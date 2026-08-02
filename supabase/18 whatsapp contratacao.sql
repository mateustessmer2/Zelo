-- ============================================================================
-- MIGRAÇÃO 18 — WHATSAPP LIBERADO NA CONTRATAÇÃO (SEM ESPERAR ACEITE)
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 17.
--
-- O QUE MUDA
--
-- Decisão explícita: o WhatsApp da profissional deve abrir para o cliente
-- IMEDIATAMENTE ao clicar em "Contratar" — antes de qualquer aceite dela.
-- É um segundo canal, mais rápido que esperar o painel.
--
-- Isso é deliberadamente diferente da policy `contatos_select_booking_confirmado`
-- (migração 05), que só libera contato após o booking virar 'confirmado' —
-- aquela regra continua existindo e vale para o app tentar mostrar contato
-- em outros lugares. Esta nova policy libera mais cedo, especificamente
-- para o fluxo de contratação.
--
-- POR QUE UMA POLICY NOVA, E NÃO ALTERAR A EXISTENTE
--
-- Enfraquecer `contatos_select_booking_confirmado` para aceitar qualquer
-- status abriria o contato de QUALQUER booking, inclusive um já cancelado
-- há meses. A policy nova é mais estreita: exige um booking em
-- 'solicitado' (ou além) entre as duas partes especificamente — sem
-- reabrir contato de pedidos antigos e encerrados.
-- ============================================================================

create policy contatos_select_ao_contratar on contatos
  for select using (
    exists (
      select 1 from bookings b
      where b.status in ('solicitado', 'confirmado', 'concluido')
        and (
          (b.cliente_id = auth.uid() and b.profissional_id = contatos.perfil_id)
          or
          (b.profissional_id = auth.uid() and b.cliente_id = contatos.perfil_id)
        )
    )
  );


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select policyname, cmd from pg_policies where tablename = 'contatos';
--  -> deve aparecer contatos_own, contatos_select_booking_confirmado,
--     contatos_select_admin, contatos_select_ao_contratar
-- ----------------------------------------------------------------------------
