import {AppError,assert} from '../core/domain.js';
import {photoSettings} from './studio-domain.js';
import {ComfyUiImageProvider,imageReady} from './image-provider.js';
export const photoReady=imageReady;
export const readJob=j=>({...j,request:JSON.parse(j.request),outputs:JSON.parse(j.outputs)});
export async function createPhotoJob(db,env,p,user,b){
 assert(typeof b.id==='string'&&/^[a-zA-Z0-9-]{20,80}$/.test(b.id),'Pedido inválido.');
 const existing=await db.first('SELECT * FROM media_jobs WHERE id=? AND project_id=?',b.id,p.id);if(existing)return readJob(existing);
 const settings=photoSettings(b.settings),state=JSON.parse(p.state);assert(settings.prompt,'Descreva a imagem ou a alteração.');
 const scene=settings.sceneId?state.scenes.find(s=>s.id===settings.sceneId):null;assert(!settings.sceneId||scene,'Cena não encontrada.');
 let source=null;if(settings.sourceId){source=await db.first('SELECT * FROM assets WHERE id=? AND project_id=?',settings.sourceId,p.id);assert(source&&/^image\/(png|jpeg|webp)$/.test(source.mime),'Escolha uma referência JPG, PNG ou WebP deste projeto.');assert(source.size<=25*1024*1024,'A referência ultrapassa 25 MB.');}
 assert(settings.operation==='generate','O modelo local conectado cria imagens a partir de texto; edição e aprimoramento ainda não estão conectados.');assert(!source,'A geração atual é por texto. Remova a referência para continuar.');
 const request={...settings,visualStyle:state.visualStyle,characters:state.characters,constraints:state.constraints,sceneText:scene?.text||'',sourceRevision:p.revision};
 const status=photoReady(env)?'QUEUED':'WAITING',now=Date.now();
 await db.run('INSERT INTO media_jobs(id,project_id,status,request,created_at,updated_at) VALUES(?,?,?,?,?,?)',b.id,p.id,status,JSON.stringify(request),now,now);
 return readJob(await db.first('SELECT * FROM media_jobs WHERE id=?',b.id));
}
export async function runPhotoSlot(db,env,p,user,id){
 let job=await db.first('SELECT * FROM media_jobs WHERE id=? AND project_id=?',id,p.id);assert(job,'Pedido não encontrado.',404);
 if(['COMPLETE','FAILED','CANCELLED','RUNNING'].includes(job.status))return readJob(job);
 assert(photoReady(env),'Configure e inicie o ComfyUI local e habilite o gerador em .env.',503);
 const request=JSON.parse(job.request),outputs=JSON.parse(job.outputs);assert(outputs.length<request.count,'Pedido já concluído.');
 const claim=await db.run("UPDATE media_jobs SET status='RUNNING',attempt=attempt+1,updated_at=?,error=NULL WHERE id=? AND project_id=? AND status IN ('QUEUED','PARTIAL','WAITING')",Date.now(),id,p.id);if(!claim.meta.changes)return readJob(await db.first('SELECT * FROM media_jobs WHERE id=?',id));
 try{
  assert(env.BUCKET,'O armazenamento local de imagens não está disponível.',503);
  const generated=await new ComfyUiImageProvider(env).generate(request,outputs.length),assetId=crypto.randomUUID(),now=Date.now(),extension=generated.mime==='image/jpeg'?'jpg':generated.mime==='image/webp'?'webp':'png',name='veyro-'+assetId.slice(0,8)+'.'+extension,key=user+'/'+p.id+'/'+assetId;
  await env.BUCKET.put(key,generated.bytes,{httpMetadata:{contentType:generated.mime}});
  try{await db.run('INSERT INTO assets(id,project_id,name,mime,size,object_key,metadata,created_at) VALUES(?,?,?,?,?,?,?,?)',assetId,p.id,name,generated.mime,generated.bytes.byteLength,key,JSON.stringify({photoJobId:id,model:env.IMAGE_MODEL||'sdxl_lightning_4step.safetensors'}),now);}catch(e){await env.BUCKET.delete(key);throw e;}
  const next=[...outputs,{assetId,name,mime:generated.mime,size:generated.bytes.byteLength}],status=next.length>=request.count?'COMPLETE':'PARTIAL';
  await db.run('UPDATE media_jobs SET status=?,outputs=?,updated_at=?,error=NULL WHERE id=? AND project_id=?',status,JSON.stringify(next),Date.now(),id,p.id);
  return readJob(await db.first('SELECT * FROM media_jobs WHERE id=? AND project_id=?',id,p.id));
 }catch(error){
  const message=error instanceof AppError?error.message:'Não foi possível gerar a imagem. Confira ComfyUI, checkpoint e espaço disponível.';
  await db.run('UPDATE media_jobs SET status=\'FAILED\',error=?,updated_at=? WHERE id=? AND project_id=?',message,Date.now(),id,p.id);
  if(error instanceof AppError)throw error;throw new AppError(message,502);
 }
}
