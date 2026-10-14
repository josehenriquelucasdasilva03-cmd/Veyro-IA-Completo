# Ponte Qwen autenticada para GitHub Pages (12/10/2026)

## Estado observado
Cloudflare já tinha `veyro-auth-test`, com `DB` D1, binding `AI`, `VEYRO_MASTER_KEY` como Secret e `VEYRO_QWEN_ENABLED=true`. Uma conta estava cadastrada e havia sessões ativas. `VEYRO_ALLOWED_ORIGIN` autoriza apenas `https://josehenriquelucasdasilva03-cmd.github.io`. Cloudflare Access está desativado neste momento, mas este Worker possui sistema próprio de contas protegidas por senha e tokens de sessão com expiração. Não misturar as duas autenticações.

**Diferença de modelo:** o Worker disponível usa `@cf/qwen/qwen3-30b-a3b-fp8` (Qwen3-30B-A3B), não o Qwen3.5-35B do Vast. A ponte usa apenas o modelo realmente presente e nunca alega ser o outro.

## Fluxo
1. A versão estática recebe uma meta tag de prévia no build. Só quando `location.origin` é o GitHub Pages oficial, o frontend oferece "Entrar para conversar com Qwen".
2. A pessoa entra com **a conta Veyro já cadastrada**. A senha é enviada diretamente via HTTPS para `/api/auth/login` do Worker, sem passar pelo GitHub e sem armazenamento em localStorage/sessionStorage.
3. O token de sessão Bearer fica apenas na memória JavaScript até logout ou recarga. O frontend consulta `/api/qwen/status`.
4. Mensagens até 600 caracteres são enviadas a `/api/chat/qwen` com as últimas quatro mensagens da aba. O Worker autentica a sessão, aplica limites e chama o binding Workers AI, retornando SSE `token`/`done`.
5. O frontend exibe tokens recebidos. Falhas e expiração de sessão são identificadas; não produz respostas inventadas. O histórico da interface permanece apenas nessa aba.
6. O Netlify e outros domínios continuam como prévias locais, pois não constam na allowlist do backend. Não adicionar `Access-Control-Allow-Origin: *` nem compartilhar um único token no código público.

## Teste pendente
O CI valida build, contratos estáticos e segurança. Um teste real de inferência só pode ser feito após login pelo dono da conta, porque não acessamos senhas/tokens. Uma resposta do modelo não foi demonstrada nesta execução.

Cloudflare Zero Trust Access está desativado na conta, então a integração com Google/GitHub via Access não está pronta. Este fluxo separado usa o sistema próprio do Worker `veyro-auth-test`.

Para conectar **exatamente** Qwen3.5:35B, será preciso um endpoint Vast HTTPS privado funcional e reconfigurar/validar a rota protegida correspondente, sem expor a GPU à internet.
