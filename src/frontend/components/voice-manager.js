/* Veyro browser voice engine: isolated from Qwen credentials and Worker endpoints.
 * Uses Web Speech only when available; never uploads conversation text.
 * Streaming utterances are queued by phrase, with explicit pause/resume/cancel.
 */
(()=>{
 'use strict';
 const synth=()=>window.speechSynthesis;
 const supported=()=>Boolean(synth()&&window.SpeechSynthesisUtterance);
 const supportedLocales=['pt-BR','en-US','es-ES','fr-FR','de-DE','it-IT','ja-JP','zh-CN'];
 let active=null, serial=0;
 const safeVoices=()=>{try{return synth()?.getVoices()||[];}catch{return [];}};
 function detectLanguage(text,preferred='pt-BR'){
  if(preferred&&preferred!=='auto')return preferred;
  if(/[\u3040-\u30ff\u3400-\u9fff]/.test(text))return /[\u3040-\u30ff]/.test(text)?'ja-JP':'zh-CN';
  const sample=' '+String(text).toLowerCase().replace(/[^a-záéíóúàãõâêôçñü ]/g,' ')+' ';
  const score=(words)=>words.reduce((n,w)=>n+(sample.includes(' '+w+' ')?1:0),0);
  const es=score(['hola','gracias','usted','puedes','para','también','estoy','quiero','porque']);
  const en=score(['hello','thanks','the','you','are','with','please','today','what','will']);
  const pt=score(['olá','obrigado','você','não','está','também','que','uma','para','com']);
  if(es>pt&&es>=2)return 'es-ES';
  if(en>pt&&en>es&&en>=2)return 'en-US';
  return 'pt-BR';
 }
 function chooseVoice(locale,name=''){
  const list=safeVoices();
  return list.find(v=>v.name===name&&v.lang?.toLowerCase().startsWith(locale.slice(0,2).toLowerCase()))
   ||list.find(v=>v.name===name)
   ||list.find(v=>v.lang?.toLowerCase()===locale.toLowerCase())
   ||list.find(v=>v.lang?.toLowerCase().startsWith(locale.slice(0,2).toLowerCase()))
   ||null;
 }
 const notify=(session,status)=>{
  if(active!==session)return;
  session.status=status;
  try{session.onState?.(status);}catch{}
 };
 function stop(){
  ++serial;
  const old=active;active=null;
  try{synth()?.cancel();}catch{}
  if(old){old.queue.length=0;old.buffer='';try{old.onState?.('stopped');}catch{}}
 }
 function create(options={}){
  if(!supported())return false;
  stop();
  const s={id:serial,queue:[],buffer:'',streaming:Boolean(options.streaming),
   finished:false,busy:false,status:'loading',onState:options.onState,
   preferred:options.lang||'pt-BR',rate:Math.min(1.5,Math.max(.65,Number(options.rate)||1)),
   pitch:Math.min(1.6,Math.max(.6,Number(options.pitch)||1)),
   voiceName:options.voiceName||'',text:'',current:null};
  active=s;notify(s,'loading');return true;
 }
 function next(session){
  if(active!==session||session.busy||session.status==='paused')return;
  const part=session.queue.shift();
  if(!part){
   if(session.finished)notify(session,'ended');
   else notify(session,'loading');
   return;
  }
  const u=new window.SpeechSynthesisUtterance(part);
  session.busy=true;session.current=u;
  u.lang=detectLanguage(part,session.preferred);
  u.rate=session.rate;u.pitch=session.pitch;
  const voice=chooseVoice(u.lang,session.voiceName);
  if(voice)u.voice=voice;
  u.onstart=()=>notify(session,'playing');
  u.onend=()=>{
   if(active!==session)return;
   session.busy=false;session.current=null;
   next(session);
  };
  u.onerror=(event)=>{
   if(active!==session)return;
   session.busy=false;session.current=null;
   if(event.error==='canceled'||event.error==='interrupted')return;
   notify(session,'error');
   session.queue.length=0;session.finished=true;
  };
  try{synth().speak(u);}catch{notify(session,'error');session.busy=false;}
 }
 function takeChunks(session,flush){
  const max=175;
  while(session.buffer.length){
   let end=-1;
   const windowText=session.buffer.slice(0,max);
   const sentence=/[.!?。！？;:](?:\s|$)/g;
   for(const m of windowText.matchAll(sentence))if(m.index>=20)end=m.index+1;
   if(end<0&&session.buffer.length>max){
    end=windowText.lastIndexOf(' ',max-1);
    if(end<40)end=max;
   }
   if(end<0&&flush)end=Math.min(session.buffer.length,max);
   if(end<0)break;
   const chunk=session.buffer.slice(0,end).trim();
   session.buffer=session.buffer.slice(end).trimStart();
   if(chunk)session.queue.push(chunk);
  }
  next(session);
 }
 function pushToken(chunk){
  const s=active;
  if(!s||s.finished||typeof chunk!=='string')return;
  s.text+=chunk;s.buffer+=chunk.replace(/\s+/g,' ');
  if(s.buffer.length>4000){notify(s,'error');stop();return;}
  takeChunks(s,false);
 }
 function finish(){
  const s=active;if(!s)return;
  s.finished=true;takeChunks(s,true);
 }
 function startText(text,options={}){
  if(!create({...options,streaming:false}))return false;
  pushToken(String(text));finish();return true;
 }
 function startStream(options={}){return create({...options,streaming:true});}
 function pause(){
  if(!active||active.status==='paused'||active.status==='ended')return false;
  try{synth().pause();notify(active,'paused');return true;}catch{return false;}
 }
 function resume(){
  if(!active)return false;
  if(active.status==='paused'){
   try{synth().resume();notify(active,active.busy?'playing':'loading');if(!active.busy)next(active);return true;}catch{return false;}
  }
  return false;
 }
 window.VeyroVoice={supported,voices:safeVoices,startText,startStream,pushToken,finish,pause,resume,stop,
  status:()=>active?.status||'idle',detectLanguage,supportedLocales};
})();
