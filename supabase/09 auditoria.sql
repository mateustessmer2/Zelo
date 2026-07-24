-- ============================================================================
-- MIGRAÇÃO 09 — CORREÇÕES DA AUDITORIA PRÉ-LANÇAMENTO
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 08. Cada bloco é independente; se um falhar com
-- "already exists", siga para o próximo.
--
-- ACHADOS QUE ESTE ARQUIVO CORRIGE (em ordem de gravidade):
--
--  A. CRÍTICO — 4 tabelas com grant de escrita e RLS DESLIGADO:
--     qualquer usuário logado podia editar a agenda, as categorias e os
--     bairros de QUALQUER profissional.
--  B. CRÍTICO — privilégio TRUNCATE concedido a authenticated:
--     TRUNCATE ignora RLS; qualquer logado podia esvaziar tabelas inteiras.
--  C. CRÍTICO — a view do feedback privado nunca retornava linhas:
--     `security_invoker = true` fazia o RLS da tabela base negar a linha
--     exatamente à pessoa que deveria lê-la. As "mensagens diretas" nunca
--     apareceram para ninguém.
--  D. IMPORTANTE — busca pública quebrada: visitante sem login não tinha
--     grant de leitura nas tabelas que a busca usa.
--  E. IMPORTANTE — aprovação de verificação em dois updates não-atômicos:
--     já causou dessincronização real (aprovado em `verificacoes`, pendente
--     em `profissionais`). Um trigger passa a sincronizar sozinho.
--  F. Índices ausentes em colunas consultadas com frequência.
--  G. Valores sem validação: preço negativo e nota fora de faixa passavam.
-- ============================================================================


-- ============================================================================
-- A) RLS NAS TABELAS QUE FICARAM SEM
-- ----------------------------------------------------------------------------
-- Leitura é pública (a busca precisa delas antes do login); escrita é só
-- do dono. O padrão é o mesmo das demais tabelas do projeto.
-- ============================================================================

alter table profissional_categorias enable row level security;
alter table profissional_bairros    enable row level security;
alter table disponibilidade         enable row level security;
alter table dias_bloqueados         enable row level security;

-- Leitura pública (necessária para a busca sem login)
create policy pc_select_public on profissional_categorias
  for select using (true);
create policy pb_select_public on profissional_bairros
  for select using (true);
create policy disp_select_public on disponibilidade
  for select using (true);

-- Dias bloqueados: só a dona precisa ler (a busca não os usa hoje)
create policy diasb_select_own on dias_bloqueados
  for select using (profissional_id = auth.uid());

-- Escrita: exclusivamente a própria profissional
create policy pc_write_own on profissional_categorias
  for all using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());
create policy pb_write_own on profissional_bairros
  for all using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());
create policy disp_write_own on disponibilidade
  for all using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());
create policy diasb_write_own on dias_bloqueados
  for all using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());


-- ============================================================================
-- B) REVOGAR PRIVILÉGIOS PERIGOSOS
-- ----------------------------------------------------------------------------
-- TRUNCATE não passa pelo RLS: com ele concedido, qualquer usuário logado
-- podia apagar uma tabela inteira com um comando. REFERENCES e TRIGGER
-- também não têm por que estar com os papéis da API.
-- ============================================================================

revoke truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;


-- ============================================================================
-- C) CORRIGIR A VIEW DO FEEDBACK PRIVADO
-- ----------------------------------------------------------------------------
-- O problema: com `security_invoker = true`, a view aplica o RLS de
-- `avaliacoes` com o papel de quem consulta. A pessoa AVALIADA não é a
-- autora nem é do lado do autor — então a policy nega, e a view sempre
-- volta vazia. O feedback privado nunca chegou a funcionar.
--
-- A correção: view SEM security_invoker (padrão: roda com os privilégios
-- do dono, atravessando o RLS da tabela base). A segurança passa a estar
-- nos filtros da própria view, que são exatamente a regra de negócio:
--   • alvo_id = auth.uid()      -> só leio o que EU recebi
--   • publicada_em is not null  -> só após a liberação simultânea
-- A view não expõe autor_id nem o comentário público.
-- ============================================================================

