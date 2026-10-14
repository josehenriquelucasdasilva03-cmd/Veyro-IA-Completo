import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(p,'utf8');
test('planetarium layout is the final style, not a baked UI screenshot',async()=>{
 const [html,css,build,netlify]=await Promise.all([
  read('src/frontend/index.html'),read('src/frontend/styles/planetarium-theme.css'),
  read('scripts/build.mjs'),read('scripts/build-netlify.mjs')
 ]);
 assert.ok(html.indexOf('href="planetarium-theme.css"')>html.indexOf('href="cosmos.css"'));
 assert.match(html,/id="composer"/);
 assert.match(html,/id="chat-log"/);
 assert.match(css,/border-bottom:2px solid #dfb55f/);
 assert.match(css,/background:radial-gradient\(circle at 35% 25%/);
 assert.match(css,/\.suggestions button/);
 assert.match(build,/'\/planetarium-theme.css'/);
 assert.match(netlify,/'dist\/site\/planetarium-theme.css'/);
 assert.doesNotMatch(css,/cinematic\.webp/);
});
test('3D planets over orbital lines, performance caps and cleanup remain intact',async()=>{
 const js=await read('src/frontend/components/cosmos3d.js');
 const loader=await read('src/frontend/components/cosmos-loader.js');
 for(const planet of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'])
   assert.ok(js.includes("key:'"+planet+"'"));
 assert.match(js,/const atmosphere=new THREE.Mesh/);
 assert.match(js,/coreTexture\.dispose\(\)/);
 assert.match(js,/atmosphereGeometry\.dispose\(\)/);
 assert.match(js,/body.key==='jupiter'\|\|body.key==='saturn'/);
 assert.match(js,/mobile&&last&&time-last<32/);
 assert.match(js,/setPixelRatio\(max\(window\.devicePixelRatio/);
 assert.match(js,/pointerType==='touch'/);
 assert.match(loader,/prefers-reduced-motion/);
});
