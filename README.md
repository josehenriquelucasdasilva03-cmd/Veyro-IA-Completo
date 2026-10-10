# Veyro IA Source

Cópia completa e editável do código da **Veyro IA existente**, reorganizada para desenvolvimento e testes antes de publicar.

**O site oficial permanece na versão 7. Nenhuma alteração desta cópia foi publicada.** A organização dos arquivos não cria outro Site nem outro projeto hospedado.

Base: commit `0450d5b3cc14059aeffb5a0b83a71c86c3919f56`. A aplicação usa JavaScript, um Worker no servidor, D1/SQLite e R2 para arquivos. A estrutura e os comportamentos da versão base foram preservados; foram adicionados documentação e um adaptador de teste local.

## Onde editar

| Pasta | Conteúdo |
|---|---|
| `src/frontend/` | HTML e aplicação da interface |
| `src/frontend/components/` | Chat, memória, pesquisa e ferramentas de mídia |
| `src/frontend/styles/` | Estilos preto/dourado e responsividade |
| `src/api/` | Entrada do servidor, rotas e perfil |
| `src/core/` | Validação, orquestração, modelo e montagem de contexto |
| `src/memory/` | Memórias, comandos, busca e embeddings |
| `src/history/` | Conversas, mensagens, arquivos e exclusão |
| `src/research/` | Pesquisa, fontes, evidências e leitor externo |
| `src/media/` | Photo Studio e regras da timeline |
| `src/storage/` | Acesso a persistência e isolamento por usuário |
| `db/` | Schema do banco |
| `drizzle/` | Migrações existentes e seus metadados |
| `public/assets/` | Imagem usada na interface |
| `services/web-reader/` | Serviço separado de leitura de páginas/PDFs |
| `scripts/` | Build e ambiente local de desenvolvimento |
| `tests/` | Testes automatizados |
| `docs/` | Arquitetura, rotas, limitações e continuidade |

Os componentes da interface continuam em JavaScript simples. Não foram convertidos para React nem inventada uma pasta de agentes autônomos: a orquestração atual fica em `src/core/orchestrator.js`.

## Testar sem alterar produção

Requisitos: Node.js 24 ou superior e npm. Python 3.11 para voz (faster-whisper); Python 3.12+ recomendado para o leitor.

```sh
npm ci
npm run setup
npm test
npm run dev
```

`npm run setup` cria `.env` a partir do exemplo sem substituir uma configuração existente e prepara o banco local em `.local/`. O comando não instala Ollama nem baixa modelos.

Abra `http://127.0.0.1:4173` **no mesmo ambiente onde o processo está rodando**. O servidor local não é um link público acessível pelo celular remotamente. Em um ambiente de desenvolvimento com prévia integrada, a ferramenta de prévia poderá expor a sessão, respeitando suas próprias regras.

- O comando cria `.local/veyro.sqlite` e `.local/media/`, separados de produção.
- A identidade `local-developer` existe apenas no servidor de testes.
- O servidor escuta exclusivamente em `127.0.0.1`. Não o exponha diretamente como um serviço público.
- Reinicie `npm run dev` depois de alterar os arquivos; o build é feito ao iniciar. Não há recarga automática.
- Para criar apenas o build, execute `npm run build`. Isso **não publica**.
- Opcional: `npm run test:reader` executa os testes do leitor sem chamadas externas.

## Animação de entrada da página inicial

Ao abrir o chat vazio ou voltar a ele, a Veyro anima a paisagem, o título, os arcos dourados, a frase, os cinco cartões e o campo de mensagem. O disparo acontece apenas quando a tela inicial passa de oculta para visível; mensagens e atualizações normais do chat não reiniciam a sequência. A preferência do sistema `prefers-reduced-motion` reduz a abertura a uma apresentação instantânea. Nenhuma dependência de animação foi adicionada.

## Mascotes e vozes oficiais

Na primeira visita do navegador, escolha um dos quatro personagens na janela **Escolha seu Veyro**. A seleção fica salva no `localStorage` deste navegador e pode ser alterada pelo botão **Escolher Veyro** no topo do chat. A arte local `public/assets/veyro-mascots.jpg` é a imagem de referência fornecida, enquadrada por CSS sem alterar os personagens. A troca de personagem atualiza apenas a representação visual; o mesmo chat, modelo Qwen/Ollama e histórico continuam em uso.

