import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MOTIONS,poseAt,stepPose,clamp} from './mascot-motion.js';
const PALETTES={black:{body:0x202329,trim:0x737983,glow:0xffffff},blue:{body:0xeef4ff,trim:0x298cf6,glow:0x67c7ff},green:{body:0xf5fff9,trim:0x48bc82,glow:0x8bffb9},red:{body:0xfff5f3,trim:0xf05855,glow:0xffa18d}};
const actions=MOTIONS;
export {actions};
export function createMascot(host,{character='black',action='idle',scale=1,interactive=true,onReady=null}={}){
 if(!host||!PALETTES[character])throw Error('Mascote inválido');
 const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
 let reduced=motionQuery.matches;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);
 camera.position.set(0,1.45,5.7);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<900?1.5:2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x454c66,2));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,5);scene.add(light);
 const controls=interactive?new OrbitControls(camera,renderer.domElement):null;if(controls){controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=!reduced;controls.dampingFactor=.08;controls.rotateSpeed=.78;controls.minPolarAngle=.6;controls.maxPolarAngle=2.1;controls.target.set(0,1.25,0);controls.update();}else camera.lookAt(0,1.25,0);
 const root=new THREE.Group();scene.add(root);
 let materialList=[];
 const mat=(color,metalness=.18)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.3,metalness});materialList.push(m);return m;};
 const palette=PALETTES[character],body=mat(palette.body,.48),trim=mat(palette.trim,.45),face=mat(0x111724),eyes=mat(palette.glow,.05),white=mat(0xffffff),shadow=mat(0x343947);
 const sphere=new THREE.SphereGeometry(1,24,16),box=new THREE.BoxGeometry(1,1,1);
 function mesh(parent,geo,material,pos,scl){const o=new THREE.Mesh(geo,material);o.position.set(...pos);o.scale.set(...scl);parent.add(o);return o;}
 const torso=mesh(root,sphere,body,[0,.95,0],[.65,.73,.44]);
 mesh(torso,sphere,trim,[0,-.25,.88],[.65,.22,.1]);
 const head=new THREE.Group();head.position.set(0,1.92,0);root.add(head);
 mesh(head,sphere,body,[0,0,0],[.76,.61,.55]);
 mesh(head,sphere,face,[0,-.01,.45],[.65,.43,.16]);
 const leftEye=mesh(head,sphere,eyes,[-.26,.06,.59],[.13,.16,.06]);
 const rightEye=mesh(head,sphere,eyes,[.26,.06,.59],[.13,.16,.06]);
 const mouth=mesh(head,sphere,eyes,[0,-.22,.6],[.17,.035,.035]);
 mesh(head,sphere,trim,[-.76,.08,0],[.13,.24,.24]);mesh(head,sphere,trim,[.76,.08,0],[.13,.24,.24]);
 const arms=[],elbows=[];
 for(const sign of [-1,1]){
  const pivot=new THREE.Group();pivot.position.set(sign*.67,1.4,0);root.add(pivot);
  mesh(pivot,sphere,body,[sign*.12,-.24,0],[.21,.32,.22]);
  const elbow=new THREE.Group();elbow.position.set(sign*.13,-.48,0);pivot.add(elbow);
  mesh(elbow,sphere,trim,[0,-.14,.02],[.2,.27,.2]);
  mesh(elbow,sphere,body,[0,-.39,.07],[.22,.14,.23]);
  arms.push(pivot);elbows.push(elbow);
 }
 const legs=[];
 for(const sign of [-1,1]){const pivot=new THREE.Group();pivot.position.set(sign*.31,.42,0);root.add(pivot);mesh(pivot,sphere,shadow,[0,-.2,0],[.23,.34,.23]);mesh(pivot,sphere,trim,[0,-.44,.12],[.28,.14,.38]);legs.push(pivot);}
 const question=mesh(root,new THREE.TorusGeometry(.2,.05,8,28,Math.PI*1.55),trim,[.85,2.7,0],[1,1,1]);question.rotation.z=.5;
 const dot=mesh(root,sphere,trim,[.98,2.35,0],[.06,.06,.06]);
 const glow=new THREE.PointLight(palette.glow,1,3);glow.position.set(0,2.5,1);scene.add(glow);
 let current=actions.includes(action)?action:'idle',desiredScale=clamp(scale,.7,1.3),speed=1;
 let frame=0,clock=0,lastPaint=0,disposed=false,paused=false,contextLost=false,ready=false,pose=poseAt('idle',0);
 // Guard RAF lifecycle: closing a panel or backgrounding the page must not burn GPU.
 const schedule=()=>{if(!disposed&&!paused&&!contextLost&&!document.hidden&&!frame)frame=requestAnimationFrame(render);};
 const onMotionChange=()=>{reduced=motionQuery.matches;if(controls)controls.enableDamping=!reduced;lastPaint=0;schedule();};
 const onContextLost=e=>{e.preventDefault();contextLost=true;ready=false;cancelAnimationFrame(frame);frame=0;};
 const onContextRestored=()=>{contextLost=false;lastPaint=0;resize();schedule();};
 renderer.domElement.addEventListener('webglcontextlost',onContextLost,false);
 renderer.domElement.addEventListener('webglcontextrestored',onContextRestored,false);
 motionQuery.addEventListener?.('change',onMotionChange);
 controls?.addEventListener('change',schedule);
 const onVisibility=()=>{if(!document.hidden){lastPaint=0;schedule();}else{cancelAnimationFrame(frame);frame=0;}};
 document.addEventListener('visibilitychange',onVisibility);
 const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);if(host.isConnected&&!paused)schedule();};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function render(ms){
  frame=0;
  if(disposed||paused||contextLost||document.hidden)return;
  if(!host.isConnected||!host.clientWidth||!host.clientHeight)return;
  const minFrameTime=1000/(innerWidth<900?30:60);
  if(!reduced&&lastPaint&&ms-lastPaint<minFrameTime-1){schedule();return;}
  const dt=lastPaint?Math.min(Math.max(0,(ms-lastPaint)/1000),.05):1/60;
  lastPaint=ms;
  if(!reduced)clock+=dt*speed;
  const phase={black:0,blue:.8,green:1.6,red:2.4}[character]||0;
  const target=poseAt(current,reduced?0:clock+phase);
  pose=reduced?target:stepPose(pose,target,dt);
  root.scale.setScalar(desiredScale);
  root.position.y=pose.y;root.rotation.y=pose.turn;root.rotation.z=pose.lean;
  head.rotation.set(pose.headX,pose.headY,pose.headZ);
  arms[0].rotation.set(pose.leftX,0,pose.leftZ);
  arms[1].rotation.set(pose.rightX,0,pose.rightZ);
  elbows[0].rotation.set(pose.leftElbowX,0,pose.leftElbowZ);
  elbows[1].rotation.set(pose.rightElbowX,0,pose.rightElbowZ);
  legs[0].rotation.x=pose.leftLegX;legs[1].rotation.x=pose.rightLegX;
  leftEye.scale.y=pose.eyeY;rightEye.scale.y=pose.eyeY;
  mouth.scale.x=pose.mouthX;mouth.scale.y=pose.mouthY;
  question.visible=pose.questionVisible>.5;dot.visible=question.visible;
  question.position.y=pose.questionY;dot.position.y=pose.dotY;
  controls?.update();
  renderer.render(scene,camera);
  if(!ready){ready=true;if(typeof onReady==='function')onReady();}
  if(!reduced)schedule();
 }
 const pause=()=>{paused=true;cancelAnimationFrame(frame);frame=0;lastPaint=0;};
 const resume=()=>{if(disposed)return;paused=false;lastPaint=0;schedule();};
 schedule();
 return {
  setAction(next){if(actions.includes(next)&&current!==next){current=next;schedule();}},
  setScale(next){desiredScale=clamp(next,.7,1.3);schedule();},
  setSpeed(next){speed=clamp(next,.5,1.5);},
  getAction(){return current;},pause,resume,
  dispose(){
   if(disposed)return;
   disposed=true;pause();observer.disconnect();
   motionQuery.removeEventListener?.('change',onMotionChange);
   document.removeEventListener('visibilitychange',onVisibility);
   renderer.domElement.removeEventListener('webglcontextlost',onContextLost);
   renderer.domElement.removeEventListener('webglcontextrestored',onContextRestored);
   controls?.removeEventListener('change',schedule);
   controls?.dispose();
   const geometries=new Set();scene.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});
   for(const geometry of geometries)geometry.dispose();
   materialList.forEach(m=>m.dispose());
   renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();
  }
 };
}
