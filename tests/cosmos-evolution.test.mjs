import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');

test('sixteen-second cinematic intro keeps existing chat and does not delay message API',()=>{
 const chat=read('src/frontend/components/chat.js');
 const css=read('src/frontend/styles/cosmos.css');
 assert.match(chat,/const VEYRO_INTRO_DURATION_MS=16000;/);
 assert.match(chat,/welcomeEntranceTimer=setTimeout\([\s\S]*?,VEYRO_INTRO_DURATION_MS\);/);
 assert.match(css,/veyro-sixteen-second-camera 16s/);
 assert.match(css,/veyro-ring-draw 4\.5s/);
 assert.match(css,/veyro-gold-particle-collapse/);
 assert.match(read('src/frontend/components/cosmos-loader.js'),/Pular introdução/);
 assert.match(chat,/function updateWelcome\(/);
 assert.match(chat,/async function sendChat\(/);
});
test('touch parallax, rotating holograms, invisible chat background, reduced motion',()=>{
 const engine=read('src/frontend/components/cosmos3d.js');
 const loader=read('src/frontend/components/cosmos-loader.js');
 const css=read('src/frontend/styles/cosmos.css');
 assert.match(engine,/pointerType==='touch'/);
 assert.match(engine,/hologramRings\.forEach/);
 assert.match(engine,/desiredActive/);
 assert.match(engine,/const visibility=\(\)=>setActive\(desiredActive\)/);
 assert.match(css,/not\(\.welcome-state\) \.veyro-cosmos-canvas/);
 assert.match(css,/transform:scale\(\.74\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(loader,/const conserve=/);
});
test('right-side animated panel reuses existing project menu and is closed accessibly',()=>{
 const loader=read('src/frontend/components/cosmos-loader.js');
 const css=read('src/frontend/styles/cosmos.css');
 const html=read('src/frontend/index.html');
 assert.match(html,/id="header-options"[^>]*aria-haspopup="dialog"/);
 assert.match(loader,/panel\.classList\.add\('veyro-options-drawer'\)/);
 assert.match(loader,/document\.getElementById\('project-options'\)\?\.click\(\)/);
 assert.match(loader,/panel\.close\(\)/);
 assert.match(loader,/panel\?\.addEventListener\('close'/);
 assert.match(css,/#panel\.veyro-options-drawer\[open\]/);
 assert.match(css,/@keyframes veyro-options-enter/);
 assert.match(html,/id="composer"/);
 assert.match(html,/id="chat-log"/);
});
