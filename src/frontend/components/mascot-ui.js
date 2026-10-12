(()=>{'use strict';
 const get=id=>document.getElementById(id);
 const toggle=get('mascot-toggle'),panel=get('mascot-panel'),stage=get('mascot-stage');
 if(!toggle||!panel||!stage)return;
 const select=get('mascot-character'),action=get('mascot-action'),size=get('mascot-scale');
 const speed=get('mascot-speed'),auto=get('mascot-auto'),status=get('mascot-3d-status');
 let mascot=null,mod=null,opened=false,generation=0,manualAction=action.value,lastAutoAction='';
 const choices=['black','blue','green','red'];
 const save=()=>{try{localStorage.setItem('veyro-mascot-preferences',JSON.stringify({
  character:select.value,action:manualAction,scale:size.value,speed:speed.value,auto:auto.checked
 }));}catch{}};
 try{
  const p=JSON.parse(localStorage.getItem('veyro-mascot-preferences')||'{}');
  if(choices.includes(p.character))select.value=p.character;
  if(p.action&&Array.from(action.options).some(x=>x.value===p.action))manualAction=action.value=p.action;
  if(Number(p.scale)>=70&&Number(p.scale)<=130)size.value=p.scale;
  if(Number(p.speed)>=50&&Number(p.speed)<=150)speed.value=p.speed;
  if(typeof p.auto==='boolean')auto.checked=p.auto;
 }catch{}

 function actionFromChat(){
  const state=document.body.dataset.mascotState;
  const mapped={idle:'idle',attention:'typing',thinking:'thinking',speaking:'talking',reading:'talking',done:'celebrating'};
  if(state&&Object.hasOwn(mapped,state))return mapped[state];
  const prompt=get('prompt'),feedback=get('feedback')?.textContent||'';
  if(/respondendo|gerando|processando|aguarde/i.test(feedback))return 'thinking';
  if(prompt&&document.activeElement===prompt&&prompt.value)return 'typing';
  return 'idle';
 }
 function syncAuto(){
  if(!opened||!mascot||!auto.checked)return;
  const next=actionFromChat();
  if(next===lastAutoAction)return;
  lastAutoAction=next;mascot.setAction(next);action.value=next;
 }
 async function open({rebuild=false}={}){
  opened=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');
  const ticket=++generation;
  if(mascot&&!rebuild){mascot.resume();syncAuto();return;}
  status.textContent='Carregando motor 3D…';
  try{
   mod??=await import('./mascot3d.js');
   if(!opened||ticket!==generation)return;
   mascot?.dispose();mascot=null;
   const initial=auto.checked?actionFromChat():manualAction;
   mascot=mod.createMascot(stage,{character:select.value,action:initial,
    scale:Number(size.value)/100});
   mascot.setSpeed(Number(speed.value)/100);
   lastAutoAction='';syncAuto();
   if(document.hidden)mascot.pause();
   status.textContent='Arraste para girar. Escolha um movimento ou use as reações automáticas.';
  }catch(error){
   if(!opened||ticket!==generation)return;
   mascot?.dispose();mascot=null;
   status.textContent='Não foi possível carregar o 3D. Confira o WebGL do navegador.';
   console.warn('Veyro Mascot 3D:',error);
  }
 }
 function close(){
  opened=false;generation++;panel.hidden=true;toggle.setAttribute('aria-expanded','false');
  mascot?.dispose();mascot=null;lastAutoAction='';
 }
 toggle.addEventListener('click',()=>opened?close():open());
 get('mascot-close').addEventListener('click',close);
 select.addEventListener('change',()=>{save();if(opened)open({rebuild:true});});
 action.addEventListener('change',()=>{
  manualAction=action.value;
  if(auto.checked)auto.checked=false; // Seleção manual tem prioridade sobre o modo automático.
  save();lastAutoAction='';mascot?.setAction(manualAction);
 });
 size.addEventListener('input',()=>{save();mascot?.setScale(Number(size.value)/100);});
 speed.addEventListener('input',()=>{save();mascot?.setSpeed(Number(speed.value)/100);});
 auto.addEventListener('change',()=>{
  save();lastAutoAction='';
  if(auto.checked)syncAuto();else{action.value=manualAction;mascot?.setAction(manualAction);}
 });
 // O chat já publica data-mascot-state; observa a mudança real sem polling de 1,2s.
 const stateObserver=new MutationObserver(syncAuto);
 stateObserver.observe(document.body,{attributes:true,attributeFilter:['data-mascot-state']});
 const prompt=get('prompt');
 prompt?.addEventListener('focus',syncAuto);
 prompt?.addEventListener('blur',syncAuto);
 prompt?.addEventListener('input',syncAuto);
 document.addEventListener('visibilitychange',()=>{
  if(!mascot)return;
  if(document.hidden)mascot.pause();else{mascot.resume();syncAuto();}
 });
})();
