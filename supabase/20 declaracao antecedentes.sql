-- ============================================================================
-- MIGRAÇÃO 20 — AUTODECLARAÇÃO DE ANTECEDENTES CRIMINAIS
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 19.
--
-- DIFERENÇA EM RELAÇÃO AO CONSENTIMENTO (migração 14)
--
-- O Termo de Consentimento (14) autoriza o Zelo a COLETAR e tratar dados
-- (selfie). Esta declaração é outra coisa: a profissional afirma, sob a
-- própria responsabilidade, que não tem antecedentes incompatíveis com o
-- trabalho — sem que o Zelo verifique isso hoje.
--
-- É a peça central da decisão de negócio de manter a exigência de
-- antecedentes desativada (migração 16) sem deixar a plataforma calada
-- sobre o assunto: em vez de exigir documento, ela pede uma declaração
-- assinada — mais leve para o admin, mais transparente para o cliente
-- que lê no perfil que aquilo é autodeclarado, não verificado.
--
-- Mesmo padrão de prova das migrações 14/17: quando, e qual versão do
-- texto a pessoa leu.
-- ============================================================================

alter table profissionais
  add column if not exists declaracao_antecedentes boolean not null default false;

alter table profissionais
  add column if not exists declaracao_antecedentes_em timestamptz;

alter table profissionais
  add column if not exists declaracao_antecedentes_versao text;

comment on column profissionais.declaracao_antecedentes is
  'Autodeclaração de ausência de antecedentes incompatíveis — não verificada pela plataforma.';
comment on column profissionais.declaracao_antecedentes_em is
  'Data e hora do aceite — prova de quando a declaração foi feita.';
comment on column profissionais.declaracao_antecedentes_versao is
  'Versão do texto que a pessoa leu. Ao alterar a declaração, suba a versão.';


-- ============================================================================
-- ATUALIZAÇÃO DO TRIGGER DE CADASTRO (migração 19)
-- ----------------------------------------------------------------------------
-- O trigger `criar_perfil_ao_registrar` já grava o consentimento de
-- verificação (migração 19). Esta versão acrescenta a declaração de
-- antecedentes, também vinda de `raw_user_meta_data` — mesma mecânica,
-- sem sessão necessária.
-- ============================================================================

create or replace function criar_perfil_ao_registrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, role, nome, cidade_id, bairro_id)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente'),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    nullif(new.raw_user_meta_data->>'cidade_id', '')::uuid,
    nullif(new.raw_user_meta_data->>'bairro_id', '')::uuid
  )
  on conflict (id) do nothing;

  if coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente') = 'profissional' then
    insert into public.profissionais (
      id,
      consentimento_verificacao, consentimento_em, consentimento_versao,
      declaracao_antecedentes, declaracao_antecedentes_em, declaracao_antecedentes_versao
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
      nullif(new.raw_user_meta_data->>'declaracao_antecedentes_versao', '')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- O trigger em si (trg_criar_perfil_ao_registrar) não muda — ele já aponta
-- para esta função pelo nome, então `create or replace` acima já é
-- suficiente para atualizar o comportamento.


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select p.nome, pr.declaracao_antecedentes, pr.declaracao_antecedentes_em
--   from profissionais pr join perfis p on p.id = pr.id;
-- ----------------------------------------------------------------------------
