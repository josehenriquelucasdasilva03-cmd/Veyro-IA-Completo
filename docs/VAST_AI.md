# Veyro IA + Qwen3.5:35b no Vast.ai

Este guia prepara o backend para usar a GPU alugada sem mudar o site publicado. **O código sozinho não ativa a conexão remota.**

## O que já foi testado na máquina

- `ollama list` mostrou `qwen3.5:35b`.
- `ollama run qwen3.5:35b` respondeu em português.
- `curl -i http://127.0.0.1:21434/api/tags` retornou `HTTP/1.1 200 OK` e o modelo.
- `OLLAMA_HOST=0.0.0.0:21434` e `OLLAMA_PORT=21434`.
- A porta `11434` respondeu `401 Unauthorized` do Caddy: é um **proxy diferente**, não a porta interna do Ollama.

`127.0.0.1:21434` só serve para processos **dentro da mesma máquina**. Não a coloque como URL do backend se o backend estiver hospedado fora do Vast.ai.

## Ativação remota segura

1. Configure ou obtenha **um endereço HTTPS de inferência** acessível pelo backend Veyro e **protegido por autenticação** (Basic no proxy ou Bearer em gateway autenticado). Configure limites de acesso e taxa de requisições. Não exponha o serviço Ollama diretamente na internet.
2. Verifique no lado do servidor, com o método de autenticação correspondente, que `GET https://<endpoint-autenticado>/v1/models` responde corretamente e que o identificador do modelo existe. Não cole o endereço com senha ou token no chat e não publique no GitHub. Um link do portal Vast ou de Jupyter não é automaticamente um endpoint de API.
3. Configure as variáveis abaixo **somente no ambiente privado que executa o backend** (segredos do servidor, ou `.env` ignorado pelo Git).
4. Refaça o build e execute os testes em ambiente de desenvolvimento, sem publicar o site oficial; só então peça autorização para uma implantação controlada.

Para proxy HTTP Basic:
```dotenv
MODEL_PROVIDER=vast
MODEL_BASE_URL=https://seu-endpoint-autenticado.example/v1
MODEL_NAME=qwen3.5:35b
MODEL_AUTH_TYPE=basic
MODEL_BASIC_USER=seu-usuario-privado
MODEL_BASIC_PASSWORD=sua-senha-privada
MODEL_TIMEOUT_MS=180000
VEYRO_CHAT_ENABLED=true
```

Para gateway com autorização Bearer use, em vez disso:
```dotenv
MODEL_PROVIDER=vast
MODEL_BASE_URL=https://seu-endpoint-autenticado.example/v1
MODEL_NAME=qwen3.5:35b
MODEL_AUTH_TYPE=bearer
MODEL_API_KEY=sua-chave-privada
MODEL_TIMEOUT_MS=180000
VEYRO_CHAT_ENABLED=true
```

A URL deve apontar à raiz `/v1` de uma API **compatível com OpenAI Chat Completions** do Ollama; essa compatibilidade é um formato de protocolo, **não** utiliza a API comercial da OpenAI. Não inclua `/chat/completions` duas vezes. Segredos nunca vão para frontend, repositório, comandos públicos ou imagens de tela.

## Restrições importantes

- HTTP externo, `?token=...` na URL, credenciais embutidas na URL e URLs com fragmento não são aceitos.
- Uma URL temporária `*.trycloudflare.com` pode expirar; o HTTPS de um túnel, sozinho, **não garante autenticação**. Configure a autenticação no gateway/proxy.
- O `MODEL_PROVIDER=local` continua disponível para Ollama no próprio notebook, normalmente em `http://127.0.0.1:11434/v1`.
- Se o backend Veyro rodar na **mesma máquina Vast**, a configuração local poderá usar `http://127.0.0.1:21434/v1`, mas isso não conecta automaticamente um site hospedado em outro servidor.
- Voz, pesquisa e ComfyUI locais não passam a rodar no Vast.ai automaticamente ao ativar o modelo remoto. O adaptador de imagem local exige `MODEL_PROVIDER=local`.
- O uso da instância Vast.ai pode continuar gerando cobranças enquanto ela estiver ligada, mesmo se o site não fizer perguntas.
- Quando o endpoint remoto estiver indisponível, o chat retorna erro controlado; não tente publicar as credenciais para contornar o erro.

## Verificação rápida do projeto

Em máquina com Node.js 24+ e dependências instaladas:
```sh
npm ci
npm test
npm run build
```

O **site publicado permanece inalterado** até autorização expressa para implantação. Se ainda não existir um endpoint HTTPS autenticado acessível ao backend, a preparação do código estará completa, mas a integração real permanecerá pendente.


## Estado da porta externa informado em 2026-10-10

Foi informado que a porta externa mapeada é **10308**, que o Caddy responde na porta interna **11434** com autenticação Basic e que o Ollama/Qwen fica na porta interna **21434**. Confirme no painel Vast.ai que o mapeamento é exatamente **porta externa 10308 → Caddy interno 11434**; o número da porta, sem o IP/hostname, não forma uma URL completa.

O mapeamento de porta do Vast.ai disponibiliza uma porta TCP pública e **não comprova que exista HTTPS/TLS nela**. Não basta trocar `http://` por `https://`: a conexão precisa apresentar um certificado TLS válido para o hostname usado pelo backend. O Instance Portal do Vast.ai pode fornecer túneis HTTPS, mas a URL do túnel deve ser verificada para confirmar que alcança a API do Caddy e que a autenticação Basic continua exigida; links temporários ou tokens em query string não devem ser tratados como configuração permanente.

Antes de ativar o chat remoto ainda faltam:

1. Um IP/hostname alcançável pelo backend e um endpoint HTTPS com certificado válido (por exemplo, um túnel HTTPS estável ou proxy TLS configurado para o serviço). Não inclua usuário ou senha na URL.
2. Confirmar que o Caddy encaminha `/v1/models` e `/v1/chat/completions` para `http://127.0.0.1:21434/v1` e aplica Basic Auth também às duas rotas; o `401` atual só confirma que o proxy exige autenticação, não que o caminho compatível nem o streaming foram validados.
3. Armazenar usuário e senha apenas nas variáveis privadas do ambiente do backend Veyro. A URL-base terá formato `https://<hostname-com-certificado>:10308/v1` somente se o TLS estiver realmente configurado nessa porta; caso o HTTPS use outra porta/hostname, usar o endereço real validado.
4. Testar, a partir do ambiente do backend, a validação TLS, o `GET /v1/models` autenticado e uma requisição `POST /v1/chat/completions` com streaming. Só depois disso abrir o chat no navegador e enviar uma mensagem.

Não publique credenciais nem envie-as pelo chat. O backend Veyro deve ser o único componente que conhece as credenciais do Caddy.
