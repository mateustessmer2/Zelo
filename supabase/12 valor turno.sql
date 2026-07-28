-- ============================================================================
-- MIGRAÇÃO 12 — VALOR POR MEIO TURNO (EM VEZ DE VALOR/HORA)
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 11.
--
-- O QUE MUDA
--
-- `valor_hora` deixa de existir como conceito. A profissional passa a
-- declarar dois valores fixos, que ela mesma define:
--   • meio turno (4h) — `valor_meio_turno`
--   • turno integral (8h) — `valor_diaria` (a coluna já existia; o nome
--     antigo já significava "dia inteiro", então foi mantido)
--
-- POR QUE VALOR FIXO E NÃO valor_hora × 4
--
-- Foi pedido explicitamente: cada turno tem um preço que a profissional
-- escreve, não um cálculo. Faz sentido também no negócio — 4 horas
-- corridas custam menos, proporcionalmente, do que 4 horas soltas cobradas
-- por hora; deixar o valor livre permite ela precificar a diferença.
--
-- OS DADOS ANTIGOS FICAM EM BRANCO, DE PROPÓSITO
--
-- `valor_hora` e `valor_meio_turno` não representam a mesma coisa — um é
-- por hora corrida, o outro é o pacote de 4h. Migrar automaticamente
-- (valor_hora × 4) inventaria um preço que a profissional nunca escolheu.
-- Por isso a coluna é renomeada (não copiada): quem já tinha preenchido
-- volta a ver o campo vazio e reenche do jeito novo.
-- ============================================================================

alter table profissionais
  rename column valor_hora to valor_meio_turno;

comment on column profissionais.valor_meio_turno is
  'Preço fixo do meio turno (4h), definido pela profissional. Substituiu valor_hora.';

comment on column profissionais.valor_diaria is
  'Preço fixo do turno integral (8h, manhã+tarde), definido pela profissional.';


-- ----------------------------------------------------------------------------
-- A constraint de valores positivos (09/G) citava `valor_hora` pelo nome
-- antigo. Recriada com o nome novo.
-- ----------------------------------------------------------------------------
alter table profissionais
  drop constraint if exists prof_valores_positivos;

alter table profissionais
  add constraint prof_valores_positivos
  check (
    (valor_meio_turno is null or valor_meio_turno >= 0) and
    (valor_diaria     is null or valor_diaria     >= 0) and
    (idade is null or (idade between 16 and 100))
  );


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select nome, valor_meio_turno, valor_diaria from profissionais
--   join perfis on perfis.id = profissionais.id;
--   -> ambas as colunas devem estar NULL para quem já tinha cadastrado
-- ----------------------------------------------------------------------------
