-- ============================================================================
-- MIGRAÇÃO 26 — REFERÊNCIAS APROVADAS VISÍVEIS AO CLIENTE
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 25.
--
-- O QUE MUDA
--
-- Decisão explícita do negócio: o cliente passa a ver nome e telefone das
-- referências de trabalho da profissional, diretamente no perfil público —
-- antes mesmo de contratar. A ideia é que o Zelo facilita o acesso ao
-- contato, mas quem confere a veracidade é o próprio cliente, ligando
-- para a referência antes de decidir.
--
-- Isso inverte a decisão de privacidade anterior (migração 17), que
-- restringia a leitura só ao admin — o argumento de então era "nome e
-- telefone são dados de terceiros, só quem confirma por telefone precisa
-- ver". A decisão de negócio agora é que o PRÓPRIO CLIENTE assume esse
-- papel de conferência, em vez do admin sozinho.
--
-- SÓ REFERÊNCIAS APROVADAS FICAM PÚBLICAS
--
-- Pendente ou rejeitada continuam privadas (só a profissional e o admin
-- veem). Expor uma referência que ainda não foi minimamente checada pelo
-- admin (ligação de confirmação) tornaria trivial inventar qualquer nome
-- e número — a aprovação do admin continua sendo o primeiro filtro antes
-- do cliente ver.
-- ============================================================================

create policy ref_select_public_aprovadas on referencias_trabalho
  for select using (status = 'aprovado');

-- A policy antiga (ref_select_own) continua valendo — ela cobre a
-- profissional vendo TODAS as próprias (inclusive pendente/rejeitada) e o
-- admin vendo tudo. Esta nova policy soma mais uma condição de acesso:
-- qualquer pessoa (inclusive anônima) pode ler uma linha se ela estiver
-- aprovada, independente de quem está logado.

grant select on referencias_trabalho to anon;


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- set role anon;
-- select nome_referencia, telefone, status from referencias_trabalho
--  where status = 'aprovado';
--  -> deve retornar linhas, mesmo sem sessão
-- reset role;
-- ----------------------------------------------------------------------------
