# Veyro IA: implantação por etapas do sistema de voz (decisões 1–10)

## Implementado nesta fase no PR #14
- Motor `voice-manager.js`: fala local por Web Speech (`speechSynthesis`), sem chaves no código, opções de voz e idioma, controle de pausar/continuar/parar, fila de frases e interrupção ao mandar nova mensagem.
- GitHub Pages: o Qwen envia texto para o motor de voz conforme os tokens chegam. Quando há frase ou trecho adequado, a leitura pode começar antes do fim da geração. Resposta escrita e login usam o mesmo Worker já existente.
- Sem servidor TTS configurado: botão **Ouvir resposta** recorre à voz do navegador. Em hospedagem com TTS existente, o backend continua prioritário e, se falhar, tenta-se a voz local.
- Quatro perfis de voz predefinidos por mascote: Black/Atlas, Blue/Neo, Green/Luna, Red/Iris. A voz real, sotaque e gênero dependem das vozes instaladas no dispositivo. Menu **⚙ Voz** permite escolher perfil, voz do aparelho, idioma, velocidade, tonalidade e modo de desempenho. Preferências locais: browser localStorage, nunca tokens.
- Auto on/off funciona tanto em respostas completas quanto em streaming Qwen, com controles. O navegador pode bloquear autoplay; o primeiro toque no botão Ouvir ajuda a conceder autorização.
- Ditado por microfone no GitHub Pages se SpeechRecognition/webkitSpeechRecognition estiver disponível. Exige permissão explícita; reconhecimento pode depender de serviço externo do navegador. O áudio não é enviado ao Worker de Qwen nesse caminho.
- Estados visuais de fala e CSS com pulso de boca/rosto **aproximado**; a imagem da cabeça é 2D estilizada. Modo Econômico reduz animações; `prefers-reduced-motion` é respeitado.

## Ainda não implementado nem validado
- Modelos com malha 3D, rig facial e sincronização labial **real** por fonemas: requer modelos compatíveis e testes em GPU/celular, não basta pulsar foto 2D.
- Novo provedor TTS de alta qualidade em nuvem específico para GitHub Pages: exige backend protegido, custo/limites e consentimento. **Não inventar integração** com Azure/Edge/Pocket/Cloudflare sem instância rodando. Evitar compras ou uso de saldo sem autorização.
- Emoções prosódicas realistas por modelo de voz, identificação inteligente multilíngue avançada e STT offline universal.
- Testes reais de reprodução em Android/iOS/notebook, microfone, autoplay e latência com credenciais do proprietário. Testes automatizados não comprovam áudio saindo do alto-falante.

## Plano de segurança e validação
1. CI deve completar `npm test` antes do Pages deploy.
2. Em celular, abrir introdução, entrar no site oficial e fazer login já existente. Qwen deve responder normalmente.
3. Tocar **Ouvir resposta** em resposta completa, conferir áudio. Ativar **Auto on** e enviar nova pergunta, confirmar narração por trechos. Pausar, continuar e parar.
4. Trocar Black, Blue, Green e Red; abrir ⚙ e alterar voz/idioma. Se o SO expuser apenas uma voz, perfis diferem em ritmo/tom, mas não em timbre independente.
5. Verificar encerramento de voz ao abrir o microfone e ao enviar nova mensagem, além dos modos Econômico/Equilibrado/Máximo.
6. Conferir que PR continua rascunho sem merge, que nenhum Worker Qwen/auth foi sobrescrito e que não há secrets no frontend.

## Arquivos
- `src/frontend/components/voice-manager.js`
- `src/frontend/components/chat.js`
- `src/frontend/app.js`
- `src/frontend/index.html`
- `src/frontend/styles/cinematic.css`
- `tests/voice-manager.test.mjs`
- `tests/voice-ui-integration.test.mjs`

**Observação:** o objetivo das dez decisões está registrado aqui; a fase atual prioriza voz funcional e controles. As decisões que exigem infraestrutura, modelos 3D e vozes profissionais continuam pendentes.


## Preparação posterior: voz natural
Foi preparado `TTS_PROVIDER=kokoro` em branch isolada, mais um ranking de vozes pt-BR no navegador. A integração do Worker público ao Kokoro não foi publicada. Consulte `docs/KOKORO_NEURAL_TTS.md`.
