import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';

const file = path => readFile(path,'utf8');

test('the existing chat UI stays wired and keeps the three-dot project menu',async()=>{
  const html=await file('src/frontend/index.html');
  const loader=await file('src/frontend/components/cosmos-loader.js');
  assert.match(html,/id="chat-log"/);
  assert.match(html,/id="composer"/);
  assert.match(html,/id="project-options"/);
  assert.match(html,/id="header-options"/);
  assert.match(html,/id="new-chat"/);
  assert.match(html,/cosmos-loader\.js/);
  assert.match(html,/cosmos\.css/);
  assert.match(loader,/project-options/);
  assert.match(loader,/MutationObserver/);
});
test('Three.js solar system is complete and handles low power gracefully',async()=>{
  const code=await file('src/frontend/components/cosmos3d.js');
  const loader=await file('src/frontend/components/cosmos-loader.js');
  const styles=await file('src/frontend/styles/cosmos.css');
  for(const name of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']){
    assert.ok(code.includes("key:'"+name+"'"),name+' has a 3D mesh');
  }
  assert.match(code,/THREE\.WebGLRenderer/);
  assert.match(code,/THREE\.SphereGeometry/);
  assert.match(code,/THREE\.RingGeometry/);
  assert.match(code,/setPixelRatio/);
  assert.match(code,/document\.hidden/);
  assert.match(code,/mobile&&last&&time-last<32/);
  assert.match(loader,/saveData/);
  assert.match(loader,/deviceMemory/);
  assert.match(loader,/prefers-reduced-motion/);
  assert.match(styles,/veyro-cosmos-fallback/);
  assert.match(styles,/pointer-events:none/);
  assert.doesNotMatch(loader,/https?:\/\//);
});
test('server and static Netlify previews both bundle local 3D assets',async()=>{
  const build=await file('scripts/build.mjs');
  const preview=await file('scripts/build-netlify.mjs');
  assert.match(build,/assets\['\/cosmos3d\.js'\]=threeScript/);
  assert.match(build,/src\/frontend\/components\/cosmos3d\.js/);
  assert.match(preview,/dist\/site\/cosmos3d\.js/);
  await access('dist/cosmos3d.js');
  await access('dist/site/cosmos3d.js');
  const entry=await file('dist/site/index.html');
  assert.match(entry,/src="cosmos-loader\.js"/);
  assert.match(entry,/href="cosmos\.css"/);
});
