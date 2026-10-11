# Integração de segurança destinada à main (prévia sem publicação)

## Contexto
Este conjunto consolidado combina, sem modificar as branches originais:
- PR #2: estrutura de Worker Cloudflare de teste e acesso remoto seguro ao Qwen;
- PR #3: correções de estabilidade do streaming, modo de autenticação explícito,
  verificação rigorosa de formatos e compatibilidade do Whisper com Python atual;
- PR #4: quotas D1 e bindings de rate limiting Cloudflare, isolamento por usuário,
  headers de segurança, contexto externo de IA separado do system prompt,
  CodeQL, Dependabot, testes e documentação de segurança.

O repositório é JavaScript sem framework Vue.js. Não foi feita conversão para Vue,
pois isso quebraria componentes e publicação existentes sem benefício de segurança.

## Como foram resolvidos os conflitos
- src/api/router.js: modo de autenticação explícito do PR #3 com quotas, log sanitizado,
  cabeçalhos e CSP do PR #4. Em modo cloudflare-access, somente ctx.access é aceito;
  em modo sites, a identidade só é válida atrás do dispatcher confiável.
- src/api/profile.js, assets e testes: assinatura mais rigorosa de mídia do PR #3,
  eliminando o módulo alternativo permissivo do PR #4.
- src/history/conversations.js: preserva correções de ações indisponíveis do PR #3,
  mais a separação de conteúdo não confiável do PR #4.
- tests/api.test.mjs: substitui cabeçalho de PNG simulado por PNG válido.

## Verificações locais de integração
- Node.js 24: 69 testes aprovados em execução conjunta, 0 falhas.
- Python 3.13: leitor 5/5, agentes 2/2, speech 4/4; total 11/11.
- Build de interface e backend: aprovado, sem deploy.
- Git diff --check: sem erros.

## Pendências e limites de segurança
- CodeQL e GitHub Actions da branch de integração devem ser conferidos no PR.
- Cloudflare Access para TODO tráfego, secrets e namespace IDs de Rate Limiting
  devem ser revisados no painel antes de deploy do Worker de teste.
- A migração 0004 deve ser aplicada SOMENTE à D1 isolada no primeiro teste.
- Os limites de requisição por binding são por localidade Cloudflare, não globais;
  quotas SQL são por operação e não garantem tetos financeiros no provedor.
- O validador de assinatura de mídia não substitui antivírus nem sandbox.
- Google/GitHub OAuth em andamento fora desta branch não foi substituído nem
  declarado implementado nesta integração. Integrar e testar separadamente.

## Publicação
A branch é somente proposta para revisão da main. Nenhum código é enviado
diretamente à main, não há merge e nenhum ambiente é publicado.
