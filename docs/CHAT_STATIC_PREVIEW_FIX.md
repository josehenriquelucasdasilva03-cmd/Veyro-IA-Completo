# Correção do envio na prévia estática (12/10/2026)

## Causa real
A aplicação tenta fazer `GET /api/status` e `GET /api/projects` antes de criar projetos e conversas. Em GitHub Pages e Netlify, o site publica somente HTML/CSS/JS: **não há Worker em /api/**. Portanto o estado `state.id` fica nulo e o `composer` bloqueia o envio com "Os projetos ainda não foram carregados". Não é um problema de clique ou teclado, é falta de backend.

## Correção testável
- `scripts/build-netlify.mjs` insere `<meta name="veyro-static-preview" content="true">` **somente** em `dist/site/index.html`, que é o conteúdo servido pelo Netlify e pelo workflow do GitHub Pages.
- A versão estática usa `startStaticPreview()` em vez de tentar criar projetos na API inexistente. A pessoa pode digitar e clicar Enviar; suas próprias mensagens aparecem na conversa, sem inventar uma resposta do Qwen.
- Banner e aviso da conversa indicam que as mensagens não foram enviadas à IA, não foram salvas no servidor, e não ficarão após atualizar a aba.
- Nova conversa limpa somente mensagens em memória. Os recursos que requerem API ficam desativados nesta prévia.
- O chat real no Worker Cloudflare usa o HTML **sem marcador**, conserva `/api/conversations/:id/messages`, autenticação Access, dados isolados e histórico D1.
- O frontend não adiciona nem armazena chaves, tokens ou emails.

## Para o chat real funcionar
Configurar e publicar o Worker privado `veyroia-test` com Cloudflare Access, D1/migrações, binding de rate-limit e modelo Qwen via HTTPS e segredo privado. Só depois testar `POST /api/conversations/:id/messages` com uma sessão autenticada no **mesmo host do Worker**. Netlify/GitHub Pages não podem fazer isso sem uma integração autenticada de backend. Nenhum frontend deve chamar uma URL Vast pública diretamente.

Ver também `docs/CLOUDFLARE_TEST_WORKER.md` e `docs/SECURITY_HARDENING.md`.
