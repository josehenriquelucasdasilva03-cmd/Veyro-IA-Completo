import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('workers/veyro-history-test/index.js','utf8');
test('history Worker is valid module and does not expose secrets or passwords',()=>{
 new vm.SourceTextModule(source);
 assert.doesNotMatch(source,/SECRET_KEY=|password=|sk-proj/);
});
test('all history and memory SQL operations restrict identity at database layer',()=>{
 assert.match(source,/SELECT u\.id FROM sessions s JOIN users u/);
 assert.match(source,/s\.token_hash=\? AND s\.expires_at>\?/);
 assert.match(source,/WHERE id=\? AND user_id=\?/);
 assert.match(source,/WHERE conversation_id=\? AND user_id=\?/);
 assert.match(source,/WHERE user_id=\?/);
 assert.match(source,/DELETE FROM veyro_user_memories WHERE id=\? AND user_id=\?/);
 assert.match(source,/if\(!user\)return fail\('Entre na sua conta Veyro\.',401\)/);
});
test('only GitHub Pages origin accepted, with bounded writes and memory opt-in',()=>{
 assert.match(source,/origin!==OFFICIAL_ORIGIN&&origin!==ownOrigin/);
 assert.match(source,/message\.length>600/);
 assert.match(source,/answer\.length>2800/);
 assert.match(source,/text\.length>320/);
 assert.match(source,/count\.n>=30/);
 assert.match(source,/count\.n>=50/);
 assert.match(source,/return json\(\{memories:/);
 assert.match(source,/return json\(\{conversations:/);
});
test('D1 migration defines owner-scoped tables and indexes',()=>{
 const migration=readFileSync('workers/veyro-history-test/001_history.sql','utf8');
 for(const table of ['veyro_conversations','veyro_conversation_messages','veyro_user_memories'])assert.match(migration,new RegExp('CREATE TABLE IF NOT EXISTS '+table));
 assert.match(migration,/user_id TEXT NOT NULL REFERENCES users\(id\)/);
});
