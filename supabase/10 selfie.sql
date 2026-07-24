-- ============================================================================
-- MIGRAÇÃO 10 — SELFIE DE VERIFICAÇÃO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 09.
--
-- Se você tentou a versão anterior deste arquivo e ela falhou: o motivo era
-- a policy `prof_select_visiveis`, que referencia a coluna `visivel`. O
-- Postgres não derruba coluna da qual uma policy depende. Esta versão
-- derruba a policy antes e a recria idêntica depois. Rodar de novo é seguro
-- — todos os blocos são idempotentes.
--
-- O QUE MUDA
--
-- A profissional passa a enviar uma selfie, comparada pelo admin com a foto
-- do documento. É o que fecha a lacuna que a verificação tinha: hoje você
-- confere que o documento é válido, mas não que pertence a quem cadastrou.
--
-- A selfie é PRIVADA. Vai para o mesmo bucket dos documentos, é vista só
-- por você na fila de aprovação, e nunca aparece no perfil. O que o cliente
-- vê continua sendo apenas o selo.
--
-- ATENÇÃO — LGPD: selfie é dado BIOMÉTRICO, categoria de dado sensível
-- (art. 5º, II), mesma classe dos antecedentes criminais. Precisa de
-- consentimento específico e destacado nos termos, e de prazo de retenção
-- definido. A recomendação continua sendo apagar o arquivo após a aprovação,
-- guardando só o status — ver bloco final de 04_storage.sql.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Novo tipo aceito em `verificacoes`
-- ----------------------------------------------------------------------------
alter table verificacoes
  drop constraint if exists verificacoes_tipo_check;

alter table verificacoes
  add constraint verificacoes_tipo_check
  check (tipo in ('identidade','antecedentes','selfie','telefone','email','endereco'));


-- ----------------------------------------------------------------------------
-- 2) Coluna de status na tabela `profissionais`
-- ----------------------------------------------------------------------------
alter table profissionais
  add column if not exists selfie_status verif_status not null default 'pendente';


-- ----------------------------------------------------------------------------
-- 3) A selfie passa a fazer parte do gate de visibilidade
-- ----------------------------------------------------------------------------
-- DECISÃO: `visivel` agora exige os TRÊS aprovados.
--
-- Sem a selfie, a verificação de identidade fica incompleta — um documento
-- válido de outra pessoa passaria. Se a selfie fosse opcional, viraria
-- enfeite: você a pediria, e o perfil entraria no ar do mesmo jeito.
--
-- CONSEQUÊNCIA IMEDIATA: profissionais já aprovadas somem da busca até a
-- selfie ser enviada e aprovada, porque `selfie_status` nasce 'pendente'.
-- O bloco 6 no fim deste arquivo resolve, se você preferir.
--
-- Coluna gerada não se altera: precisa cair e ser recriada. Dependem dela
-- o índice E a policy de leitura — os dois caem junto e voltam iguais.
-- ----------------------------------------------------------------------------

drop policy if exists prof_select_visiveis on profissionais;
drop index  if exists idx_prof_visivel;

alter table profissionais drop column if exists visivel;

alter table profissionais
  add column visivel boolean generated always as (
    identidade_status       = 'aprovado'
    and antecedentes_status = 'aprovado'
    and selfie_status       = 'aprovado'
  ) stored;

create index idx_prof_visivel on profissionais(visivel);

-- Recriada exatamente como estava em 02_rls.sql
create policy prof_select_visiveis on profissionais
  for select using (
    visivel = true            -- público vê só as verificadas
    or id = auth.uid()        -- a própria se vê sempre (perfil em construção)
    or auth_role() = 'admin'  -- admin vê todas
  );


-- ----------------------------------------------------------------------------
-- 4) Trigger de sincronização passa a conhecer a selfie
-- ----------------------------------------------------------------------------
-- Sem esta atualização, aprovar a selfie gravaria em `verificacoes` e não
-- espelharia em `profissionais` — exatamente o bug que o trigger da
-- migração 09 existe para evitar.
-- ----------------------------------------------------------------------------
create or replace function sincronizar_status_verificacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'identidade' then
    update profissionais
       set identidade_status = new.status, updated_at = now()
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


-- ----------------------------------------------------------------------------
-- 5) Verificação
-- ----------------------------------------------------------------------------
-- select identidade_status, antecedentes_status, selfie_status, visivel
--   from profissionais;
--
-- select policyname from pg_policies
--  where tablename = 'profissionais';        -- prof_select_visiveis deve estar lá
--
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname = 'verificacoes_tipo_check';
-- ----------------------------------------------------------------------------


-- ============================================================================
-- 6) OPCIONAL — manter no ar quem você já verificou pessoalmente
-- ----------------------------------------------------------------------------
-- Rode SOMENTE se você já conferiu presencialmente que a pessoa é quem diz
-- ser. Marcar a selfie como aprovada sem tê-la visto esvazia a regra que
-- este arquivo acabou de criar.
--
-- update profissionais set selfie_status = 'aprovado'
--  where identidade_status = 'aprovado' and antecedentes_status = 'aprovado';
-- ============================================================================
