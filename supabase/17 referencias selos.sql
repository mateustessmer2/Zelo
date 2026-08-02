-- ============================================================================
-- MIGRAÇÃO 17 — REFERÊNCIAS DE TRABALHO E SELOS (BRONZE/PRATA/OURO)
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 16.
--
-- O QUE É
--
-- A profissional informa até 3 contatos de referência (nome + telefone de
-- clientes anteriores). Cada um passa pela aprovação do admin, igual
-- identidade e selfie. O selo é calculado pela CONTAGEM de referências
-- aprovadas — não por texto livre, então não há o que "ler" além de
-- confirmar que o contato existe e responde.
--
--   1 aprovada  -> bronze
--   2 aprovadas -> prata
--   3 aprovadas -> ouro
--
-- POR QUE TABELA PRÓPRIA, E NÃO REIUSAR `verificacoes`
--
-- `verificacoes` guarda um documento por linha (identidade, antecedentes,
-- selfie) com upload em bucket privado. Referência não é documento — é um
-- contato (nome + telefone). Forçar isso no mesmo formato faria
-- `documento_path` ficar sempre nulo e o `tipo` virar uma gambiarra
-- ('referencia_1', 'referencia_2'...). Uma tabela própria, com uma linha
-- por referência, deixa contar "quantas aprovadas" uma consulta trivial.
--
-- PRIVACIDADE DO CONTATO
--
-- Nome e telefone da referência são dados de TERCEIROS (o cliente antigo),
-- não da profissional. Ninguém além do admin lê o contato bruto — nem a
-- própria profissional depois de enviado, nem o cliente que está buscando.
-- O que qualquer pessoa vê é só o selo (bronze/prata/ouro), nunca quem é a
-- referência.
-- ============================================================================

create table if not exists referencias_trabalho (
  id                uuid primary key default gen_random_uuid(),
  profissional_id   uuid not null references profissionais(id) on delete cascade,
  nome_referencia   text not null,
  telefone          text not null,
  status            verif_status not null default 'pendente',
  verificado_por    uuid references perfis(id),
  verificado_em     timestamptz,
  observacao        text,
  created_at        timestamptz not null default now()
);

create index idx_ref_prof on referencias_trabalho(profissional_id);
create index idx_ref_status on referencias_trabalho(status);

alter table referencias_trabalho enable row level security;

-- A profissional cria e lê as próprias referências (para ver o status:
-- pendente/aprovado/rejeitado), mas NUNCA edita depois de enviada — mesma
-- regra de "avaliação não se edita" aplicada aqui: uma referência aprovada
-- não pode ser trocada por outra sem o admin saber.
create policy ref_select_own on referencias_trabalho
  for select using (profissional_id = auth.uid() or auth_role() = 'admin');

create policy ref_insert_own on referencias_trabalho
  for insert with check (profissional_id = auth.uid());

create policy ref_update_admin on referencias_trabalho
  for update using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

grant select, insert on referencias_trabalho to authenticated;
grant update on referencias_trabalho to authenticated;  -- restrito pela policy acima


-- ----------------------------------------------------------------------------
-- Limite de 3 por profissional — impõe no banco, não só na tela.
-- ----------------------------------------------------------------------------
create or replace function checar_limite_referencias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from referencias_trabalho where profissional_id = new.profissional_id) >= 3 then
    raise exception 'Limite de 3 referências por profissional';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limite_referencias on referencias_trabalho;
create trigger trg_limite_referencias
  before insert on referencias_trabalho
  for each row execute function checar_limite_referencias();


-- ----------------------------------------------------------------------------
-- Coluna de selo em `profissionais` — calculada, não editável manualmente.
-- ----------------------------------------------------------------------------
-- Não é coluna gerada (generated always as) porque o cálculo depende de
-- CONTAR linhas de outra tabela, e colunas geradas do Postgres não podem
-- referenciar outras tabelas. Por isso é uma coluna normal, mantida por
-- trigger — o mesmo padrão já usado para sincronizar identidade/selfie
-- (migração 09/10).
-- ----------------------------------------------------------------------------
alter table profissionais
  add column if not exists selo text check (selo in ('bronze','prata','ouro')) default null;

create or replace function recalcular_selo(p_profissional_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  aprovadas int;
begin
  select count(*) into aprovadas
    from referencias_trabalho
   where profissional_id = p_profissional_id and status = 'aprovado';

  update profissionais
     set selo = case
       when aprovadas >= 3 then 'ouro'
       when aprovadas = 2 then 'prata'
       when aprovadas = 1 then 'bronze'
       else null
     end,
     updated_at = now()
   where id = p_profissional_id;
end;
$$;

create or replace function trg_recalcular_selo()
returns trigger
language plpgsql
as $$
begin
  perform recalcular_selo(coalesce(new.profissional_id, old.profissional_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_referencia_muda_selo on referencias_trabalho;
create trigger trg_referencia_muda_selo
  after insert or update of status or delete on referencias_trabalho
  for each row execute function trg_recalcular_selo();


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select p.nome, r.status, count(*)
--   from referencias_trabalho r join perfis p on p.id = r.profissional_id
--  group by p.nome, r.status;
--
-- select nome, selo from profissionais pr join perfis p on p.id = pr.id;
-- ----------------------------------------------------------------------------
