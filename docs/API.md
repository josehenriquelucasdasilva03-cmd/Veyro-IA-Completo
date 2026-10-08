# Rotas atuais

Todas as rotas de dados exigem identidade autenticada e propriedade do recurso. Nomes abaixo descrevem o contrato atual, não uma proposta de novas APIs. Corpos JSON são usados nas operações comuns; arquivos usam FormData.

| Rota | Métodos e finalidade |
|---|---|
| `/api/status` | GET: disponibilidade/configuração dos recursos |
| `/api/projects` | GET: listar; POST: criar projeto de conteúdo |
| `/api/projects/:id` | GET: projeto/detalhes; PUT: estado com revisão concorrente |
| `/api/projects/:id/chat` | POST: pedido de roteiro/revisão pelo núcleo anterior |
| `/api/projects/:id/intent` | POST: classificar intenção de mídia por regras |
| `/api/projects/:id/apply` | POST: aplicar proposta revisada |
| `/api/projects/:id/memories` | POST/DELETE: compatibilidade com memórias por projeto |
| `/api/projects/:id/versions/:versionId` | GET: conteúdo de uma versão |
| `/api/projects/:id/restore` | POST: restaurar versão preservando estado anterior |
| `/api/projects/:id/assets` | POST: enviar imagem/vídeo |
| `/api/projects/:id/assets/:assetId` | GET: ler mídia, inclusive intervalo |
| `/api/projects/:id/photo-jobs` | POST: preparar pedido de imagem |
| `/api/projects/:id/photo-jobs/:jobId` | GET: andamento/resultados |
| `/api/projects/:id/photo-jobs/:jobId/run` | POST: executar uma variante |
| `/api/projects/:id/photo-jobs/:jobId/cancel` | POST: cancelar pedido |
| `/api/conversations` | GET: listar/buscar/arquivadas; POST: criar conversa |
| `/api/conversations/:id` | GET: reabrir/paginar; PATCH: título/rascunho/arquivo; DELETE: excluir |
| `/api/conversations/:id/messages` | POST: enviar mensagem; resposta SSE |
| `/api/conversations/:id/cancel` | POST: interromper resposta |
| `/api/conversations/:id/jobs` | GET: tarefas auxiliares |
| `/api/memory` | POST: guardar memória |
| `/api/memory/search` | GET: busca por texto ou similaridade quando configurada |
| `/api/memory/:id` | PATCH: atualizar com revisão; DELETE: esquecer |
| `/api/research` | POST: executar pesquisa limitada |
| `/api/research/:id` | GET: pesquisa, fontes e afirmações |
| `/api/profile` | GET/PUT: nome e metadados de perfil |
| `/api/profile/avatar` | GET/POST: foto do perfil |
| `/api/tts/synthesize` | POST: converter texto de resposta/demonstração em áudio MP3 pelo provedor TTS configurado |

SSE do chat: `status`, `token`, `notice`, `tool`, `research_status` e um estado terminal `done`, `waiting`, `error` ou `cancelled`. Não trate conexão encerrada sem evento terminal como sucesso.

Principais tabelas: projects, messages, conversations, chat_messages, memories, versions, assets, runs, media_jobs, profiles, research_sessions, research_sources, research_claims, claim_sources, knowledge_jobs e research_cache.

## Voz e tradução locais

- `POST /api/speech/transcribe`: `multipart/form-data` com `file` e `language` (`auto`, `pt`, `en`, `es`, `fr`, `de`, `it`, `ja`, `zh`, `ru`, `ar`, `ko`, `nl`). Limite 15 MB e 120 segundos. Resposta `{text, language, durationSeconds}`. O Worker encaminha somente a serviço HTTP de loopback configurado e autentica com `SPEECH_TOKEN`.
- `POST /api/translate`: JSON `{text, sourceLanguage, targetLanguage}`; origem pode ser `auto`, destino precisa ser um idioma suportado. Limite de 8.000 caracteres. Resposta `{translation, detectedLanguage, targetLanguage}`. Usa o adaptador `QwenTranslator` e um endpoint Ollama local.

Ambas exigem autenticação do aplicativo e cabeçalho de mutação `X-Veyro-Request: 1`. Não apontar serviços locais a partir de implantação hospedada.

## Voz neural do Veyro

`POST /api/tts/synthesize` recebe JSON `{text, profile, rateAdjustment, pitchAdjustment}` e retorna `audio/mpeg`. `profile` deve ser `atlas`, `neo`, `luna` ou `iris`; nunca recebe nome de voz arbitrário. Texto é limitado a 5.000 caracteres e 24 KB no pedido; velocidade entre -15% e +15%; tonalidade entre -6% e +6%; resposta MP3 até 8 MB. O endpoint do provedor é fixo por região, não controlado pelo cliente, e tem timeout de 30 segundos.

O adaptador padrão é Azure Speech (`TTS_PROVIDER=azure`), configurado no ambiente privado do backend por `AZURE_SPEECH_REGION` e `AZURE_SPEECH_KEY`. A resposta de `/api/status` inclui `tts: true/false`. A chave não é lida nem enviada pelo frontend. Se não configurado ou se o Azure falhar, o endpoint retorna erro controlado; a API de chat e as respostas textuais continuam independentes. A síntese envia o texto à Microsoft e pode gerar cobrança após a franquia da conta. Preferências de perfil e reprodução permanecem apenas no navegador.

## Geração local de imagens

`POST /api/projects/:id/photo-jobs` cria um pedido (prompt e opções); `POST /api/projects/:id/photo-jobs/:jobId/run` gera a próxima imagem usando o adaptador ComfyUI local quando `VEYRO_IMAGES_ENABLED=true`. A interface continua apresentando o pedido em espera se o gerador estiver desabilitado. `GET` retorna estado e imagens salvas no armazenamento do projeto. A implementação atual só aceita geração de texto, até cinco imagens em sequência, e formatos quadrado, horizontal ou vertical. Ela exige `IMAGE_PROVIDER=comfyui-local`, `IMAGE_BASE_URL` em loopback, o nome do checkpoint `.safetensors` e um endpoint local Ollama configurado. Não há uma rota pública para chamar serviços locais.

## Pesquisa na web

`POST /api/research` inicia pesquisa nos modos `QUICK`, `STANDARD` ou `DEEP`; `GET /api/research/:id` consulta o relatório, as fontes e as afirmações apoiadas por trechos. A busca consulta SearXNG (`/search?q=...&format=json`); o leitor separado busca páginas públicas HTTPS e valida destinos e redirects. Ative `VEYRO_WEB_ENABLED=true` e configure os endpoints e segredo do leitor. `researchConfig` aceita HTTPS ou HTTP somente em `localhost`, `127.0.0.1` e `::1`; o Compose local publica SearXNG e leitor em `127.0.0.1:8081` e `127.0.0.1:8082`. SearXNG requer JSON habilitado em sua configuração. Opcionalmente `VEYRO_AGENTS_ENABLED=true` ativa o planner CrewAI em `127.0.0.1:8766` para os modos STANDARD/DEEP; o backend envia perguntas ao serviço autenticado, e o CrewAI usa somente o Ollama local. A ausência/falha desse serviço aciona o planejador existente. `GET /api/status` expõe apenas `agents: boolean` para refletir a configuração.
