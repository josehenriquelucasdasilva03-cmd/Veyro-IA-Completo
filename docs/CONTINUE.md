# Continuar a Veyro em outra conversa

## Prompt para continuar em outro chat ou IA

Anexe o ZIP mais recente da Veyro IA e cole:

```text
Continue o projeto Veyro IA a partir do ZIP anexado. Antes de editar, leia AGENTS.md, README.md, docs/ARCHITECTURE.md, docs/STATUS.md e este arquivo.

Regras do projeto:
- Trabalhe nesta cópia de desenvolvimento e preserve a identidade do Veyro IA.
- Não adicione nem configure a API da OpenAI. O chat e a tradução usam o Qwen selecionado: Ollama local ou endpoint remoto configurado; reconhecimento usa faster-whisper local em CPU INT8. O TTS neural oficial é opcional e usa Azure Speech, com possíveis cobranças acima da franquia: mantenha a chave somente no ambiente do backend, nunca publique nem habilite auto-leitura por padrão. `npm run model:download` baixa o Qwen e o primeiro uso do Whisper baixa o modelo selecionado.
- O chat mantém Ollama local como padrão e também aceita `MODEL_PROVIDER=runpod` ou `MODEL_PROVIDER=vast` para endpoint remoto compatível com Chat Completions somente em HTTPS e com autenticação. Configure URL base sem `?token=`, ID de modelo e `MODEL_API_KEY` ou credenciais Basic só no `.env` do servidor. O local mode aceita somente loopback; remotos usam HTTPS. `GET /api/model/health` verifica o endpoint sem expor segredos. Não copie credenciais para arquivos, navegador ou GitHub; ao receber token em URL HTTP, recomende revogá-lo e gerar outro. A URL recebida anteriormente não está conectada e não deve ser repetida.
- TTS suporta `azure` (quatro vozes neurais distintas, envia texto ao Azure) ou `pocket` (síntese local sem chave; apenas perfil português Rafael). Para Pocket, serviço obrigatório fica em `127.0.0.1:8000`, iniciado com `pocket-tts serve --host 127.0.0.1 --port 8000 --language portuguese --quantize`; não exponha a porta. Não afirme que Pocket oferece quatro vozes portuguesas distintas.
- Do vídeo enviado em 09/10/2026, integrar somente Pocket TTS ao runtime do site. Não ativar Grok Imagine ou Qwen3-Max (API hospedada/possível cobrança), não instalar Muse Code como ferramenta de runtime, não duplicar CrewAI com Hermes sem sandbox, e não baixar Kimi K3 in C (checkpoint excede o SSD de 512 GB). O Qwen local permanece como modelo do chat e tradução.
- A geração local de imagens usa ComfyUI + SDXL-Lightning; requer instalação dos dois serviços/modelos no computador. Atualmente cria imagens a partir de texto, sem edição ou aprimoramento.
- A pesquisa pode usar a equipe CrewAI opcional (planner e revisor) pelo Qwen3.5 4B/Ollama local; o serviço Python exige instalação separada e deve ficar em loopback. A busca web continua via SearXNG + leitor seguro.
- A tela inicial do chat possui sequência cinematográfica em `src/frontend/styles/cinematic.css`, disparada por transição de visibilidade em `src/frontend/components/chat.js`. Preserve a acessibilidade `prefers-reduced-motion` e não a reinicie ao renderizar mensagens.
- O seletor dos quatro mascotes e o seletor de vozes ficam em `src/frontend/components/chat.js`; estilos em `src/frontend/styles/cinematic.css`. Vozes: Atlas/Antonio, Neo/Fabio, Luna/Thalita e Iris/Francisca (`pt-BR`). A seleção e ajustes usam `localStorage`; a síntese é feita pela rota backend `POST /api/tts/synthesize` e pelo adaptador em `src/tts/provider.js`. Não enviar a chave Azure ao frontend nem misturar TTS com o fluxo do Qwen; auto-leitura precisa continuar desligada por padrão.
- Não publique, não crie outro Site e não altere o site oficial, dados, ambiente ou acesso sem eu pedir isso explicitamente.
- Não invente testes: execute npm ci, npm test e npm run build após mudanças relevantes; informe qualquer etapa que não conseguiu testar.
- Atualize os mesmos arquivos da cópia e a documentação. Não inclua .env, chaves, node_modules, dist ou dados privados na entrega.

Meu próximo pedido é: [escreva aqui o que quero mudar].

Ao concluir, liste o que mudou, os comandos/testes executados, limitações e os arquivos atualizados. Entregue um ZIP novo se eu pedir uma versão para baixar.
```

## Fluxo recomendado

1. Materializar os arquivos mantendo toda a árvore, ou extrair `Veyro-IA-Local-Ready-v0.3.0.zip`.
2. Instalar dependências com `npm ci` em Node 24+.
3. Rodar `npm test` e iniciar `npm run dev` quando houver ambiente de prévia.
4. Fazer a mudança solicitada, testar o fluxo afetado e atualizar a documentação.
5. Atualize os mesmos arquivos e regenere o ZIP de teste ao concluir uma mudança.
6. Publicar apenas depois de autorização explícita, reutilizando a identidade do Site existente e respeitando os controles de acesso originais.

## Identidade e integridade

O projeto continua sendo Veyro IA. O manifesto `.openai/hosting.json` aponta para o Site existente. A cópia não inclui histórico Git nem credenciais de push. A versão base e o mapa dos arquivos estão em `docs/SOURCE_MAP.json`.

O manifesto `docs/SNAPSHOT.json` registra hashes dos arquivos da cópia, sem incluir a si próprio. Após editar, hashes diferentes são esperados; gere novo manifesto apenas quando fechar uma nova versão de teste.

A pasta é código, não uma exportação dos seus dados. Se você precisar de backup de conversas, arquivos enviados e banco de produção, peça essa operação separadamente.
