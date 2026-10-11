import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function makeCloudflareWorkerConfig({databaseId,modelBaseUrl}){
 const id=String(databaseId||'').trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('Defina VEYRO_D1_DATABASE_ID com o ID da base D1 de teste.');
 let endpoint;
 try{endpoint=new URL(String(modelBaseUrl||''));}catch{throw new Error('Defina VEYRO_MODEL_BASE_URL com a URL HTTPS do Ollama terminando em /v1.');}
 while(endpoint.pathname.endsWith('/'))endpoint.pathname=endpoint.pathname.slice(0,-1);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!endpoint.pathname.endsWith('/v1'))throw new Error('VEYRO_MODEL_BASE_URL deve ser HTTPS, sem credenciais/query e apontar para /v1.');
 return {
  name:'veyroia-test',
  main:'dist/server/index.js',
  compatibility_date:'2026-10-10',
  workers_dev:true,
  vars:{
   MODEL_PROVIDER:'vast',
   MODEL_BASE_URL:endpoint.origin+endpoint.pathname,
   MODEL_NAME:'qwen3.5:35b',
   MODEL_AUTH_TYPE:'basic',
   MODEL_TIMEOUT_MS:'180000',
   VEYRO_CHAT_ENABLED:'true',
   VEYRO_AUTH_MODE:'cloudflare-access'
  },
  d1_databases:[{binding:'DB',database_name:'veyroia-test-db',database_id:id,migrations_dir:'drizzle'}],
  secrets:{required:['MODEL_BASIC_USER','MODEL_BASIC_PASSWORD']}
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const config=makeCloudflareWorkerConfig({databaseId:process.env.VEYRO_D1_DATABASE_ID,modelBaseUrl:process.env.VEYRO_MODEL_BASE_URL});
 await writeFile('wrangler.jsonc',JSON.stringify(config,null,2)+'\n',{flag:'w'});
 console.log('Configuração criada para o Worker de teste veyroia-test; nenhum segredo foi gravado.');
}

