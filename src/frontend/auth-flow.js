/* Single public entry; only /api/auth/session confirms a login. */
(()=>{
'use strict';
const INTRO_MS=16000,SESSION_TIMEOUT_MS=10000,INTRO_KEY='veyro.intro.seen';
function introWasSeen(){try{return sessionStorage.getItem(INTRO_KEY)==='1';}catch{return false;}}
function markIntroSeen(){try{sessionStorage.setItem(INTRO_KEY,'1');}catch{}}
const el=id=>document.getElementById(id);
const stages=['auth-intro','auth-check','auth-login','auth-unavailable'];
let started=false,introWasShown=false,resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve;});
function stage(name){
 const gate=el('auth-gate');if(!gate)return;
 gate.hidden=false;document.body.classList.add('auth-pending');
 for(const id of stages){const n=el(id);if(n)n.hidden=(id!==name);}
}
function openApp(){el('auth-gate').hidden=true;document.body.classList.remove('auth-pending');resolveReady();}
function requireLogin(){stage('auth-login');}
function showError(){stage('auth-unavailable');}
function intro(){
 introWasShown=true;stage('auth-intro');
 if(introWasSeen())return Promise.resolve();
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){markIntroSeen();return Promise.resolve();}
 return new Promise(resolve=>{
  let done=false;const button=el('auth-skip'),timer=setTimeout(finish,INTRO_MS);
  function finish(){if(done)return;done=true;clearTimeout(timer);markIntroSeen();button?.removeEventListener('click',finish);resolve();}
  button?.addEventListener('click',finish,{once:true});
 });
}
async function verifySession(){
 stage('auth-check');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),SESSION_TIMEOUT_MS);
 try{
  const response=await fetch('/api/auth/session',{method:'GET',cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
  const type=response.headers.get('content-type')||'';
  if(response.ok&&type.includes('application/json')&&(await response.json())?.authenticated===true){openApp();return;}
  if(response.status===401||response.status===403||(response.redirected&&(response.url.includes('cloudflareaccess.com')||response.url.includes('/cdn-cgi/access/')))){requireLogin();return;}
  showError();
 }catch{showError();}finally{clearTimeout(timeout);}
}
function start(){
 if(started)return ready;started=true;
 (async()=>{await intro();await verifySession();})().catch(showError);
 return ready;
}
el('auth-retry')?.addEventListener('click',verifySession);
el('auth-retry-error')?.addEventListener('click',verifySession);
window.veyroAuth={start,requireLogin,showError,get introWasShown(){return introWasShown;}};
})();
