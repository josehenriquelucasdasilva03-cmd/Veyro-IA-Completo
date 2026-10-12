import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setup} from './helpers.mjs';
import worker from '../src/api/router.js';
const origin='https://veyro.test';
const request=(env,path,{user='',method='GET'}={})=>worker.fetch(new Request(origin+path,{method,headers:{'oai-authenticated-user-id':user}}),env);
test('authenticated session is real, requires an identity and correct method',async()=>{
 const env=setup();
 assert.equal((await request(env,'/api/auth/session')).status,401);
 const accepted=await request(env,'/api/auth/session',{user:'alice'});
 assert.equal(accepted.status,200);
 assert.deepEqual(await accepted.json(),{authenticated:true});
 assert.equal(accepted.headers.get('cache-control'),'no-store');
 assert.equal((await request(env,'/api/auth/session',{user:'alice',method:'POST'})).status,405);
});
test('login continuation is only for authenticated users and avoids open redirects',async()=>{
 const env=setup();
 assert.equal((await request(env,'/api/auth/continue')).status,401);
 const response=await request(env,'/api/auth/continue?next=https://evil.example',{user:'alice'});
 assert.equal(response.status,303);
 assert.equal(response.headers.get('location'),origin+'/');
});
test('cloudflare access identity cannot be forged using an HTTP header',async()=>{
 const env={...setup(),VEYRO_AUTH_MODE:'cloudflare-access'};
 const forged=await worker.fetch(new Request(origin+'/api/auth/session',{headers:{'oai-authenticated-user-id':'fake'}}),env,{});
 assert.equal(forged.status,401);
 const verified=await worker.fetch(new Request(origin+'/api/auth/session'),env,{access:{getIdentity:async()=>({email:'user@example.com'})}});
 assert.equal(verified.status,200);
});
test('app loads only after the 16s entry and the script is bundled for both hosts',async()=>{
 const [html,flow,app,chat,build,netlify]=await Promise.all(['src/frontend/index.html','src/frontend/auth-flow.js','src/frontend/app.js','src/frontend/components/chat.js','scripts/build.mjs','scripts/build-netlify.mjs'].map(p=>readFile(p,'utf8')));
 assert.ok(html.indexOf('src="auth-flow.js"')<html.indexOf('src="app.js"'));
 assert.match(flow,/const INTRO_MS=16000/);
 assert.match(flow,/authenticated===true/);
 assert.match(app,/await window\.veyroAuth\.start\(\)/);
 assert.match(chat,/window\.veyroAuth\?\.introWasShown/);
 assert.match(build,/'\/auth-flow.js'/);
 assert.match(netlify,/'dist\/site\/auth-flow.js'/);
 assert.equal((html.match(/id="auth-gate"/g)||[]).length,1);
});
