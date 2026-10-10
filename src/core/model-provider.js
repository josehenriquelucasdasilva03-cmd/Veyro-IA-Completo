import {AppError,assert} from './domain.js';
import {acquireGpu} from './gpu-lock.js';
const active=new Map();
const loopbackHosts=new Set(['localhost','127.0.0.1','[::1]','::1']);
function verifiedModelBase(value,remote){
 const raw=String(value||'').trim();
 try{
  const url=new URL(raw);
  if(url.username||url.password||url.search||url.hash)return '';
  if(remote?url.protocol!=='https:':!(url.protocol==='https:'||(url.protocol==='http:'&&loopbackHosts.has(url.hostname))))return '';
  if(/\/(?:chat\/completions|models)\/?$/.test(url.pathname))return '';
  return raw.replace(/\/+$/,'');
 }catch{return '';}
}
export function providerConfig(env){
 const kind=['local','runpod','vast'].includes(env.MODEL_PROVIDER)?env.MODEL_PROVIDER:'none';
 const remote=kind==='runpod'||kind==='vast';
 const base=verifiedModelBase(env.MODEL_BASE_URL,remote);
 const key=String(env.MODEL_API_KEY||'');
 const authType=String(env.MODEL_AUTH_TYPE||'bearer');
 const basicUser=String(env.MODEL_BASIC_USER||'');
 const basicPassword=String(env.MODEL_BASIC_PASSWORD||'');
 const validSecret=s=>Boolean(s.trim())&&!/[\r\n]/.test(s);
 const authReady=!remote||(['basic','bearer'].includes(authType)&&(authType==='basic'?(validSecret(basicUser)&&validSecret(basicPassword)&&!basicUser.includes(':')):validSecret(key)));
 const configuredTimeout=Number(env.MODEL_TIMEOUT_MS);
 const timeoutMs=Number.isInteger(configuredTimeout)&&configuredTimeout>=10000&&configuredTimeout<=300000?configuredTimeout:remote?180000:90000;
 return {kind,ready:kind!=='none'&&Boolean(base)&&Boolean(env.MODEL_NAME)&&env.VEYRO_CHAT_ENABLED==='true'&&authReady,model:env.MODEL_NAME,base,key,authType,basicUser,basicPassword,vision:env.MODEL_VISION_ENABLED==='true',tools:env.MODEL_TOOL_CALLS==='true',timeoutMs};
}
function authorizationHeaders(config){
 if(config.authType==='basic'&&config.basicUser&&config.basicPassword){
  const bytes=new TextEncoder().encode(config.basicUser+':'+config.basicPassword);
  const binary=Array.from(bytes,b=>String.fromCharCode(b)).join('');
  return {Authorization:'Basic '+btoa(binary)};
 }
 return config.key?{Authorization:'Bearer '+config.key}:{};
}
export async function* readSSE(body){assert(body,'O serviço não enviou uma resposta.',502);const reader=body.getReader(),decoder=new TextDecoder();let buffer='';try{for(;;){const {value,done}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});buffer=buffer.replace(/\r/g,'');let cut;while((cut=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)yield data;}if(done)break;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
export class ModelProvider{
 constructor(env){this.config=providerConfig(env);}
 capabilities(){const c=this.config;return {configured:c.ready,provider:c.kind,streaming:true,vision:c.vision,tools:c.tools};}
 cancel(requestId){active.get(requestId)?.abort();}
 async health(){const c=this.config;if(!c.ready)return {configured:false,reachable:false};try{const r=await fetch(c.base+'/models',{headers:authorizationHeaders(c),redirect:'error',signal:AbortSignal.timeout(8000)});return {configured:true,reachable:r.ok};}catch{return {configured:true,reachable:false};}}
 async generate(input,options){let text='';for await(const e of this.stream(input,options))if(e.type==='token'){text+=e.text;assert(text.length<=120000,'A resposta do modelo excedeu o limite.',502);}return text;}
 async *stream({instructions,messages,tools,maxTokens},{requestId,signal}){
  const c=this.config;assert(c.ready,'O modelo de conversa ainda não foi conectado.',503);const releaseGpu=await acquireGpu();const control=new AbortController();active.set(requestId,control);const abort=()=>control.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)control.abort();let timedOut=false;const timer=setTimeout(()=>{timedOut=true;control.abort();},c.timeoutMs);
  try{
   const headers={'Content-Type':'application/json',...authorizationHeaders(c)};
   let body,url;
   url=c.base+'/chat/completions';body={model:c.model,stream:true,max_tokens:maxTokens,messages:[{role:'system',content:instructions},...messages.map(m=>({role:m.role,content:m.images?.length&&c.vision?[{type:'text',text:m.content},...m.images.map(url=>({type:'image_url',image_url:{url}}))]:m.content}))]};if(c.tools)body.tools=tools.map(({type,name,description,parameters})=>({type,function:{name,description,parameters}}));
   const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:control.signal});if(!response.ok)throw new AppError(response.status===429?'O modelo atingiu o limite de uso. Tente novamente mais tarde.':response.status===401?'A conexão com o modelo precisa ser revisada.':'O modelo não conseguiu responder agora.',502);
   let finished=false;const calls=new Map();
   for await(const raw of readSSE(response.body)){
    if(control.signal.aborted)throw new AppError('Resposta interrompida.',499);
    if(raw==='[DONE]'){finished=true;break;}let event;try{event=JSON.parse(raw);}catch{throw new AppError('O modelo enviou dados incompletos.',502);}
    const delta=event.choices?.[0]?.delta;if(delta?.content)yield {type:'token',text:delta.content};
    for(const call of delta?.tool_calls||[]){const old=calls.get(call.index)||{name:'',args:''};if(call.function?.name)old.name=call.function.name;if(call.function?.arguments)old.args+=call.function.arguments;calls.set(call.index,old);}
    if(event.choices?.[0]?.finish_reason==='length')throw new AppError('A resposta atingiu o limite. Tente uma pergunta mais específica.',502);
   }
   assert(finished,'A conexão terminou antes da resposta completa.',502);for(const call of calls.values())yield {type:'tool',name:call.name,args:JSON.parse(call.args)};
  }catch(error){if(timedOut)throw new AppError('O modelo excedeu o tempo de resposta. Verifique a GPU e tente novamente.',504);throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);active.delete(requestId);releaseGpu();}
 }
}
