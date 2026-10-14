# Consolidação Veyro IA · 12/10/2026

Esta branch é uma proposta de integração para revisão. **Sem merge, sem deploy, sem migração remota, sem credenciais.**

## Fontes e resolução de conflitos
- Base: main 27db422 (Cosmos 3D, chat, backend).
- PR #7: segurança do backend, identidade, quotas D1, rate limiting, validação, proteção de logs/headers, CodeQL/Dependabot.
- PR #6: reautenticação visual Google/GitHub via Cloudflare Access, otimização opcional de respostas, renderização por frame. Não duplicar a autenticação do PR #7.
- PR #8: tema escuro/dourado e redução de brilho no chat.
- PR #9: documentação de custo, identidade visual e roadmap.
- PR #10: gateway de vídeo opcional, desativado até configuração privada. A integração é feita apenas uma vez em router.js, index.html e scripts de build.
- PR #13: intro Cosmos de 16 segundos e teste de sincronização. A interface do Cosmos presente na main foi mantida.
- PRs #11 e #12: contêm um motor 3D paralelo (scene.js) e QA dependente desse motor. Não importar em paralelo ao Cosmos para evitar duplicação; adaptar QA ao Cosmos antes da liberação. PRs #2 e #3 já fazem parte da main. PRs #4 e #5 são bases antigas/empilhadas de segurança: não copiar validadores duplicados.

## Critérios antes do primeiro teste real
1. Node.js >= 24: npm ci, npm test e npm run build. Executar também testes Python e QA em navegador/celular. Não declarar testes aprovados sem logs.
2. Verificar Actions e CodeQL no PR de consolidação, especialmente auth, streaming, segurança, vídeo e duração da intro.
3. Configurar em **Worker de teste separado** Cloudflare Access (todos os caminhos), Google/GitHub na política, bindings D1, migração 0004, rate limiting e secrets fora do código.
4. Para chat real: verificar /api/model/health autenticado e executar envio com resposta do Qwen pelo endpoint HTTPS privado ou Ollama local. A interface/Netlify isolados não comprovam conversa real.
5. O módulo de vídeo só pode ser habilitado após validação de motor privado, rate limiter específico, limites operacionais e custos.
6. Preservar main e o site oficial até revisão e autorização expressa de publicação.

## Endereços
- Código: https://github.com/josehenriquelucasdasilva03-cmd/Veyro-IA-Completo
- Prévia estática Netlify/GitHub Pages: não é evidência de backend.
- O Worker de teste de autenticação existente não deve ser tratado como Qwen remoto validado sem verificação ponta a ponta.

Esta branch não inclui segredos, tokens ou credenciais privadas.