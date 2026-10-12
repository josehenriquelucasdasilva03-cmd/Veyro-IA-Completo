# Cenários de capacidade do Veyro IA

Estimativa **hipotética**, não benchmark. A capacidade do Qwen3.5:35B, velocidade dos modelos de vídeo, latência de rede, taxa de reexecuções e concorrência **não foram medidos** neste projeto.

Premissas transparentes: 30 dias/mês; cada resposta de chat ocupa 20 segundos de GPU; cada vídeo curto ocupa 12 minutos de GPU; multiplicador 1,25 para perdas operacionais e margem; vídeos e chat consomem uma única GPU serial hipotética. Realidade pode ser muito diferente. O processo não precisa ser contínuo, mas só responde se houver GPU online ou autoscaling funcional.

| Cenário | Pessoas ativas/dia | Respostas chat por pessoa/dia | Vídeos/mês | GPU chat | GPU vídeo | GPU total c/ margem |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Restrito | 10 | 6 | 30 | 10h | 6h | 20h |
| Moderado | 25 | 8 | 60 | 33,3h | 12h | 56,7h |
| Elevado | 50 | 10 | 120 | 83,3h | 24h | 134,2h |

`horas_gpu = 1,25 * (pessoas_dia * mensagens_dia * 30 * segundos_resposta / 3600 + videos_mes * minutos_video / 60)`

Capacidade de orçamento de 60h/mês é **apenas 2h diárias em média**, não 24/7. Compartilhar link não cria limite de usuários: tráfego pode surgir em rajadas e aumentar fila/latência.

Exemplo de preço **ilustrativo** de aluguel citado na configuração anterior: US$0,931 por hora ativa. Com PTAX venda R$4,9892 de 09/10/2026 (BCB), GPU computacional apenas:

| Horas de GPU/mês | GPU USD | Aproximação em BRL |
| ---: | ---: | ---: |
| 20 | $18,62 | R$92,90 |
| 40 | $37,24 | R$185,80 |
| 60 | $55,86 | R$278,70 |
| 120 | $111,72 | R$557,39 |
| 720 (24h x 30 dias) | $670,32 | R$3.344,36 |

Não inclui disco (cobrado mesmo com instância parada), transferência, impostos, spread/IOF, armazenamento R2, outros serviços, preparação da GPU nem dois modelos compartilhando recursos. Preço hora deve ser reconfirmado no anúncio real Vast.ai: mercado oscila. Fonte BCB: https://ptax.bcb.gov.br/ptax_internet/consultarUltimaCotacaoDolar.do . Fonte cobrança Vast: https://console.vast.ai/faq/

**Regra de lançamento:** fixar limite financeiro real no provedor, reservas de quota antes da GPU, número global máximo de jobs ativos/pendentes, limite de vídeo por conta, monitorar p50/p95 de espera/execução e impedir novos jobs ao atingir teto; testar com pessoas convidadas antes de abrir registro geral.

**Economia de GPU:** texto e planejamento podem usar Qwen em GPU distinta da renderização ou agendamento justo por classe de trabalho, evitando que um vídeo de vários minutos bloqueie 25 chats consecutivos.
