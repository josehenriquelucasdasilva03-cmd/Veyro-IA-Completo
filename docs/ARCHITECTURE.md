# Arquitetura e mapa de edição

## Interface

`src/frontend/index.html` carrega os scripts nesta ordem: studio, chat, knowledge e app. Esses arquivos compartilham o estado da aplicação por escopo global e executam as inicializações ao final de `app.js`. Preserve a ordem ao alterar a interface; não introduza `type=module` sem adaptar as dependências.

- `app.js`: estado do projeto, salvamento, referências, revisão e navegação principal.
- `components/chat.js`: mensagens, streaming, cancelamento, perfil e conversas.
- `components/chat.js` + `styles/cinematic.css`: detectam a transição para a tela inicial vazia e executam a sequência de entrada CSS; a câmera atua somente na camada de paisagem, com alternativa instantânea para `prefers-reduced-motion`.
- `components/chat.js`: seleciona e salva localmente a identidade visual dos quatro mascotes; continua usando o mesmo chat e o mesmo modelo. `styles/cinematic.css` enquadra a arte de `public/assets/veyro-mascots.jpg` por CSS.
- `components/chat.js`: seleciona um dos quatro perfis TTS oficiais, salva os controles no `localStorage`, solicita síntese para respostas ou demonstrações e controla o áudio MP3 no navegador. Auto-leitura começa desligada; respostas em texto não dependem do TTS.
- `components/knowledge.js`: gerenciamento de memória/histórico e cartões de fontes.
- `components/studio.js`: Photo Studio, timeline, prévia e exportação experimental.
- `styles/base.css` e `styles/cinematic.css`: base e sobreposições visuais.

`scripts/build.mjs` mantém os mesmos endereços públicos (`/app.js`, `/chat.js`, `/styles.css`, etc.) embora os arquivos editáveis estejam organizados em subpastas. O build incorpora a interface no Worker ESM em `dist/server/index.js`.

## Servidor e APIs

`src/api/router.js` exporta `fetch(request, env, ctx)`. Serve os arquivos públicos e direciona chamadas `/api/`.

A identidade de produção vem de `oai-authenticated-user-id`, fornecida pelo dispatcher Sites. As alterações exigem `X-Veyro-Request: 1` e verificação de origem. Não use esse cabeçalho como autenticação de um servidor público fora dessa infraestrutura.

O adaptador `scripts/dev.mjs` injeta uma identidade fixa somente para desenvolvimento em loopback. Sua implementação não é incluída no Worker de produção.

## Contexto, memória e pesquisa

- `core/orchestrator.js`: propostas estruturadas de cenas, regras de revisão e chamadas de modelo.
- `core/model-provider.js`: adaptador Chat Completions com streaming e cancelamento; aceita Ollama/local (`http` somente em loopback) ou endpoints remotos `runpod` e `vast` (HTTPS obrigatório e autenticação Bearer ou Basic mantida no backend). URL com query string, credencial embutida ou fragmento é recusada; configuração remota exige segredo. Consulte `docs/VAST_AI.md`.
- `core/gpu-lock.js`: fila exclusiva compartilhada pelo chat Qwen e pelo gerador local para impedir chamadas concorrentes na GPU.
- `media/image-provider.js`: adaptador ComfyUI local; envia workflow SDXL-Lightning, acompanha a execução e valida o arquivo retornado. O adaptador descarrega o modelo Ollama configurado antes de enviar a geração.
- `media/photo.js`: persiste o pedido e grava imagem produzida no armazenamento do projeto. A integração atual aceita geração por texto, não edição ou aprimoramento.
- `api/language.js`: rotas autenticadas de transcrição e tradução. Voz só é encaminhada a `127.0.0.1` com token local; uploads têm limite de 15 MB e a transcrição valida duração de 120 s.
- `api/tts.js` + `tts/provider.js`: `POST /api/tts/synthesize` usa o contrato `TtsProvider`. Azure envia SSML do backend; Pocket TTS opcional faz proxy multipart para serviço local em loopback, usando só a voz pronta portuguesa Rafael. Ambos validam perfil/entrada e limitam o áudio a 8 MB; Pocket tem timeout de 120 s e não exige chave. Um Worker sem provedor continua atendendo o chat textual.
- `translation/translator.js`: contrato de tradução (`translate`) e adaptador Qwen via `ModelProvider`; permite trocar o adaptador sem mudar API ou frontend.
- `services/speech/server.py`: processo Python separado, escuta apenas em `127.0.0.1:8765`, usa faster-whisper `small` em CPU INT8 e permite uma transcrição por vez. O modelo baixa sob demanda no primeiro uso.
- `core/context.js`: contexto do projeto, resumo, recuperação e tarefas auxiliares.
- `memory/knowledge.js`: memória explícita, classificação, vetores, busca e isolamento.
- `history/conversations.js`: mensagens por conversa, importação do histórico anterior e streaming do chat.
- `research/research.js`: consulta, ranking, leitura, afirmações e verificação.
- `agents/crewai-provider.js`: adaptador opcional para planejamento de consultas via serviço CrewAI em loopback; usa fila de GPU e retorna ao planejador atual em caso de indisponibilidade.
- `services/agents/server.py`: serviço Python local com dois agentes sequenciais (planejador/revisor), autenticação por token, sem ferramentas de execução; chama apenas o Ollama local configurado.
- `research/web-gateway.js`: adaptadores de busca SearXNG e leitor seguro; HTTPS remoto é aceito e HTTP só é aceito em loopback.
- `services/research/docker-compose.yml`: SearXNG, Valkey e leitor Python publicados somente em loopback para o modo local; `settings.yml` ativa JSON.

