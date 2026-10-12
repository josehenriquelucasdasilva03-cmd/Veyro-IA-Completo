# Pendências de integração • 12/10/2026

Este inventário reflete o código e os PRs abertos inspecionados nesta data, não prova serviço implantado.

| Entrega | Situação / dependência |
| --- | --- |
| Chat Qwen/Vast | Backend existe; confirmar endpoint HTTPS, secrets, sessão e teste real autenticado |
| Segurança, cotas e MFA | PR #14 possui segurança em rascunho, PR #15 contém fluxo Google/código; validar Cloudflare Access, D1 e OAuth real |
| Histórico e memória | PR #14 atualizou backend; confirmar persistência e isolamento em teste real |
| Planetas e visual 3D | PR #18; validar interação e FPS em celular/notebook antes do merge |
| Mascotes 3D | PR #17; falta rigging final, TTS/lip-sync e testes físicos |
| Estúdio 3D | PR #16; import/export GLB e controles aguardam integração/QA |
| Introdução cinematográfica | PRs #13/#14/#15; conferir duração 16 s, pular e ordem de login |
| Vídeos gerados por IA | PR #10/#14 inclui gateway opcional desativado; falta motor de GPU, filas e limites de custo |
| Imagens | Este branch adiciona edição/aprimoramento e interface com ComfyUI remoto; falta serviço HTTPS privado, GPU e testes reais |
| Voz e pesquisa | Adaptadores existem no código; confirmar instalação, serviços reais e proteção antes de produção |

## Sequência de integração recomendada

1. Validar PR #14 como base de identidade/autorização/cotas; não alterar a main sem aprovação.
2. Resolver conflitos dos PRs #15, #17, #18 e #16 com a interface e com testes separados.
3. Reconciliar este branch de imagens, priorizando backend privado, limites e isolamento.
4. Criar staging distinto, executar testes automáticos e smoke tests em dispositivos reais.
5. Comprovar chat Qwen, geração de imagens, histórico, acesso e segurança ponta a ponta.
6. Só depois considerar merge/publicação do site oficial mediante autorização explícita.
