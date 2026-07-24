-- ============================================================================
-- MIGRAÇÃO 08 — TURNO INTEGRAL
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 07.
--
-- O QUE MUDA
--
-- A profissional pode declarar disponibilidade para 'integral' (manhã + tarde),
-- e o cliente pode contratar o dia inteiro.
--
-- DECISÃO DE MODELAGEM
--
-- 'integral' é um valor próprio, não a soma de dois registros. Duas razões:
--
--   1. É como as pessoas falam. "Atendo o dia todo" não é a mesma coisa que
--      "atendo de manhã e também à tarde" — a segunda admite pegar só um
--      pedaço, a primeira sugere diária fechada.
--
--   2. O preço muda. Meio período costuma ser cobrado por hora; dia inteiro,
--      por diária. Tratar como turno próprio deixa essa distinção explícita
--      na contratação.
--
-- Quem marca 'integral' na agenda continua aparecendo em buscas por 'manha'
-- ou 'tarde' — a compatibilidade é resolvida na consulta, não duplicando
-- linhas no banco.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Disponibilidade: soltar o check antigo e recriar com 'integral'
-- ----------------------------------------------------------------------------
alter table disponibilidade
  drop constraint if exists disponibilidade_turno_check;

alter table disponibilidade
  add constraint disponibilidade_turno_check
  check (turno in ('manha', 'tarde', 'noite', 'integral'));

-- ----------------------------------------------------------------------------
-- Bookings: `turno` já é texto livre, mas ganha um check para evitar valores
-- inventados chegando pela API.
-- ----------------------------------------------------------------------------
alter table bookings
  drop constraint if exists bookings_turno_check;

alter table bookings
  add constraint bookings_turno_check
  check (turno is null or turno in ('manha', 'tarde', 'noite', 'integral'));

comment on column bookings.turno is
  'manha | tarde | noite | integral. Integral = manhã + tarde, cobrado por diária.';


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- insert into disponibilidade (profissional_id, dia_semana, turno)
--   values ('<id>', 1, 'integral');   -- deve funcionar
--
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conname in ('disponibilidade_turno_check', 'bookings_turno_check');
-- ----------------------------------------------------------------------------
