import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers.mjs';
import worker from '../src/api/router.js';
import {ModelProvider,providerConfig} from '../src/core/model-provider.js';
async function req(env,path,body,method=body?'POST':'GET',user='alice'){return worker.fetch(new Request('https://veyro.test/api/'+path,{method,headers:{'oai-authenticated-user-id':user,'X-Veyro-Request':'1',origin:'https://veyro.test','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env);}
async function init(env){const p=await(await req(env,'projects',{title:'Teste'})).json();const c=await(await req(env,'conversations',{projectId:p.id})).json();return {pid:p.id,cid:c.id};}
const send=(env,cid,message,id=crypto.randomUUID())=>req(env,'conversations/'+cid+'/messages',{message,requestId:id});
test('legacy OpenAI settings never activate a provider and HTTP endpoints are limited to loopback',()=>{assert.equal(providerConfig({MODEL_PROVIDER:'openai',OPENAI_API_KEY:'legacy',OPENAI_MODEL:'legacy',VEYRO_AI_ENABLED:'true'}).ready,false);assert.equal(providerConfig({MODEL_PROVIDER:'local',MODEL_BASE_URL:'http://192.168.1.20:11434/v1',MODEL_NAME:'x',VEYRO_CHAT_ENABLED:'true'}).ready,false);assert.equal(providerConfig({MODEL_PROVIDER:'local',MODEL_BASE_URL:'http://127.0.0.1:11434/v1',MODEL_NAME:'x',VEYRO_CHAT_ENABLED:'true'}).ready,true);});
test('RunPod-compatible provider requires HTTPS, server key, and a clean endpoint URL',()=>{
 const base={MODEL_PROVIDER:'runpod',MODEL_BASE_URL:'https://inference.example/v1',MODEL_NAME:'qwen',MODEL_API_KEY:'server-only-secret',VEYRO_CHAT_ENABLED:'true'};
 const configured=providerConfig(base);assert.equal(configured.ready,true);assert.equal(configured.kind,'runpod');
 assert.equal(providerConfig({...base,MODEL_BASE_URL:'http://inference.example/v1'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_API_KEY:''}).ready,false);
 assert.equal(providerConfig({...base,MODEL_BASE_URL:'https://inference.example/v1?token=secret'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_BASE_URL:'https://user:password@inference.example/v1'}).ready,false);
});
test('remote Ollama requires HTTPS and private authentication for the configured Qwen model',()=>{
 const base={MODEL_PROVIDER:'ollama-remote',MODEL_BASE_URL:'https://gpu.example/v1',MODEL_NAME:'qwen3.5:35b',MODEL_API_KEY:'server-only-secret-123',VEYRO_CHAT_ENABLED:'true'};
 assert.equal(providerConfig(base).ready,true);assert.equal(providerConfig(base).kind,'ollama-remote');
 assert.equal(providerConfig({...base,MODEL_BASE_URL:'http://gpu.example/v1'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_API_KEY:''}).ready,false);
 assert.equal(providerConfig({...base,MODEL_BASE_URL:'https://gpu.example/v1?token=secret'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_BASE_URL:'https://user:password@gpu.example/v1'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_AUTH_SCHEME:'basic',MODEL_API_USERNAME:'veyro',MODEL_API_PASSWORD:'strong-private-password'}).ready,true);
 assert.equal(providerConfig({...base,MODEL_AUTH_SCHEME:'basic',MODEL_API_USERNAME:'veyro',MODEL_API_PASSWORD:'short'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_AUTH_SCHEME:'digest'}).ready,false);
 assert.equal(providerConfig({...base,MODEL_REQUEST_TIMEOUT_MS:'999999'}).timeoutMs,180000);
 assert.equal(providerConfig({...base,MODEL_REQUEST_TIMEOUT_MS:'240000'}).timeoutMs,240000);
});
test('remote Ollama streams Qwen requests with server-side auth and handles GPU unavailability',async()=>{
 const env=setup(),{cid}=await init(env);
 Object.assign(env,{MODEL_PROVIDER:'ollama-remote',MODEL_BASE_URL:'https://gpu.example/v1',MODEL_NAME:'qwen3.5:35b',MODEL_API_KEY:'server-only-secret-123',VEYRO_CHAT_ENABLED:'true'});
 const originalFetch=globalThis.fetch;let requested;
 try{
  globalThis.fetch=async(url,options)=>{requested={url:String(url),headers:options.headers,body:JSON.parse(options.body)};return new Response('data: {"choices":[{"delta":{"content":"Olá do Qwen"}}]}\n\ndata: [DONE]\n\n');};
  const response=await(await send(env,cid,'Oi')).text();
  assert.ok(response.includes('event: done'));assert.equal(requested.url,'https://gpu.example/v1/chat/completions');
  assert.equal(requested.headers.Authorization,'Bearer server-only-secret-123');assert.equal(requested.body.model,'qwen3.5:35b');
  globalThis.fetch=async()=>new Response('',{status:503});
  const unavailable=await(await send(env,cid,'Teste indisponibilidade')).text();
  assert.ok(unavailable.includes('máquina Vast.ai está ativa'));assert.ok(unavailable.includes('event: error'));
  globalThis.fetch=async()=>{throw new TypeError('network failure');};
  const disconnected=await(await send(env,cid,'Teste conexão')).text();
  assert.ok(disconnected.includes('URL HTTPS, a autenticação'));
 }finally{globalThis.fetch=originalFetch;}
});
test('conversations isolate history, preserve project memories and own drafts',async()=>{const env=setup(),{pid,cid}=await init(env);await(await send(env,cid,'Lembre: cenário realista')).text();await req(env,'conversations/'+cid,{draft:'ideia incompleta'},'PATCH');const c2=await(await req(env,'conversations',{projectId:pid})).json();assert.equal((await(await req(env,'conversations/'+c2.id)).json()).messages.length,0);assert.equal((await(await req(env,'projects/'+pid)).json()).memories.length,1);assert.equal((await(await req(env,'conversations/'+cid)).json()).conversation.draft,'ideia incompleta');assert.equal((await req(env,'conversations/'+cid,undefined,'GET','bob')).status,404);});
test('unconfigured chat saves a notice without inventing a reply; duplicate requests rejected',async()=>{const env=setup(),{cid}=await init(env),id=crypto.randomUUID();const s=await(await send(env,cid,'Oi',id)).text();assert.ok(s.includes('event: waiting'));assert.ok(!s.includes('event: token'));const messages=(await(await req(env,'conversations/'+cid)).json()).messages;assert.deepEqual(messages.map(m=>m.role),['user','notice']);assert.equal(messages[1].status,'WAITING');assert.equal((await send(env,cid,'Oi',id)).status,409);});
test('legacy messages imported once and profiles remain private',async()=>{const env=setup();const p=await(await req(env,'projects',{title:'Antigo'})).json();await req(env,'projects/'+p.id+'/chat',{text:'Mensagem antiga',mode:'chat',requestId:crypto.randomUUID()});const list=await(await req(env,'conversations')).json();assert.equal(list.length,1);const first=await(await req(env,'conversations/'+list[0].id)).json();assert.equal(first.messages[0].text,'Mensagem antiga');await req(env,'conversations');assert.equal((await(await req(env,'conversations/'+list[0].id)).json()).messages.length,first.messages.length);await req(env,'profile',{name:'José'},'PUT');assert.equal((await(await req(env,'profile')).json()).name,'José');assert.equal((await(await req(env,'profile',undefined,'GET','bob')).json()).name,'Meu perfil');});
test('real streaming protocol preserves partials and scopes context to current conversation',async()=>{const env=setup(),{pid,cid}=await init(env);await(await send(env,cid,'segredo de outra conversa')).text();const c2=await(await req(env,'conversations',{projectId:pid})).json();Object.assign(env,{MODEL_PROVIDER:'local',MODEL_BASE_URL:'https://model.test/v1',MODEL_NAME:'test',VEYRO_CHAT_ENABLED:'true'});const orig=globalThis.fetch;let captured;globalThis.fetch=async(_,o)=>{captured=JSON.parse(o.body);return new Response('data: {"choices":[{"delta":{"content":"Olá"}}]}\n\ndata: {"choices":[{"delta":{"content":"!"}}]}\n\ndata: [DONE]\n\n');};try{const stream=await(await send(env,c2.id,'Oi')).text();assert.ok(stream.includes('event: token'));assert.ok(stream.includes('event: done'));assert.ok(!JSON.stringify(captured).includes('segredo de outra conversa'));let messages=(await(await req(env,'conversations/'+c2.id)).json()).messages;assert.equal(messages.at(-1).text,'Olá!');assert.equal(messages.at(-1).status,'COMPLETE');globalThis.fetch=async()=>new Response('data: {"choices":[{"delta":{"content":"Parcial"}}]}\n\n');const broken=await(await send(env,c2.id,'Continue')).text();assert.ok(broken.includes('event: error'));assert.ok(!broken.includes('event: done'));messages=(await(await req(env,'conversations/'+c2.id)).json()).messages;assert.equal(messages.at(-1).status,'FAILED');assert.equal(messages.at(-1).text,'Parcial');}finally{globalThis.fetch=orig;}});
test('cancellation keeps received text without marking the answer complete',async()=>{const env=setup(),{cid}=await init(env);Object.assign(env,{MODEL_PROVIDER:'local',MODEL_BASE_URL:'https://model.test/v1',MODEL_NAME:'test',VEYRO_CHAT_ENABLED:'true'});const orig=globalThis.fetch,encoder=new TextEncoder();globalThis.fetch=async(_,o)=>new Response(new ReadableStream({start(c){c.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Começo"}}]}\n\n'));o.signal.addEventListener('abort',()=>c.error(new DOMException('Aborted','AbortError')));}}));try{const id=crypto.randomUUID(),response=await send(env,cid,'Explique',id),reader=response.body.getReader();let output='';while(!output.includes('event: token'))output+=new TextDecoder().decode((await reader.read()).value);await req(env,'conversations/'+cid+'/cancel',{requestId:id});for(;;){const r=await reader.read();if(r.done)break;output+=new TextDecoder().decode(r.value);}assert.ok(output.includes('event: cancelled'));assert.ok(!output.includes('event: done'));const m=(await(await req(env,'conversations/'+cid)).json()).messages.at(-1);assert.equal(m.status,'CANCELLED');assert.equal(m.text,'Começo');}finally{globalThis.fetch=orig;}});
