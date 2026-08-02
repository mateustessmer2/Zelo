-- ============================================================================
-- MIGRAÇÃO 24 — TERMO DE CONSENTIMENTO PARA TODOS OS USUÁRIOS
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 23.
--
-- O QUE MUDA
--
-- O Termo de Consentimento e Ciência do Usuário passou a valer para
-- CLIENTE e PROFISSIONAL — o texto novo fala em nome de quem contrata
-- ("a contratação é realizada por minha livre escolha"), então não faz
-- sentido só a profissional aceitar.
--
-- Consequência estrutural: a prova de aceite não pode mais morar só em
-- `profissionais` (migração 14), porque cliente não tem linha lá. Passa
-- para `perfis`, que toda conta tem.
--
-- AS COLUNAS ANTIGAS EM `profissionais` NÃO SÃO REMOVIDAS
--
-- `consentimento_verificacao`, `consentimento_em` e `consentimento_versao`
-- continuam existindo com os dados de quem já aceitou o termo ANTIGO (o
-- que era específico sobre selfie). Apagar seria destruir prova de
-- consentimento já colhido — exatamente o que a LGPD exige que se
-- preserve. Elas ficam como registro histórico.
-- ============================================================================

alter table perfis
  add column if not exists termo_aceito boolean not null default false;

alter table perfis
  add column if not exists termo_aceito_em timestamptz;

alter table perfis
  add column if not exists termo_versao text;

comment on column perfis.termo_aceito is
  'Aceite do Termo de Consentimento e Ciência do Usuário (LGPD art. 7º, I). Vale para cliente e profissional.';
comment on column perfis.termo_aceito_em is
  'Data e hora do aceite — prova exigida pelo art. 8º, §2º.';
comment on column perfis.termo_versao is
  'Versão do texto que a pessoa leu. Ao alterar o termo, suba a versão no componente TermoConsentimento.jsx.';


-- ============================================================================
-- ATUALIZAÇÃO DO TRIGGER DE CADASTRO
-- ----------------------------------------------------------------------------
-- Grava o aceite do termo em `perfis` no momento em que a conta nasce,
-- para os dois papéis. Mantém tudo que as migrações 19 e 20 já faziam.
-- ============================================================================

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


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select nome, role, termo_aceito, termo_aceito_em, termo_versao
--   from perfis order by created_at desc limit 5;
-- ----------------------------------------------------------------------------
