-- ============================================================================
-- MIGRAÇÃO 19 — CRIAÇÃO DE PERFIL VIA TRIGGER (necessário com confirmação de e-mail)
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 18, e ANTES de ligar "Enable email confirmations".
--
-- POR QUE ISTO SE TORNOU NECESSÁRIO AGORA
--
-- Até aqui, `cadastrar()` (em useAuth.jsx) fazia `signUp()` e, na sequência,
-- um `insert` em `perfis` vindo do próprio navegador — o que funcionava
-- porque `signUp()` cria a sessão IMEDIATAMENTE quando a confirmação de
-- e-mail está desligada. Com `auth.uid()` disponível na hora, a policy
-- `perfis_insert_own` (id = auth.uid()) deixava passar.
--
-- Com a confirmação de e-mail LIGADA, `signUp()` NÃO cria sessão — a
-- pessoa só ganha uma quando clica no link do e-mail e confirma. Ou seja,
-- o insert feito pelo navegador logo após o cadastro passaria a falhar
-- sempre: não existe `auth.uid()` ainda, então `perfis_insert_own` nega.
--
-- A SOLUÇÃO PADRÃO DO SUPABASE PARA ISSO
--
-- Um trigger em `auth.users`, rodando com privilégio de sistema
-- (security definer), que cria a linha em `perfis` no exato instante em
-- que o usuário é criado — antes mesmo de qualquer confirmação. Isso não
-- depende de sessão, então funciona nos dois cenários (confirmação ligada
-- ou desligada).
--
-- Os dados (nome, role, cidade, bairro) viajam dentro de
-- `raw_user_meta_data`, que o `signUp()` aceita como `options.data`.
-- O frontend PRECISA mudar para passar esses dados assim — ver a nota
-- sobre `useAuth.jsx` no fim deste arquivo.
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
  on conflict (id) do nothing;  -- idempotente: reenvio do e-mail não duplica

  -- Profissional ganha a linha em `profissionais` no mesmo instante,
  -- já com o consentimento LGPD (se enviado nos metadados).
  if coalesce((new.raw_user_meta_data->>'role')::user_role, 'cliente') = 'profissional' then
    insert into public.profissionais (
      id, consentimento_verificacao, consentimento_em, consentimento_versao
    )
    values (
      new.id,
      coalesce((new.raw_user_meta_data->>'consentimento_aceito')::boolean, false),
      case when (new.raw_user_meta_data->>'consentimento_aceito')::boolean
           then now() else null end,
      nullif(new.raw_user_meta_data->>'consentimento_versao', '')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_criar_perfil_ao_registrar on auth.users;
create trigger trg_criar_perfil_ao_registrar
  after insert on auth.users
  for each row execute function criar_perfil_ao_registrar();


-- ----------------------------------------------------------------------------
-- A policy de insert do navegador (`perfis_insert_own`, `prof_insert_own`)
-- deixa de ser o caminho usado no cadastro normal, mas NÃO deve ser
-- removida: ela ainda é útil como salvaguarda (ex.: preencher um perfil
-- que por algum motivo o trigger não criou).
-- ----------------------------------------------------------------------------


-- ============================================================================
-- MUDANÇA NECESSÁRIA EM useAuth.jsx (frontend)
-- ----------------------------------------------------------------------------
-- `cadastrar()` precisa passar os dados via `options.data` do signUp, em
-- vez de fazer o insert em `perfis`/`profissionais` diretamente. Veja o
-- arquivo useAuth.jsx atualizado entregue junto com esta migração — o
-- insert manual foi substituído por metadados no signUp, e o trigger
-- acima faz o resto.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- Depois de um cadastro novo (mesmo antes de confirmar o e-mail):
-- select u.email, p.nome, p.role
--   from auth.users u join perfis p on p.id = u.id
--  order by u.created_at desc limit 3;
--  -> a linha em perfis já deve existir, mesmo sem o e-mail confirmado
-- ----------------------------------------------------------------------------
