-- ============================================================================
-- SEED — dados iniciais. Pelotas ativa; categorias iniciais + futuras.
-- Expandir cidade = mudar 'ativa' para true e inserir bairros. Sem código.
-- ============================================================================

-- Cidades --------------------------------------------------------------------
insert into cidades (nome, uf, ativa, slug) values
  ('Pelotas',        'RS', true,  'pelotas'),
  ('Rio Grande',     'RS', false, 'rio-grande'),
  ('Capão do Leão',  'RS', false, 'capao-do-leao'),
  ('Porto Alegre',   'RS', false, 'porto-alegre');

-- Bairros de Pelotas (exemplos — completar no painel admin) -------------------
insert into bairros (cidade_id, nome)
select id, b.nome from cidades, (values
  ('Centro'), ('Areal'), ('Fragata'), ('Três Vendas'),
  ('Laranjal'), ('Porto'), ('São Gonçalo')
) as b(nome)
where cidades.slug = 'pelotas';

-- Categorias iniciais (ativas) ----------------------------------------------
insert into categorias (nome, slug, icone, ativa, ordem) values
  ('Limpeza Residencial',  'limpeza-residencial',  '🧹', true, 1),
  ('Babá',                 'baba',                 '👶', true, 2),
  ('Cuidador Domiciliar/Hospitalar', 'cuidador-domiciliar-hospitalar', '👵', true, 3);

-- Categorias futuras (preparadas, inativas — ativar pelo painel admin) -------
insert into categorias (nome, slug, icone, ativa, ordem) values
  ('Eletricista',              'eletricista',              '⚡', false, 10),
  ('Encanador',                'encanador',                '🔧', false, 11),
  ('Pintor',                   'pintor',                   '🎨', false, 12),
  ('Jardineiro',               'jardineiro',               '🌱', false, 13),
  ('Piscineiro',               'piscineiro',               '🏊', false, 14),
  ('Montador de móveis',       'montador-de-moveis',       '🪑', false, 15),
  ('Chaveiro',                 'chaveiro',                 '🔑', false, 16),
  ('Cozinheira',               'cozinheira',               '🍳', false, 17),
  ('Passadeira',               'passadeira',               '👔', false, 18),
  ('Lavadeira',                'lavadeira',                '🧺', false, 19),
  ('Dog Walker',               'dog-walker',               '🐕', false, 20),
  ('Pet Sitter',               'pet-sitter',               '🐈', false, 21),
  ('Professor Particular',     'professor-particular',     '📚', false, 22),
  ('Personal Trainer',         'personal-trainer',         '🏋️', false, 23),
  ('Fotógrafo',                'fotografo',                '📷', false, 24),
  ('Garçom',                   'garcom',                   '🍽️', false, 25),
  ('Churrasqueiro',            'churrasqueiro',            '🔥', false, 26),
  ('Técnico de informática',   'tecnico-de-informatica',   '💻', false, 27),
  ('Técnico de ar condicionado','tecnico-de-ar-condicionado','❄️', false, 28);
