import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');

test('browser bridge parses and uses the authenticated deployed Cloudflare Worker protocol',()=>{
 const js=read('src/frontend/components/qwen-pages.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/location.origin===OFFICIAL_ORIGIN/);
 assert.match(js,/location.pathname.startsWith\('\/Veyro-IA-Completo\/'\)/);
 assert.match(js,/\/api\/auth\/login/);
 assert.match(js,/\/api\/qwen\/status/);
 assert.match(js,/\/api\/chat\/qwen/);
 assert.match(js,/headers.Authorization='Bearer '\+token/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/mode:'cors'/);
 assert.match(js,/token=null;user=null/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|sk-proj|VEYRO_MASTER_KEY|VEYRO_SETUP_CODE/);
});
test('official GitHub Pages has sign-in and real Qwen path; other previews remain demo',()=>{
 const app=read('src/frontend/app.js');
 assert.match(app,/if\(QWEN_PAGES\)setupQwenLogin\(\)/);
 assert.match(app,/if\(QWEN_PAGES\)await sendGithubQwen\(text\);else sendPreviewMessage\(text\)/);
 assert.match(app,/bridge.send\(text,prior,piece=>/);
 assert.match(app,/role:'assistant',text:'',status:'RUNNING'/);
 assert.match(app,/function showQwenGate\(\)/);
 for(const file of ['scripts/build.mjs','scripts/build-netlify.mjs','src/frontend/index.html'])
  assert.match(read(file),/qwen-pages\.js/);
});
