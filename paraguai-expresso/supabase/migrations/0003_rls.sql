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
