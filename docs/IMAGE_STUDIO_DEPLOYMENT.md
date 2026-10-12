# Veyro IA • Photo Studio: geração e edição (branch de revisão)

## Implementado neste branch

- Texto → imagem por ComfyUI + SDXL-Lightning; mantém o modo local anterior.
- Imagem já salva → edição ou aprimoramento via ComfyUI img2img (LoadImage → ImageScale → VAEEncode → KSampler → VAEDecode → SaveImage).
- Saída gravada no mesmo projeto e atribuída ao usuário autenticado, sem misturar fotos entre projetos.
- Um backend hospedado pode usar `IMAGE_PROVIDER=comfyui-remote`, com gateway HTTPS autenticado por Bearer; sem credencial no navegador. O gateway precisa implementar as rotas ComfyUI /upload/image, /prompt, /history/:id e /view.
- O modo local continua a descarregar o Qwen via Ollama antes de iniciar o ComfyUI, serializando a GPU pelo lock existente.
- Sem API da OpenAI, contratação, deploy, migração de dados ou habilitação automática.

## Configuração

Servidor local: mantenha IMAGE_PROVIDER=comfyui-local, IMAGE_BASE_URL=http://127.0.0.1:8188, MODEL_PROVIDER=local, Ollama e ComfyUI ligados, VEYRO_IMAGES_ENABLED=true e IMAGE_MODEL=sdxl_lightning_4step.safetensors.

Site acessível pelo celular: hospede ComfyUI em infraestrutura privada sob seu controle e um gateway HTTPS com autenticação obrigatória. Configure somente **Secrets do backend**: IMAGE_PROVIDER=comfyui-remote, IMAGE_BASE_URL=https://seu-gateway-privado.example/comfyui, IMAGE_API_KEY=<segredo forte>, IMAGE_MODEL e VEYRO_IMAGES_ENABLED=true. O Worker precisa alcançar esse gateway HTTPS. Não publique a porta 8188 nem exponha a API ComfyUI sem autenticação; aplique limitação de requisições/custo e permita apenas usuários autenticados no gateway Veyro.

**Privacidade:** na edição/aprimoramento a imagem selecionada é enviada do armazenamento do projeto ao serviço ComfyUI configurado. Mantenha a infraestrutura de destino privada e autorizada. O fluxo não implementa moderação independente do modelo e precisa de revisão antes de disponibilização ampla. A variante `comfyui-remote` exige token de 16+ caracteres e URL HTTPS sem credenciais/query.

## Limitações e QA obrigatória

- O SDXL-Lightning possui quatro passos; editar/aprimorar com denoise 0.6/0.3 é uma aproximação img2img, não garante preservação exata do conteúdo. Não substitui edição por máscara/inpainting nem super-resolução especializada.
- O recurso depende de checkpoint instalado no ComfyUI remoto/local, suporte ao formato e capacidade de GPU. Não existe GPU gratuita provisionada automaticamente.
- A API da Veyro executa um slot por requisição; um gerador lento pode exceder o tempo de execução do Cloudflare Worker. Para produção, usar fila assíncrona e polling por job.
- Executar testes Node >=24, npm ci, npm test, npm run build e QA real em celular/notebook, conferir tempo de execução, custos, quotas, isolamento e configuração segura do gateway.
- A PR foi feita para a branch de integração #14. Não mesclar, publicar ou alterar produção sem aprovação do responsável pela consolidação.
