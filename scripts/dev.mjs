// Local preview only: never import this adapter into the production Worker.
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createLocalStorage} from './local-storage.mjs';
await import('./build.mjs');
const {default:worker}=await import('../dist/server/index.js');
const port=Number(process.env.PORT||4173);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT deve estar entre 1024 e 65535.');
const store=await createLocalStorage('.local'),jobs=new Set();
const env={...process.env,DB:store.DB,BUCKET:store.BUCKET};
const ctx={waitUntil(p){const safe=Promise.resolve(p).catch(()=>{});jobs.add(safe);safe.finally(()=>jobs.delete(safe));}};
const server=createServer(async(req,res)=>{
 try{
  if(!['localhost:'+port,'127.0.0.1:'+port].includes(req.headers.host)){res.writeHead(403);res.end('Host não permitido no modo local.');return;}
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>27*1024*1024){res.writeHead(413);res.end('Arquivo muito grande.');return;}chunks.push(chunk);}
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
  // Local identity cannot be selected by a browser header. Never use on a public host.
  headers.set('oai-authenticated-user-id','local-developer');
  const request=new Request('http://'+req.headers.host+(req.url||'/'),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,env,ctx);res.writeHead(response.status,Object.fromEntries(response.headers));
  if(req.method!=='HEAD'&&response.body){for await(const part of response.body){if(!res.write(part))await once(res,'drain');}}
  res.end();
 }catch{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"Falha no teste local. Consulte os testes e a configuração."}');}
});
server.listen(port,'127.0.0.1',()=>console.log('Veyro local: http://127.0.0.1:'+port+' — dados separados em .local/; site oficial intacto.'));
async function shutdown(){server.close();await Promise.allSettled([...jobs]);store.close();process.exit(0);}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
