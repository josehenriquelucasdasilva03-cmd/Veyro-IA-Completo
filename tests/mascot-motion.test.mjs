import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTIONS,poseAt,stepPose,shortestAngle,clamp} from '../src/frontend/components/mascot-motion.js';
import {readFileSync} from 'node:fs';

test('all mascot animations output finite joint positions',()=>{
 for(const name of MOTIONS){
  for(const t of [0,.1,1.5,7.3,200]){
   const pose=poseAt(name,t);
   assert.equal(Object.keys(pose).length,22);
   for(const [key,value] of Object.entries(pose))
    assert.ok(Number.isFinite(value),name+' '+key+' must be finite');
  }
 }
});
test('thinking raises right arm toward chin and changes head position',()=>{
 const idle=poseAt('idle',.3),think=poseAt('thinking',.3);
 assert.ok(think.rightZ<-.9);
 assert.notEqual(think.headZ,idle.headZ);
 assert.equal(think.questionVisible,1);
 assert.equal(idle.questionVisible,0);
});
test('talking opens mouth and typing moves both arms',()=>{
 assert.ok(poseAt('talking',.18).mouthY>poseAt('idle',.18).mouthY);
 assert.ok(Math.abs(poseAt('typing',.18).leftX)>.5);
 assert.ok(Math.abs(poseAt('typing',.18).rightX)>.5);
});
test('transition does not jump to target in a single frame',()=>{
 const start=poseAt('idle',0),target=poseAt('celebrating',.2);
 const next=stepPose(start,target,1/60);
 assert.ok(next.leftZ<0&&next.leftZ>target.leftZ);
 assert.ok(next.rightZ>0&&next.rightZ<target.rightZ);
 assert.ok(next.y>start.y&&next.y<target.y);
});
test('smoothing is close at 30fps and 60fps for a fixed target',()=>{
 const start=poseAt('idle',0),target=poseAt('waving',0);
 let coarse=start,fine=start;
 for(let i=0;i<30;i++)coarse=stepPose(coarse,target,1/30);
 for(let i=0;i<60;i++)fine=stepPose(fine,target,1/60);
 assert.ok(Math.abs(coarse.rightZ-fine.rightZ)<.00001);
});
test('shortest angle uses a forward continuation at 2pi boundary',()=>{
 assert.ok(Math.abs(shortestAngle(6.2,.05))<.2);
 assert.ok(Math.abs(shortestAngle(.05,6.2))<.2);
});
test('prefers-reduced-motion, limits and lifecycle are respected',()=>{
 assert.equal(clamp(Number.NaN,.5,1.5),.5);
 assert.equal(clamp(3,.5,1.5),1.5);
 const engine=readFileSync(new URL('../src/frontend/components/mascot3d.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/frontend/components/mascot-ui.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../src/frontend/index.html',import.meta.url),'utf8');
 assert.match(engine,/const target=poseAt\(current,reduced\?0:clock\+phase\)/);
 assert.match(engine,/if\(!reduced\)schedule\(\)/);
 assert.match(engine,/pause,resume/);
 assert.match(engine,/setSpeed\(next\)/);
 assert.match(engine,/const geometries=new Set\(\)/);
 assert.match(ui,/attributeFilter:\['data-mascot-state','data-mode'\]/);
 assert.match(ui,/tickets\[key\]\+\+/);
 assert.match(ui,/if\(auto.checked\)auto.checked=false/);
 assert.equal((html.match(/id="mascot-status"/g)||[]).length,1);
 assert.equal((html.match(/id="mascot-3d-status"/g)||[]).length,1);
 assert.match(html,/id="mascot-speed"/);
});

test('idle character visibly animates in three-dimensional poses',()=>{
 const start=poseAt('idle',0),later=poseAt('idle',.9);
 assert.ok(Math.abs(start.turn-later.turn)>.05);
 assert.ok(Math.abs(start.headZ-later.headZ)>.05);
 assert.ok(Math.abs(start.leftX-later.leftX)>.05);
 assert.ok(Math.abs(start.y-later.y)>.02);
});
test('forearms participate in the waving, thinking and typing actions',()=>{
 assert.ok(poseAt('waving',1).rightElbowX<-.8);
 assert.ok(poseAt('thinking',1).rightElbowX<-.5);
 assert.ok(poseAt('typing',1).leftElbowX<-.6);
 assert.ok(poseAt('typing',1).rightElbowX<-.6);
});
