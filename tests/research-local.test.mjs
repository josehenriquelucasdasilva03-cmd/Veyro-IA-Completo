import test from 'node:test';
import assert from 'node:assert/strict';
import {researchConfig,serviceEndpoint} from '../src/research/web-gateway.js';

test('research services allow HTTPS or exact loopback HTTP, never arbitrary remote HTTP',()=>{
 for(const url of ['http://127.0.0.1:8081','http://localhost:8082/read','http://[::1]:8082/read','https://search.example.org'])assert.equal(serviceEndpoint(url),true,url);
 for(const url of ['http://192.168.1.2:8081','http://search.example.org','https://user:pass@example.org','file:///etc/passwd',''])assert.equal(serviceEndpoint(url),false,url);
});

test('research config is opt-in, accepts local endpoints, and requires the reader token',()=>{
 const env={VEYRO_WEB_ENABLED:'true',SEARCH_BASE_URL:'http://127.0.0.1:8081',WEB_READER_URL:'http://127.0.0.1:8082/read',WEB_READER_KEY:'a-local-secret'};
 assert.deepEqual(researchConfig(env),{search:true,reader:true});
 assert.deepEqual(researchConfig({...env,WEB_READER_KEY:''}),{search:true,reader:false});
 assert.deepEqual(researchConfig({...env,SEARCH_BASE_URL:'http://example.org'}),{search:false,reader:true});
 assert.deepEqual(researchConfig({...env,VEYRO_WEB_ENABLED:'false'}),{search:false,reader:false});
});
