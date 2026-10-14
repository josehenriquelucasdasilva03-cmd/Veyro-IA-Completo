# Veyro IA: histórico e memória persistentes (GitHub Pages + D1)
Histórico fica no D1 vinculado ao Worker `veyro-history-test`, separado do Worker de IA `veyro-auth-test`. Ambos usam o MESMO banco `veyro-auth-test` e a sessão Bearer gerada pelo Worker principal. Nunca reutilize tokens como nomes de usuário nem os registre em logs. Não há credenciais no GitHub.

Rotas: `GET/POST /api/history/conversations`; `GET/DELETE /api/history/conversations/:id`; `POST /api/history/conversations/:id/turns`; `GET/POST /api/history/memories`; `DELETE /api/history/memories/:id`.
Sessão validada por hash SHA-256 em `sessions.token_hash`, com validade verificada; toda consulta é filtrada por `user_id` derivado da sessão autenticada. Memórias são anotadas manualmente (nada de extração automática de conteúdo privado). Limites: 50 conversas, 150 mensagens por conversa, 30 memórias de 320 caracteres. As últimas memórias cabíveis podem compor uma nota fornecida ao modelo pelo próprio usuário.

Aplique o SQL `001_history.sql` no D1 existente antes de publicar o Worker. Configure o binding `DB` para o mesmo D1; permita acesso só ao domínio exato GitHub Pages e mantenha o Worker API separado do público Netlify. Não copie sessões, emails, senhas ou secrets para o frontend.

Para testar: após login, criar memória, enviar mensagem real e atualizar/reabrir site, autenticar novamente e confirmar histórico, memória e exclusão. Conferir 401 sem token e 404 para registros de outro usuário. A publicação de frontend e o deploy de Worker precisam ambos concluir; um deles sozinho não habilita persistência.

**Aviso:** texto e respostas persistem na base D1 até serem apagados pelo usuário; não é criptografia ponta a ponta. Não salvar automaticamente informações médicas, senhas ou outros dados sensíveis.
## Publicação manual, quando o deploy pela ferramenta estiver bloqueado

As tabelas D1 já foram criadas no banco `veyro-auth-test`. O bloqueio ocorreu na publicação do novo Worker, não na compilação nem nas migrações.

**Cloudflare (painel)**: Workers & Pages > criar Worker com nome `veyro-history-test`; carregar o código `index.js` desta pasta; em Settings > Bindings adicionar D1 com nome da variável `DB`, selecionando a base existente `veyro-auth-test`; ativar o subdomínio workers.dev e publicar.

**Alternativa no notebook**: na pasta raiz do repositório, após `wrangler login`, executar `npx wrangler deploy --config workers/veyro-history-test/wrangler.jsonc`. A configuração contém apenas nomes e ID público do banco, sem credenciais.

A URL esperada após deploy bem-sucedido é `https://veyro-history-test.josehenriquelucasdasilva03.workers.dev`. Não informe ao usuário que as memórias estão sincronizadas até esse Worker responder às rotas com a sessão real. Não mexer no Worker de IA `veyro-auth-test`.
