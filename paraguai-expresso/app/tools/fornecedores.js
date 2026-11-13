// Ferramenta Fornecedores. Mesma função serve para a página (/app/fornecedores)
// e para o bloco embutido na etapa 2 (passar opts.embutido = true).
// Sem filtro de nicho: a lista é uma só. Lojas premium são do plano Pro — no
// Standard o card aparece com cadeado e o banco não manda o contato.
import { esc, brl, usd, data } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, vazio, erro } from "../lib/dom.js";
import { listaFornecedores } from "../lib/dados.js";
import { ehPro } from "../auth.js";
import { ROTA_PLANO } from "../config.js";
import * as Upgrade from "../components/Upgrade.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const MSG_CONTATO =
  "Olá! Sou do grupo do Paraguai Academy e preciso comprar [PRODUTO] para revenda. Pode me enviar a lista de preços e o pedido mínimo?";

export async function montar(ctx, app, container, opts = {}) {
  const estado = {
    aba: opts.aba || (ctx.perfil?.caminho === "brasil" ? "BR" : "PY"),
    busca: "",
  };

  container.innerHTML = skeletonLista(3);
  let todos = [];
  try { todos = (await listaFornecedores()) || []; }
  catch (e) { container.innerHTML = erro(e.message); return; }

  const pro = ehPro(ctx);
  const contar = (pais) => todos.filter((f) => f.pais === pais).length;
  const nBloqueados = todos.filter((f) => f.bloqueado).length;

  // As lojas que o aluno já pode abrir vêm primeiro; as trancadas no fim.
  const filtrados = () => {
    const b = estado.busca.trim().toLowerCase();
    return todos
      .filter((f) => f.pais === estado.aba)
      .filter((f) => !b || [f.nome, f.descricao, f.cidade].join(" ").toLowerCase().includes(b))
      .sort((a, c) => (a.bloqueado ? 1 : 0) - (c.bloqueado ? 1 : 0));
  };

  // Card de loja premium que o aluno Standard ainda não pode abrir.
  const cardBloqueado = (f) => `
    <a class="card forn-card bloqueado" href="${ROTA_PLANO}">
      <div class="forn-topo"><b>${esc(f.nome)}</b>
        <div class="selos">${Upgrade.tagPro()}</div></div>
      ${f.descricao ? `<p class="muted mt-2">${esc(f.descricao)}</p>` : ""}
      <div class="forn-meta mt-2">
        <div><span class="muted">Local:</span> ${esc([f.cidade, f.pais === "PY" ? "Paraguai" : "Brasil"].filter(Boolean).join(", "))}</div>
        <div class="borrado"><span class="muted">Contato:</span> ••••••••••</div>
      </div>
      <div class="btn plain sm mt-3">${ic("lock", 15)} Liberar no plano Pro</div>
    </a>`;

  const card = (f) => {
    if (f.bloqueado) return cardBloqueado(f);
    const selos = [
      f.premium ? Upgrade.tagPro() : "",
      f.verificado ? '<span class="selo-ok">Verificado</span>' : "",
      f.destaque ? '<span class="selo-dest">Destaque</span>' : "",
      f.loja_dos_socios ? '<span class="selo-socios">Loja dos sócios do Paraguai Academy</span>' : "",
    ].join("");
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
    const avisoPro = !pro && nBloqueados
      ? Upgrade.faixa(ctx, {
          titulo: `${nBloqueados} ${nBloqueados === 1 ? "loja premium trancada" : "lojas premium trancadas"}`,
          texto: "As lojas premium fecham preço melhor para quem compra em volume. O Pro abre todas.",
          compacta: true,
        })
      : "";
    container.innerHTML = `
      ${opts.embutido ? "" : `<h1>Fornecedores</h1><p class="sub">Lojas verificadas no Paraguai e no Brasil.</p>
        <p class="dica mt-2">Dica: a aula sobre fornecedores está na <a class="link" href="#/app/trilha/2">etapa 2 da trilha</a>.</p>`}
      ${avisoPro ? `<div class="mt-3">${avisoPro}</div>` : ""}
      <div class="abas mt-3">
        <button class="aba${estado.aba === "PY" ? " on" : ""}" data-aba="PY">Paraguai (${contar("PY")})</button>
        <button class="aba${estado.aba === "BR" ? " on" : ""}" data-aba="BR">Brasil (${contar("BR")})</button>
      </div>
      <input class="busca mt-3" id="busca-forn" placeholder="Buscar por nome, produto ou cidade" value="${esc(estado.busca)}">
      ${atualizado ? `<p class="muted mt-3" style="font-size:13px">Lista atualizada em ${data(atualizado)}</p>` : ""}
      <div id="lista-forn" class="mt-3"></div>
      ${opts.embutido || pro ? "" : `<div class="mt-4">${Upgrade.faixa(ctx, {
        titulo: "Quer comprar junto com outros alunos?",
        itens: ["Todos os fornecedores, inclusive os premium",
                "Grupo de compras coletivas para bater o mínimo",
                "Mentoria com chamadas e acompanhamento na compra"],
      })}</div>`}`;
    atualizarLista();
  }
  function atualizarLista() {
    const lista = filtrados();
    const el = container.querySelector("#lista-forn");
    if (el) el.innerHTML = lista.length ? lista.map(card).join("") : vazio("Nenhum fornecedor encontrado.");
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
  };

  renderShell();
}