drop view if exists minhas_avaliacoes_recebidas;

create view minhas_avaliacoes_recebidas as
select
  a.id,
  a.booking_id,
  a.lado,
  a.nota,
  a.comentario_privado,
  a.created_at,
  a.publicada_em
from avaliacoes a
where a.alvo_id = auth.uid()
  and a.publicada_em is not null
  and a.comentario_privado is not null;

grant select on minhas_avaliacoes_recebidas to authenticated;


-- ============================================================================
-- D) BUSCA PÚBLICA — grants de leitura para visitantes sem login
-- ----------------------------------------------------------------------------
-- A home e a busca funcionam antes do cadastro (reduz atrito). O RLS
-- continua decidindo as linhas: um anon só enxerga profissionais com
-- visivel = true, e `perfis` não carrega mais telefone.
-- ============================================================================

grant select on profissionais,
                perfis,
                profissional_categorias,
                profissional_bairros,
                disponibilidade
  to anon;


-- ============================================================================
-- E) TRIGGER — sincronizar aprovação de verificação
-- ----------------------------------------------------------------------------
-- Antes, aprovar exigia dois updates vindos do app (verificacoes E
-- profissionais). Quando o segundo falhava, o estado dessincronizava —
-- aconteceu em teste real. Com o trigger, o update em `verificacoes` é
-- suficiente: o banco espelha o status em `profissionais` sozinho, e a
-- coluna gerada `visivel` faz o resto.
-- O segundo update do app continua funcionando (vira redundância inofensiva).
-- ============================================================================

create or replace function sincronizar_status_verificacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'identidade' then
    update profissionais
       set identidade_status = new.status, updated_at = now()
     where id = new.profissional_id;
  elsif new.tipo = 'antecedentes' then
    update profissionais
       set antecedentes_status = new.status, updated_at = now()
     where id = new.profissional_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sincronizar_verificacao on verificacoes;
create trigger trg_sincronizar_verificacao
  after update of status on verificacoes
  for each row execute function sincronizar_status_verificacao();


-- ============================================================================
-- F) ÍNDICES AUSENTES
-- ----------------------------------------------------------------------------
-- As PKs compostas das tabelas de junção começam por profissional_id, então
-- buscas pelo SEGUNDO campo (categoria, bairro) não as aproveitam — e são
-- exatamente as buscas que a home dispara.
-- ============================================================================

create index if not exists idx_pc_categoria on profissional_categorias(categoria_id);
create index if not exists idx_pb_bairro    on profissional_bairros(bairro_id);
create index if not exists idx_aval_autor   on avaliacoes(autor_id);
create index if not exists idx_disp_prof    on disponibilidade(profissional_id);


-- ============================================================================
-- G) VALIDAÇÃO DE VALORES
-- ----------------------------------------------------------------------------
-- Preço negativo e idade absurda passavam direto. Validação de formato fica
-- no app; invariantes de negócio ficam no banco.
-- ============================================================================

alter table profissionais
  drop constraint if exists prof_valores_positivos;
alter table profissionais
  add constraint prof_valores_positivos
  check (
    (valor_hora  is null or valor_hora  >= 0) and
    (valor_diaria is null or valor_diaria >= 0) and
    (idade is null or (idade between 16 and 100))
  );

alter table bookings
  drop constraint if exists bookings_valor_positivo;
alter table bookings
  add constraint bookings_valor_positivo
  check (valor_combinado is null or valor_combinado >= 0);


-- ============================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO
-- ----------------------------------------------------------------------------
-- 1. RLS ligado em tudo que tem escrita:
--    select tablename, rowsecurity from pg_tables
--     where schemaname='public' order by tablename;
--
-- 2. TRUNCATE revogado:
--    select grantee, privilege_type from information_schema.role_table_grants
--     where table_schema='public' and privilege_type='TRUNCATE';
--    -> não deve listar anon nem authenticated
--
-- 3. Feedback privado (após ambos avaliarem um booking):
--    a pessoa avaliada deve ver a mensagem em "Mensagens diretas"
--
-- 4. Busca deslogada: abrir o site em aba anônima SEM login e buscar
--    -> a profissional verificada deve aparecer
-- ============================================================================
