import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('3D opening runs for 16 seconds with a synchronized cinematic timeline',async()=>{
  const [chat,css]=await Promise.all([
    readFile('src/frontend/components/chat.js','utf8'),
    readFile('src/frontend/styles/cosmos.css','utf8')
  ]);
  assert.match(chat,/const VEYRO_INTRO_DURATION_MS=16000;/);
  assert.match(chat,/welcomeEntranceTimer=setTimeout\([\s\S]*?,VEYRO_INTRO_DURATION_MS\);/);
  assert.match(css,/animation:veyro-sixteen-second-camera 16s /);
  assert.match(css,/animation:veyro-depth-glide 16s /);
  assert.match(css,/@keyframes veyro-sixteen-second-camera/);
  assert.match(css,/animation:veyro-logo-left 4\.4s [^;]* 4\.3s both;/);
  assert.match(css,/animation:veyro-gold-particle-collapse 7s [^;]* calc\(3s \+ var\(--spark-delay\)\) both;/);
  assert.match(css,/animation:veyro-composer-in 1\.4s [^;]* 14\.1s both;/);
  assert.doesNotMatch(css,/veyro-eight-second-camera|eight-second entrance/);
});
test('skipping the intro and reduced-motion accessibility remain available',async()=>{
  const [loader,chat,css]=await Promise.all([
    readFile('src/frontend/components/cosmos-loader.js','utf8'),
    readFile('src/frontend/components/chat.js','utf8'),
    readFile('src/frontend/styles/cosmos.css','utf8')
  ]);
  assert.match(loader,/Pular introdução/);
  assert.match(loader,/body\.classList\.remove\('welcome-intro'\)/);
  assert.match(chat,/prefers-reduced-motion: reduce/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
