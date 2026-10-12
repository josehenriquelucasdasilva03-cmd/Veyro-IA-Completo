# Veyro IA: entrada, Google, código e chat

Esta alteração usa como base o PR #14 de consolidação. Não faz merge ou deploy.

## Sequência implementada
1. Abertura de 16 segundos, com opção de pular e redução de movimento automática.
2. Requisição autenticada `GET /api/auth/session` antes de carregar qualquer projeto.
3. Se necessário, interface de login com Google e código. Ambos redirecionam ao endpoint protegido `/api/auth/continue`. O Cloudflare Access exibe os provedores efetivamente configurados.
4. Após autenticar, o backend redireciona à raiz. A sessão é conferida de novo, então o site abre o chat.
5. Falha de rede ou prévia Netlify sem backend exibe erro, não autenticação simulada.

## Dependências importantes
- Para mostrar entrada ANTES do login, servir a interface estática pública, mas proteger integralmente `/api/*` no Cloudflare Access. Uma política que exige login na raiz terá a tela do Access ANTES da animação. Código frontend não consegue alterar isso.
- Habilitar Google como IdP e One-time PIN (e-mail) como opção de login no Access. Os dois botões mostram a MESMA página do Access: a escolha do método depende das opções do provedor, não de query params inventados.
- Google **seguido de** segundo código obrigatório exige MFA configurado no IdP/Cloudflare; este código NÃO implementa um segundo fator local nem aceita um código falso. Google e PIN são opções alternativas até que a política MFA seja configurada.
- No Worker, manter `VEYRO_AUTH_MODE=cloudflare-access` com `ctx.access.getIdentity()`, D1, quotas, Rate Limiter e secrets existentes no PR #14. Não confiar em headers de identidade recebidos diretamente do navegador.
- Revisar CI e validar Google, One-time PIN, sessão expirada, acessibilidade, erro de conexão e streaming real do Qwen antes de integrar à main ou publicar.

## Prevenção de conflitos
- Somente uma tela de login, sem OAuth paralelo ou credenciais no frontend.
- Abertura executada uma vez por carregamento, evitando repetir a animação de 16 segundos ao exibir o chat.
- Nenhum projeto carregado antes da confirmação do servidor.
- Não há retorno para URL externa controlada pelo usuário.
