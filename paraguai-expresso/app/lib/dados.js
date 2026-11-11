// Acesso aos dados do banco usados pela trilha e etapas.
import { rest, rpc } from "./supabase.js";

export const videosDaEtapa = (n) =>
  rest(`videos?select=*&etapa=eq.${n}&ativo=is.true&order=ordem.asc`);

export const checklistDaEtapa = (n) =>
  rest(`etapa_checklist?select=*&etapa=eq.${n}&order=ordem.asc`);

export const assistidosDoUsuario = (uid) =>
  rest(`videos_assistidos?select=video_id&usuario_id=eq.${uid}`);

export const marcarAssistido = (uid, videoId) =>
  rest("videos_assistidos", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ usuario_id: uid, video_id: videoId }),
  });

export const desmarcarAssistido = (uid, videoId) =>
  rest(`videos_assistidos?usuario_id=eq.${uid}&video_id=eq.${encodeURIComponent(videoId)}`, {
    method: "DELETE",
  });

export const configuracoes = () => rest("configuracoes?select=chave,valor");

// Transforma a lista de configurações numa busca por chave.
export const mapaConfig = (lista) =>
  Object.fromEntries((lista || []).map((c) => [c.chave, c.valor]));

// RPCs de progresso (bloqueio no servidor).
export const marcarChecklist = (etapa, item, valor) =>
  rpc("marcar_checklist", { p_etapa: etapa, p_item: item, p_valor: valor });

export const concluirEtapa = (etapa) => rpc("concluir_etapa", { p_etapa: etapa });

export const definirCaminho = (caminho) => rpc("definir_caminho", { p_caminho: caminho });

export const escolherNichoPrincipal = (nicho) =>
  rpc("escolher_nicho_principal", { p_nicho: nicho });

// ---------- Ferramentas (Fase 6) ----------
export const listaFornecedores = () =>
  rest("fornecedores?select=*&ativo=is.true&order=destaque.desc,nome.asc");

export const listaFreteiros = () =>
  rest("freteiros?select=*&ativo=is.true&order=nome.asc");

export const regrasFreteiro = () =>
  rest("regras_freteiro?select=*&order=ordem.asc");

export const pesosNichos = () => rest("nichos?select=slug,peso_padrao_g");

export const lojaDosSocios = () =>
  rest("fornecedores?select=*&loja_dos_socios=is.true&ativo=is.true&limit=1");
