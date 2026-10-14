import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/api/router.js';
import {setup} from './helpers.mjs';
import {videoConfig,videoRoutes} from '../src/media/video-gateway.js';
const config=()=>({...setup(),VEYRO_VIDEO_ENABLED:'true',VEYRO_VIDEO_BASE_URL:'https://private-video.test',VEYRO_VIDEO_INTERNAL_TOKEN:'secret_private_video_token_of_32_chars'});
function req(path,method='GET',body=null,user='alice'){
  const headers={'oai-authenticated-user-id':user,'X-Veyro-Request':'1',origin:'https://veyro.test'};
  if(body!==null)headers['Content-Type']='application/json';
  return new Request('https://veyro.test/api/'+path,{method,headers,...(body!==null?{body:JSON.stringify(body)}:{})});
}
test('video feature disabled by default and requires valid private endpoint',()=>{
  assert.equal(videoConfig({}).ready,false);
  assert.equal(videoConfig({...config(),VEYRO_VIDEO_ENABLED:'false'}).ready,false);
  assert.equal(videoConfig({...config(),VEYRO_VIDEO_INTERNAL_TOKEN:'x'}).ready,false);
  assert.equal(videoConfig({...config(),VEYRO_VIDEO_BASE_URL:'http://public.test'}).ready,false);
  assert.equal(videoConfig({...config(),VEYRO_VIDEO_BASE_URL:'https://user:pass@public.test'}).ready,false);
  assert.equal(videoConfig({...config(),VEYRO_VIDEO_BASE_URL:'https://public.test/?token=x'}).ready,false);
  assert.equal(videoConfig(config()).ready,true);
});
test('invalid requests are blocked before invoking provider',async()=>{
  const e=config(),input=new Request('https://veyro.test/api/projects/x/video-jobs',{method:'POST'});
  const check=body=>videoRoutes({req:input,env:e,user:'alice',projectId:'x',action:'video-jobs',readBody:async()=>body});
  await assert.rejects(check({prompt:'x'}),/2.500/);
  await assert.rejects(check({prompt:'Uma floresta',profile:'arbitrary'}),/Perfil/);
  await assert.rejects(check({prompt:'Uma floresta',idempotencyKey:'bad space'}),/Identificador/);
  await assert.rejects(videoRoutes({req:input,env:e,user:'alice',projectId:'x',action:'video-jobs/../result'}),/Identificador/);
});
test('user-project identity is stable, project-scoped and protected from other account',async()=>{
  const env=config(),old=globalThis.fetch,received=[];
  globalThis.fetch=async(url,init)=>{
    received.push({url:String(url),init});
    return new Response(init.method==='POST'?JSON.stringify({id:'00000000-0000-4000-8000-000000000001',status:'queued'}):JSON.stringify({jobs:[]}),{headers:{'Content-Type':'application/json'}});
  };
  try{
    const a=(await (await worker.fetch(req('projects','POST',{title:'A'}),env)).json()).id;
    const b=(await (await worker.fetch(req('projects','POST',{title:'B'}),env)).json()).id;
    const submit=await worker.fetch(req('projects/'+a+'/video-jobs','POST',{prompt:'Um sol cinematográfico',profile:'preview_480p',idempotencyKey:'request_key_00001'}),env);
    assert.equal(submit.status,202);
    assert.equal(received.length,1);
    assert.equal(received[0].init.headers.Authorization,'Bearer '+env.VEYRO_VIDEO_INTERNAL_TOKEN);
    const payload=JSON.parse(received[0].init.body);
    assert.match(payload.user_id,/^p-[0-9a-f]{64}$/);
    assert.equal((await worker.fetch(req('projects/'+a+'/video-jobs','GET',null,'bob'),env)).status,404);
    assert.equal(received.length,1);
    await worker.fetch(req('projects/'+b+'/video-jobs'),env);
    assert.notEqual(new URL(received[1].url).searchParams.get('user_id'),payload.user_id);
    assert.equal((await worker.fetch(req('projects/'+a+'/video-jobs'),{...env,VEYRO_VIDEO_ENABLED:'false'})).status,503);
    assert.equal(received.length,2);
  }finally{globalThis.fetch=old;}
});
test('rejects nonvideo media response',async()=>{
  const old=globalThis.fetch,env=config();
  globalThis.fetch=async()=>new Response('<html></html>',{headers:{'Content-Type':'text/html'}});
  try{await assert.rejects(videoRoutes({req:new Request('https://veyro.test/'),env,user:'alice',projectId:'1',action:'video-jobs/00000000-0000-4000-8000-000000000001/result'}),/inválido/);}
  finally{globalThis.fetch=old;}
});

test('Cloudflare Access mode refuses video generation without per-account rate limiting',async()=>{
  const env={...config(),VEYRO_AUTH_MODE:'cloudflare-access'};
  const q=new Request('https://veyro.test/api/video-jobs',{method:'POST'});
  const arg={req:q,env,user:'cf-safe-id',projectId:'proj1',action:'video-jobs',readBody:async()=>({prompt:'Um pássaro voando'})};
  await assert.rejects(videoRoutes(arg),/Limitação de vídeo não configurada/);
  let called=0;
  env.VEYRO_VIDEO_RATE_LIMITER={limit:async ({key})=>{called++;assert.equal(key,'video:cf-safe-id');return {success:false};}};
  await assert.rejects(videoRoutes(arg),/Muitas solicitações/);
  assert.equal(called,1);
});

test('video playback supports safe byte ranges without leaking engine credentials',async()=>{
  const originalFetch=globalThis.fetch,env=config(),job='00000000-0000-4000-8000-000000000001';
  let upstreamRange;
  globalThis.fetch=async(url,init)=>{
    upstreamRange=init.headers.Range;
    return new Response(new Uint8Array([0,1,2,3]),{status:206,headers:{
      'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100','Content-Length':'4'
    }});
  };
  try{
    const req=new Request('https://veyro.test/api/preview',{headers:{Range:'bytes=0-3'}});
    const result=await videoRoutes({req,env,user:'alice',projectId:'project',action:'video-jobs/'+job+'/result'});
    assert.equal(result.status,206);
    assert.equal(result.headers.get('Content-Range'),'bytes 0-3/100');
    assert.equal((await result.arrayBuffer()).byteLength,4);
    assert.equal(upstreamRange,'bytes=0-3');
    await assert.rejects(videoRoutes({req:new Request('https://veyro.test/api/preview',{headers:{Range:'bytes=0-3,8-12'}}),env,user:'alice',projectId:'project',action:'video-jobs/'+job+'/result'}),/Faixa de vídeo inválida/);
  }finally{globalThis.fetch=originalFetch;}
});
