# Correções auditadas em 11/10/2026

Alterações apenas na branch de revisão, sem deploy e sem alterar a branch main.

## Correções aplicadas
- Corrigidas URLs de simulação incompatíveis com o modo local nos testes de chat e conhecimento; loops agora encerram ao fim inesperado do stream, em vez de travar.
- Autenticação precisa de VEYRO_AUTH_MODE explícito. Os modos são cloudflare-access (Worker protegido por Access), sites (dispatcher autenticado do Sites) e local (adaptador de desenvolvimento, restrito a hosts loopback). A ausência ou o modo disabled recusam chamadas da API. **Nunca** configure sites em um Worker público sem dispatcher confiável.
- Uploads de avatares e anexos agora precisam corresponder às assinaturas dos formatos aceitos. Isto identifica formatos, mas **não substitui antivírus, decodificação integral ou validação de arquivos multipart contra excesso de tamanho com cabeçalho ausente**.
- A edição/aprimoramento de imagem, ainda indisponíveis no gerador local, são sinalizados sem tentar criar jobs incompatíveis.
- O serviço de transcrição usa email.parser em vez do módulo cgi removido no Python 3.13.
- A UI distingue modelo configurado de conexão real comprovada.
- Testes extras cobrem assinaturas falsas e autenticação não configurada.

## Execução de testes no ambiente de revisão
- Node.js 24.21.0; 63 testes JavaScript concluídos (todos passaram).
- Python 3.13.13; 4 testes de voz, 2 de agentes, 5 de leitor passaram.
- Build executado sem publicação.

## Antes de unir ou publicar
1. Revisar o destino: Veyro Sites exige cabeçalho fornecido pelo dispatcher autenticado; Worker de teste exige Access habilitado em todo o tráfego.
2. Reconciliar com PRs concorrentes que adicionem login Google/GitHub ou provedor OpenAI. Não transferir rotas, segredos ou autenticação de uma branch para outra por substituição manual.
3. Repetir testes e verificações de segurança no branch combinado e testar chamadas reais do Qwen, banco, R2 e Cloudflare Access.
4. Não considerar a interface Netlify como prova de funcionamento do backend, e não considerar modelo configurado como prova de conectividade.
5. Testar com usuários e sessões diferentes; limites globais de custo, escaneamento de malware e proteção contra prompt injection continuam exigindo auditorias especializadas.
