-- ============================================================================
-- MIGRAÇÃO 16 — ANTECEDENTES TEMPORARIAMENTE FORA DA REGRA DE VISIBILIDADE
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 15.
--
-- O QUE MUDA
--
-- `visivel` passa a exigir só identidade + selfie aprovados. Antecedentes
-- deixa de bloquear o perfil — quem já está pendente entra no ar sozinho,
-- sem você precisar aprovar nada retroativamente.
--
-- POR QUE ASSIM, E NÃO APAGANDO A COLUNA
--
-- `antecedentes_status` continua existindo e a fila de verificação continua
-- funcionando para quem enviar (o campo só sai do CADASTRO da profissional,
-- numa mudança de frontend separada desta). Isso deixa a porta aberta para
-- reativar a exigência mais tarde sem reconstruir nada — é só recolocar a
-- condição no `generated always as` abaixo.
--
-- Coluna gerada não se altera: precisa cair e voltar, e a policy de leitura
-- depende dela — mesmo padrão das migrações 10 e a correção que fizemos
-- quando isso quebrou a busca. Desta vez já sabemos o roteiro certo.
-- ============================================================================

drop policy if exists prof_select_visiveis on profissionais;
drop index  if exists idx_prof_visivel;

alter table profissionais drop column if exists visivel;

alter table profissionais
  add column visivel boolean generated always as (
    identidade_status = 'aprovado'
    and selfie_status  = 'aprovado'
    -- antecedentes_status intencionalmente fora da condição — reative
    -- descomentando a linha abaixo quando quiser voltar a exigir:
    -- and antecedentes_status = 'aprovado'
  ) stored;

create index idx_prof_visivel on profissionais(visivel);

create policy prof_select_visiveis on profissionais
  for select using (
    visivel = true
    or id = auth.uid()
    or auth_role() = 'admin'
  );


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select p.nome, pr.identidade_status, pr.antecedentes_status, pr.selfie_status, pr.visivel
--   from profissionais pr join perfis p on p.id = pr.id;
--  -> quem tem identidade + selfie aprovados deve estar visivel = true,
--     mesmo com antecedentes_status = 'pendente'
-- ----------------------------------------------------------------------------


-- ============================================================================
-- PARA REATIVAR NO FUTURO
-- ----------------------------------------------------------------------------
-- Rode um bloco igual a este, descomentando a linha de antecedentes acima.
-- Quem já estiver com antecedentes pendente sai do ar automaticamente
-- quando isso acontecer — avise as profissionais antes de reativar.
-- ============================================================================
