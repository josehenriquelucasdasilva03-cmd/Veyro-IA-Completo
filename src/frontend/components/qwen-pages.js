/* Browser-only bridge for the Veyro-authenticated Cloudflare Worker.
 * Enabled ONLY on the owner's official GitHub Pages origin.
 * No credentials, API keys or Worker secrets live in this source file.
 * The session is memory-only: re-authenticate after a page refresh.
 */
(()=>{
 'use strict';
 const OFFICIAL_ORIGIN='https://josehenriquelucasdasilva03-cmd.github.io';
 const WORKER_ORIGIN='https://veyro-auth-test.josehenriquelucasdasilva03.workers.dev';
 const HISTORY_ORIGIN='https://veyro-history-test.josehenriquelucasdasilva03.workers.dev';
 const enabled=location.origin===OFFICIAL_ORIGIN&&location.pathname.startsWith('/Veyro-IA-Completo/');
 let token=null,user=null;
 function errorText(value,fallback){return typeof value?.error==='string'&&value.error.length<220?value.error:fallback;}
 async function request(path,options={}){
  if(!enabled)throw Error('Esta conexão está disponível somente no GitHub Pages oficial.');
  const headers={'Content-Type':'application/json',...options.headers};
  if(token)headers.Authorization='Bearer '+token;
  let response;
  try{response=await fetch(WORKER_ORIGIN+path,{...options,mode:'cors',cache:'no-store',credentials:'omit',headers,redirect:'error'});}
  catch{throw Error('Não foi possível alcançar o Worker Veyro. Confira sua conexão e o domínio autorizado no Cloudflare.');}
  if(response.status===401&&path!=='/api/auth/login'){token=null;user=null;}
  return response;
 }
 async function readResponse(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw Error('O Worker retornou uma resposta inesperada.');
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(errorText(data,'Erro HTTP '+response.status));
  return data;
 }
 async function status(){
  if(!token)throw Error('Entre para consultar a IA.');
  return readResponse(await request('/api/qwen/status'));
 }
 async function login(username,password){
  if(!enabled)throw Error('Origem não autorizada para o login.');
  if(!/^[a-z0-9_.-]{3,32}$/.test(username))throw Error('Confira seu nome de usuário.');
  if(!password)throw Error('Digite sua senha.');
  const response=await request('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})});
  const result=await readResponse(response);
  if(!/^[0-9a-f]{64}$/.test(result.token||''))throw Error('A autenticação não retornou uma sessão válida.');
  token=result.token;user=result.username;
  try{return await status();}catch(e){token=null;user=null;throw e;}
 }
 async function logout(){
  const previous=token;token=null;user=null;
  if(!previous)return;
  try{await request('/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+previous}});}catch{}
 }
 async function history(path,options={}){
  if(!token)throw Error('Faça login antes de abrir o histórico.');
  if(!/^\/api\/history\/(?:conversations|memories)(?:\/[a-f0-9-]{36})?(?:\/turns)?$/.test(path))throw Error('Rota de histórico inválida.');
  let response;
  try{response=await fetch(HISTORY_ORIGIN+path,{
   ...options,mode:'cors',cache:'no-store',credentials:'omit',redirect:'error',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}
  });}
  catch{throw Error('Histórico temporariamente indisponível. Verifique a conexão do Worker.');}
  if(response.status===401){token=null;user=null;throw Error('Sessão expirada. Entre novamente.');}
  return readResponse(response);
 }
 async function send(message,recentMessages,onToken){
  if(!token)throw Error('Entre novamente na conta Veyro.');
  if(message.length<1||message.length>600)throw Error('Envie até 600 caracteres por vez.');
  const history=recentMessages.slice(-4).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,360)}));
  const response=await request('/api/chat/qwen',{method:'POST',body:JSON.stringify({message,recentMessages:history})});
  if(!response.ok){await readResponse(response);throw Error('O Worker recusou a mensagem.');}
  if(!(response.headers.get('content-type')||'').includes('text/event-stream')||!response.body)throw Error('A IA não retornou um fluxo de resposta.');
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer='',finished=false,tokens=0;
  try{
   for(;;){
    const {value,done}=await reader.read();
    buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
    buffer=buffer.replace(/\r/g,'');
    let boundary;
    while((boundary=buffer.indexOf('\n\n'))>=0){
     const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);
     const type=frame.split('\n').find(x=>x.startsWith('event:'))?.slice(6).trim();
     const raw=frame.split('\n').filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n');
     if(type==='done'){finished=true;continue;}
     if(type==='error'){let detail={};try{detail=JSON.parse(raw);}catch{}throw Error(errorText(detail,detail.message||'Erro ao responder.'));}
     if(type==='token'){
      let chunk;try{chunk=JSON.parse(raw)?.text;}catch{throw Error('Resposta da IA inválida.');}
      if(typeof chunk==='string'&&chunk){tokens++;onToken(chunk);}
     }
    }
    if(done)break;
   }
  }finally{reader.releaseLock();}
  if(!finished||!tokens)throw Error('A conexão terminou sem uma resposta completa do Qwen.');
 }
 window.VeyroQwenPages={enabled,connected:()=>Boolean(token),username:()=>user,login,status,send,logout,history};
})();