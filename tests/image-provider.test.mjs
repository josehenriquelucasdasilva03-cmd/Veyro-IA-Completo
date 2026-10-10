import test from 'node:test';
import assert from 'node:assert/strict';
import {imageProviderConfig,ComfyUiImageProvider} from '../src/media/image-provider.js';

const env={VEYRO_IMAGES_ENABLED:'true',IMAGE_PROVIDER:'comfyui-local',IMAGE_BASE_URL:'http://127.0.0.1:8188',IMAGE_MODEL:'sdxl_lightning_4step.safetensors',MODEL_PROVIDER:'local',MODEL_BASE_URL:'http://127.0.0.1:11434/v1',MODEL_NAME:'qwen3.5:4b',VEYRO_CHAT_ENABLED:'true'};

test('image generation only accepts the configured local ComfyUI and Ollama endpoints',()=>{
 assert.equal(imageProviderConfig(env).ready,true);
 assert.equal(imageProviderConfig({...env,MODEL_PROVIDER:'ollama-remote',MODEL_BASE_URL:'https://gpu.example/v1',MODEL_NAME:'qwen3.5:35b',MODEL_API_KEY:'server-only-secret-123'}).ready,true);
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
