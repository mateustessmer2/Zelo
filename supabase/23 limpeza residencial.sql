-- ============================================================================
-- MIGRAÇÃO 23 — LIMPEZA RESIDENCIAL + LISTA DE SERVIÇOS ESPECÍFICOS
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 22.
--
-- PARTE 1 — Renomear a categoria
--
-- "Faxineira" vira "Limpeza Residencial". Isso é diferente da mudança
-- anterior (que só trocou o TEXTO de marketing na home/cadastro, deixando
-- a categoria do banco como estava) — agora o nome oficial da categoria
-- muda de verdade, refletindo em todo lugar que lê `categorias.nome`:
-- chips de busca, chips de "o que você faz" no perfil da profissional,
-- e-mails de notificação, etc. `slug` também muda, para ficar coerente
-- com o nome novo — nada no código depende do slug antigo permanecer
-- igual (buscas usam `categoria_id`, não o slug).
--
-- PARTE 2 — Lista de serviços específicos dentro da categoria
--
-- Um nível mais granular que a categoria: dentro de "Limpeza Residencial",
-- a profissional marca quais serviços específicos oferece (limpeza geral,
-- lavar roupa, regar plantas, etc.) — múltipla escolha, mais um campo de
-- texto livre para "Outro".
--
-- POR QUE TABELA PRÓPRIA, E NÃO UM text[] EM `profissionais`
--
-- Um array de texto livre pareceria mais simples, mas perderia a
-- estrutura: sem uma lista fixa de opções, cada profissional escreveria
-- de um jeito ("lava roupa", "lavagem de roupas", "lavar as roupas"),
-- impossibilitando filtrar por serviço específico no futuro. Uma tabela
-- de opções fixas (`servicos_disponiveis`) + tabela de vínculo N:N
-- (`profissional_servicos`) mantém a mesma estrutura já usada para
-- categorias e bairros — e o campo "Outro" cobre o caso livre sem
-- comprometer a estrutura do resto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PARTE 1 — Renomear a categoria
-- ----------------------------------------------------------------------------
update categorias
   set nome = 'Limpeza Residencial',
       slug = 'limpeza-residencial'
 where slug = 'faxineira';


-- ----------------------------------------------------------------------------
-- PARTE 2 — Lista de serviços específicos (opções fixas)
-- ----------------------------------------------------------------------------
create table if not exists servicos_disponiveis (
  id          uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  nome        text not null,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  unique (categoria_id, nome)
);

alter table servicos_disponiveis enable row level security;

create policy servicos_disponiveis_select_public on servicos_disponiveis
  for select using (true);

grant select on servicos_disponiveis to anon, authenticated;

insert into servicos_disponiveis (categoria_id, nome, ordem)
select c.id, s.nome, s.ordem
from categorias c
cross join (values
  ('Limpeza geral', 1),
  ('Limpeza pesada', 2),
  ('Organização de ambientes', 3),
  ('Lavar roupas', 4),
  ('Passar roupas', 5),
  ('Preparar refeições simples', 6),
  ('Lavar louça', 7),
  ('Limpeza de vidros internos', 8),
  ('Limpeza de geladeira', 9),
  ('Limpeza de forno', 10),
  ('Troca de roupa de cama', 11),
  ('Regar plantas', 12),
  ('Alimentar pets', 13)
) as s(nome, ordem)
where c.slug = 'limpeza-residencial'
on conflict (categoria_id, nome) do nothing;


-- ----------------------------------------------------------------------------
-- Vínculo N:N: quais serviços cada profissional marcou
-- ----------------------------------------------------------------------------
create table if not exists profissional_servicos (
  profissional_id uuid not null references profissionais(id) on delete cascade,
  servico_id       uuid not null references servicos_disponiveis(id) on delete cascade,
  primary key (profissional_id, servico_id)
);

alter table profissional_servicos enable row level security;

create policy prof_servicos_select_public on profissional_servicos
  for select using (true);

create policy prof_servicos_write_own on profissional_servicos
  for all using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());

grant select, insert, delete on profissional_servicos to authenticated;
grant select on profissional_servicos to anon;


-- ----------------------------------------------------------------------------
-- Campo de texto livre para "Outro: ____"
-- ----------------------------------------------------------------------------
alter table profissionais
  add column if not exists servico_outro text;

comment on column profissionais.servico_outro is
  'Texto livre do campo "Outro" na lista de serviços de limpeza — complementa profissional_servicos, não substitui.';


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select nome, slug from categorias where slug = 'limpeza-residencial';
-- select nome, ordem from servicos_disponiveis order by ordem;
-- ----------------------------------------------------------------------------
