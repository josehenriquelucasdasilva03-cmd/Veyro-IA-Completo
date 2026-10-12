import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {infer3DPreset,create3DModel,PRESETS} from '../src/frontend/components/model3d-shapes.js';
const read=file=>readFileSync(file,'utf8');

test('3D descriptions resolve known objects without calling a generative API',()=>{
 assert.equal(infer3DPreset('robô metálico'),'robot');
 assert.equal(infer3DPreset('planeta com anéis'),'planet');
 assert.equal(infer3DPreset('árvore verde'),'tree');
 assert.equal(infer3DPreset('foguete espacial'),'rocket');
 assert.equal(infer3DPreset('objeto desconhecido'),'abstract');
 assert.equal(infer3DPreset('qualquer coisa','star'),'star');
});

test('all 3D templates create bounded real geometries',()=>{
 for(const name of PRESETS){
  const result=create3DModel('',name,'icon');
  let count=0;
  result.group.traverse(n=>{
   if(!n.isMesh)return;
   count++;
   assert.ok(n.geometry.getAttribute('position').count<10000);
   n.geometry.dispose();
   n.material.dispose();
  });
  assert.ok(count>0,name);
 }
});

test('3D Studio is isolated from chat and uses local bundled modules',()=>{
 const html=read('src/frontend/index.html');
 const build=read('scripts/build.mjs');
 const ui=read('src/frontend/components/model3d-ui.js');
 assert.match(html,/id="nav-3d"/);
 assert.match(html,/id="model3d-dialog"/);
 assert.match(html,/id="model3d-glb"/);
 assert.match(html,/id="model3d-png"/);
 assert.match(ui,/createPhotoRelief/);
 assert.match(ui,/exportGLB/);
 assert.match(ui,/exportPNG/);
 assert.match(build,/model3d-engine\.js/);
 assert.match(build,/model3d-ui\.js/);
 assert.match(html,/id="chat-log"/);
});
