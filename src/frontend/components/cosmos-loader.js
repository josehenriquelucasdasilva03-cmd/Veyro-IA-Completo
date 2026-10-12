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
  const panel=document.getElementById('panel');
  options?.addEventListener('click',()=>{
    if(!panel)return;
    if(panel.open&&panel.classList.contains('veyro-options-drawer')){
      panel.close();
      return;
    }
    panel.classList.add('veyro-options-drawer');
    document.getElementById('project-options')?.click();
  });
  panel?.addEventListener('close',()=>panel.classList.remove('veyro-options-drawer'));

  // Decorative golden particles converge towards the existing VEYRO IA letters.
  const title=document.querySelector('.welcome-title');
  if(title&&!title.querySelector('.veyro-logo-particles')){
    const particles=document.createElement('div');
    particles.className='veyro-logo-particles';
    particles.setAttribute('aria-hidden','true');
    for(let i=0;i<32;i++){
      const spark=document.createElement('i');
      const angle=(i*137.5)*Math.PI/180;
      const distance=80+(i%5)*36;
      spark.style.setProperty('--spark-x',(Math.cos(angle)*distance).toFixed(1)+'px');
      spark.style.setProperty('--spark-y',(Math.sin(angle)*distance).toFixed(1)+'px');
      spark.style.setProperty('--spark-delay',(i%9*.16).toFixed(2)+'s');
      particles.append(spark);
    }
    title.prepend(particles);
  }
  if(title&&!title.querySelector('.veyro-skip-intro')){
    const skip=document.createElement('button');
    skip.className='veyro-skip-intro';
    skip.type='button';
    skip.textContent='Pular introdução';
    skip.setAttribute('aria-label','Pular animação de abertura');
    skip.addEventListener('click',()=>{
      body.classList.remove('welcome-intro');
      body.classList.add('welcome-settled');
    });
    title.append(skip);
  }
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