Em **Conversa e projeto → Vozes do Veyro IA**, escolha entre quatro vozes neurais brasileiras: Atlas (Antonio), Neo (Fabio), Luna (Thalita) e Iris (Francisca). Cada perfil usa uma voz-base diferente. Selecione a voz, ajuste tom e ritmo, ouça uma demonstração e escolha a velocidade de reprodução. A configuração fica no `localStorage` do navegador. O botão **Auto on/off** no topo do chat habilita leitura automática; começa desligado. Cada resposta tem controles próprios para ouvir, pausar, continuar e parar.

O TTS é um serviço separado do Ollama: o backend usa um adaptador `TtsProvider` com Azure Speech REST; respostas em texto não aguardam nem dependem do áudio. Os quatro nomes são vozes padrão neurais `pt-BR` listadas pela Microsoft. Para habilitar as vozes, crie um recurso Azure Speech e configure no `.env` local (nunca no frontend):

```dotenv
TTS_PROVIDER=azure
AZURE_SPEECH_REGION=sua-regiao-do-recurso
AZURE_SPEECH_KEY=sua-chave-do-recurso
```

Reinicie `npm run dev` e atualize a página. A chave fica no servidor. A rota limita a entrada a 5.000 caracteres, escapa conteúdo para SSML, restringe perfis por lista permitida, aceita ajustes moderados e limita o áudio retornado a 8 MB. Códigos Markdown são removidos antes da síntese. Nenhum áudio é salvo no projeto.

