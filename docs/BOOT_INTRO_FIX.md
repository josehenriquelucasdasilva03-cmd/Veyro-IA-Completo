# Correção da entrada 3D (12/10/2026)

## Diagnóstico
A animação antiga era ligada por updateWelcome() após loadProject() e chamadas /api/status e /api/projects. Em prévias Netlify ou GitHub Pages, não existe API Worker nesses domínios. Se o bootstrap da aplicação falhasse, o estado welcome-intro jamais era acionado; a pessoa via a tela principal sem a introdução.

## Correção
- Uma tela de entrada independente aparece no HTML antes do chat e do gate de autenticação.
- 16 segundos (botão Pular introdução), com fallback CSS e planetas mesmo quando Three.js/WebGL não carrega, sem depender de /api.
- JS carrega WebGL opcionalmente e encerra automaticamente, respeitando redução de movimento e dispositivos que economizam dados.
- CSS encerra a tela automaticamente mesmo que um script falhe. Nenhum modal prende o usuário.
- A animação antiga do welcome não reproduz pela segunda vez.
- Mesmos assets em Netlify e no Worker. GitHub Pages exige build e publicação própria de dist/site, não hospeda API do Qwen.
- Manter autenticação Google/GitHub e dados privados no Worker/Cloudflare Access, sem simular login real no site estático.

## Validação
Após CI, abra a URL da prévia do PR no navegador, recarregue a página e observe a entrada. Teste também o botão de pular, tamanho de tela móvel e o modo de acessibilidade reduzir animações. Para chat real, ainda exige o Worker autenticado, D1 e Qwen.
