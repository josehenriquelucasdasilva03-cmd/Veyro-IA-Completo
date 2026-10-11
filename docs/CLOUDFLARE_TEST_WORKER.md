# Publicar a prévia no Worker Cloudflare

Este procedimento publica apenas o Worker de teste `veyroia-test` e serve o chat no endereço `workers.dev`. Não altera o Site oficial nem faz merge da PR.

## 1. Criar a base D1 isolada

No painel Cloudflare, abra **Workers & Pages → D1 SQL Database → Create database** e crie `veyroia-test-db`. Copie o **Database ID** exibido. Ele não é uma senha.

## 2. Conectar o Worker somente ao branch da PR

No painel, abra **Workers & Pages → veyroia-test → Settings → Builds** (ou conecte um repositório Git pelo fluxo de Deployments). Escolha o repositório Veyro-IA-Completo e o branch `feat/vast-qwen35-remote-20261010`. Configure:
- Build command: `npm ci && npm run build && npm run cloudflare:prepare`
- Deploy command: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`
- Build variable `VEYRO_D1_DATABASE_ID`: o ID da base criada no passo 1.
- Build variable `VEYRO_MODEL_BASE_URL`: a URL HTTPS do proxy/Caddy terminando em `/v1`, sem usuário, senha, token ou query string.

O script gera `wrangler.jsonc` apenas durante o build, com o nome fixo `veyroia-test`, o binding D1 `DB`, migrações e as variáveis não secretas `MODEL_PROVIDER=vast`, `MODEL_NAME=qwen3.5:35b`, `MODEL_AUTH_TYPE=basic`, `MODEL_TIMEOUT_MS=180000` e `VEYRO_AUTH_MODE=cloudflare-access`. O arquivo gerado não entra no Git. Verifique no painel que o branch de produção do Worker de teste é o branch da PR, nunca `main`. Não conecte este build ao projeto do Site oficial.

## 3. Ativar acesso privado

Antes do primeiro deploy, abra **Workers & Pages → veyroia-test → Access → Protect this Worker behind Access**. Escolha **All traffic** e uma política **Allow** que aceite somente seu e-mail. O endpoint deve exigir o login do Cloudflare; não configure bypass público. O backend verifica a identidade por `ctx.access` e bloqueia pedidos sem identidade. A página e a API são servidas pelo mesmo Worker para não expor credenciais no frontend nem depender de CORS.

## 4. Salvar a autenticação do modelo como Secrets

No painel, abra **Workers & Pages → veyroia-test → Settings → Variables and Secrets → Add**. Adicione como tipo **Secret**:
- Nome `MODEL_BASIC_USER`: usuário Basic do Caddy.
- Nome `MODEL_BASIC_PASSWORD`: senha Basic do Caddy.

Salve e faça Deploy. Não coloque esses valores em GitHub, variáveis de build, URL, conversa ou captura de tela. A configuração Wrangler declara ambos obrigatórios e o deploy falha se estiverem ausentes.

## 5. Publicar e testar

Confirme que o log de build executou a aplicação das migrações sem erro e que o deploy foi direcionado ao Worker de teste. Abra o endereço `workers.dev` de `veyroia-test`; entre com o e-mail autorizado pelo Access; envie uma pergunta em português. A resposta deve surgir progressivamente. `GET /api/model/health` também pode confirmar conectividade depois do login, sem retornar credenciais.

Se a autenticação do modelo falhar, o Caddy pode estar com outro usuário/senha ou a URL HTTPS pode não alcançar a API compatível. Confirme a partir do próprio host do backend que `GET /v1/models` funciona com Basic Auth e que `POST /v1/chat/completions` oferece streaming. Nunca tente contornar o erro usando HTTP público.

## Limites deste teste

- O endpoint Vast precisa continuar ativo e acessível por HTTPS com certificado válido; uma URL temporária de túnel pode expirar.
- A criação da D1 pode ter limites de uso sujeitos à conta. A conversa de texto funciona sem R2; uploads e mídia exigem configurar o bucket R2 separadamente.
- A existência do Worker no painel não significa que o código desta branch foi publicado nele.
- Até executar esses passos, não há teste real do Qwen pelo navegador.
- Para impedir deployments inadvertidos, deixe Workers Builds ligado apenas ao branch de teste. Este documento não pede merge e não modifica a hospedagem oficial.

