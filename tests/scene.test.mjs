import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
test('three-reference scene is bundled for production and static previews',()=>{
  const html=read('src/frontend/index.html');
  const build=read('scripts/build.mjs');
  const netlify=read('scripts/build-netlify.mjs');
  for(const file of ['scene.css','scene.js']){
    assert.ok(html.includes('"'+file+'"'),file+' must load in browser');
    assert.ok(build.includes("'/"+file+"'"),file+' must be in runtime assets');
    assert.ok(netlify.includes("'dist/site/"+file+"'"),file+' must be in Netlify static preview');
  }
});
test('scene layers have no GPU dependencies and are decorative only',()=>{
  const source=read('src/frontend/components/scene.js');
  assert.match(source,/aria-hidden','true'/);
  assert.match(source,/pointermove/);
  assert.match(source,/requestAnimationFrame/);
  assert.match(source,/prefers-reduced-motion/);
  assert.doesNotMatch(source,/fetch\s*\(|getUserMedia|WebGLRenderingContext|deviceorientation/);
});
test('cinematic entrance preserves mobile and accessibility fallbacks',()=>{
  const css=read('src/frontend/styles/scene.css');
  assert.match(css,/@keyframes veyro-logo-left/);
  assert.match(css,/@keyframes veyro-logo-right/);
  assert.match(css,/@media\(max-width:899px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/\.veyro-cosmos-ringed/);
  assert.match(css,/\.veyro-cosmos-amber/);
});
