-- ============================================================================
-- MIGRAÇÃO 15 — LOG DE NOTIFICAÇÕES
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 14.
--
-- POR QUE UMA TABELA DE LOG
--
-- O envio de WhatsApp pode falhar por motivos que ninguém vê: número
-- inválido, template ainda não aprovado, token expirado, limite diário da
-- Meta. Sem registro, a falha some — e você só descobre quando a
-- profissional reclama que nunca foi avisada de um pedido.
--
-- Esta tabela é escrita pela Edge Function `notificar-booking`, que usa
-- service role. Ninguém pelo app escreve aqui; só o admin lê.
-- ============================================================================

create table if not exists notificacoes_log (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid references bookings(id) on delete cascade,
  canal                 text not null default 'whatsapp',
  destino_profissional  text,   -- 'enviado' | 'sem telefone...' | 'falhou: ...'
  destino_admin         text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_notif_booking on notificacoes_log(booking_id);
create index if not exists idx_notif_data on notificacoes_log(created_at desc);

alter table notificacoes_log enable row level security;

-- Só o admin lê. A profissional não precisa ver o log técnico do próprio
-- aviso, e o cliente muito menos.
create policy notif_select_admin on notificacoes_log
  for select using (auth_role() = 'admin');

grant select on notificacoes_log to authenticated;


-- ----------------------------------------------------------------------------
-- Consulta útil: pedidos cuja notificação falhou nas últimas 48h
-- ----------------------------------------------------------------------------
-- select n.created_at, p.nome as profissional,
--        n.destino_profissional, n.destino_admin
--   from notificacoes_log n
--   join bookings b on b.id = n.booking_id
--   join perfis p on p.id = b.profissional_id
--  where n.created_at > now() - interval '48 hours'
--    and (n.destino_profissional not like 'enviado%' or n.destino_admin not like 'enviado%')
--  order by n.created_at desc;
-- ----------------------------------------------------------------------------
