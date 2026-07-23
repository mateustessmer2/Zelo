-- ============================================================================
-- ROW LEVEL SECURITY — O CORAÇÃO DAS REGRAS DE CONFIANÇA
-- ----------------------------------------------------------------------------
-- Estas políticas fazem a reputação dupla ser GARANTIDA PELO BANCO.
-- Se estivesse só no React, qualquer pessoa abriria o DevTools e leria tudo.
-- Aqui, o Postgres recusa a linha antes de ela sair do servidor.
--
-- Regra central da reputação dupla:
--   • Cliente avalia profissional  -> comentário legível SÓ por clientes
--   • Profissional avalia cliente   -> comentário legível SÓ por profissionais
--   • Ninguém lê em detalhe a avaliação que RECEBEU do outro lado
--   • Todos veem apenas o AGREGADO (view trust_scores), nunca o comentário
-- ============================================================================

-- Helper: papel do usuário logado -------------------------------------------
create or replace function auth_role()
returns user_role
language sql stable
as $$
  select role from perfis where id = auth.uid();
$$;

-- Ativar RLS em tudo que é sensível ------------------------------------------
alter table perfis          enable row level security;
alter table profissionais   enable row level security;
alter table verificacoes    enable row level security;
alter table bookings        enable row level security;
alter table avaliacoes      enable row level security;
alter table mensagens       enable row level security;
alter table favoritos       enable row level security;

-- ----------------------------------------------------------------------------
-- PERFIS
-- ----------------------------------------------------------------------------
-- Qualquer um lê dados públicos de perfil; cada um edita o seu.
create policy perfis_select_public on perfis
  for select using (true);

create policy perfis_update_own on perfis
  for update using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- PROFISSIONAIS — só aparecem na busca quando visivel = true
-- ----------------------------------------------------------------------------
create policy prof_select_visiveis on profissionais
  for select using (
    visivel = true            -- público vê só as verificadas
    or id = auth.uid()        -- a própria se vê sempre (perfil em construção)
    or auth_role() = 'admin'  -- admin vê todas
  );

create policy prof_update_own on profissionais
  for update using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- VERIFICAÇÕES — documento sensível. Só a dona e o admin acessam.
-- O cliente NUNCA lê esta tabela; ele vê apenas o selo derivado de 'visivel'.
-- ----------------------------------------------------------------------------
create policy verif_select_own_or_admin on verificacoes
  for select using (
    profissional_id = auth.uid()
    or auth_role() = 'admin'
  );

create policy verif_admin_write on verificacoes
  for all using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- ----------------------------------------------------------------------------
-- BOOKINGS — só as duas partes (e admin) enxergam
-- ----------------------------------------------------------------------------
create policy bookings_select_parties on bookings
  for select using (
    cliente_id = auth.uid()
    or profissional_id = auth.uid()
    or auth_role() = 'admin'
  );

create policy bookings_insert_cliente on bookings
  for insert with check (cliente_id = auth.uid());

create policy bookings_update_parties on bookings
  for update using (
    cliente_id = auth.uid() or profissional_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- AVALIAÇÕES — A REGRA MAIS IMPORTANTE
-- ----------------------------------------------------------------------------
-- INSERT: só quem participou de um booking CONCLUÍDO pode avaliar,
--         e apenas no lado correto (cliente->prof ou prof->cliente).
create policy avaliacoes_insert_participante on avaliacoes
  for insert with check (
    autor_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and b.status = 'concluido'
        and (
          -- cliente avaliando a profissional
          (lado = 'cliente_avalia_prof'
             and b.cliente_id = auth.uid()
             and b.profissional_id = alvo_id)
          or
          -- profissional avaliando o cliente
          (lado = 'prof_avalia_cliente'
             and b.profissional_id = auth.uid()
             and b.cliente_id = alvo_id)
        )
    )
  );

-- SELECT: visibilidade segmentada por lado.
--   Um CLIENTE só lê comentários do lado 'cliente_avalia_prof'
--     (avaliações que clientes escreveram sobre profissionais) —
--     é o que ajuda outro cliente a escolher.
--   Uma PROFISSIONAL só lê comentários do lado 'prof_avalia_cliente'
--     (avaliações que profissionais escreveram sobre clientes).
--   O autor sempre lê o que ele mesmo escreveu.
--   NINGUÉM lê em detalhe a avaliação que recebeu do outro lado:
--     o alvo NÃO ganha acesso por ser alvo. Ele só vê o agregado
--     (view trust_scores, que não passa por esta política).
create policy avaliacoes_select_segmentado on avaliacoes
  for select using (
    autor_id = auth.uid()                                   -- vejo o que escrevi
    or auth_role() = 'admin'                                -- admin modera tudo
    or (lado = 'cliente_avalia_prof' and auth_role() = 'cliente')
    or (lado = 'prof_avalia_cliente' and auth_role() = 'profissional')
  );

-- ----------------------------------------------------------------------------
-- MENSAGENS — só as partes do booking
-- ----------------------------------------------------------------------------
create policy mensagens_select_parties on mensagens
  for select using (
    exists (
      select 1 from bookings b
      where b.id = booking_id
        and (b.cliente_id = auth.uid() or b.profissional_id = auth.uid())
    )
  );

create policy mensagens_insert_parties on mensagens
  for insert with check (
    autor_id = auth.uid()
    and exists (
      select 1 from bookings b
      where b.id = booking_id
        and (b.cliente_id = auth.uid() or b.profissional_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- FAVORITOS — cada cliente gerencia os seus
-- ----------------------------------------------------------------------------
create policy favoritos_own on favoritos
  for all using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

-- ============================================================================
-- NOTA SOBRE TELEFONE
-- A coluna perfis.telefone é lida pela política pública de perfis. Para
-- liberar o telefone SÓ após booking confirmado, NÃO exponha telefone no
-- select público de perfil no app: sirva-o por uma função/endpoint que
-- confere se existe booking confirmado entre as partes. Alternativa mais
-- estrita: mover telefone para tabela própria com RLS por booking.
-- ============================================================================
