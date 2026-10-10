import test from 'node:test';
import assert from 'node:assert/strict';
import {ModelProvider,providerConfig} from '../src/core/model-provider.js';

const remote=(overrides={})=>({
 MODEL_PROVIDER:'vast',
 MODEL_BASE_URL:'https://infer.example.test/v1',
 MODEL_NAME:'qwen3.5:35b',
 MODEL_API_KEY:'sample-not-real-secret',
 MODEL_AUTH_TYPE:'bearer',
 VEYRO_CHAT_ENABLED:'true',
 ...overrides
});

test('Vast and RunPod require HTTPS and server credentials',()=>{
 assert.equal(providerConfig(remote()).ready,true);
 assert.equal(providerConfig({...remote(),MODEL_PROVIDER:'runpod'}).ready,true);
 assert.equal(providerConfig(remote({MODEL_BASE_URL:'http://infer.example.test/v1'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_BASE_URL:'http://127.0.0.1:21434/v1'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_BASE_URL:'https://infer.example.test/v1?token=abc'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_BASE_URL:'https://x:y@infer.example.test/v1'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_BASE_URL:'https://infer.example.test/v1#token'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_API_KEY:''})).ready,false);
 assert.equal(providerConfig(remote({MODEL_AUTH_TYPE:'other'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_PROVIDER:'openai'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_NAME:''})).ready,false);
 assert.equal(providerConfig(remote({VEYRO_CHAT_ENABLED:'false'})).ready,false);
 assert.equal(providerConfig({MODEL_PROVIDER:'local',MODEL_BASE_URL:'http://127.0.0.1:21434/v1',MODEL_NAME:'qwen3.5:35b',VEYRO_CHAT_ENABLED:'true'}).ready,true);
});

test('Basic credentials require a user and password and reject invalid usernames',()=>{
 assert.equal(providerConfig(remote({MODEL_AUTH_TYPE:'basic',MODEL_API_KEY:'',MODEL_BASIC_USER:'admin',MODEL_BASIC_PASSWORD:'secret'})).ready,true);
 assert.equal(providerConfig(remote({MODEL_AUTH_TYPE:'basic',MODEL_API_KEY:'',MODEL_BASIC_USER:'',MODEL_BASIC_PASSWORD:'secret'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_AUTH_TYPE:'basic',MODEL_API_KEY:'',MODEL_BASIC_USER:'a:b',MODEL_BASIC_PASSWORD:'secret'})).ready,false);
 assert.equal(providerConfig(remote({MODEL_AUTH_TYPE:'basic',MODEL_API_KEY:'',MODEL_BASIC_USER:'admin',MODEL_BASIC_PASSWORD:''})).ready,false);
});

test('Vast bearer key is sent on server-side health check and streamed chat',async()=>{
 const original=globalThis.fetch;
 const requests=[];
 globalThis.fetch=async(url,options={})=>{
  requests.push({url,options});
  if(String(url).endsWith('/models'))return new Response('{"data":[]}',{status:200});
  return new Response('data: {"choices":[{"delta":{"content":"Olá!"}}]}\n\ndata: [DONE]\n\n',{status:200,headers:{'content-type':'text/event-stream'}});
 };
 try{
  const provider=new ModelProvider(remote());
  assert.deepEqual(await provider.health(),{configured:true,reachable:true});
  const result=await provider.generate({instructions:'Responda em português',messages:[{role:'user',content:'Oi'}],tools:[],maxTokens:100},{requestId:'test-bearer'});
  assert.equal(result,'Olá!');
  assert.equal(requests.length,2);
  assert.equal(requests[0].options.headers.Authorization,'Bearer sample-not-real-secret');
  assert.equal(requests[1].options.headers.Authorization,'Bearer sample-not-real-secret');
  assert.equal(requests[1].url,'https://infer.example.test/v1/chat/completions');
  assert.equal(JSON.parse(requests[1].options.body).model,'qwen3.5:35b');
 }finally{globalThis.fetch=original;}
});

test('Vast Basic authentication works without exposing secrets in requests to the browser',async()=>{
 const original=globalThis.fetch;
 let authorization;
 globalThis.fetch=async(_url,options={})=>{authorization=options.headers.Authorization;return new Response('{"data":[]}',{status:200});};
 try{
  const provider=new ModelProvider(remote({MODEL_AUTH_TYPE:'basic',MODEL_API_KEY:'',MODEL_BASIC_USER:'usuario',MODEL_BASIC_PASSWORD:'senha'}));
  assert.deepEqual(await provider.health(),{configured:true,reachable:true});
  assert.equal(authorization,'Basic '+btoa('usuario:senha'));
  assert.equal(providerConfig(remote({MODEL_TIMEOUT_MS:'180000'})).timeoutMs,180000);
  assert.equal(providerConfig(remote({MODEL_TIMEOUT_MS:'9999999'})).timeoutMs,180000);
 }finally{globalThis.fetch=original;}
});

test('Remote authentication denial is reported safely and health is unreachable',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('private upstream detail',{status:401});
 try{
  const provider=new ModelProvider(remote());
  assert.deepEqual(await provider.health(),{configured:true,reachable:false});
  await assert.rejects(provider.generate({instructions:'test',messages:[{role:'user',content:'Oi'}],tools:[],maxTokens:20},{requestId:'test-auth-failure'}),error=>error.status===502&&/autenticação.*recusada/i.test(error.message)&&!error.message.includes('private upstream detail'));
 }finally{globalThis.fetch=original;}
});

test('Unavailable remote endpoint returns a controlled connection error',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{throw new TypeError('network unavailable');};
 try{
  const provider=new ModelProvider(remote());
  assert.deepEqual(await provider.health(),{configured:true,reachable:false});
  await assert.rejects(provider.generate({instructions:'test',messages:[{role:'user',content:'Oi'}],tools:[],maxTokens:20},{requestId:'test-endpoint-down'}),error=>error.status===503&&/conectar ao modelo remoto/i.test(error.message));
 }finally{globalThis.fetch=original;}
});

test('Interrupted streaming response is rejected instead of reported as complete',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('data: {"choices":[{"delta":{"content":"parcial"}}]}\n\n',{status:200,headers:{'content-type':'text/event-stream'}});
 try{
  const provider=new ModelProvider(remote());
  await assert.rejects(provider.generate({instructions:'test',messages:[{role:'user',content:'Oi'}],tools:[],maxTokens:20},{requestId:'test-stream-cut'}),error=>error.status===502&&/conexão terminou antes/i.test(error.message));
 }finally{globalThis.fetch=original;}
});

test('Caller cancellation aborts the remote stream with a cancelled status',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,{signal})=>new Promise((_,reject)=>{
  const abort=()=>reject(new DOMException('Aborted','AbortError'));
  if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 });
 try{
  const controller=new AbortController();
  const pending=new ModelProvider(remote()).generate({instructions:'test',messages:[{role:'user',content:'Oi'}],tools:[],maxTokens:20},{requestId:'test-stream-cancel',signal:controller.signal});
  setTimeout(()=>controller.abort(),0);
  await assert.rejects(pending,error=>error.status===499&&/interrompida/i.test(error.message));
 }finally{globalThis.fetch=original;}
});
