# Instruções do Projeto — Zelo

Antes de mexer em cadastro, verificação de identidade, armazenamento de documentos ou qualquer coisa que toque dados pessoais, consulte `docs/03_SEGURANCA_LGPD.md` para não reintroduzir uma exigência que foi deliberadamente flexibilizada (ex: antecedentes criminais hoje é autodeclaração) nem quebrar o que já está em conformidade.

Outros documentos de referência do projeto:
- `docs/01_PRODUTO.md` — visão de produto, categorias de serviço, precificação
- `docs/02_REGRAS_NEGOCIO.md` — regras de verificação, reputação dupla, selos e busca
- `docs/DECISOES.md` — decisões técnicas, de negócio e de design já tomadas; não reconsiderar sem justificativa explícita

## Regras gerais
- Nunca trocar bibliotecas sem autorização
- Nunca remover funcionalidades existentes
- Nunca alterar regras de negócio sem confirmação explícita
- Sempre explicar antes de fazer grandes refatorações
- Sempre preservar compatibilidade mobile
- Sempre priorizar simplicidade
- Sempre reutilizar componentes existentes
