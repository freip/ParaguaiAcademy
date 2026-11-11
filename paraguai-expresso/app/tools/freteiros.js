// Ferramenta Freteiros. Serve para a página (/app/freteiros) e para o bloco
// embutido na etapa 5. Mostra cada freteiro e a tabela de preços por nicho.
import { esc, brl } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, vazio, erro } from "../lib/dom.js";
import { listaFreteiros, regrasFreteiro } from "../lib/dados.js";
import { nomeNicho } from "../auth.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const MSG =
  "Olá! Vim pela Paraguai Academy. Vou trazer mercadoria do Paraguai e preciso de frete. Pode me passar o valor e o prazo?";

function descreveRegra(r) {
  if (r.tipo === "percentual") {
    const base = r.base === "nota" ? "sobre a nota fiscal" : "sobre a mercadoria";
    const min = r.compra_minima_brl ? `, compra mínima ${brl(r.compra_minima_brl)}` : "";
    return `${r.valor}% ${base}${min}`;
  }
  if (r.tipo === "fixo_unidade") return `${brl(r.valor)} por unidade`;
  return "Sob consulta";
}

export async function montar(ctx, app, container, opts = {}) {
  const estado = { nicho: ctx.perfil?.nicho_principal || ctx.nichos[0] || null, verTodos: false };

  container.innerHTML = skeletonLista(2);
  let freteiros = [], regras = [];
  try { [freteiros, regras] = await Promise.all([listaFreteiros(), regrasFreteiro()]); }
  catch (e) { container.innerHTML = erro(e.message); return; }
  freteiros = freteiros || []; regras = regras || [];

  const card = (f) => {
    const rs = regras.filter((r) => r.freteiro_id === f.id)
      .filter((r) => estado.verTodos || !estado.nicho || r.nicho === estado.nicho);
    const linhas = rs.length
      ? rs.map((r) => `<tr><td>${esc(nomeNicho(ctx, r.nicho))}${r.faixa ? ` · ${esc(r.faixa)}` : ""}</td>
          <td>${esc(descreveRegra(r))}</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">Sem tabela para este nicho. Veja todos ou consulte o freteiro.</td></tr>`;
    const zap = soDigitos(f.whatsapp);
    const botao = zap
      ? `<a class="btn ok sm mt-3" target="_blank" rel="noopener"
           href="https://wa.me/${zap}?text=${encodeURIComponent(MSG)}">${ic("send", 15)} Falar no WhatsApp</a>` : "";
    return `<div class="card">
      <div class="forn-topo"><b>${esc(f.nome)}</b></div>
      <div class="forn-meta mt-2">
        ${f.cidade ? `<div><span class="muted">Cidade:</span> ${esc(f.cidade)}</div>` : ""}
        ${f.prazo ? `<div><span class="muted">Prazo:</span> ${esc(f.prazo)}</div>` : ""}
        ${f.observacoes ? `<div><span class="muted">Obs.:</span> ${esc(f.observacoes)}</div>` : ""}
      </div>
      <table class="tabela mt-3"><thead><tr><th>Produto</th><th>Cobrança</th></tr></thead>
        <tbody>${linhas}</tbody></table>${botao}</div>`;
  };

  function render() {
    container.innerHTML = `
      ${opts.embutido ? "" : `<h1>Freteiros</h1><p class="sub">Quem traz sua mercadoria do Paraguai até o Brasil.</p>`}
      <div class="row-between mt-3">
        <div class="chips">${chips()}</div>
        <button class="link" data-acao="ver-todos">${estado.verTodos ? "Ver só meu nicho" : "Ver todos os preços"}</button>
      </div>
      <div class="mt-3">${freteiros.length ? freteiros.map(card).join("") : vazio("Nenhum freteiro cadastrado ainda.")}</div>
      <span class="aviso mt-3">Consulte a tabela diretamente com o freteiro antes de comprar.</span>
      <p class="muted mt-3" style="font-size:14px">Dica: também temos perfumes no atacado já no Brasil. Veja a
        <a class="link" href="#/app/loja-parceira">Loja parceira</a>.</p>`;
  }
  const chips = () => {
    const opc = ctx.nichos.map((s) => ({ s, n: nomeNicho(ctx, s) }));
    return opc.map((o) =>
      `<button class="chip-btn${estado.nicho === o.s && !estado.verTodos ? " on" : ""}" data-nicho="${esc(o.s)}">${esc(o.n)}</button>`
    ).join("");
  };

  container.onclick = (ev) => {
    const vt = ev.target.closest("[data-acao='ver-todos']");
    if (vt) { estado.verTodos = !estado.verTodos; render(); return; }
    const ch = ev.target.closest("[data-nicho]");
    if (ch) { estado.nicho = ch.dataset.nicho; estado.verTodos = false; render(); return; }
  };

  render();
}
