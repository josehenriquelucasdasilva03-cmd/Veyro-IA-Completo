# Voz neural natural do Veyro IA: Kokoro, português brasileiro

## Diagnóstico
A versão GitHub Pages usa `speechSynthesis`, que depende das vozes do sistema operacional e não é equivalente à síntese neural de um servidor. A seleção de voz foi melhorada e o tom dos quatro mascotes foi suavizado, mas o navegador não ganha timbres neurais novos apenas com JavaScript.

## Integração preparada, não ativada no GitHub Pages
O backend autenticado `src/api/tts.js` já faz validação, limites e isolamento de usuário antes de encaminhar para `src/tts/provider.js`. O novo `TTS_PROVIDER=kokoro` permite usar um Kokoro-FastAPI hospedado no **mesmo computador** (`http://127.0.0.1:8880`) ou em servidor remoto **HTTPS com Bearer privado**. A chamada é `POST /v1/audio/speech`, corpo `{model:"kokoro",voice:"pm_alex|pm_santa|pf_dora",input:"...",response_format:"mp3",speed:...}`.

Vozes pt-BR do Kokoro-82M: Black/Atlas = `pm_alex`, Blue/Neo = `pm_santa`, Green/Luna = `pf_dora`, Red/Iris = `pf_dora` com outra velocidade. São **3 voicepacks pt-BR**, não quatro timbres exclusivos. Se forem necessárias 4 vozes brasileiras independentes, outro provedor/modelo precisa ser validado.

## Configuração apenas no servidor
1. Instale e inicie `remsky/Kokoro-FastAPI` a partir de uma release fixada, seguindo `https://github.com/remsky/Kokoro-FastAPI`. Verifique se `/v1/audio/voices` lista `pm_alex`, `pm_santa`, `pf_dora` antes do uso; não presuma compatibilidade de qualquer imagem/tags.
2. Para um backend de **teste local** rodando na mesma máquina, configure no ambiente privado `TTS_PROVIDER=kokoro` e `KOKORO_TTS_BASE_URL=http://127.0.0.1:8880`. **Nunca** abra 8880 para toda a internet.
3. Para backend Cloudflare/Worker, o endereço `127.0.0.1` aponta para o **próprio Worker**, não para a GPU. Publique o Kokoro na sua máquina **somente atrás de um proxy HTTPS autenticado**, configure `KOKORO_TTS_BASE_URL=https://seu-proxy.example` e `KOKORO_TTS_API_KEY` como Secret do runtime do **backend**. Não use CORS aberto ou endpoint público sem autenticação. Proxy deve exigir Bearer e encaminhar para Kokoro na rede privada/localhost. Proteja rede e limites de uso.
4. O `POST /api/tts/synthesize` só existe na aplicação Worker/servidor completa. O GitHub Pages estático chama outro Worker de login/Qwen, `veyro-auth-test`, **que ainda não implementa a nova rota de síntese**. O frontend publicado NÃO passa automaticamente a falar com Kokoro quando apenas este PR é criado.
5. Para conectar a voz neural ao site GitHub Pages, será necessária uma rota autenticada `/api/tts/synthesize` no Worker de autenticação existente, com a mesma validação de sessão, limites, URL protegida e sem chaves no browser. Fazer deploy desse Worker apenas com autorização, testes e credenciais privadas prontas.
6. Se o Kokoro estiver fora do ar, o texto do Qwen deve continuar aparecendo; a fala do navegador permanece como alternativa.

## Segurança e testes
- Endereço local apenas loopback; remoto apenas HTTPS com token server-side e hostname verificado (sem IP, caminho, credenciais embutidas ou query string).
- Resposta de áudio MP3, tamanho máximo de 8MB, timeout de 60s, sem cache e sem cabeçalhos arbitrários do upstream.
- As quatro escolhas de voz são allowlist de IDs, não URL arbitrária nem comandos enviados pelo usuário.
- Nunca armazenar ou registrar senha/chave nem enviar token ao navegador.
- Sintetizar a voz de demonstração localmente pelo backend só após o proprietário instalar e conectar o modelo.
- Testes automáticos fazem mocks; áudio real, qualidade percebida e tempo de geração dependem de teste na máquina GPU/CPU e no telefone.

Status: **implementação de backend e melhor seletor nativo preparados em branch isolada. O serviço neural real e sua ligação com o Worker de autenticação ainda precisam ser ativados.**
