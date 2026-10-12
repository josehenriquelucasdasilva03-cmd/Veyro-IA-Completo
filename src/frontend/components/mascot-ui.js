(()=>{'use strict';
 const get=id=>document.getElementById(id),toggle=get('mascot-toggle'),panel=get('mascot-panel'),stage=get('mascot-stage');
 if(!toggle||!panel||!stage)return;
 const select=get('mascot-character'),action=get('mascot-action'),size=get('mascot-scale'),auto=get('mascot-auto'),status=get('mascot-status');
 let mascot=null,mod=null,opened=false;
 const save=()=>{try{localStorage.setItem('veyro-mascot-preferences',JSON.stringify({character:select.value,action:action.value,scale:size.value,auto:auto.checked}));}catch{}};
 try{const p=JSON.parse(localStorage.getItem('veyro-mascot-preferences')||'{}');if(['black','blue','green','red'].includes(p.character))select.value=p.character;if(p.action&&Array.from(action.options).some(x=>x.value===p.action))action.value=p.action;if(p.scale>=70&&p.scale<=130)size.value=p.scale;if(typeof p.auto==='boolean')auto.checked=p.auto;}catch{}
 async function open(){panel.hidden=false;opened=true;toggle.setAttribute('aria-expanded','true');try{status.textContent='Carregando motor 3D…';mod??=await import('./mascot3d.js');if(!opened)return;mascot?.dispose();mascot=mod.createMascot(stage,{character:select.value,action:action.value,scale:Number(size.value)/100});status.textContent='Arraste para girar o robô. Ajuste as opções abaixo.';}catch(e){status.textContent='3D indisponível neste aparelho ou navegador.';console.warn('Mascot 3D:',e);}}
 function close(){opened=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');mascot?.dispose();mascot=null;}
 toggle.addEventListener('click',()=>opened?close():open());get('mascot-close').addEventListener('click',close);
 select.addEventListener('change',()=>{save();if(opened)open();});
 action.addEventListener('change',()=>{save();mascot?.setAction(action.value);});
 size.addEventListener('input',()=>{save();mascot?.setScale(Number(size.value)/100);});
 auto.addEventListener('change',save);
 // Observe only local UI state, without intercepting requests or altering chat logic.
 let previous='';
 setInterval(()=>{if(!opened||!auto.checked||!mascot)return;const feedback=get('feedback')?.textContent||'';const busy=!!document.querySelector('[aria-busy="true"]');const composer=get('prompt');const focused=!!composer&&document.activeElement===composer;const next=busy?'thinking':focused?'typing':/respondendo|gerando|processando|aguarde/i.test(feedback)?'thinking':'idle';if(next!==previous){previous=next;mascot.setAction(next);action.value=next;}},1200);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&mascot){mascot.dispose();mascot=null;}else if(!document.hidden&&opened)open();});
})();
