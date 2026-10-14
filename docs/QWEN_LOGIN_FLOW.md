# Fluxo de acesso do Veyro IA (GitHub Pages)

Data: 12/10/2026. Correção do painel de conexão Qwen na conversa.

## Comportamento

1. O site mostra a introdução dos planetas, duração de 16 segundos, ou até o botão **Pular introdução**.
2. Ao concluir ou pular, aparece uma tela de login de página inteira para a **conta Veyro já existente**. O chat por trás fica inerte até autenticar.
3. O formulário envia usuário e senha via HTTPS exclusivamente ao Worker `veyro-auth-test`, chamando `/api/auth/login`. A senha não é inserida no GitHub, não fica em localStorage e é limpa do formulário depois do envio.
4. Depois do login, o frontend consulta `/api/qwen/status`. Apenas se o Qwen estiver habilitado a tela de login desaparece; do contrário, mostra erro sem liberar o chat.
5. O chat faz requisições autenticadas a `/api/chat/qwen`, exibe streaming SSE e erros reais. A versão atual executa `@cf/qwen/qwen3-30b-a3b-fp8`, **não** Qwen3.5:35B.
6. O botão discreto **Sair da conta** fica no menu lateral. Ao sair, limpa a conversa e solicita novo login; expiração de sessão também exige nova autenticação.
7. Netlify e demais domínios continuam como prévia local sem Qwen, porque a allowlist de CORS só contém o domínio GitHub Pages oficial. Não habilitar acesso irrestrito nem gravar senhas.

## Limitações

O histórico de mensagens não é persistido entre recarregamentos no GitHub Pages. A sessão é intencionalmente mantida apenas em memória; recarregar exige novo login. OAuth Google/GitHub depende de configuração separada do Cloudflare Access, que não deve ser confundido com o login local atual.

Testes de integração estática validam as transições; a validação final em celular exige abrir GitHub Pages, pular introdução, autenticar e enviar mensagem. Nenhuma senha deve ser enviada ao assistente.
