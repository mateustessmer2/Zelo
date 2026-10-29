-- ============================================================================
-- MIGRAÇÃO 29 — MOTORISTA: ÁREA DE ATENDIMENTO E DADOS DO VEÍCULO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 28.
--
-- O QUE MUDA
--
-- Dois campos novos, específicos da categoria Motorista Particular:
--
--   1. `atende_intermunicipal` (boolean) — se ela faz corrida só dentro
--      do município ou também entre cidades. Diferente de
--      `atende_todos_bairros` (migração 11), que é sobre QUAIS BAIRROS
--      dentro da própria cidade ela atende — este é sobre sair ou não
--      do município.
--
--   2. `veiculo_modelo` e `veiculo_ano` (text/int) — informação que o
--      cliente vê no perfil antes de contratar, útil especificamente
--      para transporte (não faz sentido para as outras categorias).
--
-- POR QUE COLUNAS PRÓPRIAS EM `profissionais`, E NÃO servicos_disponiveis
--
-- `servicos_disponiveis` (migrações 23/28) serve para MÚLTIPLA ESCOLHA
-- dentro de uma categoria (ex.: marcar vários serviços de limpeza). Área
-- de atendimento e dados do veículo não são "marque quantos quiser" —
-- são um boolean e um texto/número, cada um com resposta única. Colunas
-- diretas em `profissionais` são o modelo certo aqui, mesmo padrão já
-- usado para `valor_km` (migração 21).
-- ============================================================================

alter table profissionais
  add column if not exists atende_intermunicipal boolean not null default false;

alter table profissionais
  add column if not exists veiculo_modelo text;

alter table profissionais
  add column if not exists veiculo_ano int;

alter table profissionais
  drop constraint if exists prof_veiculo_ano_valido;

alter table profissionais
  add constraint prof_veiculo_ano_valido
  check (veiculo_ano is null or veiculo_ano between 1980 and 2100);

comment on column profissionais.atende_intermunicipal is
  'Só para Motorista Particular: true = também faz corrida entre municípios, false = só dentro do próprio município.';
comment on column profissionais.veiculo_modelo is
  'Só para Motorista Particular: modelo do carro (ex.: "Chevrolet Onix"), exibido no perfil.';
comment on column profissionais.veiculo_ano is
  'Só para Motorista Particular: ano do carro, exibido no perfil.';


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select column_name from information_schema.columns
--  where table_name = 'profissionais'
--    and column_name in ('atende_intermunicipal', 'veiculo_modelo', 'veiculo_ano');
-- ----------------------------------------------------------------------------
