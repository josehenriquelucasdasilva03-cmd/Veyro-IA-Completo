import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(x,'utf8');

test('intro dismissal triggers auth gate, even when skipped',()=>{
 const intro=read('src/frontend/components/boot-intro.js');
 const app=read('src/frontend/app.js');
 assert.match(intro,/dataset\.veyroIntroFinished='1'/);
 assert.match(intro,/dispatchEvent\(new Event\('veyro:intro-finished'\)\)/);
 assert.match(intro,/\.addEventListener\('click',finish\)/);
 assert.match(app,/document\.addEventListener\('veyro:intro-finished'/);
 assert.match(app,/dataset\.veyroIntroFinished!=='1'/);
});
test('authenticated GitHub Pages has a separate full-screen login and no central Qwen banner',()=>{
 const html=read('src/frontend/index.html'), app=read('src/frontend/app.js');
 const css=read('src/frontend/styles/base.css');
 assert.match(html,/id="veyro-qwen-gate"/);
 assert.match(html,/id="veyro-qwen-login-form"/);
 assert.match(html,/autocomplete="username"/);
 assert.match(html,/autocomplete="current-password"/);
 assert.match(html,/type="password"/);
 assert.match(html,/id="veyro-qwen-login-submit"/);
 assert.match(app,/if\(!QWEN_PAGES\)\{\s*const banner/);
 assert.match(app,/if\(QWEN_PAGES\)setupQwenLogin\(\)/);
 assert.match(css,/\.veyro-qwen-gate\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.veyro-qwen-gate\{position:fixed;inset:0;z-index:9998/);
 assert.match(app,/if\(!status.enabled\)\{/);
 assert.match(app,/hideQwenGate\(\)/);
 assert.match(app,/signout\.onclick/);
 assert.match(app,/lockQwenChat\(true\)/);
});
test('no secret embedded, no ability to converse before auth, other static previews stay demo',()=>{
 const app=read('src/frontend/app.js');
 const bridge=read('src/frontend/components/qwen-pages.js');
 assert.match(app,/if\(!bridge.connected\(\)\)\{\s*showQwenGate\(\)/);
 assert.match(app,/await bridge\.login\(username\.value\.trim\(\)\.toLowerCase\(\),password\.value\)/);
 assert.match(app,/password\.value='';submit\.disabled=false/);
 assert.match(bridge,/let token=null,user=null/);
 assert.doesNotMatch(bridge,/localStorage|sessionStorage/);
 assert.doesNotMatch(app,/sk-proj-[A-Za-z0-9]+/);
 assert.match(app,/else sendPreviewMessage\(text\)/);
});
