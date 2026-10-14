// Veyro account-scoped history and user-approved memories.
// Shares only D1's hashed session records with veyro-auth-test.
// No username/password, signing keys, or model credentials are stored here.
const OFFICIAL_ORIGIN='https://josehenriquelucasdasilva03-cmd.github.io';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status)=>json({error:message},status);
const epoch=()=>Math.floor(Date.now()/1000);
async function authenticate(request,DB){
 const header=request.headers.get('Authorization')||'';
 if(!/^Bearer [a-f0-9]{64}$/.test(header))return null;
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(header.slice(7))));
 const hash=btoa(String.fromCharCode(...digest));
 return DB.prepare('SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(hash,epoch()).first();
}
async function payload(request){
 if(Number(request.headers.get('content-length')||0)>12000)throw Error('BODY_LIMIT');
 const text=await request.text();
 if(text.length>12000)throw Error('BODY_LIMIT');
 try{return JSON.parse(text);}catch{throw Error('BAD_JSON');}
}
const uuid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
async function own(DB,user,id){
 return DB.prepare('SELECT id,title,created_at AS createdAt,updated_at AS updatedAt FROM veyro_conversations WHERE id=? AND user_id=?').bind(id,user.id).first();
}
async function handle(request,env){
 if(!env.DB)return fail('Histórico não configurado.',503);
 const u=new URL(request.url),path=u.pathname,method=request.method;
 if(!path.startsWith('/api/history/'))return fail('Rota inexistente.',404);
 const user=await authenticate(request,env.DB);
 if(!user)return fail('Entre na sua conta Veyro.',401);
 const db=env.DB;
 if(path==='/api/history/conversations'&&method==='GET'){
  const result=await db.prepare('SELECT id,title,created_at AS createdAt,updated_at AS updatedAt FROM veyro_conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 50').bind(user.id).all();
  return json({conversations:result.results||[]});
 }
 if(path==='/api/history/conversations'&&method==='POST'){
  const count=await db.prepare('SELECT count(*) AS n FROM veyro_conversations WHERE user_id=?').bind(user.id).first();
  if(count.n>=50)return fail('Limite de 50 conversas. Exclua uma conversa antiga.',409);
  const id=crypto.randomUUID(),t=Date.now();
  await db.prepare('INSERT INTO veyro_conversations(id,user_id,title,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,user.id,'Nova conversa',t,t).run();
  return json({conversation:{id,title:'Nova conversa',createdAt:t,updatedAt:t}},201);
 }
 const conv=path.match(/^\/api\/history\/conversations\/([0-9a-f-]{36})(?:\/(turns))?$/i);
 if(conv&&uuid(conv[1])){
  const ownRow=await own(db,user,conv[1]);if(!ownRow)return fail('Conversa não encontrada.',404);
  if(method==='GET'&&!conv[2]){
   const rows=await db.prepare('SELECT id,role,text,created_at AS createdAt FROM veyro_conversation_messages WHERE conversation_id=? AND user_id=? ORDER BY created_at DESC,id DESC LIMIT 150').bind(conv[1],user.id).all();
   return json({conversation:ownRow,messages:(rows.results||[]).reverse()});
  }
  if(method==='DELETE'&&!conv[2]){
   await db.batch([
    db.prepare('DELETE FROM veyro_conversation_messages WHERE conversation_id=? AND user_id=?').bind(conv[1],user.id),
    db.prepare('DELETE FROM veyro_conversations WHERE id=? AND user_id=?').bind(conv[1],user.id)
   ]);
   return json({ok:true});
  }
  if(method==='POST'&&conv[2]==='turns'){
   const x=await payload(request);
   const message=typeof x.message==='string'?x.message.trim():'';
   const answer=typeof x.answer==='string'?x.answer.trim():'';
   const messageId=x.messageId,answerId=x.answerId;
   if(!message||message.length>600||!answer||answer.length>2800||!uuid(messageId)||!uuid(answerId)||messageId===answerId)return fail('Turno de conversa inválido.',400);
   const t=Date.now();
   const title=ownRow.title==='Nova conversa'?message.slice(0,65):ownRow.title;
   await db.batch([
    db.prepare("INSERT OR IGNORE INTO veyro_conversation_messages(id,conversation_id,user_id,role,text,created_at) VALUES(?,?,?,'user',?,?)").bind(messageId,conv[1],user.id,message,t),
    db.prepare("INSERT OR IGNORE INTO veyro_conversation_messages(id,conversation_id,user_id,role,text,created_at) VALUES(?,?,?,'assistant',?,?)").bind(answerId,conv[1],user.id,answer,t+1),
    db.prepare('UPDATE veyro_conversations SET updated_at=?,title=? WHERE id=? AND user_id=?').bind(t,title,conv[1],user.id)
   ]);
   await db.prepare('DELETE FROM veyro_conversation_messages WHERE id IN (SELECT id FROM veyro_conversation_messages WHERE conversation_id=? AND user_id=? ORDER BY created_at DESC,id DESC LIMIT -1 OFFSET 150)').bind(conv[1],user.id).run();
   return json({ok:true,title});
  }
 }
 if(path==='/api/history/memories'&&method==='GET'){
  const r=await db.prepare('SELECT id,text,created_at AS createdAt FROM veyro_user_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.id).all();
  return json({memories:r.results||[]});
 }
 if(path==='/api/history/memories'&&method==='POST'){
  const x=await payload(request);
  const text=typeof x.text==='string'?x.text.trim():'';
  if(!text||text.length>320)return fail('A memória deve ter de 1 a 320 caracteres.',400);
  const count=await db.prepare('SELECT count(*) AS n FROM veyro_user_memories WHERE user_id=?').bind(user.id).first();
  if(count.n>=30)return fail('Limite de 30 memórias. Apague uma memória antiga.',409);
  const id=crypto.randomUUID(),t=Date.now();
  await db.prepare('INSERT INTO veyro_user_memories(id,user_id,text,created_at) VALUES(?,?,?,?)').bind(id,user.id,text,t).run();
  return json({memory:{id,text,createdAt:t}},201);
 }
 const memo=path.match(/^\/api\/history\/memories\/([0-9a-f-]{36})$/i);
 if(memo&&uuid(memo[1])&&method==='DELETE'){
  const old=await db.prepare('DELETE FROM veyro_user_memories WHERE id=? AND user_id=?').bind(memo[1],user.id).run();
  return json({ok:old.meta?.changes>0});
 }
 return fail('Rota inexistente.',404);
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const ownOrigin=new URL(request.url).origin;
  if(origin&&origin!==OFFICIAL_ORIGIN&&origin!==ownOrigin)return fail('Origem não autorizada.',403);
  const headers={
   'Access-Control-Allow-Origin':origin===ownOrigin?ownOrigin:OFFICIAL_ORIGIN,
   'Access-Control-Allow-Headers':'Authorization,Content-Type',
   'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
   'Access-Control-Max-Age':'600',
   'Vary':'Origin',
   'Cache-Control':'no-store',
   'Referrer-Policy':'no-referrer',
   'X-Content-Type-Options':'nosniff'
  };
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  let response;
  try{response=await handle(request,env);}
  catch(e){
   if(e.message==='BODY_LIMIT')response=fail('Requisição muito grande.',413);
   else if(e.message==='BAD_JSON')response=fail('JSON inválido.',400);
   else{console.error('VEYRO_HISTORY_ERROR',{name:e.name});response=fail('Não foi possível acessar o histórico agora.',503);}
  }
  const final=new Headers(response.headers);for(const [k,v]of Object.entries(headers))final.set(k,v);
  return new Response(response.body,{status:response.status,headers:final});
 }
};