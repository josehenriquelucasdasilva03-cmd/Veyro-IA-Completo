import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('only generated static site carries preview marker; Worker source stays authenticated',()=>{
 const built=read('dist/site/index.html');
 const source=read('src/frontend/index.html');
 assert.match(built,/<meta name="veyro-static-preview" content="true">/);
 assert.doesNotMatch(source,/name="veyro-static-preview"/);
 assert.match(source,/id="composer"/);
});

test('static chat accepts user message visually without fake AI or backend calls',()=>{
 const app=read('src/frontend/app.js'),chat=read('src/frontend/components/chat.js');
 assert.match(app,/const IS_STATIC_PREVIEW=Boolean\(document\.querySelector/);
 assert.match(app,/function sendPreviewMessage\(text\)/);
 assert.match(app,/role:'user',text,status:'COMPLETE'/);
 assert.match(app,/Nenhuma resposta foi gerada|nenhuma resposta foi gerada|nenhuma resposta foi gerada|nenhuma resposta foi gerada|nenhuma resposta foi gerada|nenhuma resposta foi gerada/i);
 assert.match(app,/if\(IS_STATIC_PREVIEW\)\{if\(QWEN_PAGES\)await sendGithubQwen\(text\);else sendPreviewMessage\(text\);return;\}/);
 assert.match(app,/if\(IS_STATIC_PREVIEW\)startStaticPreview\(\)/);
 assert.match(chat,/if\(IS_STATIC_PREVIEW\)\{chatDraftDirty=false;return;\}/);
 assert.match(chat,/if\(!IS_STATIC_PREVIEW\)handle\(loadProfile\)/);
 assert.doesNotMatch(app,/localStorage\.setItem\('preview-chat/);
});

test('static preview UX always identifies missing Qwen backend',()=>{
 const app=read('src/frontend/app.js'),builder=read('scripts/build-netlify.mjs');
 assert.match(app,/NÃO são enviadas ao Qwen/);
 assert.match(app,/Backend e Qwen ainda não conectados/);
 assert.match(builder,/await writeFile\('dist\/site\/index\.html', marked\)/);
});
