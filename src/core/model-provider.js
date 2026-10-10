import {AppError,assert} from './domain.js';
import {acquireGpu} from './gpu-lock.js';
const active=new Map();
export function providerConfig(env){
 const provider=env.MODEL_PROVIDER,base=String(env.MODEL_BASE_URL||'').replace(/\/+$/,'');let endpointAllowed=false;
 try{
  const url=new URL(base);
  const cleanUrl=!url.username&&!url.password&&!url.search&&!url.hash;
  const loopback=['localhost','127.0.0.1','::1'].includes(url.hostname);
  const remote=provider==='runpod'||provider==='ollama-remote';
  endpointAllowed=cleanUrl&&(url.protocol==='https:'||(url.protocol==='http:'&&loopback))&&(!remote||url.protocol==='https:');
 }catch{}
 const model=String(env.MODEL_NAME||'').trim(),key=String(env.MODEL_API_KEY||''),username=String(env.MODEL_API_USERNAME||''),password=String(env.MODEL_API_PASSWORD||'');
 const providerReady=provider==='local'||provider==='runpod'||provider==='ollama-remote';
 const authScheme=provider==='ollama-remote'?String(env.MODEL_AUTH_SCHEME||'bearer'):'bearer';
 const credentialReady=provider==='runpod'?key.length>=16&&key.length<=4096:provider==='ollama-remote'?(authScheme==='bearer'?key.length>=16&&key.length<=4096:authScheme==='basic'&&username.length>0&&username.length<=256&&!/[:\r\n]/.test(username)&&password.length>=16&&password.length<=4096&&!/[\r\n]/.test(password)):true;
 const requestedTimeout=Number(env.MODEL_REQUEST_TIMEOUT_MS);
 const timeoutMs=Number.isInteger(requestedTimeout)&&requestedTimeout>=10000&&requestedTimeout<=600000?requestedTimeout:180000;
 return {kind:providerReady?provider:'none',ready:providerReady&&endpointAllowed&&Boolean(model)&&model.length<=200&&credentialReady&&env.VEYRO_CHAT_ENABLED==='true',model,base,key,username,password,authScheme,timeoutMs,vision:env.MODEL_VISION_ENABLED==='true',tools:env.MODEL_TOOL_CALLS==='true'};
}
function authHeaders(config){if(config.kind==='ollama-remote'&&config.authScheme==='basic')return {Authorization:'Basic '+btoa(config.username+':'+config.password)};return config.key?{Authorization:'Bearer '+config.key}:{};}
export async function* readSSE(body){assert(body,'O serviço não enviou uma resposta.',502);const reader=body.getReader(),decoder=new TextDecoder();let buffer='';try{for(;;){const {value,done}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});buffer=buffer.replace(/\r/g,'');let cut;while((cut=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)yield data;}if(done)break;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
export class ModelProvider{
 constructor(env){this.config=providerConfig(env);}
 capabilities(){const c=this.config;return {configured:c.ready,provider:c.kind,streaming:true,vision:c.vision,tools:c.tools};}
 cancel(requestId){active.get(requestId)?.abort();}
 async health(){const c=this.config;if(!c.ready)return {configured:false,reachable:false};try{const r=await fetch(c.base+'/models',{headers:authHeaders(c),signal:AbortSignal.timeout(8000)});return {configured:true,reachable:r.ok};}catch{return {configured:true,reachable:false};}}
 async generate(input,options){let text='';for await(const e of this.stream(input,options))if(e.type==='token'){text+=e.text;assert(text.length<=120000,'A resposta do modelo excedeu o limite.',502);}return text;}
 async *stream({instructions,messages,tools,maxTokens},{requestId,signal}){
  const c=this.config;assert(c.ready,'O modelo de conversa ainda não foi conectado.',503);const releaseGpu=await acquireGpu();const control=new AbortController();active.set(requestId,control);const abort=()=>control.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)control.abort();const timer=setTimeout(()=>control.abort(new Error('model-timeout')),c.timeoutMs);
  try{
   const headers={'Content-Type':'application/json',...authHeaders(c)};
   let body,url;
   url=c.base+'/chat/completions';body={model:c.model,stream:true,max_tokens:maxTokens,messages:[{role:'system',content:instructions},...messages.map(m=>({role:m.role,content:m.images?.length&&c.vision?[{type:'text',text:m.content},...m.images.map(url=>({type:'image_url',image_url:{url}}))]:m.content}))]};if(c.tools)body.tools=tools.map(({type,name,description,parameters})=>({type,function:{name,description,parameters}}));
   const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:control.signal});
   if(!response.ok){
    if(response.status===401||response.status===403)throw new AppError('A autenticação do endpoint Ollama precisa ser revisada. Confira a chave privada do backend.',502);
    if(response.status===429)throw new AppError('O modelo atingiu o limite de solicitações. Tente novamente mais tarde.',503);
    if(response.status===502||response.status===503||response.status===504)throw new AppError('O serviço Ollama ou a GPU está indisponível no momento. Verifique se a máquina Vast.ai está ativa.',503);
    throw new AppError('O endpoint Ollama recusou a solicitação. Confira o endereço compatível com Chat Completions e o modelo configurado.',502);
   }
   let finished=false;const calls=new Map();
   for await(const raw of readSSE(response.body)){
    if(control.signal.aborted)throw new AppError('Resposta interrompida.',499);
    if(raw==='[DONE]'){finished=true;break;}let event;try{event=JSON.parse(raw);}catch{throw new AppError('O modelo enviou dados incompletos.',502);}
    const delta=event.choices?.[0]?.delta;if(delta?.content)yield {type:'token',text:delta.content};
    for(const call of delta?.tool_calls||[]){const old=calls.get(call.index)||{name:'',args:''};if(call.function?.name)old.name=call.function.name;if(call.function?.arguments)old.args+=call.function.arguments;calls.set(call.index,old);}
    if(event.choices?.[0]?.finish_reason==='length')throw new AppError('A resposta atingiu o limite. Tente uma pergunta mais específica.',502);
   }
   assert(finished,'A conexão terminou antes da resposta completa.',502);for(const call of calls.values())yield {type:'tool',name:call.name,args:JSON.parse(call.args)};
  }catch(error){
   if(error instanceof AppError)throw error;
   if(signal?.aborted)throw new AppError('Resposta interrompida.',499);
   if(control.signal.aborted)throw new AppError('O modelo demorou além do limite configurado. Verifique a carga da GPU e tente novamente.',504);
   throw new AppError('Não foi possível conectar ao endpoint Ollama. Verifique a URL HTTPS, a autenticação e se a máquina GPU está ligada.',503);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);active.delete(requestId);releaseGpu();}
 }
}
