import * as THREE from 'three';
const keywords=[
 ['robot',/\b(robo|robot|androide|mascote)\b/],
 ['planet',/\b(planeta|planet|saturno|terra|orbita)\b/],
 ['rocket',/\b(foguete|rocket|nave espacial)\b/],
 ['car',/\b(carro|car|automovel|veiculo)\b/],
 ['house',/\b(casa|house|cabana)\b/],
 ['tree',/\b(arvore|tree|pinheiro)\b/],
 ['heart',/\b(coracao|heart|amor)\b/],
 ['star',/\b(estrela|star)\b/],
 ['medal',/\b(medalha|medal|trofeu|logo)\b/],
 ['cube',/\b(cubo|cube|caixa)\b/],
 ['sphere',/\b(esfera|sphere|bola)\b/],
 ['torus',/\b(anel|torus)\b/]
];
export const PRESETS=[...keywords.map(x=>x[0]),'abstract'];
export function infer3DPreset(prompt='',selected='auto'){
 if(PRESETS.includes(selected))return selected;
 const s=String(prompt).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return keywords.find(([name,pattern])=>pattern.test(s))?.[0]||'abstract';
}
export function create3DModel(prompt='',selected='auto',style='model',hex='#d3af69'){
 const preset=infer3DPreset(prompt,selected), group=new THREE.Group();
 group.name='Veyro 3D '+preset;
 const color=/^#[0-9a-f]{6}$/i.test(hex)?hex:'#d3af69';
 const main=new THREE.MeshStandardMaterial({color,metalness:.4,roughness:.35,transparent:style==='hologram',opacity:style==='hologram'?.8:1});
 const dark=new THREE.MeshStandardMaterial({color:0x192033,metalness:.3,roughness:.4});
 const pale=new THREE.MeshStandardMaterial({color:0xf7f3df,metalness:.25,roughness:.4});
 const glow=new THREE.MeshStandardMaterial({color:0x84dbfc,metalness:.3,roughness:.27});
 const shape=(geo,mat=main,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{
  const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);group.add(mesh);return mesh;
 };
 const box=(w,h,d,m,x,y,z)=>shape(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const ball=(r,m,x,y,z)=>shape(new THREE.SphereGeometry(r,24,16),m,x,y,z);
 const tube=(r,h,m,x,y,z)=>shape(new THREE.CylinderGeometry(r,r,h,24),m,x,y,z);
 switch(preset){
  case 'robot':
   box(1.2,1.1,.8,main,0,.2,0);box(1.5,1.08,.9,main,0,1.55,0);
   box(1.1,.35,.1,dark,0,1.64,.51);ball(.15,glow,-.35,1.67,.6);ball(.15,glow,.35,1.67,.6);
   box(.36,.84,.5,dark,-.92,.25,0);box(.36,.84,.5,dark,.92,.25,0);
   box(.4,.55,.5,dark,-.33,-.6,0);box(.4,.55,.5,dark,.33,-.6,0);
   tube(.06,.35,pale,0,2.28,0);ball(.14,glow,0,2.51,0);break;
  case 'planet':
   ball(1.2,main,0,.25,0);
   shape(new THREE.TorusGeometry(1.58,.16,12,64),pale,0,.25,0,.35,.25);break;
  case 'rocket':
   tube(.56,2.15,main,0,.15,0);
   shape(new THREE.ConeGeometry(.56,.9,24),pale,0,1.67,0);
   ball(.29,glow,0,.61,.51);
   box(.32,.88,.29,dark,-.6,-.65,0);box(.32,.88,.29,dark,.6,-.65,0);break;
  case 'car':
   box(3.1,.65,1.33,main,0,.17,0);box(1.6,.74,1.02,pale,-.2,.82,0);
   for(const x of [-1.02,1.02])for(const z of [-.72,.72])
    shape(new THREE.CylinderGeometry(.38,.38,.2,20),dark,x,-.24,z,Math.PI/2);break;
  case 'house':
   box(2.28,1.65,1.8,main,0,0,0);
   shape(new THREE.ConeGeometry(1.69,1.25,4),dark,0,1.37,0,0,Math.PI/4);
   box(.64,1,.12,dark,.4,-.33,.98);box(.53,.5,.12,glow,-.6,.2,.98);break;
  case 'tree':
   tube(.26,1.5,dark,0,-.4,0);
   shape(new THREE.ConeGeometry(1.1,1.8,20),main,0,.55,0);
   shape(new THREE.ConeGeometry(.8,1.42,20),glow,0,1.42,0);break;
  case 'heart':
  case 'star':{
   const path=new THREE.Shape();
   if(preset==='star'){
    for(let i=0;i<10;i++){
     const a=Math.PI/2+i*Math.PI/5,r=i%2?.61:1.49;
     if(!i)path.moveTo(r*Math.cos(a),r*Math.sin(a));
     else path.lineTo(r*Math.cos(a),r*Math.sin(a));
    }path.closePath();
   }else{
    path.moveTo(0,-1.25);
    path.bezierCurveTo(-.4,-.9,-1.6,.1,-1.43,.9);
    path.bezierCurveTo(-1.2,1.8,-.22,1.7,0,1.14);
    path.bezierCurveTo(.22,1.7,1.2,1.8,1.43,.9);
    path.bezierCurveTo(1.6,.1,.4,-.9,0,-1.25);
   }
   const geo=new THREE.ExtrudeGeometry(path,{depth:.48,bevelEnabled:true,bevelSegments:2,bevelSize:.1,bevelThickness:.1});
   geo.translate(0,0,-.24);shape(geo);break;
  }
  case 'medal':
   shape(new THREE.CylinderGeometry(1.2,1.2,.2,48),main,0,0,0,Math.PI/2);
   shape(new THREE.TorusGeometry(.99,.08,8,48),pale,0,0,.12);
   shape(new THREE.IcosahedronGeometry(.55,0),glow,0,0,.21);break;
  case 'cube': shape(new THREE.BoxGeometry(2.2,2.2,2.2),main,0,0,0,.22,.32);break;
  case 'sphere':ball(1.3,main,0,0,0);break;
  case 'torus':shape(new THREE.TorusGeometry(1.23,.35,16,64),main,0,0,0,.15,.23);break;
  default:
   shape(new THREE.IcosahedronGeometry(1.2,1),main,0,0,0,.2,.3);
   shape(new THREE.TorusGeometry(1.65,.06,8,48),glow,0,0,0,.6,.3);
 }
 if(style==='icon'&&preset!=='medal'){
  shape(new THREE.CylinderGeometry(2.1,2.1,.13,48),dark,0,0,-1.27,Math.PI/2);
  shape(new THREE.TorusGeometry(1.98,.05,8,48),pale,0,0,-1.19);
 }
 return {group,preset};
}
