# Prévia de interface no Netlify

O build principal da Veyro gera o Worker em `dist/server/index.js`; esse arquivo não é um site estático e não inclui `dist/index.html`. A configuração da prévia precisa publicar a interface separadamente.

O `netlify.toml` executa o build do Worker e o script `scripts/build-netlify.mjs`, que copia a interface e seus recursos para `dist/site`. O Netlify publica esse diretório. Assim, `/` encontra `index.html` e os caminhos dos scripts, estilos e imagens usados pela página.

Não há regra de redirecionamento SPA. O frontend permanece na rota `/` e usa `/api/...` para as chamadas do backend; uma regra genérica `/* → /index.html` esconderia erros de API e não é necessária para abrir a página inicial.

## Limite desta prévia

Esta configuração resolve a publicação da interface para visualização. Ela **não executa o Worker Veyro no Netlify**. A aplicação real depende de identidade autenticada e bindings de banco D1 e armazenamento R2; a integração com Qwen/Vast também depende de URL HTTPS autenticada e segredos privados no ambiente do backend. Portanto, abrir a página na prévia não confirma que o chat ou o Qwen remoto estejam conectados.

Não coloque credenciais do modelo no frontend nem em variáveis públicas do Netlify. Para testar o chat, o backend compatível precisa estar em execução, com bindings e variáveis privadas configuradas, e o frontend de teste deve encaminhar `/api` a esse backend através de uma origem segura.
