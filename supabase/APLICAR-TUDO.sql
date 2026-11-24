-- =====================================================================
-- Paraguai Academy - Banco completo
-- Cole TUDO isto no Supabase: SQL Editor > New query > Run. Rode uma vez.
-- Pode rodar de novo sem duplicar nem apagar o que ja existe (idempotente).
-- Gerado a partir de migrations/0001..0012 (a ordem importa).
-- =====================================================================

-- #####################################################################
-- ARQUIVO: 0001_schema.sql
-- #####################################################################

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


-- #####################################################################
-- ARQUIVO: 0002_functions.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — Fase 2 (banco)  |  0002_functions.sql
-- Funções auxiliares, gatilhos e as RPCs que o aluno chama.
-- Toda mudança de perfil e de progresso passa por função no servidor:
-- o aluno não escreve direto nessas tabelas (o bloqueio é de verdade).
-- =====================================================================

-- ---------- Auxiliares (SECURITY DEFINER: leem ignorando RLS) ----------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;

create or replace function public.nichos_liberados()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(nicho), '{}') from public.acessos where usuario_id = auth.uid();
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.nichos_liberados() to anon, authenticated;

-- ---------- Criação automática do perfil no cadastro ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, whatsapp)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Progresso: inicialização e recálculo ----------

-- Aplica o caminho (brasil zera etapas 5 e 6 como "não se aplica").
create or replace function public._aplicar_caminho(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_caminho text;
begin
  select caminho into v_caminho from public.perfis where id = p_uid;
  if v_caminho = 'brasil' then
    update public.progresso_etapas
      set status = 'nao_se_aplica'
      where usuario_id = p_uid and etapa in (5,6) and status <> 'concluida';
  else
    update public.progresso_etapas
      set status = 'bloqueada'
      where usuario_id = p_uid and etapa in (5,6) and status = 'nao_se_aplica';
  end if;
end;
$$;

-- Garante exatamente uma etapa "atual": a primeira que ainda não foi concluída
-- nem marcada como "não se aplica".
create or replace function public._recomputar_atual(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.progresso_etapas set status = 'bloqueada'
    where usuario_id = p_uid and status = 'atual';
  update public.progresso_etapas set status = 'atual'
    where usuario_id = p_uid and etapa = (
      select min(etapa) from public.progresso_etapas
      where usuario_id = p_uid and status = 'bloqueada'
    );
end;
$$;

-- Cria as 8 linhas de progresso (idempotente) e ajusta caminho + etapa atual.
create or replace function public.inicializar_meu_progresso()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  insert into public.progresso_etapas (usuario_id, etapa, status)
    select v_uid, g, 'bloqueada' from generate_series(1,8) g
    on conflict (usuario_id, etapa) do nothing;
  perform public._aplicar_caminho(v_uid);
  perform public._recomputar_atual(v_uid);
end;
$$;

-- ---------- RPCs do aluno ----------

-- Marca/desmarca um item do checklist da etapa atual.
create or replace function public.marcar_checklist(p_etapa int, p_item text, p_valor boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if not exists (select 1 from public.etapa_checklist where etapa = p_etapa and item_id = p_item) then
    raise exception 'Item de checklist inválido.';
  end if;
  update public.progresso_etapas
    set checklist = jsonb_set(checklist, array[p_item], to_jsonb(p_valor), true)
    where usuario_id = v_uid and etapa = p_etapa and status = 'atual';
  if not found then raise exception 'Esta etapa não está disponível para edição.'; end if;
end;
$$;

-- Conclui a etapa: só aceita se for a etapa atual e todos os itens obrigatórios
-- estiverem marcados. Libera a próxima etapa aplicável.
create or replace function public.concluir_etapa(p_etapa int)
returns public.progresso_etapas language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_checklist jsonb;
  v_prox public.progresso_etapas;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  select status, checklist into v_status, v_checklist
    from public.progresso_etapas where usuario_id = v_uid and etapa = p_etapa;
  if not found or v_status <> 'atual' then
    raise exception 'Esta etapa não está disponível para concluir.';
  end if;
  if exists (
    select 1 from public.etapa_checklist ec
    where ec.etapa = p_etapa and ec.obrigatorio
      and coalesce((v_checklist ->> ec.item_id) = 'true', false) = false
  ) then
    raise exception 'Conclua todos os itens do checklist antes de finalizar a etapa.';
  end if;
  update public.progresso_etapas
    set status = 'concluida', concluida_em = now()
    where usuario_id = v_uid and etapa = p_etapa;
  perform public._recomputar_atual(v_uid);
  select * into v_prox from public.progresso_etapas
    where usuario_id = v_uid and status = 'atual' limit 1;
  return v_prox;   -- a nova etapa atual (ou nulo se a trilha acabou)
end;
$$;

-- Define o caminho (paraguai/brasil) e reaplica as regras das etapas 5 e 6.
create or replace function public.definir_caminho(p_caminho text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if p_caminho not in ('paraguai','brasil') then raise exception 'Caminho inválido.'; end if;
  update public.perfis set caminho = p_caminho where id = v_uid;
  perform public.inicializar_meu_progresso();
end;
$$;

-- Escolhe o nicho principal (precisa estar liberado para o aluno).
create or replace function public.escolher_nicho_principal(p_nicho text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if not exists (select 1 from public.acessos where usuario_id = v_uid and nicho = p_nicho) then
    raise exception 'Este nicho não está liberado para você.';
  end if;
  update public.perfis set nicho_principal = p_nicho where id = v_uid;
end;
$$;

-- Atualiza dados simples do próprio perfil.
create or replace function public.atualizar_meu_perfil(p_nome text, p_whatsapp text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  update public.perfis set nome = coalesce(p_nome, nome), whatsapp = coalesce(p_whatsapp, whatsapp)
    where id = v_uid;
end;
$$;

-- Marca que a troca de senha obrigatória foi feita (chamar após auth.updateUser).
create or replace function public.concluir_troca_senha()
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  update public.perfis set deve_trocar_senha = false where id = v_uid;
end;
$$;

grant execute on function public.inicializar_meu_progresso() to authenticated;
grant execute on function public.marcar_checklist(int, text, boolean) to authenticated;
grant execute on function public.concluir_etapa(int) to authenticated;
grant execute on function public.definir_caminho(text) to authenticated;
grant execute on function public.escolher_nicho_principal(text) to authenticated;
grant execute on function public.atualizar_meu_perfil(text, text) to authenticated;
grant execute on function public.concluir_troca_senha() to authenticated;

-- ---------- Marca o item automático da etapa 3 ao salvar simulação ----------

create or replace function public._marca_simulacao_etapa3()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.progresso_etapas
    set checklist = jsonb_set(checklist, '{salvou_simulacao}', 'true', true)
    where usuario_id = new.usuario_id and etapa = 3;
  return new;
end;
$$;

drop trigger if exists simulacao_marca_etapa3 on public.simulacoes;
create trigger simulacao_marca_etapa3
  after insert on public.simulacoes
  for each row execute function public._marca_simulacao_etapa3();

-- ---------- Mantém atualizado_em / atualizada_em ----------

create or replace function public._touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  if to_jsonb(new) ? 'atualizado_em' then new.atualizado_em := now(); end if;
  if to_jsonb(new) ? 'atualizada_em' then new.atualizada_em := now(); end if;
  return new;
end;
$$;

drop trigger if exists touch_fornecedores on public.fornecedores;
create trigger touch_fornecedores before update on public.fornecedores
  for each row execute function public._touch_atualizado_em();
drop trigger if exists touch_produtos on public.produtos;
create trigger touch_produtos before update on public.produtos
  for each row execute function public._touch_atualizado_em();
drop trigger if exists touch_simulacoes on public.simulacoes;
create trigger touch_simulacoes before update on public.simulacoes
  for each row execute function public._touch_atualizado_em();


-- #####################################################################
-- ARQUIVO: 0003_rls.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — Fase 2 (banco)  |  0003_rls.sql
-- Row Level Security: o aluno só lê os nichos liberados e só mexe no
-- próprio progresso e nas próprias simulações. O admin vê e edita tudo.
-- =====================================================================

-- ---------- Permissões de tabela (RLS filtra por cima) ----------
grant select on
  public.nichos, public.etapa_checklist, public.videos,
  public.configuracoes, public.cotacoes
  to anon, authenticated;

grant select on
  public.perfis, public.acessos, public.progresso_etapas,
  public.fornecedores, public.freteiros, public.regras_freteiro,
  public.regras_nota, public.lojas, public.produtos,
  public.canais_venda, public.simulacoes, public.videos_assistidos
  to authenticated;

grant insert, update, delete on
  public.simulacoes, public.videos_assistidos
  to authenticated;

-- Tabelas que o admin gerencia pela interface (a política restringe a admins).
grant insert, update, delete on
  public.nichos, public.perfis, public.acessos, public.progresso_etapas,
  public.etapa_checklist, public.videos, public.fornecedores,
  public.freteiros, public.regras_freteiro, public.regras_nota,
  public.lojas, public.produtos, public.canais_venda, public.configuracoes
  to authenticated;

-- ---------- Liga o RLS ----------
alter table public.nichos            enable row level security;
alter table public.perfis            enable row level security;
alter table public.acessos           enable row level security;
alter table public.progresso_etapas  enable row level security;
alter table public.etapa_checklist   enable row level security;
alter table public.videos            enable row level security;
alter table public.videos_assistidos enable row level security;
alter table public.fornecedores      enable row level security;
alter table public.freteiros         enable row level security;
alter table public.regras_freteiro   enable row level security;
alter table public.regras_nota       enable row level security;
alter table public.lojas             enable row level security;
alter table public.produtos          enable row level security;
alter table public.canais_venda      enable row level security;
alter table public.simulacoes        enable row level security;
alter table public.configuracoes     enable row level security;
alter table public.cotacoes          enable row level security;

-- ---------- Tabelas públicas (leitura livre, escrita só admin) ----------
do $$
declare t text;
begin
  foreach t in array array['nichos','etapa_checklist','videos','configuracoes','cotacoes'] loop
    execute format('drop policy if exists "todos leem" on public.%I', t);
    execute format('create policy "todos leem" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin gerencia" on public.%I', t);
    execute format('create policy "admin gerencia" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- Perfil ----------
drop policy if exists "dono le perfil" on public.perfis;
create policy "dono le perfil" on public.perfis
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "admin gerencia perfis" on public.perfis;
create policy "admin gerencia perfis" on public.perfis
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- (o aluno muda o próprio perfil só pelas funções RPC, nunca direto.)

-- ---------- Acessos (liberação por nicho) ----------
drop policy if exists "dono le acessos" on public.acessos;
create policy "dono le acessos" on public.acessos
  for select to authenticated using (usuario_id = auth.uid() or public.is_admin());
drop policy if exists "admin gerencia acessos" on public.acessos;
create policy "admin gerencia acessos" on public.acessos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Progresso (o aluno só lê; escrita é pelas RPCs) ----------
drop policy if exists "dono le progresso" on public.progresso_etapas;
create policy "dono le progresso" on public.progresso_etapas
  for select to authenticated using (usuario_id = auth.uid() or public.is_admin());
drop policy if exists "admin gerencia progresso" on public.progresso_etapas;
create policy "admin gerencia progresso" on public.progresso_etapas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Vídeos assistidos (do próprio aluno) ----------
drop policy if exists "dono gerencia assistidos" on public.videos_assistidos;
create policy "dono gerencia assistidos" on public.videos_assistidos
  for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "admin le assistidos" on public.videos_assistidos;
create policy "admin le assistidos" on public.videos_assistidos
  for select to authenticated using (public.is_admin());

-- ---------- Fornecedores (só nichos liberados) ----------
drop policy if exists "aluno le fornecedores" on public.fornecedores;
create policy "aluno le fornecedores" on public.fornecedores
  for select to authenticated using (ativo and nichos && public.nichos_liberados());
drop policy if exists "admin gerencia fornecedores" on public.fornecedores;
create policy "admin gerencia fornecedores" on public.fornecedores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Produtos (só nichos liberados) ----------
drop policy if exists "aluno le produtos" on public.produtos;
create policy "aluno le produtos" on public.produtos
  for select to authenticated using (nicho = any (public.nichos_liberados()));
drop policy if exists "admin gerencia produtos" on public.produtos;
create policy "admin gerencia produtos" on public.produtos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Freteiros, regras, lojas, canais (leitura para alunos logados) ----------
do $$
declare t text;
begin
  foreach t in array array['freteiros','regras_freteiro','regras_nota','lojas','canais_venda'] loop
    execute format('drop policy if exists "aluno le" on public.%I', t);
    execute format('create policy "aluno le" on public.%I for select to authenticated using (true)', t);
    execute format('drop policy if exists "admin gerencia" on public.%I', t);
    execute format('create policy "admin gerencia" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- Simulações (do próprio aluno) ----------
drop policy if exists "dono gerencia simulacoes" on public.simulacoes;
create policy "dono gerencia simulacoes" on public.simulacoes
  for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "admin le simulacoes" on public.simulacoes;
create policy "admin le simulacoes" on public.simulacoes
  for select to authenticated using (public.is_admin());


-- #####################################################################
-- ARQUIVO: 0004_seed.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — Fase 2 (banco)  |  0004_seed.sql
-- Conteúdo inicial. Idempotente: pode rodar de novo sem duplicar nem
-- apagar o que o admin já cadastrou (usa ON CONFLICT DO NOTHING).
-- =====================================================================

-- ---------- Nichos (lista fixa, sem medicamentos) ----------
insert into public.nichos (slug, nome, peso_padrao_g, ordem) values
  ('perfumes',    'Perfumes',                 500, 1),
  ('apple',       'Apple (iPhone)',           300, 2),
  ('celulares',   'Celulares (Android/Xiaomi)',300, 3),
  ('eletronicos', 'Eletrônicos',              500, 4)
on conflict (slug) do nothing;

-- ---------- Checklist obrigatório por etapa ----------
insert into public.etapa_checklist (etapa, item_id, label, obrigatorio, automatico, ordem) values
  (1,'assisti_aulas','Assisti às aulas desta etapa',true,false,1),
  (1,'escolhi_nicho','Escolhi meu nicho',true,false,2),
  (1,'sinais_golpe','Sei reconhecer os 5 sinais de golpe',true,false,3),
  (2,'assisti_aulas','Assisti às aulas',true,false,1),
  (2,'escolhi_caminho','Escolhi meu caminho (Paraguai ou Brasil)',true,false,2),
  (2,'escolhi_fornecedor','Escolhi pelo menos um fornecedor para chamar',true,false,3),
  (3,'assisti_aulas','Assisti às aulas',true,false,1),
  (3,'salvou_simulacao','Fiz e salvei pelo menos uma simulação',true,true,2),
  (4,'assisti_aulas','Assisti às aulas',true,false,1),
  (4,'leu_checklist_pagar','Li o checklist "Antes de pagar"',true,false,2),
  (5,'assisti_aulas','Assisti às aulas',true,false,1),
  (5,'escolhi_freteiro','Escolhi meu freteiro',true,false,2),
  (5,'sei_enviar_freteiro','Sei o que enviar ao freteiro',true,false,3),
  (6,'assisti_aulas','Assisti à aula',true,false,1),
  (6,'sei_custo_nota','Sei quanto custa e como pedir a nota',true,false,2),
  (7,'assisti_aulas','Assisti às aulas',true,false,1),
  (7,'sei_preencher_etiqueta','Sei preencher a etiqueta',true,false,2),
  (7,'sei_conferir','Sei conferir a mercadoria ao receber',true,false,3),
  (8,'assisti_aulas','Assisti às aulas',true,false,1),
  (8,'defini_preco','Defini o preço de venda do meu primeiro lote',true,false,2)
on conflict (etapa, item_id) do nothing;

-- ---------- Vídeos (todos sem URL; roteiro serve de guia na gravação) ----------
insert into public.videos (id, etapa, ordem, titulo, duracao, roteiro) values
  ('V0',   0, 0, 'Vídeo de vendas', null,
    '["Vídeo de vendas da página pública (/aula-gratis)"]'::jsonb),
  ('V0.1', 0, 1, 'Boas-vindas', null,
    '["Vídeo de boas-vindas no Início, exibido até concluir a etapa 1"]'::jsonb),
  ('V1.1', 1, 1, 'Como funciona a Paraguai Academy', '2 min',
    '["Quem é o Mauro","Caminho completo: escolher fornecedor, fazer as contas, pedir e pagar, travessia, nota, envio, vender","Como usar a plataforma: etapas liberam em ordem; ferramentas no menu"]'::jsonb),
  ('V1.2', 1, 2, 'Golpes mais comuns', '2 min 30 s',
    '["Loja falsa de atacado em Ciudad del Este","Site de rastreio falso cobrando taxa de liberação","Preço bom demais","Pagamento para conta de pessoa diferente da loja","Pressão para pagar rápido","Regra: só comprar de quem está na lista ou validar com o suporte"]'::jsonb),
  ('V1.3', 1, 3, 'Cota de compras x revenda', '2 min',
    '["Diferença entre comprar para uso próprio e para revender","Por que formalizar ajuda (CNPJ, nota)","O que a plataforma ensina e o que não ensina"]'::jsonb),
  ('V2.1', 2, 1, 'Paraguai ou Brasil: qual escolher', '2 min',
    '["Paraguai: preço menor, pedido mínimo, travessia, prazo maior","Brasil: chega mais rápido, sem travessia, mínimo em reais, custo um pouco maior","Quando vale cada um"]'::jsonb),
  ('V2.2', 2, 2, 'Como abordar um fornecedor', '2 min',
    '["Primeira mensagem","O que perguntar: lista de preços, mínimo, formas de pagamento, prazo","Como identificar fornecedor sério"]'::jsonb),
  ('V3.1', 3, 1, 'O que entra no custo de importar', '2 min',
    '["Produto em dólar x cotação","Freteiro: percentual no perfume, valor fixo por aparelho no celular","Transporte até a transportadora","Nota fiscal","Frete até sua casa","Embalagem","Taxa do canal de venda"]'::jsonb),
  ('V3.2', 3, 2, 'Como usar a calculadora', '2 min',
    '["Buscar produto","Ajustar quantidade","Conferir os custos já preenchidos","Escolher a margem","Salvar e compartilhar"]'::jsonb),
  ('V4.1', 4, 1, 'Como fazer o pedido', '2 min',
    '["Pedir a lista e a cotação do dólar do dia","Pedido mínimo (por volta de US$ 200 no Paraguai)","Enviar seus dados para cadastro na loja","Pedir o envio para a transportadora"]'::jsonb),
  ('V4.2', 4, 2, 'Como pagar com segurança', '2 min',
    '["Formas de pagamento aceitas","Conferir se a conta é da loja","Guardar comprovante e recibo","Nunca pagar taxa de liberação"]'::jsonb),
  ('V5.1', 5, 1, 'Como funciona a travessia', '2 min 30 s',
    '["Loja envia para a transportadora (Paraná Express, Pedro Juan Caballero)","Você recebe o recibo e repassa ao freteiro","O freteiro atravessa e prepara o envio","Prazos médios"]'::jsonb),
  ('V5.2', 5, 2, 'Como combinar com o freteiro', '1 min 30 s',
    '["O que informar: produtos, quantidade, valor, recibo","Como é cobrado","O que confirmar antes"]'::jsonb),
  ('V6.1', 6, 1, 'Como pedir a nota fiscal', '2 min',
    '["Por que pedir antes da etiqueta","Como é cobrada","Documentos necessários","Como solicitar"]'::jsonb),
  ('V7.1', 7, 1, 'Como gerar a etiqueta na SuperFrete', '2 min 30 s',
    '["Criar conta","Preencher remetente e destinatário","Medidas e peso","Comparar modalidades","Pagar e baixar a etiqueta"]'::jsonb),
  ('V7.2', 7, 2, 'Conferência ao receber', '1 min 30 s',
    '["Filmar a abertura da caixa","Conferir quantidade e lacres","O que fazer se faltar algo"]'::jsonb),
  ('V8.1', 8, 1, 'Como definir o preço de venda', '2 min',
    '["Custo por unidade","Margem","Taxa de marketplace","Preço mínimo","Usar a calculadora no modo preço de venda"]'::jsonb),
  ('V8.2', 8, 2, 'Catálogo e atendimento', '2 min 30 s',
    '["Montar catálogo no WhatsApp","Fotos","Respostas rápidas","Pós-venda","Pedir avaliação"]'::jsonb)
on conflict (id) do nothing;

-- ---------- Regra da nota fiscal ----------
insert into public.regras_nota (id, ate_valor, valor_fixo, percentual_acima)
  values (1, 1650, 100, 7)
on conflict (id) do nothing;

-- ---------- Freteira Evelin + regras (sem medicamentos) ----------
insert into public.freteiros (nome, cidade, prazo, observacoes)
  select 'Evelin', 'Pedro Juan Caballero, Paraguai', 'Combinar no contato',
         'Consulte a tabela diretamente com a freteira antes de comprar.'
  where not exists (select 1 from public.freteiros where nome = 'Evelin');

insert into public.regras_freteiro (freteiro_id, nicho, faixa, tipo, valor, base, compra_minima_brl, ordem)
  select f.id, v.nicho, v.faixa, v.tipo, v.valor, v.base, v.compra_minima_brl, v.ordem
  from public.freteiros f
  join (values
    ('perfumes',   'Perfumes e cosméticos',   'percentual',   18,   'nota', 1500, 1),
    ('celulares',  'Xiaomi até R$ 3.000,00',  'fixo_unidade', 150,  null,   null, 1),
    ('apple',      'iPhone até o modelo 16',  'fixo_unidade', 180,  null,   null, 1),
    ('apple',      'iPhone 17 ou mais novo',  'fixo_unidade', 230,  null,   null, 2),
    ('eletronicos','Outros eletrônicos',      'consulta',     null, null,   null, 1)
  ) as v(nicho, faixa, tipo, valor, base, compra_minima_brl, ordem) on true
  where f.nome = 'Evelin'
    and not exists (
      select 1 from public.regras_freteiro r
      where r.freteiro_id = f.id and r.nicho = v.nicho and coalesce(r.faixa,'') = coalesce(v.faixa,'')
    );

-- ---------- Canais de venda (taxas são placeholder, edite no admin) ----------
insert into public.canais_venda (nome, taxa_percentual)
  select v.nome, v.taxa from (values
    ('Venda direta (WhatsApp/Instagram)', 0),
    ('Mercado Livre', 12),
    ('Shopee', 14)
  ) as v(nome, taxa)
  where not exists (select 1 from public.canais_venda c where c.nome = v.nome);

-- ---------- Loja parceira e fornecedores ----------
-- Rota Árabe: loja dos sócios (transparência obrigatória com o aluno).
insert into public.fornecedores (nome, pais, cidade, nichos, descricao, verificado, destaque, loja_dos_socios, ativo)
  select 'Rota Árabe', 'BR', 'Brasil', '{perfumes}',
         'Perfumaria árabe original, com atacado para alunos.', true, true, true, true
  where not exists (select 1 from public.fornecedores where nome = 'Rota Árabe');

-- Exemplos para testar as telas (marcados como [EXEMPLO]).
insert into public.fornecedores (nome, pais, cidade, nichos, descricao, minimo_valor, minimo_moeda, verificado, ativo)
  select 'Fornecedor Exemplo Paraguai [EXEMPLO]', 'PY', 'Ciudad del Este', '{perfumes}',
         'Cadastro de exemplo para testar a lista.', 200, 'USD', true, true
  where not exists (select 1 from public.fornecedores where nome = 'Fornecedor Exemplo Paraguai [EXEMPLO]');
insert into public.fornecedores (nome, pais, cidade, nichos, descricao, minimo_valor, minimo_moeda, verificado, ativo)
  select 'Fornecedor Exemplo Brasil [EXEMPLO]', 'BR', 'São Paulo', '{eletronicos}',
         'Cadastro de exemplo para testar a lista.', 500, 'BRL', false, true
  where not exists (select 1 from public.fornecedores where nome = 'Fornecedor Exemplo Brasil [EXEMPLO]');

-- Loja + produtos de exemplo para a calculadora.
insert into public.lojas (nome, cidade, minimo_usd)
  select 'Loja Exemplo Perfumes [EXEMPLO]', 'Ciudad del Este', 200
  where not exists (select 1 from public.lojas where nome = 'Loja Exemplo Perfumes [EXEMPLO]');

insert into public.produtos (loja_id, nome, marca, sku, nicho, preco_usd, em_estoque, fonte)
  select l.id, v.nome, v.marca, v.sku, v.nicho, v.preco, true, 'seed'
  from public.lojas l
  join (values
    ('Perfume Exemplo 100ml [EXEMPLO]', 'Exemplo', 'EXP-001', 'perfumes', 25),
    ('Perfume Exemplo 50ml [EXEMPLO]',  'Exemplo', 'EXP-002', 'perfumes', 18),
    ('Celular Exemplo [EXEMPLO]',       'Exemplo', 'EXP-010', 'celulares', 180)
  ) as v(nome, marca, sku, nicho, preco) on true
  where l.nome = 'Loja Exemplo Perfumes [EXEMPLO]'
    and not exists (select 1 from public.produtos p where p.sku = v.sku);

-- ---------- Configurações globais (links e textos) ----------
insert into public.configuracoes (chave, valor, descricao) values
  ('whatsapp_suporte',   '',  'WhatsApp do suporte, só números com país e DDD (ex.: 5599999999999)'),
  ('url_superfrete',     'https://www.superfrete.com', 'Link da SuperFrete (pode ser link de indicação)'),
  ('url_rota_arabe',     'https://www.rotaarabe.com.br/', 'Link da loja parceira Rota Árabe'),
  ('rota_arabe_cupom',   'ACADEMY', 'Cupom de atacado na Rota Árabe'),
  ('mentoria_titulo',    'Mentoria individual com o Mauro', 'Título do card de mentoria'),
  ('mentoria_valor',     '300', 'Valor da mentoria em reais'),
  ('mentoria_whatsapp',  '', 'WhatsApp para contratar a mentoria'),
  ('modelo_catalogo_url','', 'Link para baixar o modelo de catálogo'),
  ('preco_curso',        '49.90', 'Preço do curso por nicho, em reais')
on conflict (chave) do nothing;

-- =====================================================================
-- DEPOIS DE CRIAR O USUÁRIO ADMIN, promova-o (troque o e-mail se preciso):
--   update public.perfis set papel = 'admin'
--   where id = (select id from auth.users
--               where lower(email) = 'assessoriacedroo@gmail.com');
-- =====================================================================


-- #####################################################################
-- ARQUIVO: 0005_sync.sql
-- #####################################################################

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


-- #####################################################################
-- ARQUIVO: 0006_abrir.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — 0006_abrir.sql
-- Tira os bloqueios: nada é obrigatório. O aluno marca livremente o que já
-- fez, abre qualquer etapa e usa todas as ferramentas. Mantém só o progresso.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- Concluir uma etapa: apenas marca como concluída (sem exigir checklist nem
-- ordem). Não mexe em etapas "não se aplica". Recalcula a etapa sugerida.
create or replace function public.concluir_etapa(p_etapa int)
returns public.progresso_etapas language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_prox public.progresso_etapas;
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  update public.progresso_etapas
    set status = 'concluida', concluida_em = now()
    where usuario_id = v_uid and etapa = p_etapa and status <> 'nao_se_aplica';
  perform public._recomputar_atual(v_uid);
  select * into v_prox from public.progresso_etapas
    where usuario_id = v_uid and status = 'atual' limit 1;
  return v_prox;
end;
$$;

-- Reabrir (desmarcar) uma etapa concluída.
create or replace function public.reabrir_etapa(p_etapa int)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  update public.progresso_etapas
    set status = 'bloqueada', concluida_em = null
    where usuario_id = v_uid and etapa = p_etapa and status = 'concluida';
  perform public._recomputar_atual(v_uid);
end;
$$;

-- Checklist: pode marcar em qualquer etapa (não só na atual).
create or replace function public.marcar_checklist(p_etapa int, p_item text, p_valor boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sessão inválida.'; end if;
  if not exists (select 1 from public.etapa_checklist where etapa = p_etapa and item_id = p_item) then
    raise exception 'Item de checklist inválido.';
  end if;
  update public.progresso_etapas
    set checklist = jsonb_set(checklist, array[p_item], to_jsonb(p_valor), true)
    where usuario_id = v_uid and etapa = p_etapa;
  if not found then raise exception 'Etapa não encontrada.'; end if;
end;
$$;

grant execute on function public.reabrir_etapa(int) to authenticated;

-- Sem simulação automática: remove o gatilho que marcava o item sozinho.
drop trigger if exists simulacao_marca_etapa3 on public.simulacoes;
drop function if exists public._marca_simulacao_etapa3();

-- Nenhum item do checklist é obrigatório nem automático (é só autoavaliação).
update public.etapa_checklist set obrigatorio = false, automatico = false;
update public.etapa_checklist set label = 'Fiz uma simulação (opcional)'
  where item_id = 'salvou_simulacao';


-- #####################################################################
-- ARQUIVO: 0007_produtos_abertos.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — 0007_produtos_abertos.sql
-- A calculadora mostra TODOS os produtos (sem filtrar pelo nicho do aluno).
-- Libera a leitura de produtos para qualquer aluno logado.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

drop policy if exists "aluno le produtos" on public.produtos;
create policy "aluno le produtos" on public.produtos
  for select to authenticated using (true);


-- #####################################################################
-- ARQUIVO: 0008_planos.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — 0008_planos.sql
-- Duas mudanças grandes:
--  1) Nicho único "Geral" (sem filtro de nicho em nenhuma tela).
--  2) Dois níveis de aluno: Standard e Pro.
--     Standard: trilha, ferramentas e os fornecedores abertos.
--     Pro: todos os fornecedores + compras coletivas + mentoria exclusiva.
-- O cadeado da tela é só o aviso; quem protege de verdade é a RLS daqui.
-- Rode no SQL Editor do Supabase.
--
-- ATENÇÃO: este arquivo refaz a política de leitura de `configuracoes` e de
-- `fornecedores`. Se algum dia você rodar 0003_rls.sql de novo, rode 0008
-- depois dele.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Nicho único "Geral"
-- ---------------------------------------------------------------------
insert into public.nichos (slug, nome, peso_padrao_g, ordem)
  values ('geral', 'Geral', 500, 0)
on conflict (slug) do update set nome = 'Geral', ativo = true, ordem = 0;

-- Os nichos antigos saem das listas (ficam na tabela por causa das chaves
-- estrangeiras já gravadas em produtos, acessos e regras de freteiro).
update public.nichos set ativo = false where slug <> 'geral';

-- Todo aluno que já tinha algum nicho passa a ter o "geral".
insert into public.acessos (usuario_id, nicho)
  select distinct usuario_id, 'geral' from public.acessos
on conflict (usuario_id, nicho) do nothing;

update public.perfis set nicho_principal = 'geral'
  where id in (select usuario_id from public.acessos where nicho = 'geral');

-- Fornecedor sem "geral" na lista continuaria invisível em qualquer filtro
-- antigo; acrescenta o slug em todos.
update public.fornecedores
  set nichos = array_append(coalesce(nichos, '{}'), 'geral')
  where not ('geral' = any (coalesce(nichos, '{}')));

-- O checklist da etapa 1 não pede mais para escolher nicho.
update public.etapa_checklist
  set label = 'Escolhi o primeiro produto que vou trazer'
  where etapa = 1 and item_id = 'escolhi_nicho';

-- ---------------------------------------------------------------------
-- 2) Plano do aluno
-- ---------------------------------------------------------------------
alter table public.perfis add column if not exists plano text not null default 'standard';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'perfis_plano_check') then
    alter table public.perfis add constraint perfis_plano_check
      check (plano in ('standard', 'pro'));
  end if;
end $$;

-- Fornecedor premium: só o Pro vê o contato.
alter table public.fornecedores add column if not exists premium boolean not null default false;

-- É Pro? (o admin conta como Pro para conseguir conferir as telas.)
create or replace function public.sou_pro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and (plano = 'pro' or papel = 'admin')
  );
$$;
grant execute on function public.sou_pro() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) Fornecedores: lista aberta, contato só para quem pode
-- ---------------------------------------------------------------------
-- A tabela base passa a esconder as linhas premium do aluno Standard. Sem o
-- nicho no meio: a lista é a mesma para todos.
drop policy if exists "aluno le fornecedores" on public.fornecedores;
create policy "aluno le fornecedores" on public.fornecedores
  for select to authenticated using (ativo and (not premium or public.sou_pro()));

-- A vitrine mostra TODOS os fornecedores ativos, mas com o contato apagado
-- quando a linha é premium e o aluno não é Pro. A view roda com os direitos
-- do dono (sem security_invoker), então ela não cai na política acima — é
-- justamente aqui que a máscara é aplicada.
--
-- NOTA: o 0009 refaz esta view fechando o acesso de quem não tem login.
-- Se você está rodando os arquivos em ordem, rode o 0009 logo depois.
drop view if exists public.fornecedores_lista;
create view public.fornecedores_lista as
  select
    f.id, f.nome, f.pais, f.cidade, f.nichos, f.descricao,
    f.minimo_valor, f.minimo_moeda, f.verificado, f.destaque,
    f.loja_dos_socios, f.premium, f.atualizado_em,
    (f.premium and not public.sou_pro())             as bloqueado,
    case when f.premium and not public.sou_pro() then null else f.contato_nome end as contato_nome,
    case when f.premium and not public.sou_pro() then null else f.whatsapp     end as whatsapp,
    case when f.premium and not public.sou_pro() then null else f.pagamento    end as pagamento,
    case when f.premium and not public.sou_pro() then null else f.prazo        end as prazo
  from public.fornecedores f
  where f.ativo;

alter view public.fornecedores_lista set (security_invoker = false);
grant select on public.fornecedores_lista to authenticated;

-- ---------------------------------------------------------------------
-- 4) Configurações só do Pro (link do grupo, contato da mentoria...)
-- ---------------------------------------------------------------------
alter table public.configuracoes add column if not exists so_pro boolean not null default false;

-- Quem não é Pro não recebe nem o valor dessas chaves.
drop policy if exists "todos leem" on public.configuracoes;
create policy "todos leem" on public.configuracoes
  for select to anon, authenticated using (not so_pro or public.sou_pro());

insert into public.configuracoes (chave, valor, descricao) values
  ('plano_standard_valor', '49.90', 'Plano Standard: pagamento único, em reais'),
  ('plano_pro_valor',      '500',   'Plano Pro: valor de entrada, em reais'),
  ('plano_pro_recorrencia','49',    'Plano Pro: mensalidade trimestral, em reais'),
  ('url_checkout',         '',      'Link de pagamento do plano Standard'),
  ('url_checkout_pro',     '',      'Link de pagamento do plano Pro'),
  ('whatsapp_upgrade',     '',      'WhatsApp para tirar dúvidas e migrar de plano')
on conflict (chave) do nothing;

insert into public.configuracoes (chave, valor, descricao, so_pro) values
  ('grupo_compras_coletivas', '', 'PRO: link do grupo de compras coletivas', true),
  ('mentoria_pro_whatsapp',   '', 'PRO: WhatsApp da mentoria exclusiva', true),
  ('mentoria_pro_agenda',     '', 'PRO: link da agenda das chamadas de mentoria', true)
on conflict (chave) do update set so_pro = true;

-- =====================================================================
-- Para colocar um aluno no Pro (ou tirar), use o painel do admin em
-- Alunos → Plano. No SQL seria:
--   update public.perfis set plano = 'pro' where id = 'UUID-DO-ALUNO';
-- Para marcar um fornecedor como premium: Admin → Fornecedores → Premium.
-- =====================================================================


-- #####################################################################
-- ARQUIVO: 0009_fecha_vitrine.sql
-- #####################################################################

-- =====================================================================
-- Paraguai Academy — 0009_fecha_vitrine.sql
-- Correção de segurança da view criada em 0008.
--
-- O problema: o Supabase concede privilégio por padrão (ALTER DEFAULT
-- PRIVILEGES) a toda tabela/view nova no schema `public`, inclusive para o
-- papel `anon`. Como view não tem RLS própria — e esta roda com os direitos
-- do dono, de propósito, para poder mascarar o contato — o grant era a única
-- tranca, e ela estava aberta: qualquer pessoa sem login conseguia listar os
-- fornecedores pela API.
--
-- A correção tem duas camadas:
--   1) tira o privilégio de `anon` e de `public`;
--   2) a própria view só devolve linha se quem pergunta for aluno com acesso
--      liberado (ou admin) — então nem um grant acidental no futuro vaza.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- Quem pergunta é aluno pagante (tem acesso liberado) ou admin?
create or replace function public.tem_acesso_aluno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos where usuario_id = auth.uid())
      or exists (select 1 from public.perfis where id = auth.uid() and papel = 'admin');
