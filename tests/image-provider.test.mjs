import test from 'node:test';
import assert from 'node:assert/strict';
import {imageProviderConfig,ComfyUiImageProvider} from '../src/media/image-provider.js';

const env={VEYRO_IMAGES_ENABLED:'true',IMAGE_PROVIDER:'comfyui-local',IMAGE_BASE_URL:'http://127.0.0.1:8188',IMAGE_MODEL:'sdxl_lightning_4step.safetensors',MODEL_PROVIDER:'local',MODEL_BASE_URL:'http://127.0.0.1:11434/v1',MODEL_NAME:'qwen3.5:4b',VEYRO_CHAT_ENABLED:'true'};

test('image generation only accepts the configured local ComfyUI and Ollama endpoints',()=>{
 assert.equal(imageProviderConfig(env).ready,true);
 assert.equal(imageProviderConfig({...env,IMAGE_BASE_URL:'https://images.example.com'}).ready,false);
 assert.equal(imageProviderConfig({...env,MODEL_BASE_URL:'https://ollama.example.com/v1'}).ready,false);
 assert.equal(imageProviderConfig({...env,IMAGE_MODEL:'../../other.safetensors'}).ready,false);
});

test('ComfyUI workflow uses SDXL-Lightning four-step settings and unloads Qwen first',async()=>{
 const originalFetch=globalThis.fetch,seen=[];
 const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(String(input));seen.push({url,body:options.body?JSON.parse(options.body):null});
  if(url.pathname==='/api/ps')return Response.json({models:[{name:'qwen3.5:4b'}]});
  if(url.pathname==='/api/generate')return Response.json({done:true});
  if(url.pathname==='/prompt')return Response.json({prompt_id:'job-123'});
  if(url.pathname==='/history/job-123')return Response.json({'job-123':{outputs:{'7':{images:[{filename:'veyro.png',subfolder:'',type:'output'}]}}}});
  if(url.pathname==='/view')return new Response(png,{headers:{'content-type':'image/png','content-length':String(png.length)}});
  throw new Error('Unexpected request '+url);
 };
 try{
  const result=await new ComfyUiImageProvider(env).generate({prompt:'Uma paisagem brasileira',size:'1024x1024'},0);
  assert.equal(result.mime,'image/png');assert.deepEqual([...result.bytes], [...png]);
  assert.deepEqual(seen.map(item=>item.url.pathname),['/api/ps','/api/generate','/prompt','/history/job-123','/view']);
  assert.equal(seen[1].body.keep_alive,0);
  const workflow=seen[2].body.prompt;
  assert.equal(workflow['1'].inputs.ckpt_name,'sdxl_lightning_4step.safetensors');
  assert.equal(workflow['4'].inputs.width,1024);assert.equal(workflow['4'].inputs.height,1024);
  assert.equal(workflow['5'].inputs.steps,4);assert.equal(workflow['5'].inputs.cfg,1);
  assert.equal(workflow['5'].inputs.sampler_name,'euler');assert.equal(workflow['5'].inputs.scheduler,'sgm_uniform');
  assert.match(workflow['2'].inputs.text,/Uma paisagem brasileira/);
 }finally{globalThis.fetch=originalFetch;}
});

