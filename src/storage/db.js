import {assert} from '../core/domain.js';
export function database(env){assert(env.DB,'Não foi possível acessar seus projetos agora. Tente novamente.',503);const db=env.DB;return {stmt:(sql,...args)=>db.prepare(sql).bind(...args),async first(sql,...args){return db.prepare(sql).bind(...args).first();},async all(sql,...args){return (await db.prepare(sql).bind(...args).all()).results;},async run(sql,...args){return db.prepare(sql).bind(...args).run();},batch:queries=>db.batch(queries)};}
export async function own(db,id,user){const p=await db.first('SELECT * FROM projects WHERE id=? AND user_id=?',id,user);assert(p,'Projeto não encontrado.',404);return p;}
export async function projectData(db,p,user){
 const [messages,memories,versions,assets,runs,photoJobs]=await Promise.all([
 db.all('SELECT * FROM (SELECT * FROM messages WHERE project_id=? ORDER BY created_at DESC LIMIT 100) ORDER BY created_at',p.id),
 db.all("SELECT id,project_id,text,created_at,revision,scope FROM memories WHERE user_id=? AND scope!='conversation' AND (project_id=? OR project_id IS NULL) ORDER BY created_at DESC",user,p.id),
 db.all('SELECT id,label,created_at FROM versions WHERE project_id=? ORDER BY created_at DESC LIMIT 100',p.id),
 db.all('SELECT id,name,mime,size,metadata,created_at FROM assets WHERE project_id=? ORDER BY created_at',p.id),
 db.all('SELECT * FROM runs WHERE project_id=? ORDER BY created_at DESC LIMIT 15',p.id),db.all('SELECT * FROM media_jobs WHERE project_id=? ORDER BY created_at DESC LIMIT 50',p.id)]);
 return {photoJobs:photoJobs.map(j=>({...j,request:JSON.parse(j.request),outputs:JSON.parse(j.outputs)})),project:{id:p.id,title:p.title,revision:p.revision,state:JSON.parse(p.state)},messages,memories,versions,assets:assets.map(a=>({...a,metadata:JSON.parse(a.metadata)})),runs:runs.map(r=>({...r,tasks:JSON.parse(r.tasks),output:r.output?JSON.parse(r.output):null}))};
}
