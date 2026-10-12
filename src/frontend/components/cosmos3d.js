/*
 * VEYRO IA: locally bundled Three.js solar system, purely decorative.
 * No remote textures, cookies, secrets or user data. Scaled for mobile hardware.
 */
import * as THREE from 'three';

const bodies=[
  {key:'mercury',orbit:2.5,size:.12,speed:.34,phase:2.6,colors:['#cbbeb0','#777b82','#292d36']},
  {key:'venus',orbit:3.25,size:.22,speed:.25,phase:4.6,colors:['#f5d39c','#c09b6f','#624837']},
  {key:'earth',orbit:4.1,size:.27,speed:.22,phase:2.2,colors:['#2d85ba','#276853','#153560']},
  {key:'mars',orbit:5.1,size:.19,speed:.18,phase:5.0,colors:['#de9569','#ab5737','#542c2b']},
  {key:'jupiter',orbit:6.5,size:.72,speed:.13,phase:.16,colors:['#e5c7a4','#b77c5e','#6d4c41']},
  {key:'saturn',orbit:8.0,size:.56,speed:.1,phase:2.15,colors:['#e1cb9e','#ab8c62','#6b5749']},
  {key:'uranus',orbit:9.25,size:.39,speed:.08,phase:5.55,colors:['#b9e1e3','#76b7c8','#315f8e']},
  {key:'neptune',orbit:10.4,size:.37,speed:.068,phase:3.8,colors:['#7297d5','#2b5fa0','#182b5f']}
];
const max=(v,a,b)=>Math.max(a,Math.min(v,b));
function seeded(seed){let n=seed|0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function textureFor(body){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext('2d');
  const rng=seeded(body.key.length*67+body.key.charCodeAt(0));
  const gradient=ctx.createLinearGradient(0,0,0,128);
  for(let i=0;i<3;i++)gradient.addColorStop(i/2,body.colors[i]);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,128);
  if(body.key==='jupiter'||body.key==='saturn'||body.key==='venus'){
    for(let j=0;j<35;j++){
      const y=rng()*128;
      ctx.globalAlpha=.08+rng()*.32;
      ctx.fillStyle=rng()>.5?'#fff3d0':'#503c3b';
      ctx.fillRect(0,y,256,1+rng()*7);
    }
    ctx.globalAlpha=1;
    if(body.key==='jupiter'){
      ctx.fillStyle='#b86c554f';ctx.beginPath();ctx.ellipse(186,80,21,8,-.23,0,Math.PI*2);ctx.fill();
    }
  }else if(body.key==='earth'){
    for(let i=0;i<17;i++){
      let x=rng()*260,y=rng()*130;
      ctx.fillStyle=i%3===0?'#9fc8a1':'#4b8461';
      ctx.beginPath();ctx.ellipse(x,y,6+rng()*24,3+rng()*10,rng()*3,0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<25;i++){ctx.fillStyle='#ffffff18';ctx.fillRect(rng()*256,rng()*128,10+rng()*40,1+rng()*4);}
  }else{
    for(let i=0;i<240;i++){
      ctx.fillStyle=rng()>.5?'#ffffff17':'#14101822';
      ctx.beginPath();ctx.arc(rng()*256,rng()*128,.5+rng()*3,0,Math.PI*2);ctx.fill();
    }
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;
  texture.anisotropy=2;
  return texture;
}

function orbitPoint(radius,theta,out){
  out.set(Math.cos(theta)*radius, Math.sin(theta)*radius*.47, Math.sin(theta)*radius*.28);
  return out;
}
export function mountCosmos(host){
  if(!host || !window.WebGLRenderingContext)return null;
  let renderer;
  const mobile=matchMedia('(max-width: 899px)').matches;
  try{
    renderer=new THREE.WebGLRenderer({
      alpha:true,antialias:!mobile,powerPreference:'low-power',
      preserveDrawingBuffer:false,stencil:false
    });
  }catch{ return null; }
  renderer.setPixelRatio(max(window.devicePixelRatio||1,1,1.5));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.className='veyro-cosmos-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  host.append(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,90);
  const ambient=new THREE.AmbientLight(0xc1d8ff,1.0);
  const sun=new THREE.PointLight(0xffd8a0,55,45,1.45);
  sun.position.set(-3.6,1.5,8);
  scene.add(ambient,sun);
  const group=new THREE.Group();scene.add(group);

  const starCount=mobile?125:220;
  const positions=new Float32Array(starCount*3);
  const random=seeded(9927);
  for(let i=0;i<starCount;i++){
    positions[i*3]=(random()-.5)*34;
    positions[i*3+1]=(random()-.5)*21;
    positions[i*3+2]=-6-random()*8;
  }
  const starsGeometry=new THREE.BufferGeometry();
  starsGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  group.add(new THREE.Points(starsGeometry,new THREE.PointsMaterial({
    color:0xbfd0e6,size:.025,transparent:true,opacity:.76,depthWrite:false
  })));

  const coreGeometry=new THREE.SphereGeometry(1.46,mobile?28:48,20);
  const coreMaterial=new THREE.MeshStandardMaterial({color:0x10131b,roughness:.68,metalness:.35});
  const core=new THREE.Mesh(coreGeometry,coreMaterial);
  core.position.z=-1.6;
  group.add(core);

  const goldMaterial=new THREE.LineBasicMaterial({color:0xb99959,transparent:true,opacity:.34,depthWrite:false});
  const planets=[];
  for(const body of bodies){
    const points=[];
    const p=new THREE.Vector3();
    for(let i=0;i<=180;i++){
      orbitPoint(body.orbit,i/180*Math.PI*2,p);
      points.push(p.clone());
    }
    const orbitGeometry=new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.LineLoop(orbitGeometry,goldMaterial));
    const geometry=new THREE.SphereGeometry(body.size,mobile?20:36,mobile?14:22);
    const map=textureFor(body);
    const mat=new THREE.MeshStandardMaterial({map,roughness:.9,metalness:.03});
    const sphere=new THREE.Mesh(geometry,mat);
    sphere.rotation.z=.18;
    group.add(sphere);
    if(body.key==='saturn'){
      const ringGeometry=new THREE.RingGeometry(body.size*1.32,body.size*2.05,80);
      const ringMaterial=new THREE.MeshBasicMaterial({color:0xdfc69a,side:THREE.DoubleSide,transparent:true,opacity:.73,depthWrite:false});
      const ring=new THREE.Mesh(ringGeometry,ringMaterial);
      ring.rotation.x=.66;ring.rotation.y=.25; sphere.add(ring);
    }
    planets.push({body,sphere,map,geometry});
  }

  let width=0,height=0,frame=0,active=false,disposed=false,last=0,rotationX=0,rotationY=0,tiltX=0,tiltY=0;
  const point=new THREE.Vector3();
  function resize(){
    if(disposed)return;
    const rect=host.getBoundingClientRect();
    const w=Math.max(rect.width,1),h=Math.max(rect.height,1);
    if(w===width&&h===height)return;
    width=w;height=h;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.position.set(0,0,w<650?26:23);
    camera.fov=w<650?44:42;
    camera.updateProjectionMatrix();
  }
  function paint(time){
    frame=0;
    if(disposed)return;
    if(active&&mobile&&last&&time-last<32){frame=requestAnimationFrame(paint);return;}
    last=time;
    resize();
    const seconds=time/1000;
    for(const {body,sphere} of planets){
      orbitPoint(body.orbit,body.phase+seconds*body.speed,point);
      sphere.position.copy(point);
      sphere.rotation.y=seconds*.14;
    }
    group.rotation.x+=(tiltX-group.rotation.x)*.055;
    group.rotation.y+=(tiltY-group.rotation.y)*.055;
    renderer.render(scene,camera);
    if(active&&!document.hidden)frame=requestAnimationFrame(paint);
  }
  function setActive(next){
    if(disposed)return;
    const allowed=next&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    active=Boolean(allowed);
    if(!frame)frame=requestAnimationFrame(paint);
  }
  const move=event=>{
    if(!active)return;
    const rect=host.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    rotationX=max((event.clientY-rect.top)/rect.height-.5,-.5,.5);
    rotationY=max((event.clientX-rect.left)/rect.width-.5,-.5,.5);
    tiltX=rotationX*.12;tiltY=rotationY*.18;
  };
  const reset=()=>{tiltX=0;tiltY=0;};
  window.addEventListener('pointermove',move,{passive:true});
  window.addEventListener('pointerup',reset,{passive:true});
  window.addEventListener('blur',reset);
  const visibility=()=>setActive(active&&!document.hidden);
  document.addEventListener('visibilitychange',visibility);
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  resize();
  frame=requestAnimationFrame(paint);
  return {
    setActive,
    dispose(){
      disposed=true;active=false;cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',reset);
      window.removeEventListener('blur',reset);
      document.removeEventListener('visibilitychange',visibility);
      for(const {sphere,map,geometry} of planets){
        geometry.dispose();map.dispose();sphere.material.dispose();
        for(const child of sphere.children){child.geometry.dispose();child.material.dispose();}
      }
      coreGeometry.dispose();coreMaterial.dispose();goldMaterial.dispose();starsGeometry.dispose();
      renderer.dispose();renderer.domElement.remove();
    }
  };
}
