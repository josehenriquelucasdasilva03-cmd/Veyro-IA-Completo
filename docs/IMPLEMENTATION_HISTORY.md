# Veyro IA

> Registro histórico da base anterior. As referências a OpenAI abaixo descrevem implementações antigas e não são instruções para ativar serviços: a configuração e as chamadas OpenAI foram removidas da revisão local atual. Consulte `README.md` e `docs/STATUS.md` para o comportamento vigente.

Central móvel privada para planejar vídeos de até 30 segundos, sem áudio.

## Implementado nesta etapa

- Projetos persistentes por usuário, com salvamento automático, revisões concorrentes e histórico restaurável.
- Roteiro manual: adicionar, remover, reordenar e proteger cenas; preservação da duração total.
- Referências persistentes em R2 (25 MB por arquivo, 12 por pedido); metadados básicos de vídeos, sem análise temporal simulada.
- Conversas registradas, memórias explícitas por projeto ou globais, busca textual e remoção de preferências.
- Comando determinístico `Lembre: ...` sem depender de modelo. Não treina nem modifica pesos de um modelo.
- Núcleo com contexto isolado, uma chamada de IA por pedido, propostas de cenas, verificação estrutural, histórico de tarefas e aplicação explícita de propostas.
- Adaptador OpenAI Responses no servidor: texto e até quatro imagens compatíveis (5 MB cada), saída estruturada. Nunca envia chaves ao cliente.
- Ausência de conexão, recusa, falha e timeout aparecem como estados reais. Sem respostas de demonstração.

## Conexão ainda pendente

Nenhuma chave ou serviço pago foi configurado. Para habilitar respostas reais, o ambiente de produção deve receber `OPENAI_API_KEY` como segredo, `OPENAI_MODEL` com um modelo compatível com imagens e saída estruturada e `VEYRO_AI_ENABLED=true`, após configurar conta e orçamento pelo fluxo seguro da plataforma. Não coloque chaves no código ou no navegador.

A integração foi testada com respostas controladas, sem chamadas pagas. Uma chamada real deverá ser validada após a conexão.

## Partes da especificação ainda não implementadas

Geração/renderização de vídeo, corte e edição automática, melhoria de resolução/fps, análise temporal de vídeo, busca vetorial/semântica, fila distribuída, fallback entre motores, circuit breaker e Image Studio. Os módulos deste MVP são funções lógicas, não 15 agentes independentes. A aplicação não promete 4K/120 fps ou geração em durações não suportadas por um motor.

O núcleo registra tarefas, dependências e timeout de 45 segundos. Não repete automaticamente POSTs pagos com resultado incerto. Os pedidos aguardando conexão são registros, não uma fila que dispara cobranças automaticamente quando uma chave é adicionada.

## Dados e desenvolvimento

D1 (`DB`) mantém projetos, mensagens, memórias, versões, metadados de arquivos e execuções. R2 (`BUCKET`) mantém os bytes. A identidade vem do cabeçalho de usuário autenticado do dispatcher Sites; todas as rotas de dados validam a propriedade do projeto. A publicação permanece privada.

`npm ci`, `npm test`, `npm run build`. Schema em `db/schema.ts`; gerar novas migrações com `npm run db:generate`. Nunca alterar uma migração aplicada.

O build incorpora os arquivos públicos no Worker ESM em `dist/server/index.js`. A publicação usa o projeto Sites existente, com migrações geradas e bindings declarados em `.openai/hosting.json`.

A exportação JSON inclui roteiro, mensagens, memórias, referências e atividade, mas não os bytes de mídia. A remoção de uma referência do pedido preserva o arquivo para permitir restauração de versões. Excluir uma memória impede seu uso nas próximas consultas de memória; não reescreve mensagens antigas.

## Complemento: Editor e Photo Studio (0.5)

- Photo Studio independente do vídeo, com rascunho persistente, geração/edição/aprimoramento, 1 a 5 variantes por pedido ou cena, referência de entrada e instruções de preservação.
- Pedidos persistentes, cancelamento, resultados parciais, galeria e uso de imagens como referências. O adaptador OpenAI Images precisa de `OPENAI_IMAGE_MODEL`, `OPENAI_API_KEY` e `VEYRO_IMAGES_ENABLED=true`. Nada foi conectado ou cobrado nesta atualização.
- Chamadas de imagem são sequenciais, uma por variante, com bloqueio de execução duplicada e timeout. Falhas não disparam repetição automática de chamadas pagas. Pedidos antigos aguardando conexão só executam após ação explícita.
- Verificação técnica de PNG e dimensões; avaliação estética/continuidade automática ainda não implementada. Resultados ficam marcados para revisão humana.
- Roteamento local de exemplos comuns e roteamento semântico pelo Core quando conectado; pedidos ambíguos continuam disponíveis nos controles explícitos.
- Editor com timeline persistente, início/fim, divisão ao meio, reordenação, velocidade, desfazer/refazer durante a sessão e restauração pelo histórico. Original preservado.
- Prévia de trechos e exportação experimental sem áudio, via Canvas/MediaRecorder, até 30 segundos e alvo 30 fps. A exportação mantém o conteúdo inteiro com barras no formato escolhido; não faz reenquadramento inteligente. Saída WebM ou MP4 conforme suporte do navegador, até 720p/360p. Não promete cortes exatos por frame, fluidez garantida, 4K, processamento em segundo plano ou recuperação após fechar a aba.
- Comando local restrito: `Corta os 3 primeiros segundos` altera o início do primeiro trecho. Interpretação livre de edição continua pendente.

