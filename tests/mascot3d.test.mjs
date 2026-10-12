import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MOTIONS} from '../src/frontend/components/mascot-motion.js';

test('mascot controls and assets are included in build',async()=>{
 const [html,build,netlify,engine]=await Promise.all([
  'src/frontend/index.html','scripts/build.mjs','scripts/build-netlify.mjs',
  'src/frontend/components/mascot3d.js'
 ].map(path=>readFile(path,'utf8')));
 for(const id of ['mascot-toggle','mascot-panel','mascot-character','mascot-action','mascot-scale','mascot-speed'])
  assert.ok(html.includes(id),id);
 for(const name of ['mascot-ui.js','mascot.css','mascot3d.js']){
  assert.ok(build.includes(name),name+' missing in worker build');
  assert.ok(netlify.includes(name),name+' missing in Netlify build');
 }
 assert.match(engine,/from '.\/mascot-motion.js'/);
 for(const name of ['idle','thinking','typing','dancing','celebrating','waving','walking','sleeping','surprised','talking','spinning'])
  assert.ok(MOTIONS.includes(name),name+' must exist in motion module');
});
