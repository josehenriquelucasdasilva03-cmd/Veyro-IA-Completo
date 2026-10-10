# Situação da base entregue

Base funcional: versão 7 da Veyro IA. Esta cópia reorganiza os fontes e adiciona ambiente local; nenhuma alteração desta revisão foi publicada em produção.

## Utilizável sem provedores

Interface e projetos; histórico e rascunhos; busca, arquivo e exclusão de conversas; memória explícita; edição/revisão manual de cenas; referências; perfil; controles manuais da timeline; pedidos de imagem salvos. Os comandos de memória sem modelo usam regras limitadas e podem pedir esclarecimento.

## Chat local e conexão remota opcional

O chat usa Ollama local por padrão e aceita `MODEL_PROVIDER=vast` (Qwen3.5:35b) ou `MODEL_PROVIDER=runpod` para endpoints remotos HTTPS autenticados, com credenciais somente no ambiente privado do backend. `GET /api/model/health` permite verificar a conectividade sem revelar segredos. O endpoint HTTPS e as credenciais privadas do Vast ainda precisam ser configurados; não foi feita chamada real à GPU nesta revisão. A URL interna `127.0.0.1:21434` só é válida se o backend estiver na mesma máquina Vast. A URL HTTP com token compartilhada anteriormente não foi usada nem gravada no repositório; gere uma credencial nova antes de ativar o proxy. O modelo remoto não altera a hospedagem oficial. A chave e as chamadas da OpenAI foram removidas do fluxo de execução. A pesquisa na web está implementada e pode usar os serviços locais SearXNG + leitor por Docker Compose; ainda requer Docker, configuração e teste com internet no notebook. Títulos/resumos e embeddings continuam dependendo das configurações próprias. Photo Studio pode gerar imagens localmente com ComfyUI + SDXL-Lightning depois da instalação manual; ainda não executado no notebook-alvo.

A busca por palavras não equivale à recuperação por significado. Testes simulados não validam a qualidade, velocidade ou compatibilidade do modelo Ollama que o usuário instalar.

CrewAI está integrado como opção local para planejar e revisar consultas nos modos Padrão/Aprofundado. O serviço e as dependências estão no código, mas ficam desligados por padrão; exigem Python 3.12, instalação dos requisitos, Ollama/Qwen em execução e SearXNG/leitor configurados. Quando ativos, usam o Qwen já instalado e não uma API de IA externa. A instalação real e o desempenho dependem do notebook.

A tela inicial do chat agora tem entrada cinematográfica CSS com movimento da paisagem, título dividido, arcos SVG dourados, frase, cartões em sequência e composer. A animação é acionada na entrada da tela inicial, não em atualizações de mensagens, e respeita `prefers-reduced-motion`. Build e testes passaram; a reprodução visual, o FPS e o comportamento em aparelho físico não foram medidos em navegador nesta sandbox.

O chat permite escolher Veyro Black, Blue, Green ou Prime, mantendo uma única conversa/modelo. A leitura por voz oferece quatro perfis neurais Azure Speech diferentes e, agora, um adaptador alternativo Pocket TTS local com a voz portuguesa Rafael. Pocket fica separado do Azure; não fornece quatro vozes portuguesas distintas, então a interface mostra apenas o perfil Veyro Local quando `TTS_PROVIDER=pocket`. Azure continua com ajustes de tom/ritmo; a velocidade de reprodução e controles de reproduzir/pausar/continuar/parar permanecem no navegador. Leitura automática fica desligada por padrão. O proxy Pocket exige loopback, limita entrada/áudio e não envia o texto à internet. Testes simulados passaram, mas a síntese real depende de instalar o pacote/modelo no notebook e ainda precisa ser validada nele.

Análise das ferramentas do vídeo: Pocket TTS foi selecionado para a integração local de voz. Hermes Skills Hub não foi instalado no backend: Veyro já tem CrewAI para o fluxo de pesquisa, e importar skills executáveis de terceiros ampliaria a superfície de risco sem um sandbox dedicado. Kimi K3 in C não foi selecionado para o notebook; não substitui o Qwen já configurado e seu checkpoint divulgado é muito maior que o SSD de 512 GB do notebook. Grok Imagine usa API hospedada com preço por imagem/vídeo; não foi conectado. Muse Code é um agente separado para desenvolvimento de repositórios, não um modelo de runtime para o chat do site. Qwen3-Max é serviço hospedado/API, não o modelo aberto local já usado via Ollama; a Veyro mantém Qwen local/Vast.ai ou RunPod opcional e não ativa cobrança.

Verificação desta integração: `npm test` (9 arquivos, passou), `npm run build` (passou), `npm run test:agents` (2 testes, passou), `npm run test:reader` (5 testes, passou), checagem de sintaxe Python/JavaScript (passou). A prévia web não foi aberta nesta sandbox: o sistema recusou o bind local do servidor de desenvolvimento (`EPERM`); teste visual com Ollama/serviços reais ainda precisa ser feito no notebook.

## Limitações preservadas

