import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const css=read('src/frontend/styles/cinematic.css');
const build=read('scripts/build-netlify.mjs');
const worker=read('scripts/build.mjs');

test('all four selectable mascots have individual valid WebP card and avatar assets',()=>{
 const html=read('src/frontend/index.html');
 for(const mascot of ['black','blue','green','red']){
  assert.match(html,new RegExp('data-mascot-choice="'+mascot+'"'));
  for(const type of ['avatar','card']){
   const file='public/assets/veyro-'+mascot+'-'+type+'.webp';
   assert.ok(existsSync(file),file+' missing');
   const content=readFileSync(file);
   assert.equal(content.toString('ascii',0,4),'RIFF');
   assert.equal(content.toString('ascii',8,12),'WEBP');
   assert.ok(content.length>1000);
   assert.ok(css.includes("url('./veyro-"+mascot+"-"+type+".webp')"));
  }
 }
 assert.doesNotMatch(html,/data-mascot-choice="prime"/);
});
test('CSS uses independent images rather than a 4-sprite crop on mobile',()=>{
 assert.doesNotMatch(css,/background-image:url\('\.\/veyro-mascots\.jpg'\)/);
 assert.match(css,/\.mascot-card-portrait\{[^}]*background-size:contain/);
 assert.match(css,/\.mascot-preview-portrait\{[^}]*background-size:cover/);
 assert.match(css,/\.mascot-portrait\{[^}]*background-size:cover/);
 assert.match(css,/\.mascot-portrait\[data-mascot=red\]/);
});
test('static and Worker builds contain all new assets',()=>{
 assert.match(build,/flatMap\(mascot=>/);
 assert.match(worker,/assets\[file\]/);
 const html=read('src/frontend/index.html');
 assert.ok(html.includes('Escolha seu Veyro'));
 const chat=read('src/frontend/components/chat.js');
 assert.match(chat,/red:\{name:'Veyro Red'/);
 assert.match(chat,/storedMascot==='prime'\?'red':'black'/);
});
