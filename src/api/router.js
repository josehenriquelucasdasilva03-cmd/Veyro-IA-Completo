import {knowledgeRoutes,embedConfig,saveMemory,forgetMemory} from '../memory/knowledge.js';
import {researchRoutes} from '../research/research.js';
import {researchConfig} from '../research/web-gateway.js';
import {conversationRoutes} from '../history/conversations.js';
import {providerConfig} from '../core/model-provider.js';
import {profileRoutes} from './profile.js';
import {photoReady,createPhotoJob,runPhotoSlot,readJob} from '../media/photo.js';
import {sourceIds,intentHint} from '../media/studio-domain.js';
import {AppError,assert,cleanState,cleanText,memoryCommand,validateProposal} from '../core/domain.js';
import {database,own,projectData} from '../storage/db.js';
import {aiReady,runCore} from '../core/orchestrator.js';
import {languageRoute} from './language.js';
import {crewAiReady} from '../agents/crewai-provider.js';
import {ttsRoute} from './tts.js';
import {ttsReady} from '../tts/provider.js';
const assets=typeof __ASSETS__==='undefined'?{}:__ASSETS__;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function body(req){assert(Number(req.headers.get('content-length')||0)<=150000,'Pedido muito grande.',413);let raw=await req.text();assert(raw.length<=150000,'Pedido muito grande.',413);try{return JSON.parse(raw);}catch{throw new AppError('Pedido inválido.');}}
async function checkFiles(db,id,state){const ids=sourceIds(state);if(!ids.length)return;const rows=await db.all('SELECT id,mime,metadata FROM assets WHERE project_id=?',id);assert(ids.every(id=>rows.some(x=>x.id===id)),'Uma referência não pertence a este projeto.');for(const clip of state.editor.clips){const a=rows.find(x=>x.id===clip.assetId);assert(a.mime.startsWith('video/'),'A timeline aceita somente vídeos.');const m=JSON.parse(a.metadata);if(m.duration)assert(clip.end<=m.duration+0.05,'O trecho ultrapassa a duração do arquivo.');}}
async function saveState(db,p,state,title,revision,label='Versão salva'){
 assert(revision===p.revision,'Este projeto mudou em outra aba. Reabra o projeto antes de salvar.',409);await checkFiles(db,p.id,state);
 const now=Date.now(),serialized=JSON.stringify(state),old=p.state;
 const result=await db.batch([
  db.stmt('INSERT INTO versions(id,project_id,label,state,created_at) SELECT ?,id,?,?,? FROM projects WHERE id=? AND revision=?',crypto.randomUUID(),label,old,now,p.id,revision),
  db.stmt('UPDATE projects SET state=?,title=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',serialized,title,now,p.id,revision)
 ]);assert(result[1].meta.changes===1,'Este projeto mudou em outra aba. Reabra o projeto.',409);
 return {revision:revision+1};
}
export default {async fetch(req,env,ctx){
 const url=new URL(req.url),path=url.pathname;
 try{
  if(!path.startsWith('/api/')){const key=path==='/'?'/index.html':path;assert(assets[key]!==undefined,'Página não encontrada.',404);if(typeof assets[key]==='object'){const a=assets[key];return new Response(Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0)),{headers:{'Content-Type':a.type,'Cache-Control':'public, max-age=86400'}});}return new Response(assets[key],{headers:{'Content-Type':key.endsWith('.js')?'text/javascript; charset=utf-8':key.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://chatgpt.com"}});}
  const user=req.headers.get('oai-authenticated-user-id');assert(user,'Entre novamente para acessar seus projetos.',401);
  if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('origin');assert(!origin||origin===url.origin,'Origem não permitida.',403);assert(req.headers.get('x-veyro-request')==='1','Pedido não permitido.',403);}
  const db=database(env);
  const tts=await ttsRoute(req,env,path);if(tts)return tts;
  const language=await languageRoute(req,env,path);if(language)return language;
  if(path==='/api/status')return json({chat:providerConfig(env).ready,chatProvider:providerConfig(env).kind,video:false,images:photoReady(env),tts:ttsReady(env),ttsProvider:env.TTS_PROVIDER||'azure',storage:Boolean(env.BUCKET),version:'0.7.0',research:researchConfig(env),agents:crewAiReady(env),embeddings:embedConfig(env).ready,knowledge:env.VEYRO_KNOWLEDGE_ENABLED==='true'});
  const conversation=await conversationRoutes(req,env,db,user,path,body,ctx);if(conversation)return conversation;
  const knowledge=await knowledgeRoutes(req,env,db,user,path,body);if(knowledge)return knowledge;
  const research=await researchRoutes(req,env,db,user,path,body);if(research)return research;
  const profile=await profileRoutes(req,env,db,user,path,body);if(profile)return profile;
  if(path==='/api/projects'){
   if(req.method==='GET')return json(await db.all('SELECT id,title,revision,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC LIMIT 100',user));
   if(req.method==='POST'){const b=await body(req),id=crypto.randomUUID(),now=Date.now();await db.run('INSERT INTO projects(id,user_id,title,state,created_at,updated_at) VALUES(?,?,?,?,?,?)',id,user,cleanText(b.title||'Novo projeto',100),JSON.stringify(cleanState()),now,now);return json({id},201);}
  }
  const match=path.match(/^\/api\/projects\/([^/]+)(?:\/(.*))?$/);assert(match,'Não encontrado.',404);const [,id,action='']=match;const p=await own(db,id,user);
  if(!action){if(req.method==='GET'){
    await db.run("UPDATE runs SET status='FAILED',error='Processamento interrompido. Reenvie o pedido.',updated_at=? WHERE project_id=? AND status IN ('RUNNING','QUEUED') AND updated_at<?",Date.now(),id,Date.now()-90000);
    await db.run("UPDATE media_jobs SET status='FAILED',error='Processamento interrompido. Resultados salvos foram preservados; verifique antes de criar outro pedido.',updated_at=? WHERE project_id=? AND status='RUNNING' AND updated_at<?",Date.now(),id,Date.now()-180000);
    return json(await projectData(db,p,user));
   }if(req.method==='PUT'){const b=await body(req);return json(await saveState(db,p,cleanState(b.state),cleanText(b.title||p.title,100),b.revision));}}
  if(action==='intent'&&req.method==='POST'){const b=await body(req);return json({tool:intentHint(cleanText(b.text))});}
  if(action==='photo-jobs'&&req.method==='POST')return json(await createPhotoJob(db,env,p,user,await body(req)),201);
  const pj=action.match(/^photo-jobs\/([^/]+)(?:\/(run|cancel))?$/);
  if(pj){const job=await db.first('SELECT * FROM media_jobs WHERE id=? AND project_id=?',pj[1],id);assert(job,'Pedido não encontrado.',404);
   if(req.method==='GET')return json(readJob(job));
   if(req.method==='POST'&&pj[2]==='run')return json(await runPhotoSlot(db,env,p,user,pj[1]));
   if(req.method==='POST'&&pj[2]==='cancel'){await db.run("UPDATE media_jobs SET status='CANCELLED',updated_at=? WHERE id=? AND status IN ('WAITING','QUEUED','PARTIAL','RUNNING')",Date.now(),job.id);return json({ok:true});}
  }
  if(action==='memories'){
   const b=await body(req);if(req.method==='POST')return json(await saveMemory(db,user,{text:b.text,scope:b.scope==='global'?'user':'project',projectId:id}),201);
   if(req.method==='DELETE'){const m=await db.first('SELECT id FROM memories WHERE id=? AND user_id=? AND (project_id=? OR project_id IS NULL)',b.id,user,id);assert(m,'Memória não encontrada.',404);await forgetMemory(db,user,b.id);return json({ok:true});}
  }
  const vm=action.match(/^versions\/([^/]+)$/);if(vm&&req.method==='GET'){const v=await db.first('SELECT * FROM versions WHERE id=? AND project_id=?',vm[1],id);assert(v,'Versão não encontrada.',404);return json({...v,state:JSON.parse(v.state)});}
  if(action==='restore'&&req.method==='POST'){const b=await body(req),v=await db.first('SELECT * FROM versions WHERE id=? AND project_id=?',b.id,id);assert(v,'Versão não encontrada.',404);return json(await saveState(db,p,cleanState(JSON.parse(v.state)),p.title,b.revision,'Antes de restaurar'));}
  if(action==='chat'&&req.method==='POST'){
   const b=await body(req);assert(['chat','plan','revise'].includes(b.mode),'Modo inválido.');const text=cleanText(b.text||'Crie uma proposta com as referências do projeto.');assert(text,'Escreva seu pedido.');assert(typeof b.requestId==='string'&&/^[a-zA-Z0-9-]{20,80}$/.test(b.requestId),'Pedido inválido.');
   const remembered=memoryCommand(text);if(remembered){const existing=await db.first('SELECT id FROM messages WHERE id=? AND project_id=?',b.requestId,id);if(!existing){const count=await db.first('SELECT count(*) AS n FROM memories WHERE user_id=?',user);assert(count.n<200,'Limite de 200 memórias.');await db.batch([db.stmt('INSERT INTO memories(id,user_id,project_id,text,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),user,id,cleanText(remembered,2000),Date.now()),db.stmt('INSERT INTO messages(id,project_id,role,text,created_at) VALUES(?,?,?,?,?)',b.requestId,id,'user',text,Date.now()),db.stmt('INSERT INTO messages(id,project_id,role,text,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),id,'notice','Memória salva neste projeto. Você pode revisá-la ou removê-la em Memórias.',Date.now()+1)]);}return json({memory:true});}
   const hint=b.mode==='chat'?intentHint(text):null;if(hint){await db.run('INSERT INTO messages(id,project_id,role,text,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),id,'user',text,Date.now());return json({tool:hint,prompt:text});}
   return json({runId:await runCore({db,env,p,user,text,mode:b.mode,requestId:b.requestId})});
  }
  if(action==='apply'&&req.method==='POST'){const b=await body(req),run=await db.first("SELECT * FROM runs WHERE id=? AND project_id=? AND status='COMPLETE'",b.id,id);assert(run?.output,'Proposta não encontrada.',404);assert(run.revision===p.revision,'O roteiro mudou depois da proposta. Peça uma nova revisão para preservar suas mudanças.',409);const state=JSON.parse(p.state),output=validateProposal(JSON.parse(run.output),state);assert(output.scenes.length,'Esta resposta não propôs cenas.');return json(await saveState(db,p,cleanState({...state,scenes:output.scenes}),p.title,b.revision,'Antes de aplicar a proposta'));}
  if(action==='cancel'&&req.method==='POST'){const b=await body(req);await db.run("UPDATE runs SET status='CANCELLED',updated_at=? WHERE id=? AND project_id=? AND status IN ('QUEUED','RUNNING','WAITING')",Date.now(),b.id,id);return json({ok:true});}
  if(action==='assets'&&req.method==='POST'){
   assert(env.BUCKET,'O armazenamento de arquivos está indisponível.',503);const length=Number(req.headers.get('content-length'));assert(!length||length<=26*1024*1024,'Cada arquivo pode ter até 25 MB.',413);
   const form=await req.formData(),file=form.get('file');assert(file&&typeof file.arrayBuffer==='function','Escolha uma foto ou vídeo.');assert(file.size>0&&file.size<=25*1024*1024,'Cada arquivo pode ter até 25 MB.',413);
   assert(/^image\/(jpeg|png|webp|gif)$|^video\/(mp4|webm|quicktime)$/.test(file.type),'Use JPG, PNG, WebP, GIF, MP4, WebM ou MOV.');
   const count=await db.first('SELECT count(*) AS n FROM assets WHERE project_id=?',id);assert(count.n<36,'Este projeto já possui 36 referências salvas. Crie outro projeto para mais arquivos.');
   const aid=crypto.randomUUID(),key=user+'/'+id+'/'+aid;let meta={};try{const m=JSON.parse(String(form.get('metadata')||'{}'));for(const k of ['width','height','duration'])if(Number.isFinite(m[k])&&m[k]>=0)meta[k]=m[k];}catch{}
   await env.BUCKET.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
   try{await db.run('INSERT INTO assets(id,project_id,name,mime,size,object_key,metadata,created_at) VALUES(?,?,?,?,?,?,?,?)',aid,id,cleanText(file.name,240),file.type,file.size,key,JSON.stringify(meta),Date.now());}catch(e){await env.BUCKET.delete(key);throw e;}
   return json({id:aid,name:file.name,mime:file.type,size:file.size,metadata:meta},201);
  }
  const am=action.match(/^assets\/([^/]+)$/);if(am&&req.method==='GET'){
   const a=await db.first('SELECT * FROM assets WHERE id=? AND project_id=?',am[1],id);assert(a&&env.BUCKET,'Arquivo não encontrado.',404);
   const object=await env.BUCKET.get(a.object_key,{range:req.headers});assert(object,'Arquivo indisponível.',404);
   const headers=new Headers({'Content-Type':a.mime,'Cache-Control':'private, max-age=3600','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});let status=200;
   if(object.range){const offset=object.range.offset??0,length=object.range.length??(object.size-offset);headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('Content-Length',String(length));status=206;}else headers.set('Content-Length',String(object.size));
   return new Response(object.body,{status,headers});
  }
  throw new AppError('Recurso não encontrado.',404);
 }catch(e){if(!(e instanceof AppError))console.error('veyro_request_failed',{path,error:e.name});return json({error:e instanceof AppError?e.message:'Não foi possível concluir. Seus dados na tela foram preservados; tente novamente.'},e.status||500);}
}};