- Geração de vídeo ainda não conectada.
- Exportação de montagem é experimental no navegador, sem áudio, até 30 segundos; depende do aparelho.
- Tarefas auxiliares usam waitUntil e lotes limitados, sem garantia de uma fila distribuída.
- Leitor Python roda no container local limitado a loopback ou por HTTPS; container, Chromium e leitura de PDFs reais não foram validados nesta entrega.
- A exportação JSON antiga do projeto não é um backup completo de todas as conversas novas.
- Nenhum teste em um celular físico foi realizado nesta etapa.
- Geração por texto integrada ao ComfyUI local com SDXL-Lightning de 4 passos. Edição, aprimoramento e imagem de referência continuam desabilitados.
- `core/gpu-lock.js` serializa chamadas de modelo e imagens; o adaptador tenta descarregar o Qwen no Ollama antes de gerar para reduzir disputa pelos 8 GB de VRAM.
- `scripts/download-image-model.ps1` baixa/retoma o checkpoint no diretório portátil do ComfyUI; o primeiro download exige internet e cerca de 6,94 GB.
- A rota do gerador aceita somente ComfyUI/Ollama em loopback e valida tipo, conteúdo e tamanho da imagem retornada.
- SearXNG + Valkey + leitor estão descritos em Compose com portas limitadas a loopback; a Veyro permite HTTP somente para endpoints exatamente em localhost/127.0.0.1/::1 e continua exigindo HTTPS para endpoints remotos.
- O serviço CrewAI também fica em loopback (`127.0.0.1:8766`), exige token gerado no setup e não possui ferramentas para comandos ou navegação. Ele sugere consultas; SearXNG e o leitor Veyro continuam realizando a pesquisa e validação.

## Alterações locais desta revisão

- O comando `npm run setup` prepara `.env` sem sobrescrever configuração existente e inicializa o SQLite local; `npm run model:download` baixa o modelo Qwen configurado via Ollama.
- O chat de projetos agora usa o adaptador local compartilhado com o chat de conversas.
- `.env.example` aponta para um Ollama local e não contém variáveis da OpenAI.
- O gerador de imagens da OpenAI foi removido e permanece indisponível até integração local.
- O padrão do backend foi definido para Qwen3.5 4B local via Ollama.
- Nenhuma alteração foi publicada no Site oficial.
- Microfone do chat grava pelo navegador e transcreve localmente via faster-whisper CPU INT8; o texto fica editável antes do envio.
- `POST /api/speech/transcribe` valida formato, 15 MB, token entre processos, loopback, máximo de 120 s e uma tarefa simultânea.
- `POST /api/translate` usa detecção automática, idiomas de origem/destino, limite de texto e adaptador Qwen/Ollama estritamente local.
- Interface inclui seletor de idioma e tradução com prévia antes de inserir no chat. Whisper fica em CPU para deixar a VRAM ao Qwen.

## Verificação desta reorganização

- `npm test`: 34 casos Node cobrindo API, chat local, memória, estúdio, persistência, segurança e rotas de voz/tradução, incluindo bloqueio de endpoints externos.
- `npm run test:speech`: 3 testes Python de limites, token obrigatório e bind no loopback. `npm run test:reader`: 5 testes Python preservados.
- Build da aplicação reorganizada concluído.
- `npm test`: testes automatizados concluídos com sucesso; inclui verificações simuladas do workflow ComfyUI, parâmetros SDXL-Lightning, descarregamento do Qwen e bloqueio de endpoints externos.
- `npm run build`: concluído após a integração. O gerador não foi executado com ComfyUI/modelo real nesta máquina; qualidade e VRAM dependem do notebook e da instalação local.
- Testes Python do leitor preservados e executáveis por `npm run test:reader`.
- Nenhum acesso ao banco oficial, ativação de API, alteração de hospedagem ou publicação nesta tarefa.

## Backend incluído nesta entrega

O backend local inclui API de projetos e versões, conversas com streaming/cancelamento, perfil, memórias, arquivos de mídia, persistência SQLite, pesquisa web via SearXNG/leitor, transcrição local, tradução Qwen e geração de imagens via ComfyUI. Voz/tradução dependem de Ollama/Qwen, Python e faster-whisper; imagem depende de ComfyUI e SDXL-Lightning; pesquisa depende de Docker, internet e Qwen instalados. Os testes simulam provedores locais; não houve execução real desses serviços no notebook-alvo. Embeddings e geração de vídeo continuam pendentes.


## Preparação Vast.ai Qwen3.5:35b (10/10/2026)

A interface, identidade e hospedagem oficial não foram modificadas. O adaptador do chat agora suporta o modo remoto `MODEL_PROVIDER=vast`, além do modo local e do RunPod documentado; endpoints remotos exigem HTTPS e autenticação Bearer ou Basic. Há timeout configurável para a inferência mais lenta de 35B, com aviso específico se a resposta demorar demais. O backend utiliza a interface Chat Completions do Ollama, sem chamadas aos serviços da OpenAI.

No terminal Vast.ai o usuário confirmou Ollama em `127.0.0.1:21434`, `GET /api/tags` com 200 e `qwen3.5:35b`. A porta 11434 respondeu com Caddy 401; isso **não** prova que a URL externa ou o proxy estejam prontos para inferência remota. O endpoint HTTPS autenticado e as credenciais privadas ainda não foram fornecidos nem configurados; o site público permanece desconectado dessa GPU. Consulte `docs/VAST_AI.md` para os próximos passos e cuidados.

O script de build tolera a ausência do manifesto privado `.openai/hosting.json` nesta cópia GitHub; quando presente, ele continua sendo copiado. Nenhuma identidade de hospedagem foi inventada ou publicada.