$$;
grant execute on function public.tem_acesso_aluno() to anon, authenticated;

drop view if exists public.fornecedores_lista;
create view public.fornecedores_lista as
  select
    f.id, f.nome, f.pais, f.cidade, f.nichos, f.descricao,
    f.minimo_valor, f.minimo_moeda, f.verificado, f.destaque,
    f.loja_dos_socios, f.premium, f.atualizado_em,
    (f.premium and not public.sou_pro())             as bloqueado,
    case when f.premium and not public.sou_pro() then null else f.contato_nome end as contato_nome,
    case when f.premium and not public.sou_pro() then null else f.whatsapp     end as whatsapp,
    case when f.premium and not public.sou_pro() then null else f.pagamento    end as pagamento,
    case when f.premium and not public.sou_pro() then null else f.prazo        end as prazo
  from public.fornecedores f
  where f.ativo
    and public.tem_acesso_aluno();   -- sem login/sem acesso, a lista vem vazia

-- A máscara do contato só funciona se a view ignorar a RLS da tabela base.
alter view public.fornecedores_lista set (security_invoker = false);

-- Só aluno logado. O `public` entra aqui porque é dele que `anon` herda.
revoke all on public.fornecedores_lista from anon;
revoke all on public.fornecedores_lista from public;
grant select on public.fornecedores_lista to authenticated;

