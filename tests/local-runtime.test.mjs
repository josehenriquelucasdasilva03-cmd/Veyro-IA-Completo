import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLocalStorage} from '../scripts/local-storage.mjs';
import worker from '../src/api/router.js';
test('local storage persists across restarts, applies migrations once and reads media ranges',async()=>{const directory=await mkdtemp(join(tmpdir(),'veyro-local-'));let store;try{
 store=await createLocalStorage(directory);const request=()=>new Request('http://127.0.0.1:4173/api/projects',{headers:{'oai-authenticated-user-id':'local-developer'}});
 const created=await worker.fetch(new Request('http://127.0.0.1:4173/api/projects',{method:'POST',headers:{'oai-authenticated-user-id':'local-developer','X-Veyro-Request':'1','Content-Type':'application/json'},body:JSON.stringify({title:'Projeto local'})}),store);assert.equal(created.status,201);
 await store.BUCKET.put('upload',new Uint8Array([1,2,3,4]));store.close();store=await createLocalStorage(directory);
 assert.equal((await(await worker.fetch(request(),store)).json())[0].title,'Projeto local');const object=await store.BUCKET.get('upload',{range:new Headers({range:'bytes=1-2'})});assert.deepEqual([...new Uint8Array(await object.arrayBuffer())],[2,3]);assert.equal(object.size,4);assert.equal(object.range.offset,1);await store.BUCKET.delete('upload');assert.equal(await store.BUCKET.get('upload'),null);
 }finally{store?.close();await rm(directory,{recursive:true,force:true});}});
