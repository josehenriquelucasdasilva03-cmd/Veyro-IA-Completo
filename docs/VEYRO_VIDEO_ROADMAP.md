# Veyro IA - vídeo como capacidade principal

O motor privado foi preparado em https://github.com/josehenriquelucasdasilva03-cmd/Veyro-Video-Engine (acesso restrito ao proprietário). Possui API interna, fila SQLite, validação de pedidos, quotas básicas, idempotência, workflow ComfyUI aprovável pelo servidor, worker serial e testes. **Não há workflow/modelo GPU validado** nem ligação ao Worker público; portanto não oferece geração real ainda.

## Arquitetura desejada

`Browser Veyro -> Cloudflare Access/OAuth -> Worker autentica usuário -> autorização e quota (D1) -> fila de job -> GPU privada -> MP4 privado (R2) -> link autenticado de duração curta -> timeline Veyro`.

**Nunca** enviar Basic Auth Vast, chaves de GPU, token do motor ou URL de inferência para o navegador.

## Escopo MVP (produto real)

1. Texto -> vídeo curto: um vídeo MP4 com 4-8s, um ou dois perfis fixos e progresso real, idempotência e cancelamento de fila.
2. Imagem -> vídeo: imagens recebidas via referências autenticadas do R2 e validadas; não liberar URL arbitrária de terceiros.
3. Storyboard: Qwen transforma a intenção em 3-6 cenas; texto/quadros são editáveis pelo usuário; um job por cena com quota.
4. Narração/legendas: STT/TTS existentes integrados com editor de timeline, renderização de áudio e exportação pelo FFmpeg de modo isolado.
5. Exportação: MP4 em R2 com expiração, limpeza automática de originais e medidas de qualidade.

Modelos a testar: **Wan2.2 TI2V 5B** ou alternativa compatível com workflow ComfyUI. Documentação oficial de inferência exige cerca de 24GB GPU para caminho single-GPU 720p, enquanto configurações ComfyUI de offloading podem rodar com menos VRAM e com grande penalidade de latência; nenhum benchmark foi feito no notebook RTX 5060 8GB. Avaliar licenças/comercialização de cada artefato antes do lançamento.

## Etapas e critérios

- Fase A - API e fila: repositório criado; testes unitários passaram no GitHub Actions; **não é produção**.
- Fase B - pipeline GPU: instalar modelo e workflow sem chaves no GitHub; medir geração de clipes reais e VRAM; determinar limites de duração, FPS, resolução, custo/minuto.
- Fase C - integração privada com site: adaptador Worker com Access, quota, R2 e autenticação servidor-servidor. Testar usuário A não acessa B.
- Fase D - beta controlado: quotas baixas, limite de gasto por hora/dia/mês, reconciliação de job preso, retry com orçamento, cancelamento real, logs sem prompts e testes de carga.
- Fase E - liberação pública: observabilidade, retenção/legal/compliance, monitoramento de qualidade e política clara de conteúdos.

**Estimativas de engenharia, não compromisso de prazo:** com infra pronta, validação de GPU 1-3 dias úteis; MVP end-to-end 4-10 dias úteis adicionais; beta com concorrência e recuperação 3-6 semanas de trabalho de um desenvolvedor experiente. Variam com workflow, infraestrutura, bugs e testes reais. Evitar prometer minutos para inserir botão de vídeo quando pipeline completo não existe.
