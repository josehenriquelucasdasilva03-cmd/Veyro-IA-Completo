import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
export {infer3DPreset,create3DModel,PRESETS} from './model3d-shapes.js';

export async function createPhotoRelief(file){
 if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>5*1024*1024)
  throw Error('Envie PNG, JPG ou WEBP com até 5 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<2||bitmap.height<2||bitmap.width*bitmap.height>16000000)
   throw Error('A imagem precisa ter no máximo 16 megapixels.');
  const ratio=bitmap.width/bitmap.height;
  const width=ratio>1?3.8:3.8*ratio,height=ratio>1?3.8/ratio:3.8;
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(2,Math.round(256*Math.min(1,ratio)));
  canvas.height=Math.max(2,Math.round(256*Math.min(1,1/ratio)));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Canvas 2D indisponível.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const geometry=new THREE.PlaneGeometry(width,height,64,64),positions=geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const x=Math.max(0,Math.min(canvas.width-1,Math.round((positions.getX(i)/width+.5)*(canvas.width-1))));
   const y=Math.max(0,Math.min(canvas.height-1,Math.round((.5-positions.getY(i)/height)*(canvas.height-1))));
   const index=(y*canvas.width+x)*4;
   const luminosity=(data[index]*.2126+data[index+1]*.7152+data[index+2]*.0722)/255;
   positions.setZ(i,.15+luminosity*.65);
  }
  positions.needsUpdate=true;geometry.computeVertexNormals();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.7}));
  const backing=new THREE.Mesh(new THREE.BoxGeometry(width,height,.2),new THREE.MeshStandardMaterial({color:0x232635}));
  const group=new THREE.Group();group.name='Veyro 3D relevo';group.add(backing,surface);
  return {group,preset:'relevo'};
 }finally{bitmap.close?.();}
}
function disposeGroup(group){
 if(!group)return;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 group.traverse(object=>{
  if(object.geometry)geometries.add(object.geometry);
  for(const m of [].concat(object.material||[]))if(m)materials.add(m);
 });
 for(const mat of materials){
  for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);
  mat.dispose();
 }
 for(const geo of geometries)geo.dispose();
 for(const map of textures)map.dispose();
}
export function create3DStage(host){
 if(!host||!window.WebGLRenderingContext)throw Error('WebGL não está disponível.');
 const mobile=matchMedia('(max-width:800px)').matches;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:!mobile,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.5:2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
 renderer.domElement.className='model3d-canvas';
 renderer.domElement.setAttribute('aria-label','Modelo 3D interativo');
 host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,150);
 scene.add(new THREE.HemisphereLight(0xd2e6ff,0x635037,2.5));
 const a=new THREE.DirectionalLight(0xffffff,3);a.position.set(4,6,5);scene.add(a);
 const b=new THREE.DirectionalLight(0xffcf84,1.6);b.position.set(-4,2,-4);scene.add(b);
 camera.position.set(5,4,8);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.enablePan=false;controls.minDistance=1;controls.maxDistance=26;
 let current=null,active=false,disposed=false,frame=0,last=0;
 function renderSize(){
  if(disposed)return;
  const r=host.getBoundingClientRect();
  if(r.width<1||r.height<1)return;
  renderer.setSize(r.width,r.height,false);
  camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 function draw(time){
  frame=0;
  if(!active||disposed||document.hidden)return;
  if(!mobile||time-last>=33){last=time;controls.update();renderer.render(scene,camera);}
  frame=requestAnimationFrame(draw);
 }
 const observer=new ResizeObserver(renderSize);observer.observe(host);
 function setOpen(value){
  active=Boolean(value);cancelAnimationFrame(frame);frame=0;
  if(active){renderSize();frame=requestAnimationFrame(draw);}
 }
 function setModel(group){
  if(!(group instanceof THREE.Group))throw Error('Modelo 3D inválido.');
  if(current){scene.remove(current);disposeGroup(current);}
  current=group;scene.add(current);
  const box=new THREE.Box3().setFromObject(group);
  const center=box.getCenter(new THREE.Vector3());
  const size=Math.max(1,box.getSize(new THREE.Vector3()).length());
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(size*.92,size*.66,size*1.2));
  camera.lookAt(center);controls.update();renderSize();
 }
 async function exportGLB(){
  if(!current)throw Error('Crie um modelo primeiro.');
  const buffer=await new GLTFExporter().parseAsync(current,{binary:true,onlyVisible:true});
  return new Blob([buffer],{type:'model/gltf-binary'});
 }
 async function exportPNG(){
  if(!current)throw Error('Crie um modelo primeiro.');
  renderSize();renderer.render(scene,camera);
  return await new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(Error('Falha ao exportar PNG.')),'image/png'));
 }
 function dispose(){
  setOpen(false);disposed=true;observer.disconnect();controls.dispose();
  if(current){scene.remove(current);disposeGroup(current);}
  renderer.dispose();renderer.domElement.remove();
 }
 return {setOpen,setModel,exportGLB,exportPNG,dispose};
}
