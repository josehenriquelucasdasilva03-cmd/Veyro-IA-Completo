import {AppError,assert} from '../core/domain.js';
const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxBytes=256*1024*1024;
export function videoConfig(env={}){
  const enabled=env.VEYRO_VIDEO_ENABLED==='true',token=String(env.VEYRO_VIDEO_INTERNAL_TOKEN||'');
  let base='';
  try{
    const u=new URL(String(env.VEYRO_VIDEO_BASE_URL||'').trim());
    const local=['127.0.0.1','localhost','[::1]','::1'].includes(u.hostname);
    if((u.protocol==='https:'||(u.protocol==='http:'&&local&&env.VEYRO_AUTH_MODE==='local'))&&!u.username&&!u.password&&!u.search&&!u.hash&&u.hostname){
      base=u.origin+(u.pathname==='/'?'':u.pathname.replace(/\/+$/,''));
    }
  }catch{}
  return {ready:enabled&&!!base&&token.length>=32&&token.length<=1024&&!/[\r\n]/.test(token),base,token};
}
export const videoConfigured=env=>videoConfig(env).ready;
async function scopedId(user,projectId){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user+'\0'+projectId));
  return 'p-'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
async function upstream(env,path,method='GET',payload=null,isVideo=false){
  const c=videoConfig(env);
  assert(c.ready,'O motor de vídeo está desativado neste ambiente.',503);
  const headers={Authorization:'Bearer '+c.token,Accept:isVideo?'video/mp4':'application/json'};
  const opts={method,headers,signal:AbortSignal.timeout(15000),redirect:'error'};
  if(payload!==null){headers['Content-Type']='application/json';opts.body=JSON.stringify(payload);}
  let response;
  try{response=await fetch(c.base+path,opts);}
  catch{throw new AppError('Motor de vídeo indisponível. Seu projeto foi preservado.',503);}
  if(!response.ok){
    const status=[404,409,429].includes(response.status)?response.status:502;
    throw new AppError(status===404?'Trabalho não encontrado.':status===409?'Trabalho não pode ser alterado.':status===429?'Limite de geração atingido.':'Motor de vídeo recusou o pedido.',status);
  }
  if(isVideo){
    assert((response.headers.get('Content-Type')||'').split(';')[0].trim()==='video/mp4','Vídeo retornado é inválido.',502);
    const size=Number(response.headers.get('Content-Length')||0);
    assert(Number.isFinite(size)&&size<=maxBytes,'Arquivo de vídeo muito grande.',502);
    assert(response.body,'Vídeo vazio.',502);
    let used=0;
    const stream=response.body.pipeThrough(new TransformStream({transform(chunk,controller){
      used+=chunk.byteLength;
      if(used>maxBytes)controller.error(new Error('Video size limit'));
      else controller.enqueue(chunk);
    }}));
    return new Response(stream,{headers:{'Content-Type':'video/mp4','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  let data;
  try{const txt=await response.text();assert(txt.length<=32000,'Resposta muito grande.',502);data=JSON.parse(txt);}
  catch(e){if(e instanceof AppError)throw e;throw new AppError('Resposta inválida do motor.',502);}
  assert(data&&typeof data==='object','Resposta inválida do motor.',502);
  return new Response(JSON.stringify(data),{status:method==='POST'&&path==='/internal/video/jobs'?202:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function videoRoutes({req,env,user,projectId,action,readBody}){
  if(action!=='video-jobs'&&!action.startsWith('video-jobs/'))return null;
  // The caller must first confirm "own(db,projectId,user)".
  const userId=await scopedId(user,projectId);
  const qs='?user_id='+encodeURIComponent(userId);
  if(action==='video-jobs'){
    if(req.method==='GET')return upstream(env,'/internal/video/jobs'+qs);
    if(req.method==='POST'){
      const input=await readBody(req);
      assert(input&&typeof input==='object'&&!Array.isArray(input),'Pedido inválido.');
      const prompt=typeof input.prompt==='string'?input.prompt.trim():'';
      assert(prompt.length>=3&&prompt.length<=2500&&!prompt.includes('\0'),'Descreva a cena com até 2.500 caracteres.');
      const profile=input.profile||'preview_480p';
      assert(['preview_480p','quality_720p'].includes(profile),'Perfil inválido.');
      const key=input.idempotencyKey;
      assert(key===undefined||(typeof key==='string'&&/^[A-Za-z0-9_-]{12,100}$/.test(key)),'Identificador inválido.');
      return upstream(env,'/internal/video/jobs','POST',{user_id:userId,prompt,profile,idempotency_key:key||crypto.randomUUID()});
    }
    throw new AppError('Método não permitido.',405);
  }
  const parts=action.match(/^video-jobs\/([^/]+)(?:\/(cancel|result))?$/);
  assert(parts&&validId.test(parts[1]),'Identificador de vídeo inválido.',404);
  const id=parts[1],type=parts[2];
  if(!type&&req.method==='GET')return upstream(env,'/internal/video/jobs/'+id+qs);
  if(type==='result'&&req.method==='GET')return upstream(env,'/internal/video/jobs/'+id+'/result'+qs,'GET',null,true);
  if(type==='cancel'&&req.method==='POST')return upstream(env,'/internal/video/jobs/'+id+'/cancel'+qs,'POST');
  throw new AppError('Método não permitido.',405);
}