Ainda pendentes do complemento: geração real após configuração e validação da API; avaliação visual automática; correção de cor/áudio, legendas, efeitos, máscaras, tracking, proxies, renderização profissional no servidor, aprendizado por exemplos e processamento distribuído. A interface e os contratos não equivalem à conclusão de todas as fases do PDF.

## Conversa e interface cinematográfica (0.6)

- Interface preto/dourado baseada na referência, fundo de montanhas e lago criado para este projeto e otimizado em WebP, sem texto sobreposto no arquivo. Texto e controles são elementos acessíveis da interface.
- Chat como tela principal, boas-vindas somente em conversas vazias, menu lateral recolhível e gaveta móvel, sugestões, rascunhos independentes e perfil com nome/foto. Conversas anteriores são importadas sem apagar as tabelas originais.
- Cada conversa tem mensagens próprias e compartilha apenas contexto do projeto e memórias explicitamente guardadas. Abrir nova conversa preserva roteiro, mídia e preferências.
- Streaming SSE real de texto, interrupção, estado incompleto e recuperação de texto parcial. Nenhuma resposta fictícia quando não há provedor. Pedidos de imagem e edição aparecem como cartões no chat; a geração continua exigindo ação explícita e provedor configurado.
- `ModelProvider` suporta Responses da OpenAI e servidor HTTPS compatível com Chat Completions. Para servidor próprio: `MODEL_PROVIDER=local`, `MODEL_BASE_URL` (base HTTPS incluindo `/v1` quando aplicável), `MODEL_NAME`, `VEYRO_CHAT_ENABLED=true`, segredo opcional `MODEL_API_KEY`. Ativar `MODEL_VISION_ENABLED` e `MODEL_TOOL_CALLS` somente se o servidor suportar esses recursos. Isso não instala nem executa um modelo no celular ou no Worker.
- FAST/STANDARD/DEEP são níveis internos de orçamento de saída, não treinamento ou raciocínio interno exibido. Saúde/capacidades são métodos do adaptador; configuração não garante conectividade real.
- Microfone opcional para ditado quando há suporte a SpeechRecognition e permissão do navegador. Não gera áudio de vídeos.
- Verificação: 17 testes de API/domínio, incluindo isolamento, importação, rascunhos, streaming incompleto e cancelamento; fluxo DOM integrado de chat, criação/reabertura de conversas, Photo Studio e editor. Provedores simulados exclusivamente nos testes; nenhuma chamada paga. Sem teste visual em navegador real ou teste em aparelho nesta etapa.
- A exportação antiga do projeto inclui as mensagens de roteiro; conversas novas têm armazenamento separado e ainda não entram nessa exportação JSON. Sem busca semântica, instalação de modelo, treinamento ou inferência offline no celular.


## Memória, histórico e pesquisa (0.7)

Implementação do PDF `Veyro_IA_Memoria_Historico_e_Pesquisa_Web.pdf` adaptada ao Site existente. D1 é preservado: não foi criada uma dependência obrigatória de PostgreSQL. Vetores ficam em JSON e a similaridade é calculada sobre conjuntos limitados; não equivale a um índice pgvector de grande escala.

### Disponível sem conexão de IA

- Conversas renomeáveis, arquiváveis e excluíveis, busca por título/mensagens/projeto e paginação das mensagens antigas. Exclusão remove mensagens, fontes, pesquisas e memórias locais da conversa; o projeto e as memórias gerais permanecem. Conversas migradas mantêm um registro sem conteúdo para evitar reimportação; a migração preserva títulos existentes.
- Memórias de usuário, projeto, conversa e preferências de uso. Formulário com criação, edição com controle de revisão, busca textual e exclusão. Alterar/esquecer invalida resumos e vetores derivados de memória, sem reescrever o histórico.
- Comandos diretos ampliados de SAVE, UPDATE, DELETE e RECALL, com resolução conservadora de “isso” para a última declaração do usuário e pedido de esclarecimento quando não houver alvo único. Não há treinamento dos pesos do modelo.
- Estados reais de pesquisa e configuração: sem serviços, o pedido fica WAITING e nenhuma fonte/resposta de pesquisa é fabricada.