O contexto diferencia memória confirmada, histórico e fontes pesquisadas. Não existe treinamento de modelo com os dados recebidos. CrewAI é opcional: coordena somente o planejamento/revisão de consultas nos modos Padrão e Aprofundado. Pesquisa, leitura, sanitização e checagem de evidências permanecem no backend Veyro; não é permitido ao agente executar comandos ou abrir URLs diretamente.

## Persistência

`db/schema.ts` descreve as tabelas. `drizzle/` preserva todas as migrações aplicadas até a versão 7. Nunca edite migrações existentes em uma evolução do projeto: altere o schema e execute `npm run db:generate` para criar outra.

Produção: D1 (`DB`) e R2 (`BUCKET`). Desenvolvimento: SQLite em disco e arquivos separados em `.local/`. Testes automatizados: SQLite em memória e objetos simulados. Nenhum deles lê o banco de produção.

O armazenamento local aplica migrações uma vez, verifica hashes em reinicializações e suporta os intervalos de mídia utilizados pelo editor. Não é um emulador completo de D1/R2 e não substitui a validação no ambiente real antes de publicar.

## Build e futura publicação

`npm run build` apenas gera arquivos locais. Não há script npm de publicação. A identidade do Site foi preservada para continuidade, mas esta entrega não enviou commits, versões ou configurações ao serviço de hospedagem. Publicar dependerá de nova instrução explícita do usuário.

O chat principal, as conversas e a tradução usam `ModelProvider`; não há chamada direta ao serviço da OpenAI. O padrão permanece Ollama local. `MODEL_PROVIDER=vast` conecta o Qwen3.5:35b no Vast.ai e `MODEL_PROVIDER=runpod` aceita o adaptador RunPod; ambos exigem Chat Completions via HTTPS e Basic ou Bearer no ambiente privado do servidor. `GET /api/model/health` é uma verificação autenticada e não retorna credenciais. O modo `local` aceita apenas URLs de loopback. Para imagens, o adaptador opcional usa somente ComfyUI local em loopback, com checkpoint SDXL-Lightning configurado. A fila de GPU evita concorrência dentro do processo Veyro; antes de imagem, o modelo Qwen configurado é descarregado pela API local do Ollama se estiver carregado. Embeddings só funcionam com `EMBEDDING_BASE_URL` configurado. Um Worker publicado não alcança Ollama ou ComfyUI instalados no computador do usuário.

Voz, tradução e pesquisa local são recursos do servidor de desenvolvimento: o navegador grava via `MediaRecorder`, envia o áudio ao serviço Whisper local, enquanto tradução e pesquisa usam o Qwen no Ollama. Pesquisa chama SearXNG no loopback, lê páginas públicas por um leitor com validação de DNS/IP/redirect e apresenta fontes. O Docker Compose mapeia portas apenas para `127.0.0.1`; em configurações hospedadas, apenas HTTPS é aceito. Não encaminhe os serviços locais à internet: um Worker hospedado não acessa o loopback do notebook.
