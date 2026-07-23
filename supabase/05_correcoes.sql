-- ============================================================================
-- MIGRAÇÃO 05 — CORREÇÕES CRÍTICAS ANTES DO LANÇAMENTO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 04. Resolve dois problemas que só aparecem com dados
-- reais e que ficam caros de migrar depois:
--
--   A) Telefone vazando pelo SELECT público de `perfis`
--   B) Retaliação em avaliações (quem avalia primeiro fica exposto)
-- ============================================================================


-- ============================================================================
-- A) TELEFONE — parar de expor no SELECT público
-- ----------------------------------------------------------------------------
-- O problema: a policy `perfis_select_public` usa `using (true)`, então
-- QUALQUER pessoa autenticada lê a coluna telefone de QUALQUER perfil pela
-- API REST. A trava "só libera após confirmação" existia só na interface —
-- e interface não é segurança.
--
-- A solução: tirar o telefone de `perfis` e colocar numa tabela própria, cujo
-- acesso exige um booking confirmado entre as duas partes. Assim a regra
-- vive no Postgres e vale para qualquer cliente da API.
-- ============================================================================

create table if not exists contatos (
  perfil_id   uuid primary key references perfis(id) on delete cascade,
  telefone    text,
  whatsapp    text,
  updated_at  timestamptz not null default now()
);

alter table contatos enable row level security;

-- Migra os telefones já existentes
insert into contatos (perfil_id, telefone)
select id, telefone from perfis where telefone is not null
on conflict (perfil_id) do nothing;

-- Cada pessoa gerencia o próprio contato
create policy contatos_own on contatos
  for all using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

-- A outra parte lê o contato APENAS se houver booking confirmado ou concluído
-- entre os dois. Esta é a regra que antes vivia no React.
create policy contatos_select_booking_confirmado on contatos
  for select using (
    exists (
      select 1 from bookings b
      where b.status in ('confirmado', 'concluido')
        and (
          (b.cliente_id = auth.uid() and b.profissional_id = contatos.perfil_id)
          or
          (b.profissional_id = auth.uid() and b.cliente_id = contatos.perfil_id)
        )
    )
  );

create policy contatos_select_admin on contatos
  for select using (auth_role() = 'admin');

-- Remove a coluna antiga. A partir daqui, `perfis` não carrega telefone.
alter table perfis drop column if exists telefone;


-- ============================================================================
-- B) LIBERAÇÃO SIMULTÂNEA DE AVALIAÇÕES
-- ----------------------------------------------------------------------------
-- O problema: se a avaliação fica visível assim que enviada, quem avalia
-- primeiro fica exposto — o outro lado lê e responde na mesma moeda. O
-- resultado é reputação inflada e inútil, que é exatamente o oposto do que
-- o produto vende.
--
-- A solução (padrão Airbnb): nenhuma avaliação aparece até que
--   • os DOIS lados tenham avaliado, OU
--   • o prazo de 14 dias expire (aí publica o que houver).
-- ============================================================================

alter table avaliacoes
  add column if not exists publicada_em timestamptz;

-- Prazo para o par se completar. Depois disso, publica mesmo unilateral.
alter table avaliacoes
  add column if not exists prazo_publicacao timestamptz
  not null default (now() + interval '14 days');

create index if not exists idx_avaliacoes_publicacao
  on avaliacoes(booking_id, publicada_em);

-- ----------------------------------------------------------------------------
-- Trigger: quando o par se completa, publica as DUAS de uma vez.
-- ----------------------------------------------------------------------------
create or replace function publicar_par_avaliacoes()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Se o outro lado já avaliou este mesmo booking, publica ambas agora.
  if exists (
    select 1 from avaliacoes a
    where a.booking_id = new.booking_id
      and a.lado <> new.lado
  ) then
    update avaliacoes
       set publicada_em = now()
     where booking_id = new.booking_id
       and publicada_em is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_publicar_par on avaliacoes;
create trigger trg_publicar_par
  after insert on avaliacoes
  for each row execute function publicar_par_avaliacoes();

-- ----------------------------------------------------------------------------
-- Publicação por expiração de prazo.
-- Rode periodicamente (pg_cron, ou uma Netlify scheduled function chamando
-- este RPC uma vez por dia).
-- ----------------------------------------------------------------------------
create or replace function publicar_avaliacoes_vencidas()
returns int
language plpgsql
security definer
as $$
declare
  n int;
begin
  update avaliacoes
     set publicada_em = now()
   where publicada_em is null
     and prazo_publicacao < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Se tiver pg_cron disponível:
-- select cron.schedule('publicar-avaliacoes', '0 3 * * *',
--                      $$select publicar_avaliacoes_vencidas()$$);

-- ----------------------------------------------------------------------------
-- Policy de SELECT atualizada: mantém a segmentação por lado E acrescenta
-- a exigência de estar publicada.
-- ----------------------------------------------------------------------------
drop policy if exists avaliacoes_select_segmentado on avaliacoes;

create policy avaliacoes_select_segmentado on avaliacoes
  for select using (
    -- Sempre vejo o que eu mesmo escrevi (publicado ou não)
    autor_id = auth.uid()
    -- Admin modera tudo
    or auth_role() = 'admin'
    -- Demais leituras: precisa estar publicada E ser do meu lado
    or (
      publicada_em is not null
      and (
        (lado = 'cliente_avalia_prof' and auth_role() = 'cliente')
        or (lado = 'prof_avalia_cliente' and auth_role() = 'profissional')
      )
    )
  );

-- ----------------------------------------------------------------------------
-- A view de agregados também só conta o que já foi publicado — senão o
-- trust score entregaria indiretamente uma avaliação ainda embargada.
-- ----------------------------------------------------------------------------
drop view if exists trust_scores;

create view trust_scores as
select
  alvo_id,
  lado,
  round(avg(nota)::numeric, 2)  as nota_media,
  count(*)                      as total_avaliacoes
from avaliacoes
where publicada_em is not null
group by alvo_id, lado;

-- Avaliações que já existiam antes desta migração entram como publicadas,
-- senão sumiriam da interface.
update avaliacoes set publicada_em = created_at where publicada_em is null;
