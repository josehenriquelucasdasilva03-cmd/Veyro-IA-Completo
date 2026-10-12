(()=>{'use strict';
 const get=id=>document.getElementById(id);
 const toggle=get('mascot-toggle'),panel=get('mascot-panel'),stage=get('mascot-stage');
 const hero=document.querySelector('.mascot-hero'),picker=get('mascot-picker');
 const preview=document.querySelector('.mascot-preview-portrait');
 if(!toggle||!panel||!stage||!hero)return;

 const select=get('mascot-character'),action=get('mascot-action'),size=get('mascot-scale');
 const speed=get('mascot-speed'),auto=get('mascot-auto'),status=get('mascot-3d-status');
 const available=new Set(['black','blue','green','red']);
 const normalize=name=>name==='prime'?'red':available.has(name)?name:'black';
 let enginePromise=null,opened=false,manualAction=action.value,lastAutoAction='';
 const slots={main:null,picker:null,panel:null},tickets={main:0,picker:0,panel:0};
 let mainVisible=true;

 const save=()=>{try{localStorage.setItem('veyro-mascot-preferences',JSON.stringify({
  character:select.value,action:manualAction,scale:size.value,speed:speed.value,auto:auto.checked
 }));}catch{}};
 try{
  const p=JSON.parse(localStorage.getItem('veyro-mascot-preferences')||'{}');
  if(available.has(normalize(p.character)))select.value=normalize(p.character);
  if(p.action&&Array.from(action.options).some(x=>x.value===p.action))manualAction=action.value=p.action;
  if(Number(p.scale)>=70&&Number(p.scale)<=130)size.value=p.scale;
  if(Number(p.speed)>=50&&Number(p.speed)<=150)speed.value=p.speed;
  if(typeof p.auto==='boolean')auto.checked=p.auto;
 }catch{}

 function actionFromChat(){
  const mapped={idle:'idle',attention:'typing',thinking:'thinking',
    speaking:'talking',reading:'talking',done:'celebrating'};
  const state=document.body.dataset.mascotState;
  if(state&&Object.hasOwn(mapped,state))return mapped[state];
  const input=get('prompt');
  return input&&document.activeElement===input&&input.value?'typing':'idle';
 }
 function currentAction(){return auto.checked?actionFromChat():manualAction;}
 function loadEngine(){
  if(!enginePromise)enginePromise=import('./mascot3d.js').catch(error=>{enginePromise=null;throw error;});
  return enginePromise;
 }
 function destroy(key){
  tickets[key]++;
  const old=slots[key];slots[key]=null;
  old?.instance.dispose();
  if(old?.host){
   old.host.classList.remove('veyro-3d-active');
   delete old.host.dataset.veyro3d;
  }
 }
 async function mount(key,host,character,pose='idle',interactive=false){
  if(!host||!host.isConnected)return;
  const name=normalize(character);
  const previous=slots[key];
  if(previous&&previous.host===host&&previous.character===name){
   previous.instance.setAction(pose);previous.instance.setSpeed(Number(speed.value)/100);
   previous.instance.setScale(Number(size.value)/100);
   return;
  }
  destroy(key);
  const ticket=tickets[key];
  host.dataset.veyro3d='loading';
  try{
   const module=await loadEngine();
   if(ticket!==tickets[key]||!host.isConnected)return;
   const instance=module.createMascot(host,{
    character:name,action:pose,interactive,
    scale:Number(size.value)/100,
    onReady:()=>{
     if(ticket!==tickets[key])return;
     host.classList.add('veyro-3d-active');
     host.dataset.veyro3d='animated';
    }
   });
   slots[key]={instance,host,character:name};
   instance.setSpeed(Number(speed.value)/100);
   syncVisibility();
  }catch(error){
   if(ticket!==tickets[key])return;
   host.classList.remove('veyro-3d-active');
   host.dataset.veyro3d='fallback';
   if(key==='panel')status.textContent='WebGL indisponível. A imagem 2D continua funcionando.';
   console.warn('Veyro 3D não iniciado:',error);
  }
 }
 function syncAuto(){
  const state=currentAction();
  if(state!==lastAutoAction){
   lastAutoAction=state;
   if(auto.checked)action.value=state;
  }
  slots.main?.instance.setAction(state);
  slots.panel?.instance.setAction(state);
  // Prévia sempre acena para mostrar que cada robô é realmente tridimensional.
  slots.picker?.instance.setAction('waving');
 }
 function syncVisibility(){
  const chatting=document.body.dataset.mode==='chat'&&!get('chat-view')?.hidden;
  const previewOpen=Boolean(picker?.open);
  const mainActive=chatting&&!opened&&!previewOpen&&mainVisible&&!document.hidden;
  if(slots.main){if(mainActive)slots.main.instance.resume();else slots.main.instance.pause();}
  if(slots.panel){if(opened&&!document.hidden)slots.panel.instance.resume();else slots.panel.instance.pause();}
  if(slots.picker){if(previewOpen&&!document.hidden)slots.picker.instance.resume();else slots.picker.instance.pause();}
 }
 function updateMain(){
  const chatting=document.body.dataset.mode==='chat';
  if(!chatting)return syncVisibility();
  const char=normalize(hero.dataset.mascot);
  select.value=char;
  mount('main',hero,char,currentAction(),false);
  syncAuto();
 }
 function updatePicker(){
  if(!picker?.open||!preview){destroy('picker');syncVisibility();return;}
  const char=normalize(preview.dataset.mascot||hero.dataset.mascot);
  if(opened)closePanel();
  mount('picker',preview,char,'waving',false);
  syncVisibility();
 }
 async function openPanel(){
  if(picker?.open)picker.close();
  opened=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');
  status.textContent='Carregando motor 3D…';
  await mount('panel',stage,select.value,currentAction(),true);
  if(opened&&slots.panel)status.textContent='Movimento 3D ativo. Arraste para girar e escolha um gesto.';
  syncVisibility();
 }
 function closePanel(){
  opened=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');
  destroy('panel');syncVisibility();
 }
 toggle.addEventListener('click',()=>opened?closePanel():openPanel());
 get('mascot-close').addEventListener('click',closePanel);
 select.addEventListener('change',()=>{
  select.value=normalize(select.value);save();
  if(typeof chooseMascot==='function')chooseMascot(select.value);
  updateMain();
  if(opened){destroy('panel');openPanel();}
 });
 action.addEventListener('change',()=>{
  manualAction=action.value;
  if(auto.checked)auto.checked=false; // Uma seleção manual deve continuar ativa.
  lastAutoAction='';save();syncAuto();
 });
 size.addEventListener('input',()=>{
  save();
  for(const item of Object.values(slots))item?.instance.setScale(Number(size.value)/100);
 });
 speed.addEventListener('input',()=>{
  save();
  for(const item of Object.values(slots))item?.instance.setSpeed(Number(speed.value)/100);
 });
 auto.addEventListener('change',()=>{save();lastAutoAction='';syncAuto();});
 new MutationObserver(()=>{syncAuto();syncVisibility();})
  .observe(document.body,{attributes:true,attributeFilter:['data-mascot-state','data-mode']});
 new MutationObserver(updateMain).observe(hero,{attributes:true,attributeFilter:['data-mascot']});
 if(preview)new MutationObserver(updatePicker).observe(preview,{attributes:true,attributeFilter:['data-mascot']});
 if(picker){
  new MutationObserver(updatePicker).observe(picker,{attributes:true,attributeFilter:['open']});
  picker.addEventListener('close',updatePicker);
 }
 const composer=get('prompt');
 for(const event of ['focus','blur','input'])composer?.addEventListener(event,syncAuto);
 document.addEventListener('visibilitychange',syncVisibility);
 const viewportObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  mainVisible=entries[0]?.isIntersecting??true;syncVisibility();
 },{threshold:.02}):null;
 viewportObserver?.observe(hero);
 updateMain();
})();