-- =====================================================================
-- Toda view nova no schema public nasce com privilégio para `anon`. Se você
-- criar outra, repita o par:
--   revoke all on public.<view> from anon, public;
--   grant select on public.<view> to authenticated;
-- =====================================================================

-- #####################################################################
-- ARQUIVO: 0010_contatos_e_promo.sql
-- #####################################################################
-- =====================================================================
-- Paraguai Academy — 0010_contatos_e_promo.sql
-- Contatos reais (suporte e mentoria) e o preço "de / por" da promoção.
-- Diferente das outras migrações, esta SOBRESCREVE valores: é configuração,
-- não estrutura. Se você já editou alguma chave no painel, confira depois.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- Formato das chaves de WhatsApp: só números, com país e DDD.
update public.configuracoes set valor = '5515992451745'
  where chave in ('whatsapp_suporte', 'whatsapp_upgrade');

update public.configuracoes set valor = '5515992715185'
  where chave in ('mentoria_pro_whatsapp', 'mentoria_whatsapp');

-- Preço cheio, para ancorar a promoção (riscado na página de vendas).
insert into public.configuracoes (chave, valor, descricao) values
  ('plano_standard_de', '140', 'Plano Standard: preço cheio riscado na página de vendas'),
  ('promo_ativa',       '1',   'Promoção ligada na página de vendas (1 = sim, 0 = não)'),
  ('promo_chamada',     'Turma de lançamento', 'Texto do selo da promoção')
