# Veyro IA 3D Studio

## Recursos desta versão

O editor 3D é executado no navegador com Three.js e abre em uma janela isolada, acessível pelo menu lateral 3D e pelo botão 3D Studio das ferramentas. O editor não modifica o chat, o login, o projeto salvo, o Worker de autenticação ou a animação Cosmos.

Há 12 modelos geométricos iniciais: robô, planeta, foguete, carro, casa, árvore, coração, estrela, medalha, cubo, esfera e anel, além da composição abstrata. O texto em português seleciona os modelos reconhecidos. Uma descrição desconhecida gera uma escultura abstrata, e não um objeto novo fiel ao texto.

O usuário escolhe cor e acabamento (modelo, ícone 3D e aparência holográfica), gira/aproxima a peça com mouse ou toque e pode solicitar arquivos GLB (malha 3D) e PNG (captura). O download é oferecido por um link dentro do editor, após a geração local do arquivo.

PNG/JPG/WEBP de até 5 MB e 16 megapixels podem ser transformados em relevo por luminosidade. Isso não calcula profundidade real e não cria uma réplica fiel da pessoa ou do objeto da fotografia. A resolução geométrica é limitada a 64 por 64 células.

## Arquitetura

- model3d-shapes.js: catálogo e geração de malhas geométricas
- model3d-engine.js: visualização WebGL, conversão em relevo, GLTFExporter e PNG
- model3d-ui.js: controles do diálogo e preparação de downloads
- model3d.css: tema preto/dourado e layout responsivo
- scripts/build.mjs: empacota Three.js/OrbitControls/GLTFExporter na mesma origem do Worker

Não usa API paga, chave, CDN ou serviço externo. Imagens não saem do navegador neste módulo e modelos não são persistidos na conta. A visualização WebGL e a captura precisam ser validadas em Chrome Android e desktop, com testes manuais de GLB em visualizador externo. A renderização usa pixel ratio reduzido em celular e interrompe a animação quando o diálogo é fechado.

## Limitações e próxima evolução

Geração universal de texto para modelo 3D, reconstrução 3D verdadeira a partir de uma imagem, exportação para impressão 3D e animação de malhas exigem integrações especializadas adicionais. O Qwen do chat não deve ser apresentado como se já gerasse qualquer geometria 3D. Qualquer provedor futuro precisa de execução isolada, controles de custo, autenticação, filas e arquivos validados.

Execute npm ci, npm test e npm run build com Node 24 ou posterior. Não fazer merge nem publicar sem autorização. Reconciliar com a PR de consolidação antes da publicação.
