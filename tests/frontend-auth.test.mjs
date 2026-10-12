import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(path,'utf8');

test('reentrada não usa parâmetro OAuth falso; destino é a rota protegida',()=>{
 const html=source('src/frontend/index.html');
 const flow=source('src/frontend/auth-flow.js');
 const router=source('src/api/router.js');
 assert.match(html,/class="auth-login-link" href="\/api\/auth\/continue"/);
 assert.ok(!html.includes('?login=1'));
 assert.ok(html.includes('id="auth-gate"'));
 assert.ok(html.includes('Cloudflare Access'));
 assert.ok(router.includes("if(path==='/api/auth/continue')"));
 assert.ok(router.includes("if(path==='/api/auth/session')"));
 assert.ok(flow.includes("sessionStorage.setItem(INTRO_KEY,'1')"));
 assert.ok(flow.includes('const INTRO_MS=16000'));
});
test('API e chat reconhecem 401 e redirecionamento de autenticação',()=>{
 const app=source('src/frontend/app.js');
 const chat=source('src/frontend/components/chat.js');
 assert.ok(app.includes('response.status===401||isCloudflareAccessRedirect(response)'));
 assert.ok(chat.includes('response.status===401||isCloudflareAccessRedirect(response)'));
 assert.ok(app.includes('showLoginGate()'));
 assert.ok(chat.includes('showLoginGate()'));
 assert.ok(chat.includes("!contentType.includes('text/event-stream')"));
 assert.ok(!app.includes("if(!contentType.includes('application/json')){showLoginGate()"));
});
