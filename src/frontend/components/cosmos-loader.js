/* Asynchronous loader: CSS fallback is always visible if WebGL is unavailable. */
(()=>{
  'use strict';
  const host=document.querySelector('.welcome-backdrop');
  if(!host)return;
  const body=document.body;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const conserve=Boolean(navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory<=2));
  let instance=null,loading=false;
  const fallback=document.createElement('div');
  fallback.className='veyro-cosmos-fallback';
  fallback.setAttribute('aria-hidden','true');
  host.append(fallback);
  const options=document.getElementById('header-options');
  options?.addEventListener('click',()=>document.getElementById('project-options')?.click());
  const canRun=()=>body.dataset.mode==='chat'&&body.classList.contains('welcome-state')&&!reduce.matches&&!conserve;
  async function sync(){
    if(canRun()&&!instance&&!loading){
      loading=true;
      try{
        const {mountCosmos}=await import('./cosmos3d.js');
        if(canRun()){
          instance=mountCosmos(host);
          if(instance)host.classList.add('veyro-webgl-ready');
        }
      }catch(error){console.warn('Cena 3D indisponível. Usando fundo alternativo.',error?.name||'WebGL');}
      finally{loading=false;}
    }
    instance?.setActive(canRun());
  }
  const changes=new MutationObserver(sync);
  changes.observe(body,{attributes:true,attributeFilter:['class','data-mode']});
  reduce.addEventListener?.('change',sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('pagehide',()=>{changes.disconnect();instance?.dispose();});
  sync();
})();
