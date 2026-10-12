# Fix: mascotes não aparecem no GitHub Pages

Causa: `src/frontend/styles/cinematic.css` carregava o sprite dos mascotes por `url('/veyro-mascots.jpg')`, apontando para a raiz de `github.io`, fora da pasta de projeto `/Veyro-IA-Completo/`.

Correção: `url('./veyro-mascots.jpg')`. Como `cinematic.css` e `veyro-mascots.jpg` são copiados juntos para a raiz de `dist/site`, essa URL funciona no GitHub Pages, no Netlify e no Worker que serve esses dois recursos no mesmo nível.

Validação: arquivo físico em `public/assets/veyro-mascots.jpg`, script de build copiando-o, CSS apontando relativamente, testes para os quatro perfis (Black, Blue, Green, Prime). No celular, testar a imagem circular superior, avatar nas respostas e opções do botão **Trocar**.

Isso corrige o sprite 2D usado como retrato. Não é uma implantação de malhas de robôs 3D nem um mecanismo 3D interativo. O Qwen e o login não mudaram.
