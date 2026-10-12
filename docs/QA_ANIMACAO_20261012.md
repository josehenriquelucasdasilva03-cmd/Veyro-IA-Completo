# Revisão independente de estabilidade das animações

Branch isolada de QA sobre PR #11, sem sobrescrever trabalho de design nem fazer merge/publicação.

Defeito analisado: builds estáticos Netlify ou GitHub Pages não incluem API; o frontend aguardava dados autenticados antes de mostrar a tela inicial. Se API falhasse, animação poderia não aparecer. O tratamento de erro agora chama updateWelcome quando ainda não há conversa, preservando a interface visual e o aviso de que a API está desligada.

Verificação automática: Node 24, npm test, bundle, build estático, navegador Chromium real nos tamanhos desktop 1440x900 e Android 393x851, disponibilidade de elementos, ausência de pageerrors, falta de overflow horizontal, menu no celular, interação e reduced-motion.

Não confundir teste de navegador em CI com testes de GPU, autenticação, desempenho de dispositivos reais e integração com nova implementação de animações produzida em outro chat. Sem medidas reais de frame rate, memória, travamentos prolongados e teste de hardware, não se deve declarar garantia numérica de 80%. QA com aparelho físico e fluxo completo continua obrigatório.

A bateria de browser também verifica três recarregamentos consecutivos sem duplicar as camadas e um cenário de conversa autenticada simulada (API mockada), incluindo saída da tela inicial e escurecimento de fundo. Uma simulação de API **não certifica** autenticação real.

Defeito adicional: na primeira visita o diálogo de seleção de mascote era aberto após 350 ms, encobrindo a introdução cinematográfica de 5,2 s. O diálogo agora só aparece depois da introdução, se a tela de boas-vindas continuar aberta, a aba estiver visível e o movimento não tiver sido reduzido. Também existe teste de primeiro acesso sem preferências salvas.
