-- =====================================================================
-- Paraguai Academy — 0005_sync.sql
-- Suporte à coleta automática (robô da Mega). Rode no SQL Editor do Supabase.
-- =====================================================================

-- Colunas novas em produtos:
--  origem_id        = id do produto na loja de origem (chave da Mega)
--  origem_categoria = id da categoria na origem (para marcar indisponível por categoria)
--  oculto           = produto com preço escondido na origem (não aparece na busca)
alter table public.produtos add column if not exists origem_id text;
alter table public.produtos add column if not exists origem_categoria text;
alter table public.produtos add column if not exists oculto boolean not null default false;

-- Chave de atualização sem duplicar: (loja, id de origem). CSV usa origem_id nulo
-- (o Postgres trata nulos como distintos, então não conflita).
create unique index if not exists produtos_loja_origem_uniq
  on public.produtos (loja_id, origem_id);

-- Estado da coleta por categoria (para a guarda de queda > 30% e os alertas).
create table if not exists public.sync_mega (
  category_id   bigint primary key,
  slug          text,
  nicho         text,
  total         integer,     -- total anunciado no site ("N resultados")
  coletados     integer,     -- quantos o robô coletou nesta rodada
  atualizado_em timestamptz,
  alerta        text
);

alter table public.sync_mega enable row level security;
grant select on public.sync_mega to authenticated;
drop policy if exists "admin gerencia sync" on public.sync_mega;
create policy "admin gerencia sync" on public.sync_mega
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "aluno le sync" on public.sync_mega;
create policy "aluno le sync" on public.sync_mega
  for select to authenticated using (true);
