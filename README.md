# Zelo — marketplace de serviços residenciais

MVP de marketplace que conecta famílias a profissionais autônomos verificados.
Lançamento em Pelotas (RS), com arquitetura parametrizada para qualquer cidade.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha com seus dados do Supabase
npm run dev
```

## Configurar o Supabase

1. Crie um projeto em supabase.com
2. No **SQL Editor**, rode os arquivos **nesta ordem**:
   - `supabase/01_schema.sql` — tabelas, enums, view de trust score
   - `supabase/02_rls.sql` — políticas de segurança (a reputação dupla vive aqui)
   - `supabase/03_seed.sql` — Pelotas, bairros e categorias
   - `supabase/04_storage.sql` — buckets e políticas de documentos
   - `supabase/05_correcoes.sql` — telefone protegido + liberação simultânea
3. Em **Settings → API**, copie a URL e a anon key para o `.env.local`
4. Em **Database → Replication**, ative Realtime na tabela `mensagens` (chat ao vivo)

### Criar o primeiro admin

Cadastre-se normalmente pelo app, depois rode no SQL Editor:

```sql
update perfis set role = 'admin' where id = 'uuid-do-seu-usuario';
```

## Deploy no Netlify

Conecte o repositório. O `netlify.toml` já configura build e redirects de SPA.
Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do site.

## Arquitetura

```
src/
  lib/supabase.js    cliente
  lib/api.js         toda conversa com o banco em um lugar
  hooks/useAuth.jsx  sessão, perfil e papel (cliente/profissional/admin)
  components/        TrustScore, Avaliacoes, FormAvaliacao, Header
  pages/             Home, Busca, PerfilProfissional, Login, Cadastro, painéis
```

### Decisões que sustentam o produto

**A segurança está no banco, não no React.** As policies RLS decidem o que cada
pessoa lê. Se a regra morasse no front-end, o DevTools contornaria.

**Reputação dupla com visibilidade segmentada.** Clientes leem apenas
avaliações escritas por clientes; profissionais, apenas as escritas por
profissionais. Ninguém lê em detalhe a avaliação que recebeu — só o agregado,
pela view `trust_scores`. E só quem teve booking concluído consegue avaliar.

**Verificação como porta de entrada.** A coluna `visivel` em `profissionais` é
gerada pelo banco: vira `true` sozinha quando identidade E antecedentes são
aprovados. Ninguém publica um perfil manualmente.

**Documentos sensíveis em bucket privado.** Antecedentes criminais é dado
sensível sob a LGPD. O arquivo nunca é exposto; o admin abre por URL assinada
de 60 segundos e o cliente vê apenas o selo.

**Pagamento fora da plataforma.** O app registra o valor combinado; o dinheiro
não passa por aqui. Evita enquadramento como arranjo de pagamento e reforça a
autonomia da profissional. Os campos para split futuro já existem em `bookings`.

**Multi-cidade desde o dia zero.** Cidades, bairros e categorias são dados.
Expandir para Rio Grande ou Porto Alegre é mudar `ativa` para `true`.

## Resolvido em 05_correcoes.sql

- **Telefone protegido**: saiu de `perfis` e foi para a tabela `contatos`, cujo
  SELECT exige booking confirmado ou concluído entre as duas partes. A regra
  agora vive no Postgres, não na interface.
- **Liberação simultânea de avaliações**: nenhuma avaliação aparece até os dois
  lados enviarem, ou até o prazo de 14 dias expirar. Um trigger publica o par
  junto; `publicar_avaliacoes_vencidas()` cuida das expiradas — agende com
  pg_cron ou uma Netlify scheduled function diária.

## Pendências antes de produção

- **Termos de uso e política de privacidade**: necessários, e vale advogado.
  Você coleta dado sensível (antecedentes) e intermedia trabalho doméstico.
- **Retenção de documentos**: apagar o arquivo após a aprovação, mantendo só o
  resultado. Ver bloco final de `04_storage.sql`.
- **Agendar `publicar_avaliacoes_vencidas()`**: sem isso, uma avaliação
  unilateral nunca aparece.
- **Rodar o app com dados reais**: os `select` aninhados em
  `buscarProfissionais` (N:N via PostgREST) são o ponto mais provável de
  ajuste no primeiro contato.
- **Métrica de disintermediação**: acompanhar recorrência dentro do app.

## Riscos conhecidos

**Vínculo empregatício** é o risco central do negócio. Faxineira, babá e
cuidadora são categorias com histórico de ações trabalhistas. A autonomia da
profissional precisa ser real no produto: ela define preço, aceita ou recusa
livremente, sem penalidade por recusa e sem exclusividade. Não adicione
contadores regressivos, ranking por taxa de aceitação ou qualquer mecanismo que
pressione aceitação — isso constrói subordinação.
