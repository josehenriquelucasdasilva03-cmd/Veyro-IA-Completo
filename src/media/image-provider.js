import {AppError,assert} from '../core/domain.js';
import {providerConfig} from '../core/model-provider.js';
import {withGpuLock} from '../core/gpu-lock.js';
import {photoPrompt} from './studio-domain.js';

const localHttp=value=>{try{const u=new URL(value);return u.protocol==='http:'&&['127.0.0.1','localhost','[::1]','::1'].includes(u.hostname);}catch{return false;}};
export function imageProviderConfig(env){
 const base=String(env.IMAGE_BASE_URL||'http://127.0.0.1:8188').replace(/\/$/,'');const checkpoint=String(env.IMAGE_MODEL||'sdxl_lightning_4step.safetensors');const model=providerConfig(env);let ollamaBase='';try{if(model.kind==='local'&&localHttp(model.base))ollamaBase=new URL(model.base).origin;}catch{}
 const modelReady=model.ready&&(Boolean(ollamaBase)||['runpod','ollama-remote'].includes(model.kind));
 const ready=env.VEYRO_IMAGES_ENABLED==='true'&&env.IMAGE_PROVIDER==='comfyui-local'&&localHttp(base)&&/^[\w .()-]+\.safetensors$/i.test(checkpoint)&&modelReady&&Boolean(model.model);
 return {ready,base,checkpoint,ollamaBase,model:model.model};
}
export const imageReady=env=>imageProviderConfig(env).ready;

const workflowFor=(request,checkpoint,seed)=>{
 const [width,height]=request.size==='1536x1024'?[1152,768]:request.size==='1024x1536'?[768,1152]:[1024,1024];
 return {
  '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:checkpoint}},
  '2':{class_type:'CLIPTextEncode',inputs:{clip:['1',1],text:photoPrompt(request,request._index||0)}},
  '3':{class_type:'CLIPTextEncode',inputs:{clip:['1',1],text:'low quality, blurry, distorted, malformed anatomy, extra fingers, watermark, signature, text artifacts'}},
  '4':{class_type:'EmptyLatentImage',inputs:{width,height,batch_size:1}},
  '5':{class_type:'KSampler',inputs:{seed,steps:4,cfg:1,sampler_name:'euler',scheduler:'sgm_uniform',denoise:1,model:['1',0],positive:['2',0],negative:['3',0],latent_image:['4',0]}},
  '6':{class_type:'VAEDecode',inputs:{samples:['5',0],vae:['1',2]}},
  '7':{class_type:'SaveImage',inputs:{filename_prefix:'veyro-local',images:['6',0]}}
 };
};

async function unloadQwen(config){
 if(!config.ollamaBase)return;
 let response;try{response=await fetch(config.ollamaBase+'/api/ps',{signal:AbortSignal.timeout(5000)});}catch{return;}
 assert(response.ok,'Não foi possível verificar o uso de VRAM do Ollama.',503);const state=await response.json(),loaded=(state.models||[]).some(m=>m.name===config.model||m.model===config.model);if(!loaded)return;
 try{response=await fetch(config.ollamaBase+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config.model,prompt:'',stream:false,keep_alive:0}),signal:AbortSignal.timeout(30000)});}catch{throw new AppError('Não consegui liberar a VRAM do Qwen antes de gerar a imagem.',503);}
 assert(response.ok,'Não consegui liberar a VRAM do Qwen antes de gerar a imagem.',503);
}
async function checkedJson(response,message){assert(response.ok,message,502);try{return await response.json();}catch{throw new AppError(message,502);}}
async function waitForOutput(config,promptId){
 const deadline=Date.now()+240000;
 while(Date.now()<deadline){let response;try{response=await fetch(config.base+'/history/'+encodeURIComponent(promptId),{signal:AbortSignal.timeout(10000)});}catch{throw new AppError('A conexão com o ComfyUI foi interrompida.',502);}
  const history=await checkedJson(response,'O ComfyUI não conseguiu consultar o trabalho.');const entry=history[promptId];
  if(entry?.status?.status_str==='error'||entry?.status?.completed===false&&entry?.outputs===undefined&&entry?.status?.messages?.some(m=>m[0]==='execution_error'))throw new AppError('O ComfyUI não conseguiu gerar esta imagem. Confira o modelo e a VRAM.',502);
  const images=Object.values(entry?.outputs||{}).flatMap(output=>output.images||[]);if(images.length)return images[0];
  await new Promise(resolve=>setTimeout(resolve,800));
 }
 throw new AppError('A geração excedeu quatro minutos. Tente uma imagem quadrada ou reduza a quantidade.',504);
}
export class ComfyUiImageProvider {
 constructor(env){this.config=imageProviderConfig(env);}
 async generate(request,index=0){
  assert(this.config.ready,'Configure o ComfyUI e o modelo SDXL-Lightning local para gerar imagens.',503);
  return withGpuLock(async()=>{
   await unloadQwen(this.config);
   const imageRequest={...request,_index:index},payload={prompt:workflowFor(imageRequest,this.config.checkpoint,Math.floor(Math.random()*2**32)),client_id:crypto.randomUUID()};let response;
   try{response=await fetch(this.config.base+'/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});}catch{throw new AppError('ComfyUI local indisponível. Inicie o serviço antes de gerar imagens.',503);}
   const queued=await checkedJson(response,'ComfyUI recusou o fluxo. Confira se o checkpoint está instalado.');assert(typeof queued.prompt_id==='string'&&queued.prompt_id.length<=120,'ComfyUI retornou um pedido inválido.',502);
   const output=await waitForOutput(this.config,queued.prompt_id);assert(output.type==='output'&&typeof output.filename==='string'&&output.filename.length<=240,'O ComfyUI retornou um arquivo inválido.',502);
   const view=new URL(this.config.base+'/view');view.searchParams.set('filename',output.filename);view.searchParams.set('subfolder',output.subfolder||'');view.searchParams.set('type','output');
   try{response=await fetch(view,{signal:AbortSignal.timeout(30000)});}catch{throw new AppError('Não foi possível baixar o resultado do ComfyUI local.',502);}
   assert(response.ok,'Não foi possível baixar o resultado do ComfyUI local.',502);assert(Number(response.headers.get('content-length')||0)<=25*1024*1024,'Imagem gerada excedeu 25 MB.',413);const bytes=new Uint8Array(await response.arrayBuffer());assert(bytes.length>0&&bytes.length<=25*1024*1024,'Imagem gerada excedeu 25 MB.',413);
   const png=bytes.length>8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';assert(png||jpeg||webp,'O resultado do gerador não é uma imagem PNG, JPG ou WebP.',502);
   return {bytes,mime:png?'image/png':jpeg?'image/jpeg':'image/webp',promptId:queued.prompt_id};
  });
 }
}
