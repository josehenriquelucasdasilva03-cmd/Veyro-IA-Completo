import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const html=()=>read('src/frontend/index.html');
const css=()=>read('src/frontend/styles/cosmos.css');
const engine=()=>read('src/frontend/components/cosmos3d.js');

test('the approved cinematic reference augments the existing actual chat interface',()=>{
  const ui=html(),style=css();
  assert.equal((ui.match(/class="veyro-cinematic-motto"/g)||[]).length,1);
  assert.match(ui,/INTELIGÊNCIA.*PRESENÇA.*FUTURO/);
  assert.match(ui,/id="welcome"/);
  assert.match(ui,/id="chat-log"/);
  assert.match(ui,/id="composer"/);
  assert.match(ui,/id="header-options"/);
  assert.match(ui,/id="new-chat"/);
  assert.match(style,/veyro-storyboard-top 8s/);
  assert.match(style,/veyro-storyboard-inner-ring/);
  assert.match(style,/veyro-storyboard-outer-ring/);
  assert.match(style,/\.veyro-cinematic-motto/);
  assert.match(style,/prefers-reduced-motion:reduce/);
  assert.match(style,/\.suggestions button:last-child/);
});
test('the same animated scene is reused rather than creating a second renderer',()=>{
  const source=engine();
  const loader=read('src/frontend/components/cosmos-loader.js');
  assert.equal((source.match(/new THREE\.WebGLRenderer/g)||[]).length,1);
  assert.equal((loader.match(/await import\('\.\/cosmos3d\.js'\)/g)||[]).length,1);
  for(const name of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']){
    assert.match(source,new RegExp("key:'"+name+"'"));
  }
  assert.match(source,/opacity:\.54/);
  assert.match(source,/starCount=mobile\?180:310/);
  assert.match(source,/SphereGeometry\(body\.size\*1\.12/);
  assert.match(loader,/Pular introdução/);
  assert.match(loader,/veyro-options-drawer/);
  assert.doesNotMatch(source,/getUserMedia|fetch\s*\(/);
});