**Privacidade e custo:** ao pedir a demonstração ou narrar uma resposta, o texto correspondente é enviado à Microsoft para sintetizar o áudio. A leitura automática também envia o texto depois de cada resposta enquanto estiver habilitada. Evite usar esse recurso com conteúdo sensível. A [página oficial de preços do Azure Speech](https://azure.microsoft.com/pt-br/pricing/details/speech/) consultada em outubro de 2026 indica 500 mil caracteres gratuitos por mês para TTS neural padrão; o excedente é cobrado por caractere. Confirme limites, cobrança e região da sua conta antes de habilitar. A [lista oficial de vozes e idiomas](https://learn.microsoft.com/pt-br/azure/ai-services/speech-service/language-support?tabs=tts) confirma os quatro perfis. A ausência de chave mantém os botões de voz sem síntese, mas não interrompe o chat em texto.

### Alternativa local gratuita: Pocket TTS

O [Pocket TTS da Kyutai](https://github.com/kyutai-labs/pocket-tts) pode ser usado sem Azure e sem chave: o backend Veyro encaminha o texto para um serviço Pocket TTS que roda somente em `127.0.0.1`. O perfil exibido é **Veyro Local (Rafael)**, a voz pronta listada para português. Ele é uma opção adicional; não substitui as quatro vozes Azure, que têm bases diferentes. Na configuração Pocket, as outras quatro não aparecem e os controles de tom/ritmo ficam indisponíveis. O áudio usa WAV e continua sujeito ao limite de 8 MB do backend.

No Windows, instale `pocket-tts` em um Python compatível e inicie o servidor no loopback. A documentação oficial recomenda `uvx`:

```powershell
py -3.12 -m pip install --user uv
uvx pocket-tts serve --host 127.0.0.1 --port 8000 --language portuguese --quantize
```

Em outro terminal, altere no `.env` privado:

```dotenv
TTS_PROVIDER=pocket
POCKET_TTS_BASE_URL=http://127.0.0.1:8000
```

Reinicie o backend Veyro e abra **Conversa e projeto → Vozes do Veyro IA**. O Pocket baixa e carrega seus pesos na primeira inicialização; o desempenho real no ROG ainda precisa ser medido. A Veyro nunca aceita URL remota para este serviço nem coloca a síntese no navegador. O projeto de código é MIT, e o modelo/vozes têm termos próprios — o modelo publicado informa CC-BY-4.0; revise-os se redistribuir arte ou áudio.

## Chat com um modelo local

O chat usa o **Qwen3.5 4B** no Ollama por padrão. Instale e abra o Ollama no mesmo computador que executa o Veyro; depois rode `npm run model:download`. Esse comando baixa o valor de `MODEL_NAME` em `.env` (por padrão, `qwen3.5:4b`). O modelo ocupa cerca de 3,3–4 GB no catálogo Ollama. Para iniciar o site e backend, rode `npm run dev` e abra `http://127.0.0.1:4173`. O endpoint local padrão é `http://127.0.0.1:11434/v1`. Não há chamada ao serviço da OpenAI no código.

### Endpoint remoto compatível (opcional)

Também é possível apontar o backend para um Ollama remoto, mantendo o Ollama local como padrão. Na máquina Veyro, configure no `.env` privado `MODEL_PROVIDER=ollama-remote`, `MODEL_BASE_URL=https://<host-https-do-proxy>/v1`, `MODEL_NAME=qwen3.5:35b` e autenticação `MODEL_AUTH_SCHEME=bearer` + `MODEL_API_KEY`, ou `MODEL_AUTH_SCHEME=basic` + `MODEL_API_USERNAME`/`MODEL_API_PASSWORD` se o proxy exigir Basic Auth. Use uma credencial forte, exclusiva e com pelo menos 16 caracteres. O proxy HTTPS deve proteger tanto `/v1/models` quanto `/v1/chat/completions`; o backend valida TLS pela URL HTTPS e nunca envia credenciais à URL, navegador ou GitHub. HTTP remoto, query strings, credenciais embutidas e chamadas sem autenticação são recusados. **Não use** `127.0.0.1:21434` na configuração do backend hospedado: esse endereço só funciona quando o backend executa na mesma máquina Vast.ai. O endereço público HTTPS e o tipo de autenticação da sua máquina ainda precisam ser configurados; o código não inventa nem presume esses dados. Timeout padrão é 180 segundos e pode ser ajustado com `MODEL_REQUEST_TIMEOUT_MS` (10–600 segundos). Erros de autenticação, indisponibilidade da GPU e timeout são reportados sem expor a credencial. O modo remoto envia o texto das conversas ao endpoint GPU configurado por você. O modo local `MODEL_PROVIDER=local` e o fluxo atual do notebook permanecem disponíveis. O endpoint RunPod compatível já existente continua suportado separadamente.

O Qwen3.5 9B também está disponível, mas ocupa cerca de 6,6–7,6 GB no Ollama. Em uma GPU móvel com 8 GB de VRAM, o 4B deixa mais espaço para o contexto e o restante do sistema; por isso é o padrão desta cópia. Os tamanhos publicados são do catálogo e o uso real de memória varia conforme contexto e configuração.

Referências oficiais: [Qwen3.8 no GitHub](https://github.com/QwenLM/Qwen3.8) e [modelos Qwen3.5 no Ollama](https://ollama.com/library/qwen3.5).

O backend integrado inclui projetos, versões e restauração, conversas com streaming e cancelamento, memória, perfil, mídia, transcrição local, tradução Qwen e APIs de pesquisa. A geração de imagens pode usar ComfyUI + SDXL-Lightning no próprio computador. Geração de vídeo, embeddings e pesquisa web ainda dependem de outras integrações. Veja `docs/API.md` e `docs/STATUS.md`.

O leitor Python é um serviço separado: seu código e Dockerfile estão incluídos, mas ele não é iniciado por `npm run dev` nem foi hospedado automaticamente.

## Voz e tradução locais no Windows

O reconhecimento usa faster-whisper `small` em CPU INT8, com detecção automática ou idioma escolhido no chat. A tradução chama o Qwen já usado pelo chat através do Ollama local. O áudio é limitado a 15 MB e 120 segundos; apenas uma transcrição é executada por vez. A primeira execução baixa o modelo Whisper automaticamente (requer internet nessa primeira vez). Permita acesso ao microfone no navegador.

Instale o Ollama e deixe-o aberto; depois abra PowerShell na pasta do projeto e execute uma vez:

```powershell
npm run setup
py -3.11 -m venv .venv-speech
.\.venv-speech\Scripts\python.exe -m pip install --upgrade pip
.\.venv-speech\Scripts\python.exe -m pip install -r services\speech\requirements.txt
npm run model:download
```

A instalação do pacote `faster-whisper` pode baixar as bibliotecas Python necessárias. O reconhecimento roda em CPU para deixar a VRAM para o Qwen. Instale e inicie o Ollama antes de baixar/iniciar o modelo de chat.

Depois, mantenha **dois terminais PowerShell** abertos na pasta do projeto:

Terminal 1 — serviço de voz local (o primeiro uso baixa Whisper `small`). Para executar mesmo se a política do PowerShell bloquear scripts locais, use:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-speech.ps1
```

Terminal 2 — backend e interface Veyro:

```powershell
npm run dev
```

Acesse `http://127.0.0.1:4173` no mesmo notebook. O serviço de voz escuta somente em `127.0.0.1` e exige token gerado por `npm run setup`. Não encaminhe as portas 4173, 8765 ou 11434 para a internet. Recursos locais não funcionarão num Site hospedado longe do notebook porque o Worker remoto não consegue acessar os serviços `localhost` do computador.

## Gerar imagens localmente no Windows

O Photo Studio usa ComfyUI local e o checkpoint gratuito SDXL-Lightning de 4 passos. Não requer conta, chave ou API paga. O arquivo do modelo tem aproximadamente 6,94 GB; o primeiro download precisa de internet. A licença OpenRAIL++ permite uso sujeito às condições e restrições de uso responsável descritas pelo autor. ComfyUI e os pesos são projetos independentes, mantidos por seus autores.

1. Instale o driver NVIDIA recente e baixe a versão portátil oficial para NVIDIA em [ComfyUI Releases](https://github.com/comfyanonymous/ComfyUI/releases/latest). Extraia, por exemplo, em `C:\ComfyUI_windows_portable`.
2. Abra PowerShell na pasta do projeto e instale o checkpoint (o download pode ser retomado executando o comando novamente):

```powershell
.\scripts\download-image-model.ps1 -ComfyPath "C:\ComfyUI_windows_portable"
```

3. Copie `.env.example` para `.env` se ainda não executou `npm run setup`. No `.env`, habilite `VEYRO_IMAGES_ENABLED=true`; mantenha `IMAGE_PROVIDER=comfyui-local`, `IMAGE_BASE_URL=http://127.0.0.1:8188` e `IMAGE_MODEL=sdxl_lightning_4step.safetensors`. O Ollama deve estar instalado e `MODEL_PROVIDER=local`, `MODEL_BASE_URL=http://127.0.0.1:11434/v1` e `MODEL_NAME=qwen3.5:4b` configurados.
4. Inicie ComfyUI em um terminal PowerShell (a partir da pasta extraída):

```powershell
.\run_nvidia_gpu.bat
```

5. Em outro terminal, inicie a Veyro com `npm run dev` e acesse `http://127.0.0.1:4173`. Abra **Photo Studio**, escreva o prompt e envie. A geração é uma imagem por vez; pedidos com mais imagens avançam em sequência.

A Veyro só aceita endpoint de imagem em loopback. Ela serializa o uso da GPU e tenta descarregar o Qwen pelo Ollama antes de gerar, para reduzir competição pelos 8 GB de VRAM. O computador pode ficar sem o Qwen carregado até o próximo pedido de chat. A memória e a velocidade reais ainda precisam ser validadas no notebook-alvo; se houver falta de VRAM, tente o formato quadrado e feche aplicativos de GPU. A geração local não funciona no Site remoto publicado, pois ele não acessa o notebook.

## Pesquisa na web local

A pesquisa já existe na interface e no backend, com modos **Rápida**, **Padrão** e **Aprofundada**, links para as fontes e resumo pelo Qwen. Ela fica desativada até configurar SearXNG e o leitor seguro. SearXNG é gratuito e agrega resultados de mecanismos externos; o conteúdo pesquisado continua vindo da internet e está sujeito às limitações desses serviços. O leitor seguro aceita páginas públicas HTTPS, valida DNS e redirects, consulta robots e bloqueia endereços internos.

No Windows, instale e abra o Docker Desktop. Na pasta do projeto, rode `npm run setup` para criar segredos locais e depois:

```powershell
docker compose --env-file .env -f services/research/docker-compose.yml up -d --build
```

No `.env`, configure `VEYRO_WEB_ENABLED=true`, `SEARCH_BASE_URL=http://127.0.0.1:8081` e `WEB_READER_URL=http://127.0.0.1:8082/read`. O `WEB_READER_KEY` e o `SEARXNG_SECRET` são criados pelo setup; não os compartilhe. Mantenha o Qwen configurado e inicie `npm run dev`. A primeira montagem/execução do Docker baixa imagens de contêineres e precisa de internet. Os serviços são publicados apenas em `127.0.0.1`; não encaminhe essas portas para a internet. Para desligar: `docker compose --env-file .env -f services/research/docker-compose.yml down`.

Não é necessário esperar o notebook para preparar o código. A pesquisa real só poderá ser confirmada quando o SearXNG/leitor e o Qwen estiverem iniciados com internet no computador.

### Agentes locais opcionais (CrewAI)

Esta cópia inclui uma equipe pequena baseada no CrewAI, framework open source do brasileiro João Moura. Ela usa o mesmo Qwen3.5 4B local pelo Ollama: um agente cria consultas para pesquisa e outro as revisa. A Veyro continua fazendo a busca pelo SearXNG e lendo/verificando as fontes com o leitor seguro. A equipe só atua nos modos **Padrão** e **Aprofundada**; se estiver desligada ou indisponível, a Veyro usa seu planejador atual. Não é um modelo extra e não exige chave ou API paga.

Para instalar no Windows, use Python 3.12 e rode uma vez na pasta do projeto:

```powershell
py -3.12 -m venv .venv-agents
.\.venv-agents\Scripts\python.exe -m pip install --upgrade pip
.\.venv-agents\Scripts\python.exe -m pip install -r services\agents\requirements.txt
npm run setup
```

No `.env`, altere `VEYRO_AGENTS_ENABLED=true`. Mantenha `MODEL_PROVIDER=local`, `MODEL_NAME=qwen3.5:4b` e Ollama em `http://127.0.0.1:11434`. O setup gera `AGENT_TOKEN`; mantenha esse valor privado. Deixe o Ollama aberto e, em um terminal PowerShell separado, inicie:

```powershell
.\.venv-agents\Scripts\python.exe services\agents\server.py
```

Depois inicie a Veyro com `npm run dev`. A interface mostra se a equipe local está ativa. O serviço dos agentes se vincula somente a `127.0.0.1:8766`; não encaminhe essa porta à internet. A instalação Python precisa de internet uma vez para baixar o CrewAI e suas dependências. Os agentes fazem inferência no Qwen já instalado, com uma chamada por vez compartilhando a fila de GPU da Veyro. O tempo de busca aumenta porque há planejamento e revisão.

A distribuição CrewAI pode instalar o SDK Python OpenAI como dependência transitiva; isso não configura chave, não envia dados e não chama a API. Esta integração fixa o modelo no Ollama local e não configura nem chama a API da OpenAI. Não há chave OpenAI no fluxo. Para deixar os agentes desligados, mantenha `VEYRO_AGENTS_ENABLED=false`.

## Continuar em outra conversa

1. Abra/anexe a pasta **Veyro IA Source** ou o arquivo **Veyro-IA-Source-v7.zip**.
2. Peça para ler `AGENTS.md`, este README, `docs/CONTINUE.md` e `docs/STATUS.md`.
3. Desenvolva e teste na cópia, salvando as mudanças nos mesmos arquivos da pasta.
4. Solicite publicação explicitamente somente depois de aprovar a versão de teste.

Uma nova conversa precisa ter acesso à pasta ou ao ZIP: a existência dos arquivos não significa que toda conversa carregará o código automaticamente.

## O que a cópia inclui

Inclui fontes, imagem de interface, dependências fixadas no `package-lock.json`, configurações sem segredos, schema, migrações, serviço leitor e testes. A pasta `dist/` e `node_modules/` são geradas novamente e não fazem parte da entrega. Não inclui dados reais de usuários, banco de produção, conversas privadas, uploads nem credenciais.

A identidade do Site existente está em `.openai/hosting.json` para uma publicação futura autorizada. Esse identificador não é uma senha. **Não use essa configuração para publicar durante os testes.**

`docs/SOURCE_MAP.json` permite relacionar os caminhos antigos aos novos. `docs/SNAPSHOT.json` registra os arquivos e seus hashes SHA-256 na data da entrega. O histórico de implementação anterior foi preservado em `docs/IMPLEMENTATION_HISTORY.md` e serve como referência histórica, não como instrução para publicar.
