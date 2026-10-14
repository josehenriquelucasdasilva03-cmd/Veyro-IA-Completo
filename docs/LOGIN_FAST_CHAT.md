# Login Google e GitHub e redução da latência no Veyro IA

Este código está em uma branch de revisão dentro de Veyro-IA-Completo e não altera a main, o site oficial, segredos ou o PR do Qwen/Vast.ai.

## Login

No Worker de teste, configure VEYRO_AUTH_MODE=cloudflare-access. O Cloudflare Access protege todo o hostname, inclusive /api/*, e oferece a tela com as opções Google e GitHub. O backend recebe a identidade apenas pelo contexto Access do Worker; cabeçalhos de identidade enviados do navegador são ignorados. O modo de autenticação precisa ser explícito: sem ele, a API retorna 503. O modo local funciona somente em loopback.

Para habilitar os provedores manualmente:
1. Cloudflare Zero Trust > Integrations > Identity providers: registre Google e GitHub.
2. Crie aplicativos OAuth nas contas Google Cloud e GitHub, com callback da organização: https://SEU-TIME.cloudflareaccess.com/cdn-cgi/access/callback
3. Configure os Client IDs e Client secrets nas configurações privadas do Cloudflare. Nunca coloque chaves na interface ou no GitHub.
4. Em Access controls > Applications, crie uma aplicação Self-hosted para o hostname inteiro do Worker de teste, autorize ambas as opções e limite a política Allow aos usuários de teste.
5. Teste sessão expirada, logout, tentativa de falsificar cabeçalhos, acesso entre usuários e isolamento de dados antes de publicar.
6. A aplicação, após 401, mostra entrada de contingência e recarrega a URL protegida. Quando Access funciona, a tela de escolha dos provedores aparece antes de carregar a própria aplicação.

Não use VEYRO_AUTH_MODE=sites em Workers públicos: este modo só existe para o dispatcher confiável da hospedagem legada. tests/helpers.mjs simula esse dispatcher somente nos testes. Google e GitHub com emails diferentes podem formar identidades diferentes e não são vinculados automaticamente. Dados anteriores não são migrados automaticamente.

## Respostas mais rápidas

Com VEYRO_FAST_RESPONSES=true, o chat usa decisão local para saber quando é necessário pesquisar. Isso elimina uma inferência adicional de classificação em algumas mensagens, mas pode deixar de identificar perguntas especializadas que mereciam pesquisa. Consultas que pedem pesquisa, notícias, preço e outras pistas atuais ainda acionam a busca.
A tela agrupa os trechos recebidos em frames de animação para evitar reconstrução do DOM a cada token. Salvamentos parciais ocorrem a cada aproximadamente 2,2 segundos no lugar de 1,2 segundos. Isso reduz trabalho e escrita, mas não muda o tempo de geração por token do Qwen ou a latência da rede.
Para preferir o classificador anterior, use VEYRO_FAST_RESPONSES=false. Os provedores e a GPU continuam privados no backend.

## Limitações

Não houve configuração ou teste de verdade nos painéis do Cloudflare, Google ou GitHub. Não foram medidos tokens/s, TTFB ou tempo real do Qwen. Não faça merge, deploy ou publicação sem revisão dos PRs concorrentes e testes de integração no Worker isolado.

## Regularização Google/GitHub no PR #14

**Código não equivale à ativação de OAuth no painel.** O frontend não tem Client ID nem Client Secret de Google ou GitHub. O próprio Cloudflare Access apresenta as opções configuradas, protege a sessão e disponibiliza a identidade verificada por `ctx.access`.

### Configuração privada necessária

1. No Google Cloud, registre OAuth Client do tipo Web Application. Use **o callback exato indicado pelo Access** (normalmente `https://SEU-TIME.cloudflareaccess.com/cdn-cgi/access/callback`). Guarde o segredo em local protegido.
2. No GitHub, registre uma OAuth App com o callback indicado pelo Access. Guarde o Client Secret em local protegido e autorize o aplicativo no processo administrativo da conta.
3. Em **Cloudflare Zero Trust > Integrations > Identity providers**, adicione Google e GitHub com seus respectivos Client ID e Client Secret; use **Test** para conferir ambos.
4. Em **Workers & Pages > veyroia-test > Access**, escolha **All traffic**, com política **Allow** apenas para contas de teste. Verifique em Zero Trust se os dois Identity Providers estão disponíveis para esta aplicação e se a tela de escolha não foi suprimida por login instantâneo.
5. Verifique em navegador privado: acesso anônimo bloqueado; login Google permitido; logout do Access e login GitHub permitido; API `/api/status` protegida; POST de chat autenticado; tentativa de outro usuário sem acesso aos dados; sessão expirada pedindo nova autenticação.
6. Não publique o site oficial nem exponha API/Secrets até esses testes passarem. Prévia Netlify/GitHub Pages é só visual e não tem o backend autenticado.

### Correções do frontend

O botão de recuperação usa agora a raiz do mesmo Worker, protegida pelo Access. Não usa mais o parâmetro `?login=1`, pois ele não inicia OAuth. Tanto as APIs JSON quanto o streaming de mensagens tratam resposta 401 ou redirecionamento identificável ao Cloudflare Access. Respostas HTML inesperadas em prévias estáticas não são confundidas com login bem-sucedido.

### Contas e privacidade

O backend usa o email **verificado pelo Access** para derivar um ID pseudônimo. Google e GitHub com mesmo email verificado recebem a mesma identidade Veyro; emails diferentes resultam em contas distintas. Não implemente vinculação automática por nome de usuário e nunca aceite email informado diretamente pelo navegador.

Documentação oficial: https://developers.cloudflare.com/workers/configuration/cloudflare-access/ e https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/github/ e https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/ .
