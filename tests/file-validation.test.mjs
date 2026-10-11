import test from 'node:test';
import assert from 'node:assert/strict';
import {validFileSignature} from '../src/api/file-validation.js';
import worker from '../src/api/router.js';
import {setup} from './helpers.mjs';
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/mz8AAAAASUVORK5CYII='),c=>c.charCodeAt(0));
test('media signatures reject disguised MIME types and truncated images',()=>{
 assert.equal(validFileSignature('image/png',png),true);
 assert.equal(validFileSignature('image/jpeg',png),false);
 assert.equal(validFileSignature('image/png',new Uint8Array([137,80,78,71])),false);
 assert.equal(validFileSignature('image/svg+xml',png),false);
 assert.equal(validFileSignature('video/mp4',new Uint8Array([1,2,3])),false);
});
test('API rejects fake uploads without saving them',async()=>{
 const env=setup(),u='https://veyro.test/api/',headers={'oai-authenticated-user-id':'alice','X-Veyro-Request':'1',origin:'https://veyro.test'};
 const project=await(await worker.fetch(new Request(u+'projects',{method:'POST',headers:{...headers,'content-type':'application/json'},body:'{"title":"Teste"}'}),env)).json();
 const form=new FormData();form.append('file',new File([new Uint8Array([1,2,3])],'disguised.png',{type:'image/png'}));
 const res=await worker.fetch(new Request(u+'projects/'+project.id+'/assets',{method:'POST',headers,body:form}),env);
 assert.equal(res.status,415);
 assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM assets').bind().first()).n,0);
});
test('unconfigured API rejects forged identity headers',async()=>{
 const env=setup();delete env.VEYRO_AUTH_MODE;
 const res=await worker.fetch(new Request('https://veyro.test/api/projects',{headers:{'oai-authenticated-user-id':'alice'}}),env);
 assert.equal(res.status,503);
 const local={...env,VEYRO_AUTH_MODE:'local'};
 const unsafeLocal=await worker.fetch(new Request('https://veyro.test/api/projects',{headers:{'oai-authenticated-user-id':'alice'}}),local);
 assert.equal(unsafeLocal.status,403);
 const cf={...env,VEYRO_AUTH_MODE:'cloudflare-access'};
 const denied=await worker.fetch(new Request('https://veyro.test/api/projects',{headers:{'oai-authenticated-user-id':'alice'}}),cf,{});
 assert.equal(denied.status,401);
});
