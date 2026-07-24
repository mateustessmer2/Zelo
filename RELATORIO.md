# Auditoria pré-lançamento — Zelo
**Data:** 24/07/2026 · **Escopo:** 100% dos arquivos do repositório (28 arquivos, 9 migrações SQL, 20 módulos JS/JSX)

---

## Método e limites — leia primeiro

Auditoria **estática**: cada arquivo foi lido e cruzado com o schema, as policies e os grants. Validações executadas: balanceamento sintático de todos os módulos, imports × exports, colunas usadas × colunas existentes, RLS × grants tabela a tabela.

**O que este ambiente não executa** (sem rede): `npm run build`, `npm audit`, Lighthouse, testes em navegador. Esses quatro itens ficam como pendência — a lista de comandos está no fim do relatório.

---

## Nota geral: 7,5 / 10 → 9 / 10 após aplicar as correções

**Prontidão para produção: quase — aplicar o SQL 09 é condição para lançar.**
Dois dos achados críticos permitem que um usuário logado altere ou destrua dados de outros. O terceiro faz uma funcionalidade inteira (feedback privado) falhar em silêncio.

---

## Achados críticos (3)

### C1 — Quatro tabelas com escrita liberada para qualquer usuário logado
`profissional_categorias`, `profissional_bairros`, `disponibilidade` e `dias_bloqueados` receberam **grant de escrita sem RLS habilitado**. Grant sem RLS = sem filtro por linha: qualquer pessoa logada podia apagar a agenda da Creuza, trocar as categorias dela, adicionar bairros falsos. Um cliente malicioso sabotaria concorrentes com três chamadas de API.
**Correção (09/A):** RLS ligado nas quatro + leitura pública + escrita só do dono.

### C2 — TRUNCATE concedido aos papéis da API
Visto nos grants reais do seu banco: `authenticated` tinha TRUNCATE. **TRUNCATE ignora RLS** — qualquer usuário logado podia esvaziar uma tabela inteira com um comando.
**Correção (09/B):** revogado TRUNCATE, REFERENCES e TRIGGER de `anon` e `authenticated` em todas as tabelas.

### C3 — Feedback privado nunca funcionou
A view `minhas_avaliacoes_recebidas` foi criada com `security_invoker = true`: ela aplica o RLS de `avaliacoes` com o papel de quem consulta — e o RLS **nega a linha justamente à pessoa avaliada**. Resultado: a view sempre retorna vazio; as "mensagens diretas" nunca apareceram para ninguém. O erro é meu, do arquivo 07 — inclusive o comentário que afirmava o contrário.
**Correção (09/C):** view recriada sem `security_invoker`; a segurança está nos filtros dela (`alvo_id = auth.uid()` + só publicadas), que são exatamente a regra de negócio.

## Achados importantes (6)

| # | Problema | Correção |
|---|----------|----------|
| I1 | **Busca pública quebrada** — visitante sem login recebia `permission denied` (sem grants para `anon`) | 09/D: grants de leitura; RLS continua escondendo perfis não visíveis |
| I2 | **Aprovação em 2 updates não-atômicos** — já dessincronizou em teste real | 09/E: trigger espelha `verificacoes` → `profissionais` no banco |
| I3 | **Índices ausentes** nas colunas que a busca da home filtra | 09/F: 4 índices |
| I4 | **Sem validação de valores** — preço negativo e idade 999 passavam | 09/G: constraints |
| I5 | **Extensão de upload não sanitizada** — nome do arquivo ia cru para o path | `api.js`: whitelist `[a-z0-9]{1,5}`, senão `.bin` |
| I6 | **Usuário órfão preso em "Carregando…" eterno** sem conseguir sair | `App.jsx`: tela com explicação e botão Sair |

## Melhorias aplicadas (aproveitando os mesmos arquivos)

- **Code splitting** (`App.jsx`): páginas em `React.lazy` — o bundle inicial era ~443 KB; a home agora carrega só o necessário. Impacto direto no celular, que é onde seus usuários estão.
- **Cabeçalhos de segurança** (`netlify.toml`): CSP restrita ao que o app usa (Supabase + Google Fonts), X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- **Cache imutável** para `/assets/*` (os nomes têm hash; todo deploy gera nomes novos).
- **SEO/OG** (`index.html`): title, description e Open Graph — o link do Zelo vai circular por WhatsApp; agora aparece com título e descrição decentes.
- **`robots.txt`**: libera indexação do site, bloqueia `/admin` e painéis.

## Não corrigido agora — documentado (com motivo)

| Item | Motivo de não mexer |
|------|--------------------|
| `useEffect` sem guarda de unmount em 5 arquivos | Inofensivo no React 18 (no-op); corrigir custaria 5 colagens por benefício ~zero |
| `alternarFavorito`/`listarFavoritos` sem UI | Roadmap declarado, não código morto |
| Cadastro cria perfil pelo cliente (origem dos órfãos) | A solução canônica (trigger + metadata no signUp) exige mudar signup e trigger juntos — risco médio; fazer com calma pós-lançamento |
| `bookings` update sem restrição de coluna (parte pode alterar `valor_combinado` depois) | Exige trigger de colunas; risco baixo com pagamento fora da plataforma |
| Mensagens de chat nunca marcadas como lidas | Funcionalidade, não bug; roadmap |
| Busca por turno baixa a tabela `disponibilidade` inteira | OK até ~centenas de profissionais; reescrever com filtro no banco quando escalar |

## Escalabilidade (estimativa honesta)

- **1.000 usuários:** nada a fazer — Supabase free aguenta com folga.
- **10.000:** a busca por turno (acima) vira o primeiro gargalo; paginar resultados.
- **100.000+:** mover busca para uma função SQL (`rpc`) com joins no banco; CDN de fotos; considerar plano pago do Supabase pelos limites de conexões.
Nenhum desses exige mudança de arquitetura — o desenho atual (Postgres + RLS + SPA) escala até lá.

## Pendências que dependem de você (fora do código)

1. **Rodar no seu Mac ou aceitar no primeiro deploy:** `npm run build` (o Netlify roda no deploy — se o build passar lá, este item se resolve sozinho), `npm audit` (1 min, aponta vulnerabilidades de dependências).
2. **Termos de uso + política de privacidade** — segue sendo o bloqueador real de lançamento (antecedentes criminais = dado sensível, LGPD).
3. **SMTP próprio + religar confirmação de e-mail.**
4. **Agendar `publicar_avaliacoes_vencidas()`** (diário) — sem isso, avaliação unilateral nunca publica após os 14 dias.
5. Apagar documentos de verificação após aprovação (retenção mínima, LGPD).

## Ordem de aplicação

1. `supabase/09_auditoria.sql` → SQL Editor (bloco a bloco se preferir)
2. Subir: `App.jsx`, `api.js`, `index.html`, `netlify.toml`, `public/robots.txt` (pasta nova `public/`), `supabase/09_auditoria.sql`
3. Testar: busca **deslogada** em aba anônima · feedback privado (par de avaliações novo) · upload de documento · aprovação como admin

---

*Relatório gerado por auditoria estática linha a linha. Os quatro itens não executáveis neste ambiente (build, npm audit, Lighthouse, teste em navegador) estão listados acima como pendência — nenhum deles foi simulado ou presumido.*
