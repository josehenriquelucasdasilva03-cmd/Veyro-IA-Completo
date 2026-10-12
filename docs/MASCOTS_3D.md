# Veyro Mascotes 3D - fase 1 (celular e notebook)

Protótipo **procedural** e isolado da interface principal. Não são ainda os modelos definitivos Black/Blue/Green/Red da imagem original: para reproduzir sua aparência fielmente e animar dedos, são necessários arquivos GLB rigados compatíveis. Este PR não altera autenticação, rotas nem APIs.

## Funcionalidades
- Botão flutuante opt-in, quatro paletas, rotação por toque/mouse, escala e dez animações procedurais + descanso.
- Pensamento com braço no queixo e interrogação; movimentos aproximados sem dedos articulados.
- Preferências locais; reações heurísticas a foco no prompt, aria-busy e mensagens de status. Não há conexão oficial com estados internos do modelo.
- Importação dinâmica do Three.js já empacotado localmente; cena descartada ao fechar; pausa em aba invisível; opção de movimento reduzido do sistema.

## Teste
Execute `npm ci && npm run build && node scripts/build-netlify.mjs && npm test`. Testar visualmente em Android Chrome e navegador de notebook, inclusive WebGL desabilitado, zoom, rolagem, acessibilidade e integração com os demais PRs. Sem merge nem publicação automática.

## Próximas fases
1. Converter quatro personagens originais em GLB com esqueleto compatível e mãos/dedos articulados.
2. Substituir movimentos procedurais por clips AnimationMixer e interpolação suave.
3. Eventos explícitos do chat e TTS com sincronização labial.
4. Acessórios, danças coletivas e perfis de desempenho.

## Correção de movimentos e integração (branch fix/mascots-motion-20261012)
- Poses isoladas no módulo testável mascot-motion.js: continuidade nos ângulos, interpolação exponencial por delta do frame, piscadas breves e movimentos de braços/pernas/cabeça sem salto entre ações.
- Movimento de pensamento aproxima o braço direito do queixo (ainda sem rig facial/dedos); fala anima boca; digitação move ambos os braços; dança, giro, caminhada e aceno continuam disponíveis.
- Limitação de renderização a aproximadamente 30 fps no celular e 60 fps no notebook; resolução moderada no celular para economizar GPU. O motor para ao fechar, em aba oculta e respeita movimento reduzido.
- Estado data-mascot-state do chat controla as animações automáticas por MutationObserver (sem setInterval), incluindo atenção, pensamento, fala, áudio e conclusão. Ação manual desativa o modo automático, permitindo testar os gestos.
- Corrige a colisão de ID mascot-status entre barra do chat e painel 3D. Novo controle de velocidade local.
- Trocas rápidas de robô/fechamento agora invalidam carregamentos assíncronos obsoletos; troca de aba pausa e retoma a mesma instância.
- Não altera o backend, autenticação, permissões ou publicação.

## Limitações e QA restante
Os modelos são geométricos e não possuem esqueleto nem dedos articulados; estes movimentos são aproximações visuais, não animações humanas realistas.
Executar npm ci && npm test && npm run build && node scripts/build-netlify.mjs (Node 24). Conferir Chrome Android, dispositivo com WebGL indisponível, notebook, rotação por toque, velocidade 50–150%, abertura e fechamento repetidos, alternância rápida entre mascotes, teclado aberto, preferências de movimento reduzido e sincronismo com respostas verdadeiras.
PR de revisão sem merge ou deploy automático. Integração com os demais PRs deve ser controlada pelo consolidador principal.


## Mascotes 3D visíveis na conversa (revisão de 12/10)
Problema identificado: a barra principal e o seletor de mascotes mostravam apenas um sprite JPEG animado por CSS. O motor Three.js operava somente dentro do painel flutuante, portanto as figuras visíveis na conversa não tinham movimento tridimensional real.

Implementado nesta branch de revisão: a própria .mascot-hero hospeda um canvas WebGL real, com rotação 3D, gestos de cabeça, ombros, antebraços, pernas e boca. A .mascot-preview-portrait apresenta o modelo selecionado acenando; o painel de controles continua interativo por toque e mouse. A animação acompanha os eventos efetivos do chat, inclusive fala e escuta, sem depender da API do Qwen para animar. As quatro escolhas Black/Blue/Green/Red usam o mesmo rig procedural 3D com paletas distintas; preferência antiga Prime converte-se para Red.

Desempenho: a interface mantém no máximo o avatar principal e uma prévia/painel 3D, pausa os renderizadores ocultos, libera recursos ao trocar de personagem e mantém fallback JPEG se WebGL falhar. Respeita redução de movimento do sistema. Não há modelo GLB importado nem geração automática de personagens com esqueleto humano.

Verificar antes de publicar: todos os testes automatizados e compilação CI; Android e notebook devem confirmar visualmente movimentos e gestos em WebGL; testar fluxo de seleção, abertura/fechamento, tela pequena, rotação, redução de movimento, falha de GPU. Esta branch continua separada da main e não altera autenticação/Qwen.
