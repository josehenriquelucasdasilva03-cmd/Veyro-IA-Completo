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
