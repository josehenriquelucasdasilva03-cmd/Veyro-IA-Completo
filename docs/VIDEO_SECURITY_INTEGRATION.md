# Integração experimental de segurança + vídeo

Esta branch nasce de `security/main-ready-20261011` (PR #7) e incorpora o gateway e UI do PR #10 sem alterar a branch de segurança, a main ou o site.

`Security CI` valida Node 24, build, testes Python e as rotas de vídeo. As cotas gerais de modelo/imagem/áudio do PR #7 são preservadas. Vídeo só aceita novos trabalhos com `VEYRO_VIDEO_ENABLED=true` e, em Cloudflare Access, requer também binding `VEYRO_VIDEO_RATE_LIMITER` específico; a engine possui teto global próprio de trabalhos. Nenhuma dessas cotas substitui o limite financeiro real na GPU.

Se funcionar, esta branch é referência de rebase futuro de segurança/vídeo, não aprovação de merge nem deploy. Login Google/GitHub do PR #6 e CSS do PR #8 ainda permanecem separadamente em revisão.
