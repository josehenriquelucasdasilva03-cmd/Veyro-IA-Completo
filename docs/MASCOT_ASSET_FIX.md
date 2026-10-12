# Mascotes 3D ilustrados: correção de recorte e seleção

Diagnóstico (12/10/2026): `veyro-mascots.jpg` contém quatro robôs numa única imagem 1536x1152. A imagem era servida (HTTP 200) em GitHub Pages e Netlify, mas o recorte por `background-position` e porcentagens de tamanho não aparecia no celular. Resultado observado: quatro cartões com retângulos escuros.

Correção: converter a imagem existente em **quatro retratos e quatro imagens de corpo individuais** em WebP. Os cartões usam `veyro-[cor]-card.webp` com `background-size:contain`; avatar de chat e prévia usam `veyro-[cor]-avatar.webp` com `cover`. A página e Worker recebem todos os arquivos pelos builds separados e caminhos relativos. São imagens estáticas com aparência 3D; **não são modelos 3D animados**.

Cores e personagens: Black, Blue, Green, Red. O antigo "Prime" foi corrigido para "Red" e a preferência anterior `prime` é migrada em memória para `red`. O arquivo original permanece por compatibilidade, mas não é usado para a exibição dos mascotes.

Verificações: testes confirmam assinaturas reais WebP, oito arquivos presentes, quatro opções, CSS sem sprite e inclusão nos builds. No telefone, testar botão "Trocar", miniaturas, preview e avatar nas respostas. Os Workers de Qwen/autenticação não foram alterados.
