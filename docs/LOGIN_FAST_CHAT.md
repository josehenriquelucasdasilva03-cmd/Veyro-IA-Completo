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
