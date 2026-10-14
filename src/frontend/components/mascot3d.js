import * as THREE from 'three';

const THEMES={black:{shell:0x171c25,accent:0xe8eefa},blue:{shell:0xe6ebf4,accent:0x449dff},green:{shell:0xe6ebf4,accent:0x8bdc83},red:{shell:0xe6ebf4,accent:0xff6666}};
export function createRobot(){
 const robot=new THREE.Group(),shell=new THREE.MeshStandardMaterial({color:THEMES.black.shell,metalness:.55,roughness:.32}),dark=new THREE.MeshStandardMaterial({color:0x111827,metalness:.35,roughness:.4}),accent=new THREE.MeshStandardMaterial({color:THEMES.black.accent,emissive:THEMES.black.accent,emissiveIntensity:.65});
 const sphere=new THREE.SphereGeometry(1,20,16),box=new THREE.BoxGeometry(1,1,1);
 const mesh=(geometry,material,scale,parent,position=[0,0,0])=>{const node=new THREE.Mesh(geometry,material);node.scale.set(...scale);node.position.set(...position);parent.add(node);return node;};
 const torso=mesh(sphere,shell,[.48,.62,.32],robot,[0,1.25,0]);
 const chest=mesh(box,accent,[.17,.12,.025],robot,[0,1.38,.31]);
 const head=new THREE.Group();head.position.y=2.13;robot.add(head);
 mesh(sphere,shell,[.61,.48,.43],head);
 mesh(sphere,dark,[.53,.32,.15],head,[0,-.015,.36]);
 const eyes=[-.23,.23].map(x=>mesh(sphere,accent,[.105,.125,.035],head,[x,.055,.495]));
 const mouth=mesh(box,accent,[.17,.035,.025],head,[0,-.15,.50]);
 mesh(box,dark,[.035,.2,.035],head,[0,.5,0]);mesh(sphere,accent,[.07,.07,.07],head,[0,.64,0]);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.48,1.62,0);robot.add(arm);arms.push(arm);
  mesh(sphere,dark,[.14,.14,.14],arm);
  mesh(sphere,shell,[.16,.36,.16],arm,[side*.08,-.32,0]);
  mesh(sphere,accent,[.13,.055,.14],arm,[side*.09,-.57,0]);
  mesh(sphere,shell,[.18,.18,.18],arm,[side*.09,-.71,.03]);
  const leg=new THREE.Group();leg.position.set(side*.23,.76,0);robot.add(leg);legs.push(leg);
  mesh(sphere,dark,[.13,.13,.13],leg);
  mesh(sphere,shell,[.17,.28,.17],leg,[0,-.25,0]);
  mesh(sphere,dark,[.14,.10,.14],leg,[0,-.44,0]);
  mesh(sphere,shell,[.2,.14,.29],leg,[0,-.61,.11]);
 }
 robot.userData={head,eyes,mouth,arms,legs,torso,chest,shell,accent};
 return robot;
}
export function themeRobot(robot,id){const theme=THEMES[id]||THEMES.black;robot.userData.shell.color.setHex(theme.shell);robot.userData.accent.color.setHex(theme.accent);robot.userData.accent.emissive.setHex(theme.accent);}
export function poseRobot(robot,time,state='idle',mouthPulse=0,reduced=false){
 const {head,eyes,mouth,arms,legs}=robot.userData,t=reduced?0:time;
 robot.position.y=reduced?0:Math.sin(t*1.8)*.025;robot.rotation.set(0,Math.sin(t*.7)*.06,0);
 head.rotation.set(0,Math.sin(t*.8)*.06,0);
 arms.forEach((arm,i)=>arm.rotation.set(0,0,(i===0?1:-1)*.13));legs.forEach(leg=>leg.rotation.set(0,0,0));
 const blink=!reduced&&t%5.3>5.15?.15:1;eyes.forEach(eye=>eye.scale.y=.125*blink);mouth.scale.y=.035;
 if(reduced)return;
 if(state==='dance'){
  robot.position.y=.05+Math.abs(Math.sin(t*5))*.12;robot.rotation.z=Math.sin(t*5)*.12;
  arms.forEach((arm,i)=>arm.rotation.z=(i===0?1:-1)*(1.1+Math.sin(t*5+i)*.5));
  legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*5+i*Math.PI)*.28);head.rotation.z=Math.sin(t*5)*.1;
 }else if(state==='thinking'){head.rotation.z=.13;arms[1].rotation.z=-1.6;arms[1].rotation.x=-.45;}
 else if(state==='attention'){head.rotation.x=-.1;head.rotation.z=.05;}
 else if(state==='reading'||state==='speaking'){
  head.rotation.x=Math.sin(t*3)*.035;arms[1].rotation.z=-.45-Math.sin(t*2)*.16;
  mouth.scale.y=.035+(state==='reading'?Math.max(0,mouthPulse)*.085:0);
 }else if(state==='done'){arms[1].rotation.z=-2.25+Math.sin(t*8)*.18;}
}
export function mountMascot(host){
 let renderer;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,30);camera.position.set(0,1.45,6.8);camera.lookAt(0,1.4,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x4e5267,2.6));const key=new THREE.DirectionalLight(0xffedce,3);key.position.set(3,5,4);scene.add(key);
 const rim=new THREE.DirectionalLight(0x609cff,2);rim.position.set(-3,2,-2);scene.add(rim);
 const robot=createRobot();scene.add(robot);
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.append(canvas);
 let active=false,disposed=false,frame=0,last=0,state='idle',reduced=false,pulseUntil=0,danceUntil=0;
 const resize=()=>{const {width,height}=host.getBoundingClientRect();if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);}};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function tick(now){if(!active||disposed)return;frame=requestAnimationFrame(tick);if(now-last<40)return;last=now;
  const action=now<danceUntil&&state==='idle'?'dance':state;
  // Word timing when available; approximate jaw movement for audio engines without boundaries.
  const pulse=pulseUntil?Math.max(0,(pulseUntil-now)/180):state==='reading'?.35+Math.abs(Math.sin(now*.018))*.45:0;
  poseRobot(robot,now/1000,action,pulse,reduced);renderer.render(scene,camera);
 }
 return {
  update({id,state:next,reducedMotion=false}){themeRobot(robot,id);state=next||'idle';reduced=reducedMotion;if(state!=='reading')pulseUntil=0;poseRobot(robot,performance.now()/1000,state,0,reduced);renderer.render(scene,camera);},
  word(){pulseUntil=performance.now()+180;},dance(){danceUntil=performance.now()+6000;},
  setActive(value){const next=Boolean(value);if(next===active||disposed)return;active=next;if(active)frame=requestAnimationFrame(tick);else cancelAnimationFrame(frame);},
  dispose(){if(disposed)return;disposed=true;active=false;cancelAnimationFrame(frame);observer.disconnect();const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)materials.add(node.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();canvas.remove();}
 };
}
