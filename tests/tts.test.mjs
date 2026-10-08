import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/api/router.js';
import {setup} from './helpers.mjs';

async function request(env,body,{method='POST',user='alice',headers={}}={}){
 const requestHeaders={...(body?{'content-type':'application/json'}:{}),'X-Veyro-Request':'1','origin':'https://veyro.test',...headers};if(user)requestHeaders['oai-authenticated-user-id']=user;
 const response=await worker.fetch(new Request('https://veyro.test/api/tts/synthesize',{method,headers:requestHeaders,body:body?JSON.stringify(body):undefined}),env);
 const data=(response.headers.get('content-type')||'').includes('application/json')?await response.json():new Uint8Array(await response.arrayBuffer());return {response,data};
}
const azureEnv=()=>Object.assign(setup(),{TTS_PROVIDER:'azure',AZURE_SPEECH_REGION:'brazilsouth',AZURE_SPEECH_KEY:'test-azure-key'});

test('TTS requires application authentication and Azure config; chat status exposes readiness',async()=>{
 const env=setup(),unauth=await request(env,{text:'Olá',profile:'atlas'},{user:null});assert.equal(unauth.response.status,401);
 const missing=await request(env,{text:'Olá',profile:'atlas'});assert.equal(missing.response.status,503);assert.match(missing.data.error,/Azure Speech não está configurado/);
 const status=await worker.fetch(new Request('https://veyro.test/api/status',{headers:{'oai-authenticated-user-id':'alice'}}),env);assert.equal((await status.json()).tts,false);
 Object.assign(env,{AZURE_SPEECH_KEY:'test-key',AZURE_SPEECH_REGION:'brazilsouth'});const ready=await worker.fetch(new Request('https://veyro.test/api/status',{headers:{'oai-authenticated-user-id':'alice'}}),env);assert.equal((await ready.json()).tts,true);
});

test('TTS accepts only the four profiles and bounds text and prosody settings',async()=>{
 const env=azureEnv();for(const body of [{text:'Olá',profile:'en-US-ArbitraryNeural'},{text:'x'.repeat(5001),profile:'atlas'},{text:'Olá',profile:'atlas',rateAdjustment:16},{text:'Olá',profile:'atlas',pitchAdjustment:-7}])assert.ok([400,413].includes((await request(env,body)).response.status));
});

test('Azure TTS uses four different allowlisted Neural voices, escapes SSML and returns MP3',async()=>{
 const env=azureEnv(),original=globalThis.fetch,seen=[];globalThis.fetch=async(url,options)=>{seen.push({url,options});return new Response(Uint8Array.from([73,68,51,1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});};
 try{for(const profile of ['atlas','neo','luna','iris']){const result=await request(env,{text:'Teste <tag> & "fala"',profile,rateAdjustment:15,pitchAdjustment:6});assert.equal(result.response.status,200);assert.equal(result.response.headers.get('content-type'),'audio/mpeg');assert.deepEqual([...result.data],[73,68,51,1,2,3]);}assert.equal(new Set(seen.map(x=>x.options.body.match(/name="([^"]+)"/)[1])).size,4);assert.ok(seen[0].url==='https://brazilsouth.tts.speech.microsoft.com/cognitiveservices/v1');assert.equal(seen[0].options.headers['Ocp-Apim-Subscription-Key'],'test-azure-key');assert.match(seen[0].options.body,/&lt;tag&gt; &amp; &quot;fala&quot;/);assert.match(seen[0].options.body,/rate="\+13%" pitch="\+2%"/);}finally{globalThis.fetch=original;}
});

test('TTS maps provider failures without exposing upstream details or affecting chat routes',async()=>{
 const env=azureEnv(),original=globalThis.fetch;globalThis.fetch=async()=>new Response('internal azure detail / secret',{status:429});try{const result=await request(env,{text:'Teste',profile:'neo'});assert.equal(result.response.status,429);assert.match(result.data.error,/limite temporário/);assert.doesNotMatch(result.data.error,/internal azure detail|secret/);}finally{globalThis.fetch=original;}
});
