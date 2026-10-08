// Development-only adapters. Production continues to use the Sites DB/BUCKET bindings.
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
export async function createLocalStorage(directory,migrations='drizzle'){
 await mkdir(directory,{recursive:true});const media=join(directory,'media');await mkdir(media,{recursive:true});
 const sqlite=new DatabaseSync(join(directory,'veyro.sqlite'));
 sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS __local_migrations(name TEXT PRIMARY KEY,sha256 TEXT NOT NULL)');
 try{for(const name of (await readdir(migrations)).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await readFile(join(migrations,name),'utf8'),hash=createHash('sha256').update(sql).digest('hex'),existing=sqlite.prepare('SELECT sha256 FROM __local_migrations WHERE name=?').get(name);
  if(existing){if(existing.sha256!==hash)throw Error('Migração já aplicada foi alterada: '+name);continue;}
  sqlite.exec('BEGIN');try{sqlite.exec(sql);sqlite.prepare('INSERT INTO __local_migrations VALUES(?,?)').run(name,hash);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
 }}catch(e){sqlite.close();throw e;}
 const DB={prepare(sql){return {bind(...args){return {first:()=>sqlite.prepare(sql).get(...args)||null,all:()=>({results:sqlite.prepare(sql).all(...args)}),run:()=>({meta:sqlite.prepare(sql).run(...args)})};}};},batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const filename=key=>join(media,createHash('sha256').update(String(key)).digest('hex'));
 const BUCKET={async put(key,value){const data=value instanceof ArrayBuffer?Buffer.from(value):ArrayBuffer.isView(value)?Buffer.from(value.buffer,value.byteOffset,value.byteLength):Buffer.from(await new Response(value).arrayBuffer());const target=filename(key),tmp=target+'.'+randomUUID();await writeFile(tmp,data);await rename(tmp,target);},async delete(key){await unlink(filename(key)).catch(e=>{if(e.code!=='ENOENT')throw e;});},async get(key,options={}){let bytes;try{bytes=await readFile(filename(key));}catch(e){if(e.code==='ENOENT')return null;throw e;}const size=bytes.length,header=options.range?.get?.('range');let body=bytes,range;const m=header?.match(/^bytes=(\d*)-(\d*)$/);if(m&&(m[1]||m[2])){const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Math.min(size-1,Number(m[2])):size-1):size-1;if(start<size&&start<=end){body=bytes.subarray(start,end+1);range={offset:start,length:body.length};}}return {body,size,range,arrayBuffer:async()=>body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)};}};
 return {DB,BUCKET,close:()=>sqlite.close()};
}
