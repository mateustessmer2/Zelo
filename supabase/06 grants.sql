-- ============================================================================
-- MIGRAÇÃO 06 — GRANTS E POLICIES QUE FALTAVAM
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 05.
--
-- Este arquivo consolida tudo que foi descoberto ao colocar o app no ar pela
-- primeira vez. Sem ele, os SQLs 01-05 criam um banco correto mas inacessível:
-- o app cadastra, mas nada aparece; sobe documento, mas não registra.
--
-- POR QUE ISTO É NECESSÁRIO
--
-- 1) GRANTS — o projeto foi criado com "Automatically expose new tables"
--    DESLIGADO (recomendação de segurança do próprio Supabase). Isso significa
--    que nenhuma tabela nova recebe privilégio na API automaticamente. O RLS
--    decide QUAIS LINHAS a pessoa vê; o GRANT decide se ela pode olhar a
--    tabela. Faltando o segundo, o primeiro nem chega a ser avaliado.
--
-- 2) POLICIES DE INSERT — o desenho original de 02_rls.sql cobriu quem LÊ os
--    dados e esqueceu quem os CRIA. Cadastro, upload de documento e
--    contratação são todos INSERT feitos pela própria pessoa.
--
-- 3) auth_role() PRECISA SER security definer — a função lê `perfis`, que tem
--    RLS. Chamada de dentro de uma policy, essa leitura interna é bloqueada e
--    a função devolve vazio. O resultado é silencioso: nada quebra, tudo só
--    fica invisível.
-- ============================================================================


-- ============================================================================
-- A) GRANTS DE SCHEMA E TABELAS
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- Dados de referência: leitura pública (a home precisa deles antes do login)
grant select on cidades, bairros, categorias to anon, authenticated;

-- Tabelas do app: o RLS filtra as linhas, o grant abre a porta
grant select, insert, update on perfis                  to authenticated;
grant select, insert, update on profissionais           to authenticated;
grant select, insert, delete on profissional_categorias to authenticated;
grant select, insert, delete on profissional_bairros    to authenticated;
grant select, insert, update on bookings                to authenticated;
grant select, insert         on avaliacoes              to authenticated;
grant select, insert         on mensagens               to authenticated;
grant select, insert, update on verificacoes            to authenticated;
grant select, insert, update on contatos                to authenticated;
grant select, insert, delete on favoritos               to authenticated;
grant select, insert, delete on disponibilidade         to authenticated;
grant select, insert, delete on dias_bloqueados         to authenticated;

-- View de agregados (Trust Score)
grant select on trust_scores to anon, authenticated;

-- Sequências, caso alguma coluna serial seja adicionada depois
grant usage on all sequences in schema public to authenticated;


-- ============================================================================
-- B) GRANTS DE STORAGE
-- ============================================================================

grant usage on schema storage to anon, authenticated;
grant select, insert, update on storage.objects to authenticated;
grant select on storage.buckets to anon, authenticated;


-- ============================================================================
-- C) auth_role() COM security definer
-- ----------------------------------------------------------------------------
-- Sem `security definer`, a função é bloqueada pelo RLS de `perfis` quando
-- chamada de dentro de uma policy — e devolve vazio. Consequência: o admin
-- deixa de ser reconhecido como admin em TODAS as policies que dependem dela
-- (fila de verificação, avaliações segmentadas, bookings).
--
-- `set search_path = public` evita que um schema malicioso no caminho de
-- busca sequestre a resolução de `perfis` — obrigatório em security definer.
-- ============================================================================

create or replace function auth_role()
returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from perfis where id = auth.uid();
$$;


-- ============================================================================
-- D) POLICIES DE INSERT E UPDATE QUE FALTAVAM
-- ============================================================================

-- Cada pessoa cria o próprio perfil no cadastro.
-- O `id = auth.uid()` garante que ninguém cria perfil para outra pessoa.
create policy perfis_insert_own on perfis
  for insert with check (id = auth.uid());

-- Mesma coisa para a linha em `profissionais`, criada logo após o perfil
create policy prof_insert_own on profissionais
  for insert with check (id = auth.uid());

-- A profissional registra os próprios documentos de verificação.
-- Sem isto, o arquivo sobe para o storage mas a linha nunca é criada —
-- e o app falha sem erro visível.
create policy verif_insert_own on verificacoes
  for insert with check (profissional_id = auth.uid());

-- Reenvio de documento rejeitado
create policy verif_update_own on verificacoes
  for update using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());

-- O admin aprova a verificação, o que exige atualizar `profissionais`.
-- A policy `prof_update_own` cobre apenas a própria profissional — sem esta,
-- a aprovação grava em `verificacoes` mas não sincroniza os status, e a
-- coluna gerada `visivel` nunca vira true.
create policy prof_update_admin on profissionais
  for update using (auth_role() = 'admin')
  with check (auth_role() = 'admin');


-- ============================================================================
-- E) VERIFICAÇÃO — rode depois para confirmar que está tudo no lugar
-- ----------------------------------------------------------------------------
-- select count(*) from categorias where ativa = true;   -- esperado: 3
-- select count(*) from cidades;                          -- esperado: 4
-- select count(*) from bairros;                          -- esperado: 7
--
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public' order by tablename;
--   -> true em: perfis, profissionais, avaliacoes, bookings, mensagens,
--               verificacoes, contatos, favoritos
--   -> false em: cidades, bairros, categorias (dados públicos)
--
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'public' order by tablename, cmd;
--
-- select id, name, public from storage.buckets;
--   -> documentos-verificacao (false), fotos-perfil (true)
-- ============================================================================


-- ============================================================================
-- NOTA PARA O FUTURO
-- ----------------------------------------------------------------------------
-- Toda tabela nova precisa de DUAS coisas para funcionar no app:
--   1. `grant ... to authenticated` (ou anon, se for leitura pública)
--   2. policies de RLS cobrindo SELECT *e* INSERT/UPDATE/DELETE conforme o uso
--
-- Esquecer a policy de INSERT é o erro mais fácil de cometer: a tela carrega,
-- o botão responde, e a gravação falha em silêncio. Ao criar tabela, escreva
-- as policies pensando em quem LÊ e em quem ESCREVE.
-- ============================================================================
