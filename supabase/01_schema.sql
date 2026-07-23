-- ============================================================================
-- MARKETPLACE DE SERVIÇOS — SCHEMA PRINCIPAL
-- Postgres / Supabase
-- ----------------------------------------------------------------------------
-- Princípios de arquitetura embutidos neste schema:
--   1. Multi-cidade desde o dia zero: nada fixo em Pelotas. Cidades e bairros
--      são dados, não código. Expandir = inserir linhas, não refatorar.
--   2. Categorias parametrizadas: adicionar categoria = inserir linha.
--   3. Verificação obrigatória (identidade + antecedentes) como gate de
--      visibilidade, com método plugável (manual hoje, API externa depois).
--   4. Reputação dupla com visibilidade segmentada — a regra vive no banco
--      (RLS), nunca só no front-end. Ver 02_rls.sql.
--   5. Valor combinado registrado, pagamento fora da plataforma no MVP,
--      com campos prontos para split futuro.
-- ============================================================================

-- Extensões -----------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "unaccent";       -- busca sem acento

-- ENUMs ---------------------------------------------------------------------
create type user_role        as enum ('cliente', 'profissional', 'admin');
create type verif_status     as enum ('pendente', 'em_analise', 'aprovado', 'rejeitado');
create type verif_metodo     as enum ('manual', 'idwall', 'unico', 'serpro');
create type booking_status   as enum ('solicitado', 'confirmado', 'concluido', 'cancelado', 'recusado');
create type review_lado      as enum ('cliente_avalia_prof', 'prof_avalia_cliente');

-- ============================================================================
-- GEOGRAFIA — parametrizada, nunca hard-coded
-- ============================================================================
create table cidades (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  uf          char(2) not null,
  ativa       boolean not null default false,   -- Pelotas = true; resto dormindo
  slug        text unique not null,
  created_at  timestamptz not null default now(),
  unique (nome, uf)
);

create table bairros (
  id          uuid primary key default gen_random_uuid(),
  cidade_id   uuid not null references cidades(id) on delete cascade,
  nome        text not null,
  created_at  timestamptz not null default now(),
  unique (cidade_id, nome)
);
create index idx_bairros_cidade on bairros(cidade_id);

