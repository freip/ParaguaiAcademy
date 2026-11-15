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
