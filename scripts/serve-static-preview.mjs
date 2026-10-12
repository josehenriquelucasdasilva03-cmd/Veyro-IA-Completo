// Local-only web server for automated visual tests. Not for production.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=resolve('dist/site'),port=4179;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
createServer(async(req,res)=>{
  try{
    if((req.url||'').startsWith('/api/')){
      res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({error:'Prévia estática: API não conectada.'}));return;
    }
    const url=new URL(req.url||'/','http://127.0.0.1:4179');
    const filename=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
    if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    if(!(await stat(filename)).isFile())throw Error('not file');
    const buf=await readFile(filename);
    res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(buf);
  }catch{
    res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');
  }
}).listen(port,'127.0.0.1',()=>console.log('Visual QA preview ready'));
