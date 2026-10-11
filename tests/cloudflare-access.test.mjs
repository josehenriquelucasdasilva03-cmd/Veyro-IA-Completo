import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareAccessUser} from '../src/api/cloudflare-access.js';

test('identidade do Cloudflare Access gera id estável sem expor email',async()=>{
 const ctx={access:{getIdentity:async()=>({email:'Pessoa@Example.com'})}};
 const first=await cloudflareAccessUser(ctx),second=await cloudflareAccessUser(ctx);
 assert.equal(first,second);
 assert.match(first,/^cf-[a-f0-9]{64}$/);
 assert.equal(first.includes('example.com'),false);
});
test('recusa chamadas sem identidade verificada pelo Access',async()=>{
 assert.equal(await cloudflareAccessUser({}),null);
 assert.equal(await cloudflareAccessUser({access:{getIdentity:async()=>({})}}),null);
 assert.equal(await cloudflareAccessUser({access:{getIdentity:async()=>{throw Error('bad')}}}),null);
});

