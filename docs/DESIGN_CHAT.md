# Veyro IA · chat preto, branco e dourado

Esta branch contém **somente mudanças visuais**. Não altera login, APIs, dados, chave de acesso ou configuração de deploy.

## Definições da interface
- Campo de digitação preto com borda dourada discreta; foco realçado sem excesso de brilho.
- Envio em círculo preto com borda dourada e seta branca.
- Mensagens da pessoa e da IA em superfícies escuras, texto claro e contornos dourados.
- O fundo continua visível no histórico, com redução de brilho ao iniciar a conversa.
- Animação da abertura e preferência de movimento reduzido preservadas.

## Arte pendente: fundo dos planetas

A imagem original citada pelo usuário **não foi encontrada no repositório nem no vídeo**. O CSS deixa a variável `--veyro-chat-background-image` pronta e usa provisoriamente `/cinematic.webp` (paisagem anterior) para evitar referência quebrada. Assim que a arte dos planetas for fornecida, inclua-a no build do Worker e na prévia Netlify, depois aponte essa variável para a URL pública correspondente.

## Arquivos
- `src/frontend/styles/cinematic.css` (mudança visual)
- `docs/DESIGN_CHAT.md` (especificação e pendência)

Não foi feito merge nem publicação.
