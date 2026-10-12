import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('main chat avatar and preview are WebGL hosts rather than static-only image placeholders',()=>{
 const html=read('src/frontend/index.html'),ui=read('src/frontend/components/mascot-ui.js');
 const engine=read('src/frontend/components/mascot3d.js');
 const css=read('src/frontend/styles/mascot.css');
 assert.match(html,/class="mascot-portrait mascot-hero"/);
 assert.match(html,/class="mascot-portrait mascot-preview-portrait"/);
 assert.match(ui,/mount\('main',hero,char,currentAction\(\),false\)/);
 assert.match(ui,/mount\('picker',preview,char,'waving',false\)/);
 assert.match(ui,/onReady:/);
 assert.match(engine,/new THREE.WebGLRenderer/);
 assert.match(engine,/renderer.render\(scene,camera\)/);
 assert.match(css,/\.mascot-hero\.veyro-3d-active/);
 assert.match(css,/\.mascot-hero canvas/);
});
test('all four selected mascots map to valid 3D characters, including old Prime preference migration',()=>{
 const html=read('src/frontend/index.html');
 const ui=read('src/frontend/components/mascot-ui.js');
 const engine=read('src/frontend/components/mascot3d.js');
 const chat=read('src/frontend/components/chat.js');
 for(const name of ['black','blue','green','red']){
  assert.match(html,new RegExp('data-mascot-choice="'+name+'"'));
  assert.match(engine,new RegExp(name+':\\{body:'));
  assert.match(ui,new RegExp("'"+name+"'"));
  assert.match(chat,new RegExp(name+':\\{name:'));
 }
 assert.match(chat,/==='prime'\?'red'/);
 assert.match(ui,/name==='prime'\?'red'/);
});
test('WebGL rendering can restart after hidden stages become visible',()=>{
 const engine=read('src/frontend/components/mascot3d.js');
 const ui=read('src/frontend/components/mascot-ui.js');
 assert.match(engine,/const observer=new ResizeObserver\(resize\)/);
 assert.match(engine,/if\(host.isConnected&&!paused\)schedule\(\)/);
 assert.match(engine,/onReady\(\)/);
 assert.match(ui,/new IntersectionObserver/);
 assert.match(ui,/syncVisibility/);
 assert.match(ui,/function destroy\(key\)/);
});
