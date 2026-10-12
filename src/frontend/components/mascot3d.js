import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const PALETTES={black:{body:0x202329,trim:0x737983,glow:0xffffff},blue:{body:0xeef4ff,trim:0x298cf6,glow:0x67c7ff},green:{body:0xf5fff9,trim:0x48bc82,glow:0x8bffb9},red:{body:0xfff5f3,trim:0xf05855,glow:0xffa18d}};
const actions=['idle','thinking','typing','dancing','celebrating','waving','walking','sleeping','surprised','talking','spinning'];
export {actions};
export function createMascot(host,{character='black',action='idle',scale=1}={}){
 if(!host||!PALETTES[character])throw Error('Mascote inválido');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,100);
 camera.position.set(0,1.8,7.4);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x454c66,2));
 const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,5);scene.add(light);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.6;controls.maxPolarAngle=2.1;controls.target.set(0,1.2,0);controls.update();
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
 const arms=[];
 for(const sign of [-1,1]){const pivot=new THREE.Group();pivot.position.set(sign*.67,1.4,0);root.add(pivot);mesh(pivot,sphere,body,[sign*.16,-.29,0],[.23,.43,.23]);mesh(pivot,sphere,trim,[sign*.19,-.63,.04],[.23,.22,.23]);arms.push(pivot);}
 const legs=[];
 for(const sign of [-1,1]){const pivot=new THREE.Group();pivot.position.set(sign*.31,.42,0);root.add(pivot);mesh(pivot,sphere,shadow,[0,-.2,0],[.23,.34,.23]);mesh(pivot,sphere,trim,[0,-.44,.12],[.28,.14,.38]);legs.push(pivot);}
 const question=mesh(root,new THREE.TorusGeometry(.2,.05,8,28,Math.PI*1.55),trim,[.85,2.7,0],[1,1,1]);question.rotation.z=.5;
 const dot=mesh(root,sphere,trim,[.98,2.35,0],[.06,.06,.06]);
 const glow=new THREE.PointLight(palette.glow,1,3);glow.position.set(0,2.5,1);scene.add(glow);
 let current=actions.includes(action)?action:'idle',desiredScale=scale,frame=0,last=0,disposed=false;
 const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function render(ms){if(disposed)return;frame=requestAnimationFrame(render);if(document.hidden||!host.isConnected||host.offsetParent===null)return;
 const t=ms/1000,dt=Math.min((ms-last)/1000,.05);last=ms;const a=reduced?'idle':current;const wave=Math.sin(t*3),quick=Math.sin(t*8);
 root.scale.setScalar(desiredScale);root.position.y=0;root.rotation.y=0;head.rotation.set(0,0,0);
 arms[0].rotation.set(0,0,0);arms[1].rotation.set(0,0,0);legs[0].rotation.x=0;legs[1].rotation.x=0;
 leftEye.scale.y=.16;rightEye.scale.y=.16;mouth.scale.y=.035;mouth.scale.x=.17;
 question.visible=a==='thinking';dot.visible=a==='thinking';
 if(a==='thinking'){head.rotation.z=-.16;head.rotation.y=.16;arms[1].rotation.z=1.55;arms[1].rotation.x=-.85;question.position.y=2.7+.09*wave;dot.position.y=2.35+.09*wave;}
 else if(a==='typing'){arms[0].rotation.x=-.9+.15*quick;arms[1].rotation.x=-.9-.15*quick;head.rotation.x=.09;}
 else if(a==='dancing'){root.position.y=.12+Math.abs(wave)*.18;root.rotation.y=.28*Math.sin(t*2);arms[0].rotation.z=-.65+.5*wave;arms[1].rotation.z=.65+.5*wave;legs[0].rotation.x=.35*wave;legs[1].rotation.x=-.35*wave;}
 else if(a==='celebrating'){root.position.y=Math.abs(wave)*.23;arms[0].rotation.z=-2.4;arms[1].rotation.z=2.4;}
 else if(a==='waving'){arms[1].rotation.z=2.3;arms[1].rotation.x=.5*wave;}
 else if(a==='walking'){root.position.y=Math.abs(wave)*.06;arms[0].rotation.x=.4*wave;arms[1].rotation.x=-.4*wave;legs[0].rotation.x=-.4*wave;legs[1].rotation.x=.4*wave;}
 else if(a==='sleeping'){head.rotation.z=-.24;leftEye.scale.y=.025;rightEye.scale.y=.025;root.position.y=-.12;}
 else if(a==='surprised'){arms[0].rotation.z=-.7;arms[1].rotation.z=.7;mouth.scale.x=.07;mouth.scale.y=.12;}
 else if(a==='talking'){mouth.scale.y=.035+Math.abs(quick)*.09;arms[1].rotation.z=.4+.2*wave;head.rotation.y=.09*wave;}
 else if(a==='spinning'){root.rotation.y=t*1.5;}
 else{root.position.y=.025*wave;head.rotation.y=.08*Math.sin(t*.6);}
 if(a!=='sleeping'&&Math.sin(t*.7)>.992){leftEye.scale.y=.02;rightEye.scale.y=.02;}
 controls.update();renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(render);
 return {setAction(next){if(actions.includes(next))current=next;},setScale(next){desiredScale=Math.max(.7,Math.min(1.3,Number(next)||1));},getAction(){return current;},dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();scene.traverse(o=>{if(o.isMesh)o.geometry.dispose();});materialList.forEach(m=>m.dispose());renderer.domElement.remove();}};
}
