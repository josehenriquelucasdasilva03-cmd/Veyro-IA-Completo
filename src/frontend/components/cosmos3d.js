/*
 * VEYRO IA: locally bundled Three.js solar system, purely decorative.
 * No remote textures, cookies, secrets or user data. Scaled for mobile hardware.
 */
import * as THREE from 'three';

/* Orbital movement is deliberately slow: planets remain recognizable in the mockup composition. */
const bodies=[
  {key:'mercury',orbit:3.8,size:.16,speed:.024,phase:1.85,colors:['#cbbeb0','#777b82','#292d36']},
  {key:'venus',orbit:4.35,size:.29,speed:.020,phase:4.35,colors:['#f5d39c','#c09b6f','#624837']},
  {key:'earth',orbit:5.35,size:.62,speed:.016,phase:3.9,colors:['#2d85ba','#276853','#153560']},
  {key:'mars',orbit:6.2,size:.45,speed:.012,phase:3.6,colors:['#de9569','#ab5737','#542c2b']},
  {key:'jupiter',orbit:8.1,size:2.05,speed:.007,phase:2.85,colors:['#e5c7a4','#b77c5e','#6d4c41']},
  {key:'saturn',orbit:9.0,size:1.48,speed:.006,phase:.04,colors:['#e1cb9e','#ab8c62','#6b5749']},
  {key:'uranus',orbit:7.3,size:.62,speed:.009,phase:5.45,colors:['#b9e1e3','#76b7c8','#315f8e']},
  {key:'neptune',orbit:8.4,size:.56,speed:.008,phase:1.0,colors:['#7297d5','#2b5fa0','#182b5f']}
];
const max=(v,a,b)=>Math.max(a,Math.min(v,b));
function seeded(seed){let n=seed|0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function textureFor(body){
  const canvas=document.createElement('canvas');
  canvas.width=384;canvas.height=192;
  const ctx=canvas.getContext('2d');
  const rng=seeded(body.key.length*67+body.key.charCodeAt(0));
  const gradient=ctx.createLinearGradient(0,0,0,192);
  for(let i=0;i<3;i++)gradient.addColorStop(i/2,body.colors[i]);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,384,192);
  if(body.key==='jupiter'||body.key==='saturn'||body.key==='venus'||body.key==='core'){
    for(let j=0;j<55;j++){
      const y=rng()*192;
      ctx.globalAlpha=.08+rng()*.32;
      ctx.fillStyle=rng()>.5?'#fff3d0':'#503c3b';
      ctx.fillRect(0,y,384,1+rng()*9);
    }
    ctx.globalAlpha=1;
    if(body.key==='jupiter'){
      ctx.fillStyle='#b86c554f';ctx.beginPath();ctx.ellipse(270,122,31,12,-.23,0,Math.PI*2);ctx.fill();
    }
    if(body.key==='core'){
      for(let i=0;i<60;i++){
        ctx.fillStyle=i%3===0?'#ca935321':'#080f1955';
        ctx.beginPath();ctx.ellipse(rng()*384,rng()*192,3+rng()*17,1+rng()*5,rng()*3,0,Math.PI*2);ctx.fill();
      }
    }
  }else if(body.key==='earth'){
    for(let i=0;i<17;i++){
      let x=rng()*384,y=rng()*192;
      ctx.fillStyle=i%3===0?'#9fc8a1':'#4b8461';
      ctx.beginPath();ctx.ellipse(x,y,6+rng()*24,3+rng()*10,rng()*3,0,Math.PI*2);ctx.fill();
    }
    for(let i=0;i<25;i++){ctx.fillStyle='#ffffff18';ctx.fillRect(rng()*384,rng()*192,10+rng()*40,1+rng()*4);}
  }else{
    for(let i=0;i<240;i++){
      ctx.fillStyle=rng()>.5?'#ffffff17':'#14101822';
      ctx.beginPath();ctx.arc(rng()*384,rng()*192,.5+rng()*3,0,Math.PI*2);ctx.fill();
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
  renderer.setPixelRatio(max(window.devicePixelRatio||1,1,mobile?1.2:1.5));
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.className='veyro-cosmos-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  host.append(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,.1,90);
  const ambient=new THREE.AmbientLight(0x8793b7,.65);
  const sun=new THREE.PointLight(0xffd49a,115,70,1.4);
  sun.position.set(3.3,5.1,8);
  scene.add(ambient,sun);
  const group=new THREE.Group();scene.add(group);
  if(mobile)group.scale.setScalar(.78);
  const extraGeometries=[];
  const extraMaterials=[];
  const hologramRings=[];
  // Fine holographic orbital lines: limited geometry for stable mobile performance.
  for(const [radius,tilt,shade] of [[3.55,.21,0xdab970],[3.8,-.18,0xd2b270]]){
    const geometry=new THREE.TorusGeometry(radius,.015,4,mobile?80:140);
    const material=new THREE.MeshBasicMaterial({
      color:shade,transparent:true,opacity:mobile?.10:.18,
      depthWrite:false,side:THREE.DoubleSide
    });
    const ring=new THREE.Mesh(geometry,material);
    ring.rotation.x=tilt;
    group.add(ring);
    hologramRings.push(ring);
    extraGeometries.push(geometry);
    extraMaterials.push(material);
  }

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

  // The large central sphere is a real textured 3D planet, not a painted orbit.
  const coreGeometry=new THREE.SphereGeometry(3.15,mobile?36:64,mobile?24:42);
  const coreTexture=textureFor({key:'core',colors:['#766047','#1b2631','#050b12']});
  const coreMaterial=new THREE.MeshStandardMaterial({map:coreTexture,roughness:.92,metalness:.02});
  const core=new THREE.Mesh(coreGeometry,coreMaterial);
  core.position.set(0,.27,-2.2);
  group.add(core);
  // Fresnel-like rim, rendered only on the edge to preserve legibility of the title.
  const atmosphereGeometry=new THREE.SphereGeometry(3.36,mobile?36:64,mobile?24:42);
  const atmosphereMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
    uniforms:{glowColor:{value:new THREE.Color(0xd7a45e)}},
    vertexShader:'varying vec3 vNormal;varying vec3 vViewDir;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vViewDir=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'uniform vec3 glowColor;varying vec3 vNormal;varying vec3 vViewDir;void main(){float rim=pow(1.0-max(dot(normalize(vNormal),normalize(vViewDir)),0.0),3.0);gl_FragColor=vec4(glowColor,rim*0.26);}'
  });
  const atmosphere=new THREE.Mesh(atmosphereGeometry,atmosphereMaterial);
  atmosphere.position.copy(core.position);
  group.add(atmosphere);

  const goldMaterial=new THREE.LineBasicMaterial({color:0xb99959,transparent:true,opacity:.075,depthWrite:false});
  const planets=[];
  for(const body of bodies){
    const points=[];
    const p=new THREE.Vector3();
    for(let i=0;i<=180;i++){
      orbitPoint(body.orbit,i/180*Math.PI*2,p);
      points.push(p.clone());
    }
    const orbitGeometry=new THREE.BufferGeometry().setFromPoints(points);
    extraGeometries.push(orbitGeometry);
    // Only two faint curves on notebooks, not eight dominant wire orbits.
    if(!mobile&&(body.key==='jupiter'||body.key==='saturn'))group.add(new THREE.LineLoop(orbitGeometry,goldMaterial));
    const geometry=new THREE.SphereGeometry(body.size,mobile?20:36,mobile?14:22);
    const map=textureFor(body);
    const mat=new THREE.MeshStandardMaterial({map,roughness:.9,metalness:.03});
    const sphere=new THREE.Mesh(geometry,mat);
    sphere.rotation.z=.18;
    group.add(sphere);
    if(body.key==='saturn'){
      const ringGeometry=new THREE.RingGeometry(body.size*1.3,body.size*2.04,mobile?60:100);
      const ringMaterial=new THREE.MeshBasicMaterial({color:0xdfc69a,side:THREE.DoubleSide,transparent:true,opacity:.73,depthWrite:false});
      const ring=new THREE.Mesh(ringGeometry,ringMaterial);
      ring.rotation.x=.66;ring.rotation.y=.25; sphere.add(ring);
    }
    planets.push({body,sphere,map,geometry});
  }

  let width=0,height=0,frame=0,active=false,desiredActive=false,disposed=false,last=0,tiltX=0,tiltY=0;
  const point=new THREE.Vector3();
  function resize(){
    if(disposed)return;
    const rect=host.getBoundingClientRect();
    const w=Math.max(rect.width,1),h=Math.max(rect.height,1);
    if(w===width&&h===height)return;
    width=w;height=h;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.position.set(0,0,w<650?25:23);
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
      sphere.rotation.y=seconds*.055;
    }
    core.rotation.y=seconds*.025;
    group.rotation.x+=(tiltX-group.rotation.x)*.055;
    group.rotation.y+=(tiltY-group.rotation.y)*.055;
    group.position.x+=((tiltY*.8)-group.position.x)*.04;
    group.position.y+=((-tiltX*.5)-group.position.y)*.04;
    hologramRings.forEach((ring,index)=>{ring.rotation.z=seconds*(index%2?-.019:.015);});
    renderer.render(scene,camera);
    if(active&&!document.hidden)frame=requestAnimationFrame(paint);
  }
  function setActive(next){
    if(disposed)return;
    desiredActive=Boolean(next);
    active=desiredActive&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!frame)frame=requestAnimationFrame(paint);
  }
  const move=event=>{
    if(!active)return;
    const rect=host.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    if(event.pointerType==='touch'&&!event.isPrimary)return;
    const px=max((event.clientX-rect.left)/rect.width-.5,-.5,.5);
    const py=max((event.clientY-rect.top)/rect.height-.5,-.5,.5);
    tiltX=py*(event.pointerType==='touch'?.3:.15);
    tiltY=px*(event.pointerType==='touch'?.4:.21);
  };
  const reset=()=>{tiltX=0;tiltY=0;};
  window.addEventListener('pointermove',move,{passive:true});
  window.addEventListener('pointerup',reset,{passive:true});
  window.addEventListener('blur',reset);
  const visibility=()=>setActive(desiredActive);
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
      extraGeometries.forEach(item=>item.dispose());
      extraMaterials.forEach(item=>item.dispose());
      coreGeometry.dispose();coreTexture.dispose();coreMaterial.dispose();
      atmosphereGeometry.dispose();atmosphereMaterial.dispose();
      goldMaterial.dispose();starsGeometry.dispose();
      renderer.dispose();renderer.domElement.remove();
    }
  };
}
