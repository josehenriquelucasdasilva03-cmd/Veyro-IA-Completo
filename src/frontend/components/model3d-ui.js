(function(){'use strict';const get=id=>document.getElementById(id);const dialog=get('model3d-dialog');if(!dialog)return;async function open(){if(!dialog.open)dialog.showModal();const engine=await import('./model3d-engine.js');if(!window.veyro3DStage){window.veyro3DStage=engine.create3DStage(get('model3d-preview'));window.veyro3DStage.setModel(engine.create3DModel('robô','robot').group);}window.veyro3DStage.setOpen(true);}get('nav-3d').onclick=open;get('model3d-open').onclick=open;get('model3d-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>window.veyro3DStage?.setOpen(false));
const status=(s,bad=false)=>{get('model3d-status').textContent=s;get('model3d-status').classList.toggle('error',bad);};
get('model3d-generate').onclick=async()=>{
 try{
  await open();
  const engine=await import('./model3d-engine.js');
  const result=engine.create3DModel(get('model3d-prompt').value.slice(0,500),get('model3d-preset').value,get('model3d-style').value,get('model3d-color').value);
  window.veyro3DStage.setModel(result.group);
  window.veyro3DName=result.preset;
  status(result.preset==='abstract'?'Descrição fora do catálogo: criada escultura abstrata.':'Modelo '+result.preset+' criado.');
 }catch(e){status(e.message||'Falha ao gerar.',true);}
};
get('model3d-import').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  await open();
  const engine=await import('./model3d-engine.js');
  const result=await engine.createPhotoRelief(file);
  window.veyro3DStage.setModel(result.group);window.veyro3DName='relevo';
  status('Relevo por luminosidade gerado. Não reconstrói a profundidade real de uma foto.');
 }catch(error){status(error.message||'Falha ao carregar imagem.',true);}
 finally{e.target.value='';}
};
})();