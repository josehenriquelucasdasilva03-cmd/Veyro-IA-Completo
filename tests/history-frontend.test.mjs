import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('GitHub Pages bridge shares in-memory session only with owner-scoped history API',()=>{
 const bridge=read('src/frontend/components/qwen-pages.js');
 assert.match(bridge,/HISTORY_ORIGIN='https:\/\/veyro-history-test\./);
 assert.match(bridge,/async function history\(path,options=/);
 assert.match(bridge,/Authorization':'Bearer '\+token/);
 assert.match(bridge,/history\};/);
 assert.doesNotMatch(bridge,/localStorage|sessionStorage/);
});
test('conversations load and persist only after Qwen successful result',()=>{
 const app=read('src/frontend/app.js');
 assert.match(app,/await restoreSavedVeyro\(\)/);
 assert.match(app,/async function refreshSavedConversations\(\)/);
 assert.match(app,/async function activateSavedConversation\(id\)/);
 assert.match(app,/async function createSavedConversation\(\)/);
 assert.match(app,/reply\.status='COMPLETE'/);
 assert.match(app,/if\(historyAvailable&&selectedSavedConversation\)/);
 assert.match(app,/await bridge\.history\('\/api\/history\/conversations\/'\+selectedSavedConversation\+'\/turns'/);
 assert.match(app,/Conversa salva na sua conta Veyro/);
});
test('memories require explicit entry and are deletable',()=>{
 const app=read('src/frontend/app.js');
 assert.match(app,/function showSavedMemories\(\)/);
 assert.match(app,/Nova memória/);
 assert.match(app,/Guard ar memória|Guardar memória/);
 assert.match(app,/\/api\/history\/memories/);
 assert.match(app,/memoryButton\.disabled=true/);
 assert.match(app,/approvedMemories/);
 assert.match(app,/cleanHistoryOnLogout\(\)/);
});
