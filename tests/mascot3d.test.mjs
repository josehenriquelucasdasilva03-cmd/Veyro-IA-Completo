import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRobot,poseRobot,themeRobot} from '../src/frontend/components/mascot3d.js';
test('robot has articulated head, arms, legs and independent theme colors',()=>{
 const robot=createRobot(),parts=robot.userData;
 assert.equal(parts.arms.length,2);assert.equal(parts.legs.length,2);assert.ok(parts.head.isGroup);
 for(const [id,color]of [['black',0xe8eefa],['blue',0x449dff],['green',0x8bdc83],['red',0xff6666]]){themeRobot(robot,id);assert.equal(parts.accent.color.getHex(),color);}
 themeRobot(robot,'invalid');assert.equal(parts.shell.color.getHex(),0x171c25);
});
test('dance moves actual joints; thinking and speech have separate poses; reduced motion is stable',()=>{
 const robot=createRobot();poseRobot(robot,1,'dance');const before=robot.userData.arms[0].rotation.z;
 poseRobot(robot,1.2,'dance');assert.notEqual(robot.userData.arms[0].rotation.z,before);assert.notEqual(robot.userData.legs[0].rotation.x,0);
 poseRobot(robot,2,'thinking');assert.equal(robot.userData.arms[1].rotation.z,-1.6);
 poseRobot(robot,2,'reading',1);assert.ok(robot.userData.mouth.scale.y>.035);
 poseRobot(robot,3,'idle');assert.equal(robot.userData.mouth.scale.y,.035);
 poseRobot(robot,10,'dance',1,true);const stable=robot.userData.arms[0].rotation.z;
 poseRobot(robot,20,'dance',1,true);assert.equal(robot.userData.arms[0].rotation.z,stable);assert.equal(robot.position.y,0);
});
test('both deploy targets include a local 3D bundle, loader and dance control',async()=>{
 const html=await readFile('dist/site/index.html','utf8');assert.match(html,/mascot3d-loader\.js/);assert.match(html,/id="mascot-dance"/);
 for(const path of ['dist/mascot3d.js','dist/site/mascot3d.js','dist/site/mascot3d-loader.js'])assert.ok((await readFile(path)).length>100);
 const loader=await readFile('src/frontend/components/mascot3d-loader.js','utf8');assert.doesNotMatch(loader,/https?:\/\//);assert.match(loader,/document.hidden/);assert.match(loader,/IntersectionObserver/);
});