on conflict (chave) do nothing;

-- O preço do Standard continua 49,90 (plano_standard_valor). O checkout
-- entra depois, em url_checkout / url_checkout_pro.

-- Confirme como ficou:
--   select chave, valor from public.configuracoes order by chave;

-- #####################################################################
-- ARQUIVO: 0011_fornecedores_reais.sql
-- #####################################################################
-- =====================================================================
-- Paraguai Academy — 0011_fornecedores_reais.sql
-- A lista real de fornecedores (Ciudad del Este, Salto del Guairá e um no
-- Brasil). Entram todos ABERTOS (premium = false): o Standard também vê o
-- contato. O que separa o Pro continua sendo compras coletivas, mentoria e
-- acompanhamento. Para trancar uma loja depois: Admin → Fornecedores → Premium.
--
-- Idempotente: a chave é o `nome`. Rodar de novo não duplica e não sobrescreve
-- o que você já editou no painel.
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Os fornecedores
-- ---------------------------------------------------------------------
-- `descricao` guarda a categoria porque a busca da tela varre nome, descrição
-- e cidade — assim o aluno acha digitando "óculos" ou "eletrônicos".
-- `verificado` entra como false de propósito: o selo "Verificado" é uma
-- afirmação sua para o aluno, não nossa. Veja o passo 3 para ligar o selo.
-- Pedido mínimo, pagamento e prazo ficam nulos (não temos o dado); a tela
-- simplesmente não desenha a linha vazia.
insert into public.fornecedores
  (nome, pais, cidade, nichos, descricao, contato_nome, whatsapp,
   verificado, premium, ativo)
