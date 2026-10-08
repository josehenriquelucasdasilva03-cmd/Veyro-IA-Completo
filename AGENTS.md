# Veyro IA — fonte de desenvolvimento

Este é o código reorganizado do projeto Veyro IA existente, baseado na versão publicada 7.

- O usuário pediu explicitamente para preservar o site oficial. Trabalhe nesta cópia.
- Não crie outro Site, não faça push para a branch oficial, não salve versão no Sites,
  não publique e não altere ambiente, acesso ou dados de produção sem nova instrução explícita.
- O arquivo `.openai/hosting.json` preserva a identidade do projeto para uma futura publicação autorizada.
- O comando `npm run dev` usa somente dados locais. A identidade simulada vale apenas no adaptador local;
  o Worker de produção continua exigindo a identidade fornecida pelo Sites.
- Leia `README.md`, `docs/ARCHITECTURE.md` e `docs/CONTINUE.md` antes de mudanças.
- Leia `docs/STATUS.md` para distinguir funcionalidades prontas de serviços ainda não conectados.
- Preserve migrações já existentes. Gere uma nova migração para mudanças de schema.
- Não coloque segredos, `.env`, dados locais, uploads de usuário ou credenciais Git em entregas.
- Rode os testes relevantes e o build local após alterar o código; não alegue testes no celular sem fazê-los.
- Atualize os mesmos arquivos da pasta Veyro IA Source ao salvar mudanças futuras, preservando sua identidade.
