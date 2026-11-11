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
