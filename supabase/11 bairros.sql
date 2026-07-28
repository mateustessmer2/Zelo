-- ============================================================================
-- MIGRAÇÃO 11 — "OUTROS BAIRROS" E "ATENDE TODOS OS BAIRROS"
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 10.
--
-- DUAS NECESSIDADES DIFERENTES, DUAS SOLUÇÕES DIFERENTES
--
-- Cliente: mora num bairro que não está na lista (a lista tem só 7). Ele
-- precisa dizer "outro" e ainda assim completar o cadastro. Solução: uma
-- linha real em `bairros` chamada "Outro / não listado" — assim `bairro_id`
-- continua NOT NULL-friendly e nada no resto do sistema precisa saber que
-- esse valor é especial.
--
-- Profissional: atende o município inteiro, não uma lista de bairros
-- marcados um a um. Marcar os 7 bairros manualmente já resolveria hoje, mas
-- quebra sozinho no dia em que você cadastrar o 8º bairro — ela continuaria
-- "atendendo todos" só na cabeça dela, não no banco. Por isso uma FLAG
-- própria em `profissionais`, e a busca passa a checar a flag antes de
-- checar `profissional_bairros`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Bairro coringa para o cliente
-- ----------------------------------------------------------------------------
insert into bairros (cidade_id, nome)
select id, 'Outro / não listado' from cidades where nome = 'Pelotas'
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- 2) Flag "atende todos os bairros" na profissional
-- ----------------------------------------------------------------------------
alter table profissionais
  add column if not exists atende_todos_bairros boolean not null default false;

comment on column profissionais.atende_todos_bairros is
  'Quando true, a busca ignora profissional_bairros e considera qualquer bairro compatível.';