test('remote ComfyUI requires HTTPS and server-side authorization, without a local Ollama dependency',()=>{
 const remote={VEYRO_IMAGES_ENABLED:'true',IMAGE_PROVIDER:'comfyui-remote',IMAGE_BASE_URL:'https://private-gateway.example/images',IMAGE_API_KEY:'private-test-token-longer-than-16',IMAGE_MODEL:'sdxl_lightning_4step.safetensors'};
 assert.equal(imageProviderConfig(remote).ready,true);
 assert.equal(imageProviderConfig({...remote,IMAGE_API_KEY:''}).ready,false);
 assert.equal(imageProviderConfig({...remote,IMAGE_BASE_URL:'http://private-gateway.example/images'}).ready,false);
 assert.equal(imageProviderConfig({...remote,IMAGE_BASE_URL:'https://127.0.0.1/images'}).ready,false);
 assert.equal(imageProviderConfig({...remote,IMAGE_BASE_URL:'https://user:pass@private-gateway.example/images'}).ready,false);
 assert.equal(imageProviderConfig({...remote,IMAGE_BASE_URL:'https://private-gateway.example/images?key=secret'}).ready,false);
});
test('remote edit uploads the authorized source and executes an image-to-image graph',async()=>{
 const originalFetch=globalThis.fetch,seen=[];
 const env={VEYRO_IMAGES_ENABLED:'true',IMAGE_PROVIDER:'comfyui-remote',IMAGE_BASE_URL:'https://private-gateway.example/images',IMAGE_API_KEY:'private-test-token-longer-than-16',IMAGE_MODEL:'sdxl_lightning_4step.safetensors'};
 const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(String(input));seen.push({url,options});
  assert.equal(options.headers.Authorization,'Bearer '+env.IMAGE_API_KEY);
  assert.equal(options.redirect,'error');
  if(url.pathname==='/images/upload/image')return Response.json({name:'veyro-input-00000000-0000-4000-8000-000000000001.png',subfolder:''});
  if(url.pathname==='/images/prompt')return Response.json({prompt_id:'edit-123'});
  if(url.pathname==='/images/history/edit-123')return Response.json({'edit-123':{outputs:{'7':{images:[{filename:'out.png',type:'output'}]}}}});
  if(url.pathname==='/images/view')return new Response(png,{headers:{'content-length':String(png.length)}});
  throw new Error('Unexpected request '+url);
 };
 try{
  const source={bytes:png,mime:'image/png'};
  const output=await new ComfyUiImageProvider(env).generate({operation:'edit',prompt:'Preservar cenário',size:'1024x1024',count:1},0,source);
  assert.equal(output.mime,'image/png');
  assert.deepEqual(seen.map(x=>x.url.pathname),['/images/upload/image','/images/prompt','/images/history/edit-123','/images/view']);
  const graph=JSON.parse(seen[1].options.body).prompt;
  assert.equal(graph['4'].class_type,'LoadImage');
  assert.equal(graph['9'].class_type,'VAEEncode');
  assert.equal(graph['5'].inputs.denoise,0.6);
  assert.deepEqual(graph['5'].inputs.latent_image,['9',0]);
  assert.equal(seen[0].options.body instanceof FormData,true);
 }finally{globalThis.fetch=originalFetch;}
});
test('enhancement uses a gentler denoise value than editing',async()=>{
 const originalFetch=globalThis.fetch,graphs=[];
 const remote={VEYRO_IMAGES_ENABLED:'true',IMAGE_PROVIDER:'comfyui-remote',IMAGE_BASE_URL:'https://private-gateway.example/images',IMAGE_API_KEY:'private-test-token-longer-than-16',IMAGE_MODEL:'sdxl_lightning_4step.safetensors'};
 const image=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 globalThis.fetch=async(input,options={})=>{
  const path=new URL(String(input)).pathname;
  if(path.endsWith('/upload/image'))return Response.json({name:'veyro-input-00000000-0000-4000-8000-000000000001.png'});
  if(path.endsWith('/prompt')){graphs.push(JSON.parse(options.body).prompt);return Response.json({prompt_id:'enhance-123'});}
  if(path.endsWith('/history/enhance-123'))return Response.json({'enhance-123':{outputs:{'7':{images:[{filename:'out.png',type:'output'}]}}}});
  if(path.endsWith('/view'))return new Response(image);
  throw Error('Unexpected '+path);
 };
 try{
  await new ComfyUiImageProvider(remote).generate({operation:'enhance',prompt:'Melhorar nitidez',size:'1024x1024',count:1},0,{mime:'image/png',bytes:image});
  assert.equal(graphs[0]['5'].inputs.denoise,0.3);
 }finally{globalThis.fetch=originalFetch;}
});
