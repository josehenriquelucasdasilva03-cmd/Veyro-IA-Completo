# Endurecimento de segurança do Veyro IA

## Escopo e preservação
Esta proposta parte da branch feat/vast-qwen35-remote-20261010 do PR #2.
Nenhuma mudança é aplicada ao site oficial, a main, aos segredos, ao login Google/GitHub ou ao PR #2.
O PR desta proposta deve permanecer draft até auditoria e testes reais.
O trabalho paralelo de OAuth e cadastro deve ser integrado separadamente sem criar cabeçalho de identidade controlável pelo usuário.

## Autenticação e isolamento
- O Worker de teste exige VEYRO_AUTH_MODE=cloudflare-access e ctx.access.getIdentity()
  autenticado pelo Cloudflare Access. Proteja TODO O TRÁFEGO do Worker no painel.
- Não confie em oai-authenticated-user-id num Worker público. O modo legado
  só pode operar no dispatcher confiável da hospedagem original e no adaptador de desenvolvimento.
- O backend consulta projetos, conversas, memórias e arquivos por IDs e user_id,
  e testes rejeitam leitura com identidade de outra conta.

## Limites e custos: operações, não dinheiro
- Cloudflare Rate Limiting obrigatório no Worker de teste:
  API_RATE_LIMITER 300/min/usuário, MODEL_RATE_LIMITER 20/min/usuário/tipo
  e UPLOAD_RATE_LIMITER 10/min/usuário.
- O Rate Limiting por binding opera por localização Cloudflare, não é limite global estrito.
- A migração 0004 cria security_quotas em D1, reservando contadores SQL atômicos
  por usuário e UTC: modelo 80/dia e 1200/mês; imagem 30/dia e 300/mês;
  áudio 100/dia e 1500/mês, personalizáveis por VEYRO_*_LIMIT.
- Reservas contam mesmo se a execução falhar. Limites de operações não são
  tetos em reais, dólares nem tokens e não incluem todas as chamadas internas.
  Para custo real configure limites de faturamento no provedor.
- Confira que namespace_id dos 3 bindings não colide com outro Worker da conta.

## Arquivos, headers, logs e IA
- Uploads conferem tipo MIME e assinatura de arquivo antes de gravar no R2.
  Isso NÃO equivale a antivírus nem validação integral do parser. Em produção,
  adicionar decodificação segura, quarentena e análise em sandbox.
- Cabeçalhos: nosniff, HSTS (HTTPS), Referrer-Policy, Permissions-Policy,
  API sem cache, CSP da interface com form-action sem alterar os embeds atuais.
- Logs do router ocultam IDs, e-mails, URLs e textos dos prompts.
  Nunca registrar cabeçalhos de autenticação, corpos sensíveis ou Secrets.
- Contexto de arquivos, memórias e pesquisa é enviado separado de instruções
  de sistema como mensagem de prioridade inferior. Isso REDUZ mas NÃO
  elimina prompt injection. Ferramentas devem validar escopo e autorização
  antes de executar qualquer ação relevante.

## Etapas manuais antes de um futuro deploy
1. Revisar o PR #2 e os resultados do PR de segurança.
2. Proteger o Worker veyroia-test por Cloudflare Access com política restrita.
3. Configurar D1 isolado, bindings Rate Limiting e Secrets Basic no runtime.
4. Aplicar a migração 0004 na base de TESTE.
5. Testar autenticação, uploads, quotas, SSE e Qwen de verdade em ambiente privado.
6. Ativar Code Scanning, Dependabot Alerts, Secret Scanning e Push Protection
   no painel do GitHub se estiverem disponíveis para esta conta.
7. Configurar monitoramento de custos e alertas diretamente nos provedores.

Este PR não altera o OAuth público, não publica Worker nem garante
ausência de vulnerabilidades. Análise de malware, WAF e validação econômica
continuam dependendo de integrações e configurações externas.
