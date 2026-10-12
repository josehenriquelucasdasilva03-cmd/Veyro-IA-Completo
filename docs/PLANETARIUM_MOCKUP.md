# Veyro IA · visual planetário (proposta)

Base: consolidação PR #14. Referência aprovada pelo usuário: layout panorâmico escuro/preto, logo VEYRO IA, cinco cartões, barra inferior preta com uma borda dourada inferior e botão circular preto, aro dourado e seta preta visível pelo contorno.

## O que foi alterado
- `planetarium-theme.css` é carregado após `cosmos.css`, isolando o acabamento sem remover regras de segurança, streaming e controles existentes.
- `cosmos3d.js` já é o motor Three.js oficial: mantém oito planetas, aumenta os volumes de Júpiter, Saturno e do planeta central e reduz as órbitas visíveis. Texturas são geradas localmente, sem downloads externos.
- O botão de enviar reaproveita `#send` e o símbolo `#i-send`: nenhuma nova rota de mensagens. O ícone é escuro com contorno sutil para continuar identificável e a borda do botão é dourada.
- A barra de composição ganha a linha inferior dourada, sem bloquear digitação, microfone, anexos, estados disabled ou atalhos de teclado.
- Em telas pequenas, cartões viram duas colunas e a cena 3D reduz densidade e pixel ratio. Fallback CSS planetário quando WebGL, energia ou acessibilidade desabilitam a cena.
- Conversas existentes continuam escurecendo o fundo; dados e respostas são fornecidos pelo backend anterior, não pelo mockup.

## Antes do merge ou deploy
1. Executar npm ci, npm test, npm run build e conferir CI/CodeQL.
2. Abrir em Android e notebook, observar FPS, memória, fonte do logo, legibilidade da seta e cards, toque e teclado.
3. Confirmar que CSS antigo não vence `planetarium-theme.css` e verificar viewport estreito e landscape.
4. Verificar autenticação e streaming Qwen end-to-end no Worker; GitHub Pages isolado não garante IA real.
5. Coordenar com PR #15 (login) e #17 (mascotes 3D) caso a consolidação escolha ambos. Não criar um segundo renderizador, nem publicar em produção automaticamente.

A aparência do mockup é uma referência visual, não uma promessa de igualdade pixel a pixel entre screenshot e cena 3D em múltiplos tamanhos de tela.
