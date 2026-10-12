# Veyro IA: auditoria de consolidação (11/10/2026)

Esta revisão é documental e **não efetua merge, deploy, mudança de ambiente, migração ou alteração em produção**. Revisão da API GitHub em 11/10/2026; nenhum teste ponta a ponta da GPU foi efetuado nesta revisão.

## Base e trabalho paralelo

- main: commit `73024114`, já inclui PR #2 Qwen/Vast/Worker e PR #3 estabilidade.
- PR #7: segurança consolidada, baseada na main atual; rascunho; CodeQL e Security CI aprovados no GitHub Actions. Ainda não incorporada.
- PR #6: Google/GitHub + resposta mais rápida; rascunho, base na branch `security/hardening-access-quota-20261011` (PR #4), **não** na branch #7. Rebase/reintegração requer revisão de conflitos com main e #7.
- PR #8: refinamento CSS preto/dourado/branco e fundo escurecido; rascunho. A imagem de planetas não está no repositório, apenas a variável para substituir paisagem.
- PR #4: branch antiga de segurança sobre PR #2; não fazer merge além da segurança consolidada do #7.
- PR #1: adaptador remoto anterior, não confundir com versão incorporada à main pelo #2.
- PR #5: fechado sem merge, substituído pelo #7.

## Código hoje versus serviço ativado

| Módulo | Existe no código | Verificação faltante |
|---|---|---|
| Chat, histórico e projetos | Sim | Sessão real, isolamento e persistência sob carga |
| Qwen3.5:35B remoto `vast` | Adaptador e URL HTTPS autenticada | Health real, token/s, falhas e GPU ligada |
| Login Google/GitHub | PR #6; dependência no Cloudflare Access | Configuração OAuth, identidades, logout e sessão |
| Quota e rate limit | PR #7 | Bindings Worker, D1 migração 0004, testes de carga/limites financeiros |
| SearXNG + CrewAI | Serviços opcionais de pesquisa/agentes | Docker, rede, qualidade e tempos reais |
| Imagem ComfyUI/SDXL | Implementada **somente no modo MODEL_PROVIDER=local** | GPU e modelo locais, teste end-to-end, imagem com chat remoto Vast |
| TTS e STT | Rotas e provedores condicionais | Serviços e credenciais realmente conectados |
| Estúdio e edição | Prévia/exportação experimental (limite documentado) | Áudio, robustez de codecs, mobile e persistência |
| Vídeo gerativo | `video:false` no status da main | Integração isolada com Veyro-Video-Engine e modelo funcional |

**Não declarar pronto para público** enquanto componentes críticos dependam de configuração ou testes reais.

## Achados críticos

1. `VEYRO_AUTH_MODE=sites` aceita cabeçalho de identidade **somente quando a infraestrutura acima for de fato um dispatcher confiável**. Não usar modo `sites` em Worker público; para Worker de teste usar Cloudflare Access protegido em todo hostname.
2. O PR #7 implementa quota por contagem de chamadas, **não teto de gasto em moeda**. Rate limiter Cloudflare não equivale a limite financeiro global. Separar cota de chat, imagem e vídeo.
3. Migração D1 do #7 ainda não aplicada neste repositório de produção; antes de deploy testar no D1 de teste e backups compatíveis.
4. PR #6 exige revisão contra #7, especialmente `src/api/router.js`, `src/history/conversations.js`, configuração do Worker e testes. Não fazer cherry-pick cego.
5. Access com política exclusiva para o dono **não é liberação pública**: para teste com convidados, política e onboarding separados, com quotas por conta. Provedores OAuth com e-mails diferentes não ligam automaticamente duas identidades.
6. Qwen e ComfyUI imagem possuem acoplamento no local: `imageProviderConfig()` requer `MODEL_PROVIDER=local`, bloqueando a função no Worker remoto Vast.
7. O Worker está desenhado para respostas HTTP, não renderização demorada: jobs de vídeo devem sair para backend de GPU com fila e armazenamento privados.
8. A política de segurança dos uploads verifica signatures básicas; isso não substitui antivírus, `ffprobe`, validação de codecs ou tratamento de arquivos maliciosos.
9. Tests e build verdes não comprovam segurança global, estabilidade em GPU, integração OAuth real ou proteção contra todos os ataques.

## Ordem de integração recomendada

**Sequência obrigatória:** confirmar Worker/D1/Access/teste Qwen -> revisar/mesclar futuramente PR #7 somente com autorização -> rebase do #6 sobre branch segura, correr testes/login real -> revisão visual #8 e recurso planetas -> serviços públicos limitados -> integração video engine via feature flag no Worker.

Em cada etapa: branch própria, testes Node 24 + Python 3.12, Security CI/CodeQL, testes de duas contas e sessões vencidas, revisão de impacto na fatura; nenhum merge automático.

## Regras de preservação

Não modificar `main`, site oficial, banco ou secrets sem autorização. Não adicionar OpenAI API nem alterar modelo escolhido para chat/tradução. Não publicar endpoint do ComfyUI ou GPU; uso público exige autenticação, limites globais e orçamento de verdade. Respeitar `AGENTS.md` e manter estas análises separadas dos PRs simultâneos.
