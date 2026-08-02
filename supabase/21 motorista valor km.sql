-- ============================================================================
-- MIGRAÇÃO 21 — MOTORISTA PARTICULAR E VALOR POR KM RODADO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 20.
--
-- O QUE MUDA
--
-- Nova categoria "Motorista Particular", já ativa. Diferente das demais
-- (que cobram por meio turno / turno integral), motorista cobra por
-- distância — por isso ganha um campo de preço PRÓPRIO,
-- `valor_km`, que convive com os outros dois sem substituí-los.
--
-- POR QUE UM CAMPO NOVO, E NÃO REAPROVEITAR valor_meio_turno
--
-- Meio turno e turno integral descrevem BLOCOS DE TEMPO — fazem sentido
-- para quem cobra por período (faxineira, babá, cuidadora). Motorista
-- cobra por DISTÂNCIA, uma unidade totalmente diferente. Forçar isso num
-- campo pensado para "preço de um turno de 4h ou 8h" confundiria o
-- profissional preenchendo o formulário e o cliente lendo o perfil.
--
-- A profissional pode, no futuro, oferecer mais de uma categoria (a
-- tabela já suporta N:N via profissional_categorias) — por isso os três
-- campos de valor (meio turno, diária, km) coexistem na mesma linha de
-- `profissionais`: cada categoria que ela atende usa o campo que faz
-- sentido para ela.
-- ============================================================================

insert into categorias (nome, slug, icone, ativa, ordem)
values ('Motorista Particular', 'motorista-particular', '🚗', true, 4)
on conflict (slug) do nothing;

alter table profissionais
  add column if not exists valor_km numeric(10,2);

alter table profissionais
  drop constraint if exists prof_valores_positivos;

alter table profissionais
  add constraint prof_valores_positivos
  check (
    (valor_meio_turno is null or valor_meio_turno >= 0) and
    (valor_diaria     is null or valor_diaria     >= 0) and
    (valor_km         is null or valor_km         >= 0) and
    (idade is null or (idade between 16 and 100))
  );

comment on column profissionais.valor_km is
  'Preço por km rodado — usado por categorias que cobram por distância (ex.: Motorista Particular), não por turno.';


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select nome, slug, ativa from categorias where slug = 'motorista-particular';
-- select column_name from information_schema.columns
--   where table_name = 'profissionais' and column_name = 'valor_km';
-- ----------------------------------------------------------------------------
