-- =====================================================================
-- Paraguai Academy — Fase 2 (banco)  |  0001_schema.sql
-- Tabelas e índices. Rode no Supabase: SQL Editor > New query > Run.
-- Rode os arquivos em ordem: 0001, 0002, 0003, 0004.
-- =====================================================================

-- Nichos (lista fixa; sem medicamentos). slug único evita duplicidade.
create table if not exists public.nichos (
  slug          text primary key,
  nome          text not null,
  ativo         boolean not null default true,
  peso_padrao_g integer not null default 0,
  ordem         integer not null default 0
);

-- Perfil do aluno/admin (1 por usuário do Supabase Auth).
create table if not exists public.perfis (
  id                uuid primary key references auth.users(id) on delete cascade,
  nome              text,
  whatsapp          text,
  nicho_principal   text references public.nichos(slug),
  caminho           text not null default 'paraguai' check (caminho in ('paraguai','brasil')),
  papel             text not null default 'aluno'    check (papel in ('aluno','admin')),
  deve_trocar_senha boolean not null default true,
  criado_em         timestamptz not null default now()
);

-- Liberação de acesso por nicho (o admin controla manualmente).
create table if not exists public.acessos (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  nicho        text not null references public.nichos(slug),
  liberado_em  timestamptz not null default now(),
  liberado_por uuid references auth.users(id),
  unique (usuario_id, nicho)
);

-- Progresso das 8 etapas (1 linha por etapa por aluno).
create table if not exists public.progresso_etapas (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  etapa       integer not null check (etapa between 1 and 8),
  status      text not null default 'bloqueada'
              check (status in ('bloqueada','atual','concluida','nao_se_aplica')),
  checklist   jsonb not null default '{}'::jsonb,
  concluida_em timestamptz,
  unique (usuario_id, etapa)
);

-- Itens de checklist obrigatórios por etapa (o servidor valida a conclusão por aqui).
-- Os textos (labels) ficam também em content/trilha.js; aqui guardamos a estrutura.
create table if not exists public.etapa_checklist (
  etapa       integer not null check (etapa between 1 and 8),
  item_id     text not null,
  label       text not null,
  obrigatorio boolean not null default true,
  automatico  boolean not null default false,   -- marcado pelo sistema (ex.: salvou simulação)
  ordem       integer not null default 0,
  primary key (etapa, item_id)
);

-- Vídeos (id tipo V3.1). url nula até gravar.
create table if not exists public.videos (
  id      text primary key,
  etapa   integer,                 -- 0 = fora da trilha (V0 vendas, V0.1 boas-vindas)
  ordem   integer not null default 0,
  titulo  text not null,
  duracao text,
  url     text,
  roteiro jsonb not null default '[]'::jsonb,
  ativo   boolean not null default true
);

-- Aulas assistidas por aluno.
create table if not exists public.videos_assistidos (
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  video_id    text not null references public.videos(id) on delete cascade,
  assistido_em timestamptz not null default now(),
  primary key (usuario_id, video_id)
);

-- Fornecedores (Paraguai e Brasil).
create table if not exists public.fornecedores (
  id              bigint generated always as identity primary key,
  nome            text not null,
  pais            text not null check (pais in ('PY','BR')),
  cidade          text,
  nichos          text[] not null default '{}',   -- slugs de nichos
  descricao       text,
  contato_nome    text,
  whatsapp        text,
  minimo_valor    numeric,
  minimo_moeda    text check (minimo_moeda in ('USD','BRL')),
  pagamento       text,
  prazo           text,
  verificado      boolean not null default false,
  destaque        boolean not null default false,
  loja_dos_socios boolean not null default false,
  ativo           boolean not null default true,
  atualizado_em   timestamptz not null default now()
);

-- Freteiros.
create table if not exists public.freteiros (
  id          bigint generated always as identity primary key,
  nome        text not null,
  cidade      text,
  whatsapp    text,
  prazo       text,
  observacoes text,
  ativo       boolean not null default true
);

-- Regras de cobrança do freteiro, por nicho/faixa.
create table if not exists public.regras_freteiro (
  id              bigint generated always as identity primary key,
  freteiro_id     bigint not null references public.freteiros(id) on delete cascade,
  nicho           text not null references public.nichos(slug),
  faixa           text,
  tipo            text not null check (tipo in ('percentual','fixo_unidade','consulta')),
  valor           numeric,
  base            text check (base in ('mercadoria','nota')),
  compra_minima_brl numeric,
  ordem           integer not null default 0
);

-- Regra da nota fiscal (tabela de uma linha só).
create table if not exists public.regras_nota (
  id               integer primary key default 1 check (id = 1),
  ate_valor        numeric not null default 1650,
  valor_fixo       numeric not null default 100,
  percentual_acima numeric not null default 7,
  contato_whatsapp text
);

-- Lojas (fonte dos produtos da calculadora).
create table if not exists public.lojas (
  id         bigint generated always as identity primary key,
  nome       text not null,
  cidade     text,
  site       text,
  whatsapp   text,
  minimo_usd numeric
);

-- Produtos (base de preços da calculadora).
create table if not exists public.produtos (
  id            bigint generated always as identity primary key,
  loja_id       bigint references public.lojas(id) on delete set null,
  nome          text not null,
  marca         text,
  sku           text,
  nicho         text references public.nichos(slug),
  faixa_frete   text,
  preco_usd     numeric,
  imagem_url    text,
  url           text,
  em_estoque    boolean not null default true,
  fonte         text,
  atualizado_em timestamptz not null default now(),
  busca tsvector generated always as (
    to_tsvector('portuguese',
      coalesce(nome,'') || ' ' || coalesce(marca,'') || ' ' || coalesce(sku,''))
  ) stored
);
create index if not exists produtos_busca_idx on public.produtos using gin (busca);
-- Upsert do CSV por (loja, sku) quando houver sku; o resto é tratado no importador.
create unique index if not exists produtos_loja_sku_uniq
  on public.produtos (loja_id, sku) where sku is not null and sku <> '';

-- Canais de venda (taxa %).
create table if not exists public.canais_venda (
  id              bigint generated always as identity primary key,
  nome            text not null,
  taxa_percentual numeric not null default 0,
  ativo           boolean not null default true
);

-- Simulações salvas pelo aluno.
create table if not exists public.simulacoes (
  id            bigint generated always as identity primary key,
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  nome          text,
  itens         jsonb not null default '[]'::jsonb,
  parametros    jsonb not null default '{}'::jsonb,
  resultado     jsonb not null default '{}'::jsonb,
  criada_em     timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index if not exists simulacoes_usuario_idx on public.simulacoes (usuario_id);

-- Configurações globais (links e textos).
create table if not exists public.configuracoes (
  chave     text primary key,
  valor     text,
  descricao text
);

-- Cache da cotação do dólar (preenchido pela função serverless /api/cotacao).
create table if not exists public.cotacoes (
  id            integer primary key default 1 check (id = 1),
  par           text not null default 'USD-BRL',
  valor         numeric,
  atualizada_em timestamptz
);