-- ============================================================================
-- CATEGORIAS — adicionar = inserir linha (ou pelo painel admin)
-- ============================================================================
create table categorias (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  slug        text not null unique,
  icone       text,                 -- emoji ou nome de ícone
  ativa       boolean not null default true,
  ordem       int not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- PERFIS — 1:1 com auth.users do Supabase
-- ============================================================================
create table perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null,
  nome          text not null,
  foto_url      text,
  telefone      text,                          -- liberado ao outro lado só após booking confirmado
  cidade_id     uuid references cidades(id),
  bairro_id     uuid references bairros(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_perfis_cidade on perfis(cidade_id);

-- ============================================================================
-- PROFISSIONAIS — dados específicos da oferta
-- ============================================================================
create table profissionais (
  id                    uuid primary key references perfis(id) on delete cascade,
  descricao             text,
  idade                 int,
  experiencia           text,
  especialidades        text[],
  cursos                text[],
  valor_hora            numeric(10,2),
  valor_diaria          numeric(10,2),
  tempo_resposta_min    int,                    -- métrica agregada, calculada
  -- GATE DE VISIBILIDADE: só aparece na busca quando ambos verificados
  identidade_status     verif_status not null default 'pendente',
  antecedentes_status   verif_status not null default 'pendente',
  visivel               boolean generated always as (
                          identidade_status = 'aprovado'
                          and antecedentes_status = 'aprovado'
                        ) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_prof_visivel on profissionais(visivel);

-- Categorias que a profissional atende (N:N)
create table profissional_categorias (
  profissional_id uuid references profissionais(id) on delete cascade,
  categoria_id    uuid references categorias(id) on delete cascade,
  primary key (profissional_id, categoria_id)
);

-- Bairros que a profissional atende (N:N)
create table profissional_bairros (
  profissional_id uuid references profissionais(id) on delete cascade,
  bairro_id       uuid references bairros(id) on delete cascade,
  primary key (profissional_id, bairro_id)
);

-- ============================================================================
-- VERIFICAÇÃO — método plugável (manual hoje, API externa depois)
-- O DOCUMENTO EM SI vai em bucket PRIVADO (storage). Aqui só o resultado.
-- Cliente nunca vê o documento — vê apenas o selo derivado do status.
-- ============================================================================
create table verificacoes (
  id                uuid primary key default gen_random_uuid(),
  profissional_id   uuid not null references profissionais(id) on delete cascade,
  tipo              text not null check (tipo in ('identidade','antecedentes','telefone','email','endereco')),
  status            verif_status not null default 'pendente',
  metodo            verif_metodo not null default 'manual',
  documento_path    text,                        -- caminho no bucket PRIVADO, nunca exposto
  verificado_por    uuid references perfis(id),  -- admin que aprovou (no modo manual)
  verificado_em     timestamptz,
  observacao        text,
  created_at        timestamptz not null default now()
);
create index idx_verif_prof on verificacoes(profissional_id);

-- ============================================================================
-- DISPONIBILIDADE / AGENDA
-- ============================================================================
create table disponibilidade (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  dia_semana      int check (dia_semana between 0 and 6),  -- 0=domingo
  turno           text check (turno in ('manha','tarde','noite')),
  created_at      timestamptz not null default now()
);

create table dias_bloqueados (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  data            date not null,
  motivo          text,
  unique (profissional_id, data)
);

-- ============================================================================
-- CONTRATAÇÕES (BOOKINGS) — registra o combinado; pagamento fora no MVP
-- ============================================================================
create table bookings (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references perfis(id) on delete restrict,
  profissional_id   uuid not null references profissionais(id) on delete restrict,
  categoria_id      uuid not null references categorias(id),
  bairro_id         uuid references bairros(id),
  data_servico      date not null,
  turno             text,
  observacao        text,
  -- Valor combinado registrado (pagamento acontece por fora no MVP)
  valor_combinado   numeric(10,2),
  status            booking_status not null default 'solicitado',
  -- Campos prontos para split/pagamento futuro (nulos no MVP):
  pagamento_metodo  text,          -- 'pix','cartao'... (futuro)
  pagamento_status  text,          -- (futuro)
  split_config      jsonb,         -- (futuro)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_bookings_cliente on bookings(cliente_id);
create index idx_bookings_prof on bookings(profissional_id);

-- ============================================================================
-- AVALIAÇÕES — REPUTAÇÃO DUPLA
-- Uma linha por avaliação, sempre atrelada a um booking concluído.
-- 'lado' define quem avaliou quem. A VISIBILIDADE é controlada por RLS
-- (02_rls.sql): comentários de cada lado só são lidos pelo mesmo lado.
-- ============================================================================
create table avaliacoes (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  autor_id      uuid not null references perfis(id) on delete cascade,
  alvo_id       uuid not null references perfis(id) on delete cascade,
  lado          review_lado not null,
  nota          int not null check (nota between 1 and 5),
  comentario    text,               -- anônimo para o alvo; visível ao mesmo lado do autor
  created_at    timestamptz not null default now(),
  -- Cada booking gera no máximo 1 avaliação por lado
  unique (booking_id, lado)
);
create index idx_avaliacoes_alvo on avaliacoes(alvo_id, lado);

-- ============================================================================
-- MÉTRICAS AGREGADAS PÚBLICAS (Trust Score)
-- View somente-leitura. Expõe apenas AGREGADOS — nunca o comentário
-- individual nem quem avaliou. É isto que ambos os lados podem ver do outro.
-- ============================================================================
create view trust_scores as
select
  alvo_id,
  lado,
  round(avg(nota)::numeric, 2)  as nota_media,
  count(*)                      as total_avaliacoes
from avaliacoes
group by alvo_id, lado;

-- ============================================================================
-- CHAT — telefone liberado só após booking confirmado (regra na app + RLS)
-- ============================================================================
create table mensagens (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  autor_id      uuid not null references perfis(id) on delete cascade,
  conteudo      text not null,
  lida          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index idx_mensagens_booking on mensagens(booking_id, created_at);

-- ============================================================================
-- FAVORITOS
-- ============================================================================
create table favoritos (
  cliente_id      uuid references perfis(id) on delete cascade,
  profissional_id uuid references profissionais(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (cliente_id, profissional_id)
);
