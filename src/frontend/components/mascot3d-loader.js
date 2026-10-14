/* One articulated 3D character for the conversation, never one renderer per message. */
(()=>{
 const host=document.querySelector('.mascot-hero');if(!host)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let instance=null,visible=true,disposed=false,loading=false;
 const dance=document.getElementById('mascot-dance');
 if(dance)dance.disabled=true;
 const sync=()=>{if(!instance)return;const low=document.body.dataset.voicePerformance==='economico';instance.update({id:host.dataset.mascot,state:document.body.dataset.mascotState,reducedMotion:reduced.matches||low});instance.setActive(visible&&!document.hidden&&!reduced.matches&&!low);if(dance) dance.disabled=reduced.matches||low;};
 const mutations=new MutationObserver(sync);mutations.observe(document.body,{attributes:true,attributeFilter:['data-mascot-state','data-voice-performance']});mutations.observe(host,{attributes:true,attributeFilter:['data-mascot']});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(host);
 const onWord=()=>instance?.word(),onDance=()=>instance?.dance();
 document.addEventListener('veyro-speech-word',onWord);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);dance?.addEventListener('click',onDance);
 const cleanup=()=>{disposed=true;mutations.disconnect();intersection.disconnect();document.removeEventListener('veyro-speech-word',onWord);document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);dance?.removeEventListener('click',onDance);instance?.dispose();};
 window.addEventListener('pagehide',event=>{if(event.persisted){instance?.setActive(false);}else cleanup();});window.addEventListener('pageshow',sync);
 async function load(){if(loading||disposed)return;loading=true;try{const {mountMascot}=await import('./mascot3d.js');if(disposed)return;instance=mountMascot(host);if(instance){host.classList.add('mascot-3d-ready');host.querySelector('canvas')?.addEventListener('webglcontextlost',()=>{cleanup();host.classList.remove('mascot-3d-ready');host.title='Animação 3D interrompida pelo navegador.';if(dance)dance.hidden=true;},{once:true});sync();}else if(dance)dance.hidden=true;}catch{if(dance)dance.hidden=true;host.title='Animação 3D indisponível neste navegador.';}finally{loading=false;}}
 load();
})();
