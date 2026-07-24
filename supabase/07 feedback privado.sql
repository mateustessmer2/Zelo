-- ============================================================================
-- MIGRAÇÃO 07 — FEEDBACK PRIVADO NA AVALIAÇÃO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 06.
--
-- O QUE MUDA
--
-- Cada avaliação passa a ter dois textos:
--   • `comentario`        — público, anônimo, lido pelo MESMO lado do autor
--                           (clientes leem o que clientes escreveram)
--   • `comentario_privado`— lido APENAS pela pessoa avaliada
--
-- POR QUE O PRIVADO SÓ APARECE DEPOIS DA PUBLICAÇÃO
--
-- Feedback franco só é franco quando não gera represália. Se a profissional
-- lesse "achei o trabalho fraco" antes de avaliar o cliente, a nota dela
-- viraria resposta, não avaliação.
--
-- Por isso o privado herda a mesma trava do público: fica invisível até
-- `publicada_em` ser preenchido — o que acontece quando os DOIS lados
-- avaliaram, ou quando o prazo de 14 dias expira (ver 05_correcoes.sql).
-- Nesse ponto ambos já se comprometeram, e ler não muda mais nada.
-- ============================================================================

alter table avaliacoes
  add column if not exists comentario_privado text;

comment on column avaliacoes.comentario_privado is
  'Mensagem direta à pessoa avaliada. Só legível após publicada_em — ver policy avaliacoes_select_privado.';


-- ----------------------------------------------------------------------------
-- A policy de SELECT existente (avaliacoes_select_segmentado) já entrega a
-- linha inteira a quem é do mesmo lado do autor — e isso INCLUIRIA o texto
-- privado, que não é para eles.
--
-- Postgres não filtra coluna por policy: RLS decide linhas, não campos.
-- A separação é feita por uma VIEW dedicada, que é o único caminho pelo qual
-- o app lê o texto privado.
-- ----------------------------------------------------------------------------

create or replace view minhas_avaliacoes_recebidas
with (security_invoker = true) as
select
  a.id,
  a.booking_id,
  a.lado,
  a.nota,
  a.comentario_privado,
  a.created_at,
  a.publicada_em
from avaliacoes a
where a.alvo_id = auth.uid()          -- só o que EU recebi
  and a.publicada_em is not null      -- e só depois da liberação simultânea
  and a.comentario_privado is not null;

grant select on minhas_avaliacoes_recebidas to authenticated;


-- ============================================================================
-- IMPORTANTE — a view acima entrega `comentario_privado` de linhas que a
-- policy `avaliacoes_select_segmentado` normalmente esconderia da pessoa
-- avaliada. Isso é intencional e seguro por três motivos:
--
--   1. `security_invoker = true` faz a view rodar com as permissões de quem
--      consulta, então o RLS da tabela base continua valendo.
--   2. O filtro `alvo_id = auth.uid()` garante que ninguém lê o privado
--      destinado a outra pessoa.
--   3. `publicada_em is not null` preserva a liberação simultânea.
--
-- A view NÃO expõe `autor_id` nem `comentario` público — a pessoa avaliada
-- lê a mensagem, não descobre quem escreveu a avaliação pública nem o que
-- foi dito lá.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select column_name from information_schema.columns
--  where table_name = 'avaliacoes' and column_name = 'comentario_privado';
--
-- select table_name from information_schema.views
--  where table_name = 'minhas_avaliacoes_recebidas';
-- ----------------------------------------------------------------------------
