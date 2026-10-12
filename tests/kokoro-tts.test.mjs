import test from 'node:test';
import assert from 'node:assert/strict';
import {KokoroTtsProvider,kokoroTtsBase,ttsReady} from '../src/tts/provider.js';
const local={TTS_PROVIDER:'kokoro',KOKORO_TTS_BASE_URL:'http://127.0.0.1:8880'};
const remote={TTS_PROVIDER:'kokoro',KOKORO_TTS_BASE_URL:'https://tts.example.com',KOKORO_TTS_API_KEY:'secret-token-for-private-proxy'};
test('neural provider is opt-in; only explicit loopback or authenticated HTTPS can be configured',()=>{
 assert.equal(ttsReady({TTS_PROVIDER:'kokoro'}),false);
 assert.equal(ttsReady(local),true);
 assert.equal(ttsReady(remote),true);
 for(const url of ['http://8.8.8.8:8880','http://192.168.1.10:8880','http://voice.example.com','https://localhost:8880','https://192.168.1.10','https://tts.example.com/?token=secret','https://user:pass@tts.example.com','https://tts.example.com/private']){
  assert.equal(ttsReady({...remote,KOKORO_TTS_BASE_URL:url}),false,url);
 }
 assert.equal(kokoroTtsBase({...remote,KOKORO_TTS_API_KEY:'short'}),'');
});
test('Kokoro sends allowlisted Portuguese voice IDs and never forwards credentials to browser',async()=>{
 const original=globalThis.fetch;
 const seen=[];
 globalThis.fetch=async(url,options)=>{
  seen.push({url,options});
  return new Response(new Uint8Array([73,68,51,4,5,6]),{headers:{'Content-Type':'audio/mpeg','X-secret':'no'}});
 };
 try{
  const p=new KokoroTtsProvider(remote);
  for(const profile of ['atlas','neo','luna','iris']){
   const out=await p.synthesize({text:'Olá! Como você está?',profile});
   assert.equal(out.status,200);
   assert.equal(out.headers.get('content-type'),'audio/mpeg');
   assert.equal(out.headers.get('X-secret'),null);
  }
  assert.deepEqual(seen.map(x=>JSON.parse(x.options.body).voice),['pm_alex','pm_santa','pf_dora','pf_dora']);
  assert.ok(seen.every(x=>x.url==='https://tts.example.com/v1/audio/speech'));
  assert.ok(seen.every(x=>x.options.headers.Authorization==='Bearer '+remote.KOKORO_TTS_API_KEY));
  assert.deepEqual(seen.map(x=>JSON.parse(x.options.body).response_format),['mp3','mp3','mp3','mp3']);
  const localProvider=new KokoroTtsProvider(local);
  await localProvider.synthesize({text:'Olá',profile:'atlas'});
  assert.equal(seen.at(-1).options.headers.Authorization,undefined);
 }finally{globalThis.fetch=original;}
});
test('Kokoro validates profiles and conceals private server errors',async()=>{
 const p=new KokoroTtsProvider(remote);
 await assert.rejects(()=>p.synthesize({text:'Olá',profile:'rafael'}),/quatro mascotes/);
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('SECRET_UPSTREAM_ERROR',{status:500});
 try{await assert.rejects(()=>p.synthesize({text:'Olá',profile:'atlas'}),e=>e.status===502&&!e.message.includes('SECRET_UPSTREAM_ERROR'));}
 finally{globalThis.fetch=original;}
});
test('Kokoro rejects non-audio response',async()=>{
 const p=new KokoroTtsProvider(remote),old=globalThis.fetch;globalThis.fetch=async()=>new Response('<html>login</html>',{headers:{'Content-Type':'text/html'}});
 try{await assert.rejects(()=>p.synthesize({text:'Olá',profile:'luna'}),/diferente de MP3/);}
 finally{globalThis.fetch=old;}
});
