-- ============================================================================
-- MIGRAÇÃO 28 — CUIDADOR DOMICILIAR/HOSPITALAR + SUBOPÇÕES
-- ----------------------------------------------------------------------------
-- Rode DEPOIS de 01 a 27.
--
-- O QUE MUDA
--
-- "Cuidadora de idosos" vira "Cuidador Domiciliar/Hospitalar" — nome mais
-- amplo, porque a categoria passa a cobrir três frentes diferentes de
-- cuidado, não só idosos. Mesmo padrão já usado para Limpeza Residencial
-- (migração 23): renomeia a categoria de verdade no banco (não é só texto
-- de marketing) e cria uma lista de subopções marcáveis dentro dela.
--
-- SUBOPÇÕES (reaproveitando `servicos_disponiveis`, mesma tabela e mesmo
-- mecanismo N:N já criados na migração 23 para Limpeza Residencial):
--   • Cuidador hospitalar
--   • Cuidador de idosos
--   • Cuidador de pacientes com limitações
--
-- Por que reaproveitar a tabela em vez de criar uma nova: `servicos_disponiveis`
-- já é genérica por design — uma lista de opções por categoria, com
-- vínculo N:N em `profissional_servicos`. Não há nada específico de
-- limpeza na estrutura; ela serve a qualquer categoria que precise de
-- subopções marcáveis.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Renomear a categoria
-- ----------------------------------------------------------------------------
update categorias
   set nome = 'Cuidador Domiciliar/Hospitalar',
       slug = 'cuidador-domiciliar-hospitalar'
 where slug = 'cuidadora-de-idosos';


-- ----------------------------------------------------------------------------
-- 2) Subopções dentro da categoria
-- ----------------------------------------------------------------------------
insert into servicos_disponiveis (categoria_id, nome, ordem)
select c.id, s.nome, s.ordem
from categorias c
cross join (values
  ('Cuidador hospitalar', 1),
  ('Cuidador de idosos', 2),
  ('Cuidador de pacientes com limitações', 3)
) as s(nome, ordem)
where c.slug = 'cuidador-domiciliar-hospitalar'
on conflict (categoria_id, nome) do nothing;


-- ----------------------------------------------------------------------------
-- Verificação
-- ----------------------------------------------------------------------------
-- select nome, slug from categorias where slug = 'cuidador-domiciliar-hospitalar';
-- select nome, ordem from servicos_disponiveis
--   where categoria_id = (select id from categorias where slug = 'cuidador-domiciliar-hospitalar')
--  order by ordem;
-- ----------------------------------------------------------------------------
