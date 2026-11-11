// Ferramenta Fornecedores. Mesma função serve para a página (/app/fornecedores)
// e para o bloco embutido na etapa 2 (passar opts.embutido = true).
import { esc, brl, usd, data } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, vazio, erro } from "../lib/dom.js";
import { listaFornecedores } from "../lib/dados.js";
import { nomeNicho } from "../auth.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const MSG_CONTATO =
  "Olá! Vim pela Paraguai Academy. Tenho interesse em comprar [PRODUTO] para revenda. Pode me enviar a lista de preços e o pedido mínimo?";

export async function montar(ctx, app, container, opts = {}) {
  const estado = {
    aba: opts.aba || (ctx.perfil?.caminho === "brasil" ? "BR" : "PY"),
    busca: "",
    nicho: opts.nicho || ctx.perfil?.nicho_principal || ctx.nichos[0] || null,
  };

  container.innerHTML = skeletonLista(3);
  let todos = [];
  try { todos = (await listaFornecedores()) || []; }
  catch (e) { container.innerHTML = erro(e.message); return; }

  const contar = (pais) => todos.filter((f) => f.pais === pais).length;

  const filtrados = () => {
    const b = estado.busca.trim().toLowerCase();
    return todos
      .filter((f) => f.pais === estado.aba)
      .filter((f) => !estado.nicho || (f.nichos || []).includes(estado.nicho))
      .filter((f) => !b || [f.nome, f.descricao, f.cidade, (f.nichos || []).join(" ")]
        .join(" ").toLowerCase().includes(b));
  };

  const chips = () => {
    const opc = [{ s: null, n: "Todos" }, ...ctx.nichos.map((s) => ({ s, n: nomeNicho(ctx, s) }))];
    return opc.map((o) =>
      `<button class="chip-btn${estado.nicho === o.s ? " on" : ""}" data-nicho="${o.s ?? "__todos"}">${esc(o.n)}</button>`
    ).join("");
  };

  const card = (f) => {
    const selos = [
      f.verificado ? '<span class="selo-ok">Verificado</span>' : "",
      f.destaque ? '<span class="selo-dest">Destaque</span>' : "",
      f.loja_dos_socios ? '<span class="selo-socios">Loja dos sócios do Paraguai Academy</span>' : "",
    ].join("");
    const nichosChips = (f.nichos || []).map((s) => `<span class="nicho-chip">${esc(nomeNicho(ctx, s))}</span>`).join("");
    const linha = (rot, val) => (val != null && val !== "" ? `<div><span class="muted">${rot}:</span> ${val}</div>` : "");
    const minimo = f.minimo_valor != null
      ? (f.minimo_moeda === "USD" ? usd(f.minimo_valor) : brl(f.minimo_valor)) : "";
    const zap = soDigitos(f.whatsapp);
    const botao = zap
      ? `<a class="btn ok sm mt-3" target="_blank" rel="noopener"
           href="https://wa.me/${zap}?text=${encodeURIComponent(MSG_CONTATO)}">${ic("send", 15)} Falar no WhatsApp</a>`
      : "";
    return `<div class="card forn-card">
      <div class="forn-topo"><b>${esc(f.nome)}</b><div class="selos">${selos}</div></div>
      <div class="nichos mt-2">${nichosChips}</div>
      ${f.descricao ? `<p class="muted mt-2">${esc(f.descricao)}</p>` : ""}
      <div class="forn-meta mt-2">
        ${linha("Local", esc([f.cidade, f.pais === "PY" ? "Paraguai" : "Brasil"].filter(Boolean).join(", ")))}
        ${linha("Contato", esc(f.contato_nome))}
        ${linha("Pedido mínimo", minimo)}
        ${linha("Pagamento", esc(f.pagamento))}
        ${linha("Prazo", esc(f.prazo))}
      </div>${botao}</div>`;
  };

  function renderShell() {
    const atualizado = todos.reduce((m, f) => (f.atualizado_em && f.atualizado_em > m ? f.atualizado_em : m), "");
    container.innerHTML = `
      ${opts.embutido ? "" : `<h1>Fornecedores</h1><p class="sub">Lojas verificadas, filtradas pelo seu nicho.</p>`}
      <div class="abas mt-3">
        <button class="aba${estado.aba === "PY" ? " on" : ""}" data-aba="PY">Paraguai (${contar("PY")})</button>
        <button class="aba${estado.aba === "BR" ? " on" : ""}" data-aba="BR">Brasil (${contar("BR")})</button>
      </div>
      <input class="busca mt-3" id="busca-forn" placeholder="Buscar por nome, produto ou cidade" value="${esc(estado.busca)}">
      <div class="chips mt-3">${chips()}</div>
      ${atualizado ? `<p class="muted mt-3" style="font-size:13px">Lista atualizada em ${data(atualizado)}</p>` : ""}
      <div id="lista-forn" class="mt-3"></div>`;
    atualizarLista();
  }
  function atualizarLista() {
    const lista = filtrados();
    const el = container.querySelector("#lista-forn");
    if (el) el.innerHTML = lista.length ? lista.map(card).join("") : vazio("Nenhum fornecedor para este nicho ainda.");
  }

  let deb;
  container.oninput = (ev) => {
    if (ev.target.id !== "busca-forn") return;
    estado.busca = ev.target.value;
    clearTimeout(deb); deb = setTimeout(atualizarLista, 200);
  };
  container.onclick = (ev) => {
    const aba = ev.target.closest("[data-aba]");
    if (aba) { estado.aba = aba.dataset.aba; renderShell(); return; }
    const ch = ev.target.closest("[data-nicho]");
    if (ch) { estado.nicho = ch.dataset.nicho === "__todos" ? null : ch.dataset.nicho; renderShell(); return; }
  };

  renderShell();
}
