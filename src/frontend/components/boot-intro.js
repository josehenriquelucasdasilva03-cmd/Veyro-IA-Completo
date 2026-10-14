/* Abertura independente: renderiza antes da API e do login, com fallback CSS. */
(()=>{
  'use strict';
  const root=document.getElementById('veyro-intro');
  if(!root)return;
  document.body.dataset.bootIntroPlayed='1';
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conserve=Boolean(navigator.connection?.saveData||(navigator.deviceMemory&&navigator.deviceMemory<=2));
  let finished=false,scene=null;
  function finish(){
    if(finished)return;
    finished=true;
    root.classList.add('veyro-entry-finished');
    root.setAttribute('aria-hidden','true');
    root.inert=true;
    document.body.dataset.veyroIntroFinished='1';
    document.dispatchEvent(new Event('veyro:intro-finished'));
    scene?.dispose();
    window.setTimeout(()=>root.remove(),700);
  }
  root.querySelector('.veyro-entry-skip')?.addEventListener('click',finish);
  // CSS auto-dismisses even if the JavaScript timer fails. Avoid trapping visitors.
  window.setTimeout(finish,reduce?850:16000);
  if(reduce||conserve||!window.WebGLRenderingContext)return;
  (async()=>{
    try{
      const {mountCosmos}=await import('./cosmos3d.js');
      if(finished)return;
      scene=mountCosmos(root.querySelector('.veyro-entry-scene'));
      if(scene){scene.setActive(true);root.classList.add('veyro-entry-webgl');}
    }catch{ /* CSS planets remain visible if WebGL fails. */ }
  })();
})();