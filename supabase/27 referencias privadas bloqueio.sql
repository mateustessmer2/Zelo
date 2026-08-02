-- ============================================================================
-- MIGRAÇÃO 27 — REFERÊNCIAS SÓ NA CONTRATAÇÃO, COM BLOQUEIO PELO ADMIN
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 26.
--
-- O QUE MUDA EM RELAÇÃO À MIGRAÇÃO 26
--
-- A 26 tornou referências aprovadas públicas no perfil, antes mesmo do
-- cliente contratar. Esta migração REVERTE isso: a policy pública é
-- removida, e o contato (primeiro nome + telefone) só é entregue ao
-- cliente que acabou de criar um booking — por e-mail, não mais na tela.
--
-- POR QUE REVERTER EM VEZ DE SÓ ADICIONAR RESTRIÇÃO NA POLICY
--
-- A policy pública da 26 não distinguia "antes de contratar" de "depois" —
-- ela liberava para qualquer um, sempre. Adicionar essa distinção via RLS
-- puro exigiria a policy checar se existe um booking do usuário logado
-- com aquela profissional, o que é possível, mas a entrega por E-MAIL (em
-- vez de tela) já muda o mecanismo por completo: quem lê o e-mail não
-- está necessariamente com sessão ativa no navegador no momento da leitura.
-- Por isso o envio passa a ser feito por uma Edge Function com service
-- role, no mesmo modelo já usado para notificar-booking — não por RLS.
--
-- BLOQUEIO PELO ADMIN
--
-- Diferente de "rejeitar" (que é a decisão inicial, antes da referência
-- ser aprovada), bloquear é uma ação que pode acontecer DEPOIS — se a
-- pessoa citada como referência reclamar de ter o contato dela usado.
-- Por isso é uma coluna própria (`bloqueada`), não um novo valor do enum
-- `verif_status`: esse enum é compartilhado com identidade/selfie/
-- antecedentes, onde "bloqueado após aprovado" não faz sentido do mesmo
-- jeito. Uma referência bloqueada para de ser divulgada e para de contar
-- para o selo — o trigger de selo (migração 17) é atualizado para isso.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Reverter a policy pública da migração 26
-- ----------------------------------------------------------------------------
drop policy if exists ref_select_public_aprovadas on referencias_trabalho;
revoke select on referencias_trabalho from anon;


-- ----------------------------------------------------------------------------
-- 2) Coluna de bloqueio
-- ----------------------------------------------------------------------------
alter table referencias_trabalho
  add column if not exists bloqueada boolean not null default false;

alter table referencias_trabalho
  add column if not exists bloqueada_em timestamptz;

alter table referencias_trabalho
  add column if not exists bloqueada_motivo text;

comment on column referencias_trabalho.bloqueada is
  'Quando true, a referência para de ser divulgada e de contar para o selo — mesmo já aprovada antes.';


-- ----------------------------------------------------------------------------
-- 3) O selo (migração 17) passa a exigir NÃO bloqueada, além de aprovada
-- ----------------------------------------------------------------------------
create or replace function recalcular_selo(p_profissional_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  aprovadas int;
begin
  select count(*) into aprovadas
    from referencias_trabalho
   where profissional_id = p_profissional_id
     and status = 'aprovado'
     and bloqueada = false;

  update profissionais
     set selo = case
       when aprovadas >= 3 then 'ouro'
       when aprovadas = 2 then 'prata'
       when aprovadas = 1 then 'bronze'
       else null
     end,
     updated_at = now()
   where id = p_profissional_id;
end;
$$;

-- O trigger que chama esta função já dispara em UPDATE de `status`
-- (migração 17). Passa a disparar também em UPDATE de `bloqueada`, para
-- recalcular o selo no momento em que o admin bloqueia ou desbloqueia.
drop trigger if exists trg_referencia_muda_selo on referencias_trabalho;
create trigger trg_referencia_muda_selo
  after insert or update of status, bloqueada or delete on referencias_trabalho
  for each row execute function trg_recalcular_selo();


-- ----------------------------------------------------------------------------
-- 4) Policy para o admin bloquear/desbloquear
-- ----------------------------------------------------------------------------
-- `ref_update_admin` (migração 17) já cobre UPDATE por admin de forma
-- geral — bloquear é só mais um campo dentro do mesmo UPDATE, não precisa
-- de policy nova.


-- ----------------------------------------------------------------------------
-- 5) Log de divulgação — quando e para quem uma referência foi enviada
-- ----------------------------------------------------------------------------
-- Sem isto, não haveria registro de quem recebeu o contato de quem. Se a
-- pessoa citada como referência reclamar de abordagem indevida, este log
-- é o que permite saber quem recebeu o dado e quando — parte do dever de
-- prestar contas do tratamento de dados de terceiros.
create table if not exists divulgacoes_referencia (
  id                uuid primary key default gen_random_uuid(),
  referencia_id     uuid not null references referencias_trabalho(id) on delete cascade,
  booking_id        uuid references bookings(id) on delete set null,
  cliente_id        uuid not null references perfis(id) on delete cascade,
  aceitou_disclaimer boolean not null default false,
  enviado_em        timestamptz not null default now()
);

create index idx_divulgacao_referencia on divulgacoes_referencia(referencia_id);
create index idx_divulgacao_cliente on divulgacoes_referencia(cliente_id);

alter table divulgacoes_referencia enable row level security;

create policy divulgacao_select_admin on divulgacoes_referencia
  for select using (auth_role() = 'admin');

-- Só a Edge Function (service role) grava aqui — nenhum papel do
-- frontend precisa de INSERT.
grant select on divulgacoes_referencia to authenticated;


-- ----------------------------------------------------------------------------
-- 6) Função pública: SÓ a contagem de referências aprovadas
-- ----------------------------------------------------------------------------
-- O cliente precisa saber "esta profissional tem referência aprovada?"
-- para decidir se mostra o disclaimer antes de contratar — mas não pode
-- ler nome/telefone antes disso (é isto que esta migração acabou de
-- fechar). Uma função com security definer devolve só um número, nunca
-- o conteúdo da tabela — não é um jeito de contornar o RLS por trás, é
-- literalmente a única informação que ela expõe.
-- ----------------------------------------------------------------------------
create or replace function contar_referencias_aprovadas(p_profissional_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from referencias_trabalho
   where profissional_id = p_profissional_id
     and status = 'aprovado'
     and bloqueada = false;
$$;

grant execute on function contar_referencias_aprovadas(uuid) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- set role anon;
-- select * from referencias_trabalho;  -- deve dar 0 linhas ou erro de permissão
-- select contar_referencias_aprovadas('<id-de-uma-profissional>');  -- deve funcionar
-- reset role;
--
-- select nome_referencia, status, bloqueada from referencias_trabalho;
-- ----------------------------------------------------------------------------
