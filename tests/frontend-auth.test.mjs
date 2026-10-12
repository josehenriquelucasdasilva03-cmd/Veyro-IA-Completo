import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(path,'utf8');

test('reentrada não usa falso parâmetro OAuth e preserva Access',()=>{
 const html=source('src/frontend/index.html');
 assert.ok(html.includes('class="auth-login-link" href="/"'));
 assert.ok(!html.includes('?login=1'));
 assert.ok(html.includes('id="auth-gate"'));
 assert.ok(html.includes('Google e GitHub'));
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
