import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

test('consolidated Veyro keeps login, Qwen, voices and planets while enabling 3D mascots',async()=>{
 const html=await readFile('src/frontend/index.html','utf8');
 for(const asset of ['boot-intro.js','qwen-pages.js','voice-manager.js','video.js',
    'cosmos-loader.js','planetarium-theme.css','mascot-ui.js','mascot.css'])
   assert.ok(html.includes(asset),'missing '+asset);
 for(const id of ['mascot-toggle','mascot-panel','mascot-stage','mascot-character',
    'mascot-action','mascot-speed','mascot-scale','mascot-auto','mascot-3d-close'])
   assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(allIds.length,new Set(allIds).size,'duplicate IDs would break the controls');
 for(const name of ['black','blue','green','red'])assert.ok(html.includes('data-mascot-choice="'+name+'"'));
});

test('compiled local/Netlify assets include all 3D JS, CSS and original interface',async()=>{
 const {size}=await stat('dist/site/mascot3d.js');
 assert.ok(size>12000,'actual Three.js bundle missing');
 for(const path of ['dist/site/mascot-ui.js','dist/site/mascot.css','dist/site/planetarium-theme.css',
     'dist/site/boot-intro.js','dist/site/qwen-pages.js','dist/site/voice-manager.js'])
  assert.ok((await stat(path)).size>0,path+' empty or missing');
 const staticHtml=await readFile('dist/site/index.html','utf8');
 assert.match(staticHtml,/veyro-static-preview/);
 assert.match(staticHtml,/mascot-ui\.js/);
 const worker=await readFile('dist/server/index.js','utf8');
 assert.ok(worker.includes('/mascot3d.js')||worker.includes('mascot3d.js'),'Worker is missing Three.js robot bundle');
});
