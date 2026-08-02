-- ============================================================================
-- MIGRAÇÃO 25 — DATA DA CONFERÊNCIA + DECLARAÇÕES DO CADASTRO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 24.
--
-- PARTE 1 — Data da conferência de identidade
--
-- O selo no perfil agora abre um modal dizendo "Documentação conferida
-- pelo Zelo em [data]". Para isso a data precisa existir: até agora o
-- sistema guardava apenas o STATUS ('aprovado'), sem registrar QUANDO a
-- aprovação aconteceu na linha de `profissionais`.
--
-- A informação já existia em `verificacoes.verificado_em`, mas essa tabela
-- não é legível pelo cliente (e nem deveria ser — ela contém o caminho do
-- documento). Por isso a data é copiada para `profissionais`, que é
-- público, sem levar junto nada sensível.
--
-- PARTE 2 — Declarações adicionais no cadastro do profissional
--
-- Além do Termo de Consentimento (migração 24) e da Declaração de
-- Antecedentes (migração 20), o cadastro passa a registrar duas
-- afirmações exigidas: veracidade das informações e aptidão legal para
-- exercer a atividade.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1
-- ----------------------------------------------------------------------------
alter table profissionais
  add column if not exists identidade_verificada_em timestamptz;

comment on column profissionais.identidade_verificada_em is
  'Quando a identidade foi conferida. Exibida no modal do selo — a conferência vale para essa data, não indefinidamente.';

-- O trigger que sincroniza status (migrações 09/10) passa a gravar a data
-- junto, no momento em que a identidade é aprovada.
create or replace function sincronizar_status_verificacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'identidade' then
    update profissionais
       set identidade_status = new.status,
           identidade_verificada_em = case
             when new.status = 'aprovado' then coalesce(new.verificado_em, now())
             else null
           end,
           updated_at = now()
     where id = new.profissional_id;
  elsif new.tipo = 'antecedentes' then
    update profissionais
       set antecedentes_status = new.status, updated_at = now()
     where id = new.profissional_id;
  elsif new.tipo = 'selfie' then
    update profissionais
       set selfie_status = new.status, updated_at = now()
     where id = new.profissional_id;
  end if;
  return new;
end;
$$;

-- Backfill: quem já foi aprovado antes desta migração ganha a data que
-- estava registrada em `verificacoes`.
update profissionais p
   set identidade_verificada_em = v.verificado_em
  from verificacoes v
 where v.profissional_id = p.id
   and v.tipo = 'identidade'
   and v.status = 'aprovado'
   and p.identidade_verificada_em is null;


-- ----------------------------------------------------------------------------
-- PARTE 2 — Declarações do cadastro do profissional
-- ----------------------------------------------------------------------------
alter table profissionais
  add column if not exists declarou_info_verdadeiras boolean not null default false;

alter table profissionais
  add column if not exists declarou_apto_legalmente boolean not null default false;

comment on column profissionais.declarou_info_verdadeiras is
  'Declarou no cadastro que as informações fornecidas são verdadeiras e atualizadas.';
comment on column profissionais.declarou_apto_legalmente is
  'Declarou no cadastro estar legalmente apto(a) a exercer as atividades anunciadas.';

-- Trigger de cadastro passa a gravar as duas declarações
create or replace function criar_perfil_ao_registrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (
    id, role, nome, cidade_id, bairro_id,
    termo_aceito, termo_aceito_em, termo_versao
  )
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente'),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    nullif(new.raw_user_meta_data->>'cidade_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'bairro_id', '')::uuid,
    coalesce((new.raw_user_meta_data->>'termo_aceito')::boolean, false),
    case when (new.raw_user_meta_data->>'termo_aceito')::boolean
         then now() else null end,
    nullif(new.raw_user_meta_data->>'termo_versao', '')
  )
  on conflict (id) do nothing;

  if coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente') = 'profissional' then
    insert into public.profissionais (
      id,
      consentimento_verificacao, consentimento_em, consentimento_versao,
      declaracao_antecedentes, declaracao_antecedentes_em, declaracao_antecedentes_versao,
      declarou_info_verdadeiras, declarou_apto_legalmente
    )
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'consentimento_aceito')::boolean, false),
      case when (new.raw_user_meta_data->>'consentimento_aceito')::boolean
           then now() else null end,
      nullif(new.raw_user_meta_data->>'consentimento_versao', ''),
      coalesce((new.raw_user_meta_data->>'declaracao_antecedentes_aceito')::boolean, false),
      case when (new.raw_user_meta_data->>'declaracao_antecedentes_aceito')::boolean
           then now() else null end,
      nullif(new.raw_user_meta_data->>'declaracao_antecedentes_versao', ''),
      coalesce((new.raw_user_meta_data->>'declarou_info_verdadeiras')::boolean, false),
      coalesce((new.raw_user_meta_data->>'declarou_apto_legalmente')::boolean, false)
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select p.nome, pr.identidade_status, pr.identidade_verificada_em,
--        pr.declarou_info_verdadeiras, pr.declarou_apto_legalmente
--   from profissionais pr join perfis p on p.id = pr.id;
-- ----------------------------------------------------------------------------
