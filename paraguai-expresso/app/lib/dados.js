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

export const reabrirEtapa = (etapa) => rpc("reabrir_etapa", { p_etapa: etapa });

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

// ---------- Calculadora (Fase 7) ----------
export function buscarProdutos(nicho, termo) {
  // Produtos com preço escondido na origem (oculto) não aparecem na busca.
  let q = `produtos?select=*,lojas(nome,site,whatsapp,minimo_usd)&oculto=is.false&order=em_estoque.desc,nome.asc&limit=40`;
  if (nicho) q += `&nicho=eq.${encodeURIComponent(nicho)}`;
  const t = (termo || "").trim();
  if (t) {
    const e = encodeURIComponent(t);
    q += `&or=(nome.ilike.*${e}*,marca.ilike.*${e}*,sku.ilike.*${e}*)`;
  }
  return rest(q);
}

// Data da última atualização dos produtos de um nicho (para "atualizada em...").
export function ultimaAtualizacaoProdutos(nicho) {
  let q = `produtos?select=atualizado_em&order=atualizado_em.desc&limit=1`;
  if (nicho) q += `&nicho=eq.${encodeURIComponent(nicho)}`;
  return rest(q);
}

export const canaisVenda = () => rest("canais_venda?select=*&ativo=is.true&order=id.asc");
export const regraNota = () => rest("regras_nota?select=*&id=eq.1");

export const salvarSimulacao = (payload) =>
  rest("simulacoes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });

export const listarSimulacoes = () =>
  rest("simulacoes?select=id,nome,itens,parametros,resultado,criada_em&order=criada_em.desc");

export const excluirSimulacao = (id) =>
  rest(`simulacoes?id=eq.${id}`, { method: "DELETE" });
