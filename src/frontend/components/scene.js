/* Veyro IA: decorative 3D-like scene, no paid WebGL renderer or network assets.
 * It is independent of authentication, chat and video rendering.
 */
(() => {
  'use strict';
  const backdrop=document.querySelector('.welcome-backdrop');
  const welcome=document.getElementById('welcome');
  if(!backdrop||!welcome||backdrop.querySelector('.veyro-cosmos-layer'))return;

  const layer=document.createElement('div');
  layer.className='veyro-cosmos-layer';
  layer.setAttribute('aria-hidden','true');
  for(const name of ['dust','far','amber','ringed','horizon']){
    const part=document.createElement('div');
    part.className='veyro-cosmos-'+name;
    if(name==='ringed'){
      const ring=document.createElement('span');
      ring.className='veyro-cosmos-ring';
      part.append(ring);
    }
    layer.append(part);
  }
  const solar=document.createElement('div');
  solar.className='veyro-solar-system';
  solar.setAttribute('aria-hidden','true');
  for(const name of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']){
    const orbit=document.createElement('div');
    orbit.className='veyro-orbit veyro-orbit-'+name;
    const runner=document.createElement('div');
    runner.className='veyro-orbit-runner';
    const planet=document.createElement('span');
    planet.className='veyro-planet veyro-planet-'+name;
    if(name==='saturn'){
      const ring=document.createElement('i');
      ring.className='veyro-saturn-ring';
      planet.append(ring);
    }
    runner.append(planet);
    orbit.append(runner);
    solar.append(orbit);
  }
  layer.append(solar);
  backdrop.append(layer);

  document.getElementById('header-options')?.addEventListener('click',()=>{
    document.getElementById('project-options')?.click();
  });

  // Parallax responds to a finger or pointer but never intercepts a tap or scroll.
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const touch=window.matchMedia('(pointer: coarse)');
  const body=document.body;
  let tx=0,ty=0,frame=0;
  const paint=()=>{
    frame=0;
    if(media.matches||!body.classList.contains('welcome-state')||document.hidden)return;
    body.style.setProperty('--veyro-near-x',(tx*21).toFixed(2)+'px');
    body.style.setProperty('--veyro-near-y',(ty*12).toFixed(2)+'px');
    body.style.setProperty('--veyro-far-x',(tx*-12).toFixed(2)+'px');
    body.style.setProperty('--veyro-far-y',(ty*-8).toFixed(2)+'px');
    body.style.setProperty('--veyro-title-rotate-x',(ty*-4).toFixed(2)+'deg');
    body.style.setProperty('--veyro-title-rotate-y',(tx*6).toFixed(2)+'deg');
  };
  function move(event){
    if(media.matches||!body.classList.contains('welcome-state'))return;
    // One gesture affects the scene; it cannot hijack scroll or text input.
    if(touch.matches&&event.pointerType==='touch'&&event.buttons===0)return;
    const rect=welcome.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    tx=Math.max(-1,Math.min(1,((event.clientX-rect.left)/rect.width-.5)*2));
    ty=Math.max(-1,Math.min(1,((event.clientY-rect.top)/rect.height-.5)*2));
    if(!frame)frame=requestAnimationFrame(paint);
  }
  function reset(){
    tx=0;ty=0;
    if(!frame)frame=requestAnimationFrame(paint);
  }
  welcome.addEventListener('pointermove',move,{passive:true});
  welcome.addEventListener('pointerleave',reset,{passive:true});
  welcome.addEventListener('pointerup',reset,{passive:true});
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)reset();});
  media.addEventListener?.('change',()=>{
    if(media.matches){
      for(const name of ['near-x','near-y','far-x','far-y','title-rotate-x','title-rotate-y']){
        body.style.removeProperty('--veyro-'+name);
      }
    }else reset();
  });
})();