import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=x=>readFileSync(x,'utf8');

test('cinematic splash starts in initial HTML before app and API',()=>{
 const html=file('src/frontend/index.html');
 assert.ok(html.indexOf('id="veyro-intro"')>html.indexOf('<body'));
 assert.ok(html.indexOf('id="veyro-intro"')<html.indexOf('id="auth-gate"'));
 assert.ok(html.indexOf('boot-intro.js')<html.indexOf('studio.js'));
 assert.match(html,/boot-intro\.css/);
 assert.match(html,/Pular introdução/);
});
test('16-second autonomous intro works without an API response and never traps users',()=>{
 const js=file('src/frontend/components/boot-intro.js');
 const css=file('src/frontend/styles/boot-intro.css');
 assert.match(js,/window\.setTimeout\(finish,reduce\?850:16000\)/);
 assert.match(js,/\.addEventListener\('click',finish\)/);
 assert.match(js,/mountCosmos/);
 assert.match(css,/veyro-entry-auto-hide \.7s ease 16s forwards/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const chat=file('src/frontend/components/chat.js');
 assert.match(chat,/dataset\.bootIntroPlayed==='1'/);
});
test('both static Netlify and Worker builds include boot assets',()=>{
 for(const source of ['scripts/build.mjs','scripts/build-netlify.mjs']){
  const code=file(source);
  assert.ok(code.includes('boot-intro.js'));
  assert.ok(code.includes('boot-intro.css'));
 }
});
