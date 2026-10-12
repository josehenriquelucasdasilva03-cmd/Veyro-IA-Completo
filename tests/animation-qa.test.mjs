import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('fallback visual não depende da disponibilidade do Worker',()=>{
  const app=readFileSync('src/frontend/app.js','utf8');
  assert.match(app,/if\(state\.mode==='chat'&&!\(state\.chatMessages\?\.length\)\)updateWelcome\(\)/);
});
test('browser QA cobre desktop, Android, API offline, acessibilidade e interação',()=>{
  const config=readFileSync('playwright.config.cjs','utf8');
  const spec=readFileSync('tests/browser/animation.spec.cjs','utf8');
  assert.match(config,/desktop-chromium/);assert.match(config,/android-chromium/);
  assert.match(spec,/API is offline/);assert.match(spec,/reduced motion/);
  assert.match(spec,/horizontal overflow/);
});

test('primeira visita preserva introdução sem modal prematuro',()=>{
  const chat=readFileSync('src/frontend/components/chat.js','utf8');
  assert.match(chat,/5800/);
  assert.match(chat,/!document\.body\.classList\.contains\('welcome-intro'\)/);
});
