-- ============================================================================
-- MIGRAÇÃO 22 — PONTUAÇÃO DE COMPLETUDE DE PERFIL (ordena a busca)
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 21.
--
-- O QUE É
--
-- Perfil mais completo aparece PRIMEIRO na busca — não é um selo visual,
-- é a ordem de exibição dos resultados. Decisão explícita do negócio:
-- incentivar quem preenche mais informação, porque isso ajuda o cliente
-- a decidir e reduz mensagem repetida perguntando o óbvio.
--
-- CRITÉRIOS (definidos com o usuário) — 1 ponto cada, máximo 5:
--   1. Foto de perfil       -> perfis.foto_url preenchido
--   2. Descrição preenchida -> profissionais.descricao preenchido
--   3. Valores definidos    -> pelo menos um de valor_meio_turno,
--                              valor_diaria, valor_km preenchido
--   4. Agenda preenchida    -> pelo menos 1 linha em disponibilidade
--   5. Referências          -> pelo menos 1 referência APROVADA
--      (referência pendente/rejeitada não conta — senão bastaria
--       enviar qualquer nome, sem passar pela checagem do admin)
--
-- POR QUE COLUNA MANTIDA POR TRIGGER, E NÃO CALCULADA NA QUERY DE BUSCA
--
-- Dá para calcular tudo isso com subqueries toda vez que alguém busca —
-- mas isso significa 5 consultas extras POR PROFISSIONAL, toda vez que
-- a home ou a busca carrega. Com o volume de hoje (dezenas de
-- profissionais) não pesa; quando crescer, pesa. Mesma lógica já usada
-- para `selo` (migração 17): uma coluna mantida por trigger, recalculada
-- só quando algo relevante muda, e a busca só faz `order by`.
-- ============================================================================

alter table profissionais
  add column if not exists pontuacao_perfil int not null default 0;

create index if not exists idx_prof_pontuacao on profissionais(pontuacao_perfil desc);


create or replace function recalcular_pontuacao_perfil(p_profissional_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pontos int := 0;
  tem_foto boolean;
  tem_descricao boolean;
  tem_valores boolean;
  tem_agenda boolean;
  tem_referencia_aprovada boolean;
begin
  select (foto_url is not null and foto_url <> '') into tem_foto
    from perfis where id = p_profissional_id;

  select (descricao is not null and trim(descricao) <> ''),
         (valor_meio_turno is not null or valor_diaria is not null or valor_km is not null)
    into tem_descricao, tem_valores
    from profissionais where id = p_profissional_id;

  select exists(select 1 from disponibilidade where profissional_id = p_profissional_id)
    into tem_agenda;

  select exists(
    select 1 from referencias_trabalho
    where profissional_id = p_profissional_id and status = 'aprovado'
  ) into tem_referencia_aprovada;

  pontos := (case when tem_foto then 1 else 0 end)
          + (case when tem_descricao then 1 else 0 end)
          + (case when tem_valores then 1 else 0 end)
          + (case when tem_agenda then 1 else 0 end)
          + (case when tem_referencia_aprovada then 1 else 0 end);

  update profissionais
     set pontuacao_perfil = pontos
   where id = p_profissional_id;
end;
$$;


-- ----------------------------------------------------------------------------
-- Triggers que disparam o recálculo — um por tabela que afeta a pontuação.
-- Cada um só chama a função acima; a lógica de pontuação vive num único
-- lugar, o que evita ela ficar duplicada e divergente entre triggers.
-- ----------------------------------------------------------------------------

-- 1) Mudança em perfis (foto) ou profissionais (descrição, valores)
create or replace function trg_pontuacao_via_profissionais()
returns trigger
language plpgsql
as $$
begin
  perform recalcular_pontuacao_perfil(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_pontuacao_profissionais on profissionais;
create trigger trg_pontuacao_profissionais
  after update of descricao, valor_meio_turno, valor_diaria, valor_km on profissionais
  for each row execute function trg_pontuacao_via_profissionais();

-- perfis.foto_url mora em outra tabela — trigger próprio, mesmo alvo
create or replace function trg_pontuacao_via_perfis()
returns trigger
language plpgsql
as $$
begin
  if new.foto_url is distinct from old.foto_url then
    perform recalcular_pontuacao_perfil(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pontuacao_perfis on perfis;
create trigger trg_pontuacao_perfis
  after update of foto_url on perfis
  for each row execute function trg_pontuacao_via_perfis();

-- 2) Mudança em disponibilidade (agenda) — insert ou delete de qualquer linha
create or replace function trg_pontuacao_via_disponibilidade()
returns trigger
language plpgsql
as $$
begin
  perform recalcular_pontuacao_perfil(coalesce(new.profissional_id, old.profissional_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_pontuacao_disponibilidade on disponibilidade;
create trigger trg_pontuacao_disponibilidade
  after insert or delete on disponibilidade
  for each row execute function trg_pontuacao_via_disponibilidade();

-- 3) Referência aprovada/rejeitada — já existe um trigger na tabela
-- referencias_trabalho (trg_referencia_muda_selo, migração 17) que
-- recalcula o SELO. Este aqui recalcula a PONTUAÇÃO — são cálculos
-- diferentes, então dois triggers na mesma tabela, cada um com sua
-- responsabilidade.
create or replace function trg_pontuacao_via_referencias()
returns trigger
language plpgsql
as $$
begin
  perform recalcular_pontuacao_perfil(coalesce(new.profissional_id, old.profissional_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_pontuacao_referencias on referencias_trabalho;
create trigger trg_pontuacao_referencias
  after insert or update of status or delete on referencias_trabalho
  for each row execute function trg_pontuacao_via_referencias();


-- ----------------------------------------------------------------------------
-- Backfill: calcula a pontuação de quem já existe no banco. Sem isto,
-- todo mundo cadastrado antes desta migração ficaria com pontuação 0
-- até a próxima edição de perfil — o que bagunçaria a ordem da busca
-- logo de cara.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id from profissionais loop
    perform recalcular_pontuacao_perfil(r.id);
  end loop;
end;
$$;


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select p.nome, pr.pontuacao_perfil
--   from profissionais pr join perfis p on p.id = pr.id
--  order by pr.pontuacao_perfil desc;
-- ----------------------------------------------------------------------------
