# Veyro IA: sistema de design consolidado (proposta)

**Fonte visual em execução:** PR #8 `design/chat-dourado-fundo-20261011`. Este documento é uma especificação para revisão, não altera seus arquivos de CSS ou a main.

## Princípios

1. **Preto como estrutura**: painel de chat e campo de texto escuros, reduzindo ruído, mas sem plano absolutamente preto em todas as camadas.
2. **Dourado como sinal**: contorno de foco, separadores sutis, microdetalhes do composer e cartões; não pintar todo texto de dourado.
3. **Branco para leitura**: títulos e mensagens de alto contraste; tons de cinza para metadados, não para instruções importantes.
4. **Paisagem/planetas como fundo contextual**: imagem em camada própria e efeito de dimmer progressivo quando conversa inicia, sem prejudicar legibilidade.
5. **Motion controlado**: parallax, zoom e entrada só na tela inicial, no máximo um movimento contínuo suave; `prefers-reduced-motion` remove transições e efeitos repetidos.
6. **Acessibilidade**: foco visível por teclado, texto responsivo, alvo tátil com dimensão confortável, contraste WCAG AA no texto, navegação sem depender exclusivamente de cor.

## Tokens propostos para alinhar design (não aplicar automaticamente)

- `--veyro-bg: #0B0E14`
- `--veyro-surface: #141923`
- `--veyro-surface-raised: #1C2230`
- `--veyro-text: #F5F5F5`
- `--veyro-muted: #BDC5D0`
- `--veyro-gold: #D8BA72`
- `--veyro-gold-subtle: rgba(216,186,114,0.28)`
- `--veyro-outline: rgba(216,186,114,0.55)`

## Componentes

- Composer: superfície escura, borda fina dourada, foco perceptível, ícone microfone separado.
- Enviar: círculo preto, seta branca, aro dourado sem preenchimento amarelo.
- Bubble: texto claro e borda dourada muito suave, maior peso visual na mensagem, não na moldura.
- Histórico: foto dos planetas atrás de overlay escuro ao haver mensagens; testes sobre fundo complexo no celular.
- Vídeo Studio: cartão de job com preview, FPS/duração/resolução reais, status `queued/running/completed/failed`, custo reservado e cancelamento; nunca simular avanço com porcentagem inventada.
- Erros: mostrar indicação concreta de problema de rede, fila ou autenticação; não esconder exceção atrás de spinner infinito.
- Robôs e vozes: opções já implementadas devem manter os identificadores e salvar escolha de forma coerente.

## Bloqueio visual conhecido

A imagem exata dos planetas descrita para a conversa **ainda não existe nos assets verificados do repositório**. O PR #8 já contempla a variável para adicioná-la. Não substituir a imagem por um arquivo arbitrário nem publicar fundo quebrado.

## Revisão antes de lançamento

Testar visualmente em 360px, 390px, 768px e desktop; teclado e leitor de tela; foco, histórico longo, milhares de tokens em streaming, modo de conexão perdida, barras inferiores móveis, preferências de animação e contraste. Guardar capturas reais da prévia antes de aprovar.
