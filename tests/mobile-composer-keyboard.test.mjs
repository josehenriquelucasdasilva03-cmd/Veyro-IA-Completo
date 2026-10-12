import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/frontend/styles/planetarium-theme.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/frontend/app.js',import.meta.url),'utf8');

test('mobile composer gives the message its own full-width row',()=>{
  assert.match(css,/Mobile chat composer: full-width message text/);
  assert.match(css,/body\[data-mode="chat"\] \.composer textarea\{[\s\S]*?grid-column:1!important;[\s\S]*?grid-row:2!important;/);
  assert.match(css,/body\[data-mode="chat"\] \.composer \.composer-bottom\{[\s\S]*?display:flex!important;[\s\S]*?grid-row:3!important;/);
  assert.match(css,/max-height:min\(150px,calc\(var\(--viewport-height\) \* \.24\)\)!important;/);
});

test('chat composer tracks the visible viewport when Android keyboard opens',()=>{
  assert.match(js,/window\.visualViewport\.addEventListener\('resize',updateViewport\)/);
  assert.match(js,/document\.body\.classList\.toggle\('veyro-keyboard-open'/);
  assert.match(js,/for\(const event of \['focus','blur'\]\)/);
  assert.match(css,/body\.veyro-keyboard-open\[data-mode="chat"\] \.dock/);
});