### Implementado e dependente de serviços configurados

- Classificação semântica de memória por modelo e identificação do alvo dentro de memórias pertencentes ao usuário. Ambiguidades não devem provocar exclusão múltipla.
- Títulos de 3–8 palavras e resumos incrementais por modelo, preservando renomeação manual. Contexto com projeto, até 8 memórias relevantes, resumo, mensagens recentes e até 4 trechos antigos por similaridade.
- Vetorização compatível com API de embeddings e recuperação por similaridade. Queda do serviço mantém busca por palavras e informa o modo utilizado.
- Decisão de pesquisa por regras e classificador, planejamento de consultas, SearXNG via SearchGateway, leitor protegido, ranking, remoção de cópias, extração de afirmações, correspondência de trechos e segunda revisão pelo modelo. QUICK (1 consulta/3 páginas), STANDARD (até 3/5), DEEP (até 2 rodadas, 6 consultas totais/8 páginas), limite total de 110 segundos e 20 pesquisas/hora/usuário. A consulta inicial é sempre preservada e nenhuma memória privada entra nas consultas automaticamente.
- Resultados: afirmações com marcadores numerados, fontes clicáveis, domínio/data, divergências, limitações e estado de evidência insuficiente. “SUPPORTED” significa que passou por conferência de trecho e revisão de modelo, não que há garantia de verdade ou confiança estatística calibrada.
- Cache de pesquisa separado por usuário, expiração de 30 minutos. Pesquisa não cria memória pessoal automaticamente. Falha individual de uma página permite continuar com as demais.
- Tarefas auxiliares registradas em D1 e executadas via `waitUntil`, com chamadas limitadas a 18 segundos, em paralelo. As tarefas podem retomar no próximo envio; não é uma fila distribuída com entrega garantida. Embeddings antigos são processados em lotes de 20 por envio. O chat não depende da conclusão dessas tarefas.

### Configuração necessária para ativar

Nenhuma credencial foi criada e nenhuma chamada paga foi feita. O código do Site foi preparado, mas ainda faltam serviços reais conectados.

1. Modelo de conversa: configuração OpenAI ou servidor compatível já descrita acima. `VEYRO_KNOWLEDGE_ENABLED=true` habilita títulos/resumos e classificador adicional de necessidade web. Usar o fluxo seguro do plugin OpenAI Developers para chave OpenAI; não enviar chaves no chat.
2. Vetores: `VEYRO_EMBEDDINGS_ENABLED=true`, `EMBEDDING_MODEL`; opcional `EMBEDDING_BASE_URL` HTTPS e segredo `EMBEDDING_API_KEY` para servidor próprio. Na OpenAI, usa a chave secreta existente e `/v1/embeddings`. O modelo precisa ser confirmado antes de ativar.
3. Pesquisa: `VEYRO_WEB_ENABLED=true`, `SEARCH_BASE_URL` de uma instância própria SearXNG com JSON ativado; segredo `SEARCH_API_KEY` se houver autenticação. O gateway envia safe search 2.
4. Leitura: `WEB_READER_URL` HTTPS apontando para `services/web-reader/server.py` e segredo `WEB_READER_KEY`, igual a `READER_KEY` no serviço. Leitor é um serviço separado, não executado no Worker e ainda não hospedado. Dockerfile e requisitos incluídos; requer hospedagem HTTPS e configuração real para funcionar. Não há instância pública arbitrária selecionada nem fallback inseguro.

O leitor faz resolução DNS e valida todos os endereços, conecta a IP público fixado e verifica TLS com o hostname original, revalida redirects, limita bytes/tempo e consulta robots. Extrai HTML/texto/PDF com seções relevantes. Renderização JS é opcional (`READER_RENDER_JS=true`), requer Playwright, bloqueia rede direta, WebSockets e recursos de outra origem; páginas dependentes desses recursos podem permanecer indisponíveis. O container/Chromium e a extração de PDFs reais não foram executados neste ambiente. O provedor instalado deve respeitar igualmente restrições de rede, limites e políticas de acesso.

### Verificação

26 testes Node, 5 testes Python e fluxo DOM integrado: memória criar/editar, arquivo/exclusão de conversa, conservação das memórias de projeto, pesquisa sem conexão, vetores por serviço simulado, títulos/resumos, fontes divergentes, queda de página, trechos inexistentes, bloqueios de URL/DNS e conexão a IP fixado. Serviços externos simulados somente em testes. Não representa teste de produção dos provedores nem validação no celular.

Referências de implementação: [SearXNG Search API](https://docs.searxng.org/dev/search_api.html) e [OpenAI embeddings](https://developers.openai.com/api/docs/guides/embeddings).