select v.nome, v.pais, v.cidade, '{geral}', v.descricao,
       nullif(v.contato, ''), v.zap, true, false, true
from (values
  -- ---------- Perfumes e cosméticos (Ciudad del Este) ----------
  ('H3 (Agatres)',                  'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Aya',              '595993513100'),
  ('Amadeus',                       'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Micaela Lunkes',   '595993514627'),
  ('Macedônia',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Camila',           '595976909999'),
  ('Serena Group',                  'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Beatriz',          '595993014879'),
  ('Atacado Connect',               'PY', 'Ciudad del Este', 'Perfumes, cosméticos e eletrônicos.',           'Julia',            '595983610887'),
  ('Zomo Store',                    'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Letícia',          '595973548115'),
  ('Francia S.A',                   'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Magali',           '595983102128'),
  ('Charme Perfumaria',             'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Carmen Maria',     '595985335487'),
  ('Grupo ATN',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Christian',        '595973108090'),
  ('ASM',                           'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Richard',          '595985236700'),
  ('Multipass',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Maria',            '595994999008'),
  ('Elegância Company',             'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'William',          '595976530629'),
  ('Loja Roma',                     'PY', 'Ciudad del Este', 'Perfumes, cosméticos, eletrônicos e celulares.','Brahiam',          '595986799380'),
  ('Ponto.Com',                     'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Magali',           '595986885554'),
  ('Toku Importados',               'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Lucas',            '595994367305'),
  ('Madrid Center',                 'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Stella',           '595974906309'),
  ('Behuel Behuel By La Bendecida', 'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Lourdes',          '595986117526'),
  ('Epic Importados',               'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Jhoana',           '595985899969'),
  ('Alborada',                      'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Jonathan Carvalho','595981433888'),
  ('New Zone',                      'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        '',                 '595994376439'),
  ('Brands',                        'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        '',                 '595992979800'),
  ('Casa Nippon',                   'PY', 'Ciudad del Este', 'Perfumes e cosméticos.',                        'Kawana',           '595983776789'),

  -- ---------- Eletrônicos e celulares ----------
  -- Atacado Connect e Loja Roma também vendem eletrônicos: não viram cadastro
  -- novo, a categoria entrou na descrição deles lá em cima.
  ('Alex Iphone Swap',              'BR', null,              'Eletrônicos e celulares — iPhone.',             'Alex',             '5545998619254'),

  -- ---------- Acessórios e outros (Ciudad del Este) ----------
  ('Fátima (Óculos)',               'PY', 'Ciudad del Este', 'Óculos.',                                       'Fátima',           '595991787777'),
  ('Carol Shop',                    'PY', 'Ciudad del Este', 'Relógios.',                                     'Andréa',           '595983288287'),
  ('New Hengda',                    'PY', 'Ciudad del Este', 'Bolsas, copos, óculos e acessórios.',           '',                 '595995677778'),
  ('Mix Importados',                'PY', 'Ciudad del Este', 'Brinquedos.',                                   'Mirella',          '595976617802'),
  ('Prime Barber Supply',           'PY', 'Ciudad del Este', 'Material para barbearia.',                      '',                 '595984425370'),

  -- ---------- Salto del Guairá ----------
  ('Dalet Importados',              'PY', 'Salto del Guairá', null,                                           'Lety',             '595987406151')
) as v(nome, pais, cidade, descricao, contato, zap)
where not exists (select 1 from public.fornecedores f where f.nome = v.nome);

-- ---------------------------------------------------------------------
-- 2) Os cadastros de teste saem da lista
-- ---------------------------------------------------------------------
-- Ficam no banco (dá para reativar no painel), só param de aparecer para o
-- aluno agora que existem fornecedores de verdade.
update public.fornecedores set ativo = false
  where nome like '%[EXEMPLO]%';

-- ---------------------------------------------------------------------
-- 3) Dois pontos para você conferir depois
-- ---------------------------------------------------------------------
-- a) ALEX IPHONE SWAP — o número veio como +55 45 9861-9254, que tem 8 dígitos
--    depois do DDD. Celular no Brasil tem 9 (começa com 9), então salvamos
--    exatamente o que você mandou, sem inventar dígito. Se o número certo for
--    (45) 99861-9254, rode:
--
--      update public.fornecedores set whatsapp = '5545998619254'
--        where nome = 'Alex Iphone Swap';
--
--    A cidade dele ficou vazia por isso mesmo: DDD 45 cobre o oeste do Paraná
--    inteiro, não dá para afirmar Foz do Iguaçu. Preencha no painel.
--
-- b) SELO "VERIFICADO" — todos entraram sem o selo. Para ligar em todos os que
--    você já conferiu pessoalmente:
--
--      update public.fornecedores set verificado = true
--        where pais = 'PY' and ativo and nome <> 'Rota Árabe';
--
--    Ou marque loja por loja em Admin → Fornecedores.

-- Confira como ficou:
--   select nome, cidade, contato_nome, whatsapp, descricao
--     from public.fornecedores where ativo order by cidade, nome;

-- #####################################################################
-- ARQUIVO: 0012_verificado_e_zap_alex.sql
-- #####################################################################
-- =====================================================================
-- Paraguai Academy — 0012_verificado_e_zap_alex.sql
-- Dois ajustes nos fornecedores, decididos depois do 0011:
--   1) O nono dígito no WhatsApp do Alex Iphone Swap.
--   2) O selo "Verificado" ligado em todas as lojas ativas.
--
-- Por que um arquivo novo em vez de editar o 0011: o insert de lá tem guarda
-- `where not exists`, então rodar o 0011 de novo NÃO corrige linha que já
-- existe. Este arquivo usa `update` e funciona nos dois casos — banco que já
-- rodou o 0011 e banco novo (onde ele só confirma o que o 0011 já gravou).
-- Rode no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) WhatsApp do Alex Iphone Swap
-- ---------------------------------------------------------------------
-- Veio como +55 45 9861-9254 (8 dígitos depois do DDD); celular no Brasil tem
-- 9 e começa com 9. Fica (45) 99861-9254 → 5545998619254.
-- Ainda vale mandar uma mensagem para confirmar que é o número certo antes de
-- o primeiro aluno mandar.
update public.fornecedores
   set whatsapp = '5545998619254'
 where nome = 'Alex Iphone Swap'
   and whatsapp <> '5545998619254';

-- ---------------------------------------------------------------------
-- 2) Selo "Verificado" em todas as lojas ativas
-- ---------------------------------------------------------------------
-- Alinha o que o aluno vê com o que a página de vendas promete ("as lojas já
-- verificadas"). Só as ativas: os cadastros [EXEMPLO] que o 0011 desativou não
-- levam selo, senão voltariam com ele se alguém os reativasse.
update public.fornecedores
   set verificado = true
 where ativo
   and not verificado;

-- Confira como ficou (espera-se 0 linhas sem selo):
--   select nome, verificado, whatsapp from public.fornecedores
--    where ativo and not verificado;
--
--   select nome, whatsapp from public.fornecedores
--    where nome = 'Alex Iphone Swap';
