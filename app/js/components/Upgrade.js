// Peças de incentivo ao plano Pro. Tudo aqui só aparece para quem é Standard:
// o Pro nunca vê oferta do que já tem.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { ehPro } from "../auth.js";
import { ROTA_PLANO, RECURSOS_PRO } from "../config.js";

// Selo do plano do aluno (barra lateral e página de planos).
export const selo = (ctx) =>
  ehPro(ctx)
    ? `<span class="selo-plano pro">${ic("star", 11)} Pro</span>`
    : '<span class="selo-plano">Standard</span>';

// Etiqueta "Pro" para marcar um item só do Pro em qualquer lista.
export const tagPro = () => `<span class="selo-plano pro sm">${ic("star", 10)} Pro</span>`;

/**
 * Faixa de incentivo. Vai no fim (ou no topo) das telas do aluno Standard.
 * @param {Object} ctx
 * @param {Object} opts
 * @param {string} [opts.titulo]
 * @param {string} [opts.texto]
 * @param {string[]} [opts.itens]   Até 3 benefícios curtos.
 * @param {boolean} [opts.compacta] Versão de uma linha.
 */
export function faixa(ctx, opts = {}) {
  if (ehPro(ctx)) return "";
  const {
    titulo = "Suba para o Pro",
    texto = "Todos os fornecedores, compras coletivas e mentoria exclusiva com chamadas.",
    itens = [],
    compacta = false,
  } = opts;

  if (compacta) {
    return `<a class="upg-linha" href="${ROTA_PLANO}">
      <span class="ib">${ic("star", 15)}</span>
      <span><b>${esc(titulo)}</b> <span class="muted">${esc(texto)}</span></span>
      <span class="upg-seta">${ic("arrow", 16)}</span></a>`;
  }

  const lista = itens.length
    ? `<ul class="upg-itens">${itens.map((i) => `<li>${ic("check", 14)} ${esc(i)}</li>`).join("")}</ul>`
    : "";
  return `<div class="upg-faixa">
    <div class="upg-corpo">
      <small>${ic("star", 12)} Plano Pro</small>
      <b>${esc(titulo)}</b>
      <p class="muted">${esc(texto)}</p>
      ${lista}
    </div>
    <a class="btn" href="${ROTA_PLANO}">Ver os planos ${ic("arrow", 16)}</a>
  </div>`;
}

/**
 * Card de recurso trancado: mostra o que é, com cadeado, e leva ao upgrade.
 * @param {keyof typeof RECURSOS_PRO} chave
 */
export function cardTrancado(chave, opts = {}) {
  const r = RECURSOS_PRO[chave] || { nome: opts.nome || "Recurso Pro", isca: "" };
  return `<a class="card card-trancado" href="${ROTA_PLANO}">
    <div class="trancado-topo"><span class="ib">${ic("lock", 20)}</span>${tagPro()}</div>
    <b>${esc(r.nome)}</b>
    <p class="muted mt-2">${esc(r.isca)}</p>
    <span class="link mt-3" style="display:inline-block">Liberar no Pro ${ic("arrow", 14)}</span>
  </a>`;
}

/**
 * Tela inteira de recurso trancado (quando o Standard entra numa rota Pro).
 * @param {keyof typeof RECURSOS_PRO} chave
 * @param {string[]} previa  O que ele vai encontrar lá dentro.
 */
export function telaTrancada(chave, previa = []) {
  const r = RECURSOS_PRO[chave] || { nome: "Recurso Pro", isca: "" };
  return `<h1>${esc(r.nome)} ${tagPro()}</h1>
    <p class="sub">${esc(r.isca)}</p>
    <div class="card tranca-hero mt-4">
      <span class="tranca-ic">${ic("lock", 26)}</span>
      <b>Este espaço é do plano Pro</b>
      <p class="muted mt-2">Seu plano hoje é o Standard. O Pro abre este acesso na hora.</p>
      <a class="btn mt-3" href="${ROTA_PLANO}">Ver o que muda no Pro ${ic("arrow", 16)}</a>
    </div>
    ${previa.length ? `<div class="card mt-3"><h2>O que tem aqui dentro</h2>
      <ul class="resumo mt-3">${previa.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}`;
}
