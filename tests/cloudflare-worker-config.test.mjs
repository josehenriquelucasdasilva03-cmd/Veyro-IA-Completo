import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCloudflareWorkerConfig} from '../scripts/prepare-cloudflare-worker.mjs';

const base={databaseId:'12345678-1234-1234-1234-123456789abc',modelBaseUrl:'https://ollama.example.test/v1'};
test('gera config somente para o Worker de teste e Qwen remoto',()=>{
 const config=makeCloudflareWorkerConfig(base);
 assert.equal(config.name,'veyroia-test');
 assert.equal(config.workers_dev,true);
 assert.equal(config.vars.MODEL_PROVIDER,'vast');
 assert.equal(config.vars.MODEL_NAME,'qwen3.5:35b');
 assert.equal(config.vars.VEYRO_AUTH_MODE,'cloudflare-access');
 assert.deepEqual(config.secrets.required,['MODEL_BASIC_USER','MODEL_BASIC_PASSWORD']);
 assert.equal(config.d1_databases[0].binding,'DB');
 assert.equal(config.d1_databases[0].database_id,base.databaseId);
 assert.equal(JSON.stringify(config).includes('MODEL_BASIC_PASSWORD='),false);
});
test('recusa endpoint inseguro ou com credenciais embutidas',()=>{
 for(const modelBaseUrl of ['http://ollama.example.test/v1','https://user:pass@ollama.example.test/v1','https://ollama.example.test/v1?token=x','https://ollama.example.test/chat/completions'])assert.throws(()=>makeCloudflareWorkerConfig({...base,modelBaseUrl}));
});
test('recusa deploy sem id da D1 de teste',()=>{
 assert.throws(()=>makeCloudflareWorkerConfig({...base,databaseId:''}),/VEYRO_D1_DATABASE_ID/);
});

