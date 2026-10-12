# Veyro IA · referências visuais (12/10/2026)

Esta branch **não inclui cópias dos 3 vídeos de terceiros** e não altera o backend, os secrets ou o site publicado.

- Referência 1 (Nova IA 3D): profundidade, iluminação e objetos 3D. Tradução: planetas CSS com sombras, anel, poeira estelar e destaque dourado. É profundidade simulada por CSS, não um motor 3D/WebGL.
- Referência 2 (vídeos cinematográficos): enquadramento, atmosfera e movimento da câmera. Tradução: paralaxe de camadas, fundo que escurece ao começar o chat e entrada cinematográfica.
- Referência 3 (interfaces criativas modernas): tipografia e cards com entrada e reação ao usuário. Tradução: letras saem dos cantos da tela, convergem no centro e cards reagem ao ponteiro/toque.

Performance: somente requestAnimationFrame durante interação com a tela de boas-vindas, transform/opacity em CSS e visual estático sob prefers-reduced-motion. Sem sensores, sem APIs pagas, sem animação em loop por JavaScript, sem bibliotecas 3D externas.

Testes: `npm ci`, `npm test`, `npm run build`, `node scripts/build-netlify.mjs`. **Executar QA visual em desktop e celulares reais antes de publicar**; esta branch foi criada isoladamente a partir de `design/chat-dourado-fundo-20261011`, que permanece inalterada.