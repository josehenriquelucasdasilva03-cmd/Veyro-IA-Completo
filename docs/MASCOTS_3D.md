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
