# Veyro IA - integração de mascotes 3D à versão consolidada

Branch de teste: integration/mascots3d-consolidated-test-20261012
Base: integration/consolidacao-veyro-chat-20261012 (sem alteração da main).

## Mudança funcional
A interface consolidada apresentava imagens WebP e nenhum motor de animação 3D. Esta alteração instala o módulo local Three.js, componentes de renderização e controles do PR #21 sem substituir o visual planetário ou as telas existentes. Black, Blue, Green e Red passam a ter movimento procedural de cabeça, corpo, braços, antebraços, pernas e boca no próprio cabeçalho de conversa. O seletor mostra o mascote acenando em 3D.

Não há acesso aos modelos GLB detalhados dos mascotes originais. O motor mostra versões procedurais com cores correspondentes; caso o dispositivo não aceite WebGL, a interface mantém a ilustração WebP original. Isto NÃO equivale à animação fiel do desenho original.

## Compatibilidade
- Mantidas as páginas de login, intro, backend Qwen, síntese de voz, vídeos, tema planetário e seleção de quatro mascotes.
- UI do visualizador inserida com IDs únicos; o botão mascot-3d-close não interfere com o mascot-close do diálogo existente.
- Scripts compilados pelo esbuild e entregues via Worker e Netlify; sem dependências externas de CDN.
- Renderização limitada aproximadamente a 30 fps em celular e 60 fps no notebook; segundo contexto 3D só no seletor ou painel. Pausa automática, modo reduzido e fallback 2D.
- O PR #19 da correção de barra de mensagens continua separado; mudanças nesse setor precisam ser reconciliadas pelo chat principal.

## Antes de publicar
Exigir npm ci && npm test && npm run build && node scripts/build-netlify.mjs; testar Android Chrome e notebook reais com WebGL, teclado aberto, trocas repetidas entre quatro mascotes, gestos, intro/login, áudio e recursos Qwen. Não mesclar/publicar este PR nem modificar o Worker de produção durante a revisão.
