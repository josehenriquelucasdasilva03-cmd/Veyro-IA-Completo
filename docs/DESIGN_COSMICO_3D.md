# VEYRO IA: referência de design cósmico 3D

Atualização da interface existente em src/frontend/, inspirada na demonstração
visual de oito segundos aprovada em 12/10/2026. Não cria um segundo frontend.

## Estrutura e integração

- src/frontend/index.html: texto do logo e legenda dourada, preservando o
  cabeçalho, o compositor de mensagens, a navegação, o mascote e o histórico.
- src/frontend/components/cosmos3d.js: cena única Three.js. Oito planetas
  com textura procedural, linhas de órbita douradas, anéis de Saturno,
  estrelas, paralaxe e adaptação mobile. Não baixa imagens de terceiros.
- src/frontend/components/cosmos-loader.js: carrega a cena por demanda,
  mantém fallback CSS e respeita economia de dados e redução de movimento.
- src/frontend/styles/cosmos.css: composição do logo, anéis dourados,
  revelação dos controles no final dos oito segundos, estilo responsivo.
- src/frontend/components/chat.js: coordena entrada cinematográfica
  existente de oito segundos e retoma o estado do chat.

O vídeo de referência NÃO é inserido como MP4 na interface: ele foi usado
como direção artística para elementos interativos. O campo de texto, os botões,
as mensagens e o menu não são imagens; continuam componentes reais do site.

## Funcionamento

1. Os planetas e os anéis aparecem progressivamente.
2. O nome branco e dourado se forma com partículas, mostrando a legenda
   "Inteligência · Presença · Futuro".
3. O cabeçalho, as sugestões e o compositor real chegam ao fim da sequência.
4. O botão "Pular introdução" permite entrar sem esperar oito segundos.
5. Quando a conversa começa, o cenário se reduz e perde intensidade.
6. Os três pontinhos reutilizam o painel de opções original, que abre
   com animação lateral.
7. Dispositivos sem WebGL ou com movimento reduzido recebem uma alternativa
   sem a cena animada.

## Validação

Execute Node.js >=24 com npm ci, npm run build,
node scripts/build-netlify.mjs e npm test.

O build Netlify é estático: não serve sozinho as rotas do backend Qwen.
Teste a aparência e a suavidade dos gestos em celular real antes de considerar
encerrada a validação visual. Alterações na branch main podem ativar
implantação automática quando Netlify estiver conectado ao repositório.
