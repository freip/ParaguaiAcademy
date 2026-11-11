// Painel do admin. Login por e-mail, verificação de papel e as seções de
// gestão (alunos, vídeos, fornecedores, freteiros, nota, lojas, produtos,
// canais e configurações).
import { sessao, entrar, sair, rest, chamarApi, papelDoUsuario } from "./sb.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const soDig = (s) => String(s || "").replace(/\D/g, "");
const app = () => document.getElementById("app");
let NICHOS = [];

// ---------------- Login / gate ----------------
function telaLogin(msg = "") {
  app().innerHTML = `<section class="card login">
    <h1>Painel do Admin</h1><p class="muted">Acesso restrito.</p>
    <form id="fl"><label>E-mail<input id="em" type="email" autocomplete="username" required></label>
      <label>Senha<input id="pw" type="password" autocomplete="current-password" required></label>
      <button class="btn" id="bl">Entrar</button><p class="msg erro" id="ml">${esc(msg)}</p></form></section>`;
  document.getElementById("fl").onsubmit = async (e) => {
    e.preventDefault();
    const b = document.getElementById("bl"); b.disabled = true; b.textContent = "Entrando...";
    try {
      const s = await entrar(document.getElementById("em").value, document.getElementById("pw").value);
      if ((await papelDoUsuario(s.user.id)) !== "admin") { sair(); telaLogin("Esta conta não é administradora."); return; }
      iniciar();
    } catch (err) { telaLogin(err.message); }
  };
}

const SECOES = [
  ["alunos", "Alunos"], ["videos", "Vídeos"], ["fornecedores", "Fornecedores"],
  ["freteiros", "Freteiros"], ["nota", "Nota fiscal"], ["lojas", "Lojas"],
  ["produtos", "Produtos"], ["canais", "Canais de venda"], ["config", "Configurações"],
];

async function iniciar() {
  try { NICHOS = (await rest("nichos?select=slug,nome&order=ordem.asc")) || []; } catch { NICHOS = []; }
  app().innerHTML = `<div class="admin-shell">
    <aside class="admin-side"><b class="logo">PARAGUAI <span>ACADEMY</span></b>
      <nav id="menu">${SECOES.map(([id, t]) => `<button data-sec="${id}">${t}</button>`).join("")}</nav>
      <button class="link" id="sair">Sair</button></aside>
    <main class="admin-main" id="sec"></main></div>`;
  document.getElementById("menu").onclick = (e) => { const b = e.target.closest("[data-sec]"); if (b) abrir(b.dataset.sec); };
  document.getElementById("sair").onclick = () => { sair(); telaLogin(); };
  abrir("alunos");
}

function abrir(id) {
  [...document.querySelectorAll("#menu button")].forEach((b) => b.classList.toggle("on", b.dataset.sec === id));
  const sec = document.getElementById("sec");
  sec.innerHTML = '<p class="muted">Carregando...</p>';
  (RENDER[id] || (() => { sec.innerHTML = "—"; }))(sec);
}

const msg = (el, t, ok) => { el.innerHTML = `<p class="msg ${ok ? "ok" : "erro"}">${esc(t)}</p>`; };

// ---------------- Editor genérico de tabela ----------------
function campoHTML(col, val) {
  const id = "f_" + col.c;
  if (col.t === "bool") return `<label class="chk"><input type="checkbox" id="${id}" ${val ? "checked" : ""}> ${col.r}</label>`;
  if (col.t === "select") return `<label>${col.r}<select id="${id}">${col.opcoes.map(([v, l]) => `<option value="${v}" ${String(val ?? "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  if (col.t === "nichos") return `<label>${col.r}<div class="nichos-check">${NICHOS.map((n) => `<label class="chk"><input type="checkbox" data-nicho="${n.slug}" ${(val || []).includes(n.slug) ? "checked" : ""}> ${esc(n.nome)}</label>`).join("")}</div></label>`;
  if (col.t === "number") return `<label>${col.r}<input type="number" step="0.01" id="${id}" value="${val ?? ""}"></label>`;
  return `<label>${col.r}<input type="text" id="${id}" value="${esc(val ?? "")}"></label>`;
}
function lerCampo(col, root) {
  if (col.t === "nichos") return [...root.querySelectorAll("[data-nicho]:checked")].map((x) => x.dataset.nicho);
  const e = root.querySelector("#f_" + col.c);
  if (col.t === "bool") return e.checked;
  if (col.t === "number") { const v = e.value.trim(); return v === "" ? null : +v; }
  const v = e.value.trim(); return v === "" ? null : v;
}

function crud(cfg) {
  return async function (sec) {
    let linhas = [];
    try { linhas = (await rest(`${cfg.tabela}?select=${cfg.select || "*"}&order=${cfg.ordem || "id.asc"}`)) || []; }
    catch (e) { sec.innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; return; }
    sec.innerHTML = `<div class="sec-topo"><h1>${cfg.titulo}</h1><button class="btn sm" id="novo">Novo</button></div>
      <div id="form"></div>
      <div class="lista">${linhas.map((r) => `<div class="row"><span>${esc(cfg.resumo(r))}</span>
        <span><button class="link" data-ed="${r.id}">Editar</button>
        <button class="link del" data-del="${r.id}">Excluir</button></span></div>`).join("") || '<p class="muted">Nada cadastrado.</p>'}</div>`;

    const formBox = sec.querySelector("#form");
    const abrirForm = (reg) => {
      formBox.innerHTML = `<div class="card form-grid">
        ${cfg.colunas.map((c) => campoHTML(c, reg?.[c.c] ?? c.def)).join("")}
        <div class="form-acoes"><button class="btn sm" id="salvar">Salvar</button>
        <button class="link" id="cancelar">Cancelar</button><span id="fmsg"></span></div></div>`;
      formBox.querySelector("#cancelar").onclick = () => { formBox.innerHTML = ""; };
      formBox.querySelector("#salvar").onclick = async () => {
        const dados = {}; for (const c of cfg.colunas) dados[c.c] = lerCampo(c, formBox);
        try {
          if (reg) await rest(`${cfg.tabela}?id=eq.${reg.id}`, { method: "PATCH", body: JSON.stringify(dados), prefer: "return=minimal" });
          else await rest(cfg.tabela, { method: "POST", body: JSON.stringify(dados), prefer: "return=minimal" });
          abrir(cfg.sec);
        } catch (e) { msg(formBox.querySelector("#fmsg"), e.message); }
      };
    };
    sec.querySelector("#novo").onclick = () => abrirForm(null);
    sec.querySelectorAll("[data-ed]").forEach((b) => b.onclick = () => abrirForm(linhas.find((x) => String(x.id) === b.dataset.ed)));
    sec.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm("Excluir este registro?")) return;
      try { await rest(`${cfg.tabela}?id=eq.${b.dataset.del}`, { method: "DELETE", prefer: "return=minimal" }); abrir(cfg.sec); }
      catch (e) { alert(e.message); }
    });
  };
}

// ---------------- Seções ----------------
const RENDER = {
  fornecedores: crud({
    sec: "fornecedores", titulo: "Fornecedores", tabela: "fornecedores", ordem: "nome.asc",
    resumo: (r) => `${r.nome} · ${r.pais}${r.loja_dos_socios ? " · sócios" : ""}${r.ativo ? "" : " · inativo"}`,
    colunas: [
      { c: "nome", r: "Nome", t: "text" }, { c: "pais", r: "País", t: "select", opcoes: [["PY", "Paraguai"], ["BR", "Brasil"]] },
      { c: "cidade", r: "Cidade", t: "text" }, { c: "nichos", r: "Nichos", t: "nichos" },
      { c: "descricao", r: "Descrição", t: "text" }, { c: "contato_nome", r: "Contato", t: "text" },
      { c: "whatsapp", r: "WhatsApp", t: "text" }, { c: "minimo_valor", r: "Pedido mínimo", t: "number" },
      { c: "minimo_moeda", r: "Moeda", t: "select", opcoes: [["", "-"], ["USD", "USD"], ["BRL", "BRL"]] },
      { c: "pagamento", r: "Pagamento", t: "text" }, { c: "prazo", r: "Prazo", t: "text" },
      { c: "verificado", r: "Verificado", t: "bool" }, { c: "destaque", r: "Destaque", t: "bool" },
      { c: "loja_dos_socios", r: "Loja dos sócios", t: "bool" }, { c: "ativo", r: "Ativo", t: "bool", def: true },
    ],
  }),
  lojas: crud({
    sec: "lojas", titulo: "Lojas", tabela: "lojas", ordem: "nome.asc",
    resumo: (r) => `${r.nome}${r.cidade ? " · " + r.cidade : ""}`,
    colunas: [{ c: "nome", r: "Nome", t: "text" }, { c: "cidade", r: "Cidade", t: "text" },
      { c: "site", r: "Site", t: "text" }, { c: "whatsapp", r: "WhatsApp", t: "text" }, { c: "minimo_usd", r: "Mínimo US$", t: "number" }],
  }),
  canais: crud({
    sec: "canais", titulo: "Canais de venda", tabela: "canais_venda", ordem: "id.asc",
    resumo: (r) => `${r.nome} · ${r.taxa_percentual}%${r.ativo ? "" : " · inativo"}`,
    colunas: [{ c: "nome", r: "Nome", t: "text" }, { c: "taxa_percentual", r: "Taxa (%)", t: "number" }, { c: "ativo", r: "Ativo", t: "bool", def: true }],
  }),

  async videos(sec) {
    let vids = [];
    try { vids = (await rest("videos?select=*&order=etapa.asc,ordem.asc")) || []; }
    catch (e) { sec.innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; return; }
    sec.innerHTML = `<h1>Vídeos</h1><p class="muted">Cole a URL de cada vídeo. Sem URL, o aluno vê "Vídeo em breve".</p>
      ${vids.map((v) => `<div class="card video-adm" data-id="${esc(v.id)}">
        <div class="row"><b>${esc(v.id)} · ${esc(v.titulo)}</b><span class="muted">${v.url ? "com vídeo" : "sem vídeo"}</span></div>
        <label>URL<input class="v-url" value="${esc(v.url || "")}" placeholder="YouTube, Vimeo, Panda, Bunny..."></label>
        <div class="dois"><label>Título<input class="v-tit" value="${esc(v.titulo || "")}"></label>
        <label>Duração<input class="v-dur" value="${esc(v.duracao || "")}"></label></div>
        <label>Roteiro (uma linha por tópico)<textarea class="v-rot">${esc((v.roteiro || []).join("\n"))}</textarea></label>
        <div class="form-acoes"><button class="btn sm v-salvar">Salvar</button><span class="v-msg"></span></div></div>`).join("")}`;
    sec.querySelectorAll(".video-adm").forEach((card) => {
      card.querySelector(".v-salvar").onclick = async () => {
        const roteiro = card.querySelector(".v-rot").value.split("\n").map((s) => s.trim()).filter(Boolean);
        try {
          await rest(`videos?id=eq.${encodeURIComponent(card.dataset.id)}`, {
            method: "PATCH", prefer: "return=minimal",
            body: JSON.stringify({ url: card.querySelector(".v-url").value.trim() || null, titulo: card.querySelector(".v-tit").value.trim(), duracao: card.querySelector(".v-dur").value.trim() || null, roteiro }),
          });
          msg(card.querySelector(".v-msg"), "Salvo.", true);
        } catch (e) { msg(card.querySelector(".v-msg"), e.message); }
      };
    });
  },

  async nota(sec) {
    let n;
    try { n = (await rest("regras_nota?select=*&id=eq.1"))?.[0] || {}; }
    catch (e) { sec.innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; return; }
    sec.innerHTML = `<h1>Nota fiscal</h1><div class="card form-grid">
      <label>Até o valor (R$)<input id="n_ate" type="number" value="${n.ate_valor ?? 1650}"></label>
      <label>Valor fixo (R$)<input id="n_fix" type="number" value="${n.valor_fixo ?? 100}"></label>
      <label>Percentual acima (%)<input id="n_pct" type="number" value="${n.percentual_acima ?? 7}"></label>
      <label>WhatsApp de contato<input id="n_zap" value="${esc(n.contato_whatsapp || "")}"></label>
      <div class="form-acoes"><button class="btn sm" id="n_salvar">Salvar</button><span id="n_msg"></span></div></div>`;
    sec.querySelector("#n_salvar").onclick = async () => {
      try {
        await rest("regras_nota?id=eq.1", { method: "PATCH", prefer: "return=minimal",
          body: JSON.stringify({ ate_valor: +sec.querySelector("#n_ate").value, valor_fixo: +sec.querySelector("#n_fix").value, percentual_acima: +sec.querySelector("#n_pct").value, contato_whatsapp: sec.querySelector("#n_zap").value.trim() || null }) });
        msg(sec.querySelector("#n_msg"), "Salvo.", true);
      } catch (e) { msg(sec.querySelector("#n_msg"), e.message); }
    };
  },

  async config(sec) {
    let cfg = [];
    try { cfg = (await rest("configuracoes?select=*&order=chave.asc")) || []; }
    catch (e) { sec.innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; return; }
    sec.innerHTML = `<h1>Configurações</h1>
      ${cfg.map((c) => `<div class="card cfg-row" data-chave="${esc(c.chave)}">
        <label>${esc(c.descricao || c.chave)}<input class="cfg-val" value="${esc(c.valor || "")}"></label>
        <button class="btn sm cfg-salvar">Salvar</button><span class="cfg-msg"></span></div>`).join("")}`;
    sec.querySelectorAll(".cfg-row").forEach((row) => {
      row.querySelector(".cfg-salvar").onclick = async () => {
        try {
          await rest(`configuracoes?chave=eq.${encodeURIComponent(row.dataset.chave)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ valor: row.querySelector(".cfg-val").value }) });
          msg(row.querySelector(".cfg-msg"), "Salvo.", true);
        } catch (e) { msg(row.querySelector(".cfg-msg"), e.message); }
      };
    });
  },

  async freteiros(sec) {
    let fret = [], regras = [];
    try { [fret, regras] = await Promise.all([rest("freteiros?select=*&order=nome.asc"), rest("regras_freteiro?select=*&order=ordem.asc")]); }
    catch (e) { sec.innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; return; }
    sec.innerHTML = `<div class="sec-topo"><h1>Freteiros</h1><button class="btn sm" id="nf">Novo freteiro</button></div><div id="nfForm"></div>
      ${(fret || []).map((f) => `<div class="card">
        <div class="row"><b>${esc(f.nome)}</b><span><button class="link" data-edf="${f.id}">Editar</button> <button class="link del" data-delf="${f.id}">Excluir</button></span></div>
        <div class="muted">${esc(f.cidade || "")} · ${esc(f.prazo || "")}</div>
        <table class="tbl"><tbody>${(regras || []).filter((r) => r.freteiro_id === f.id).map((r) => `<tr>
          <td>${esc(r.nicho)} ${esc(r.faixa || "")}</td><td>${esc(r.tipo)} ${r.valor ?? ""} ${esc(r.base || "")}</td>
          <td><button class="link del" data-delr="${r.id}">x</button></td></tr>`).join("")}</tbody></table>
        <button class="link" data-addr="${f.id}">+ regra</button></div>`).join("")}`;
    const salvarFreteiro = async (reg) => {
      const box = sec.querySelector("#nfForm");
      box.innerHTML = `<div class="card form-grid"><label>Nome<input id="ff_nome" value="${esc(reg?.nome || "")}"></label>
        <label>Cidade<input id="ff_cid" value="${esc(reg?.cidade || "")}"></label><label>WhatsApp<input id="ff_zap" value="${esc(reg?.whatsapp || "")}"></label>
        <label>Prazo<input id="ff_prz" value="${esc(reg?.prazo || "")}"></label><label>Observações<input id="ff_obs" value="${esc(reg?.observacoes || "")}"></label>
        <label class="chk"><input type="checkbox" id="ff_ativo" ${reg ? (reg.ativo ? "checked" : "") : "checked"}> Ativo</label>
        <div class="form-acoes"><button class="btn sm" id="ff_salvar">Salvar</button><span id="ff_msg"></span></div></div>`;
      box.querySelector("#ff_salvar").onclick = async () => {
        const d = { nome: box.querySelector("#ff_nome").value.trim(), cidade: box.querySelector("#ff_cid").value.trim() || null, whatsapp: box.querySelector("#ff_zap").value.trim() || null, prazo: box.querySelector("#ff_prz").value.trim() || null, observacoes: box.querySelector("#ff_obs").value.trim() || null, ativo: box.querySelector("#ff_ativo").checked };
        try { if (reg) await rest(`freteiros?id=eq.${reg.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(d) }); else await rest("freteiros", { method: "POST", prefer: "return=minimal", body: JSON.stringify(d) }); abrir("freteiros"); }
        catch (e) { msg(box.querySelector("#ff_msg"), e.message); }
      };
    };
    sec.querySelector("#nf").onclick = () => salvarFreteiro(null);
    sec.querySelectorAll("[data-edf]").forEach((b) => b.onclick = () => salvarFreteiro((fret || []).find((x) => String(x.id) === b.dataset.edf)));
    sec.querySelectorAll("[data-delf]").forEach((b) => b.onclick = async () => { if (confirm("Excluir freteiro e suas regras?")) { try { await rest(`freteiros?id=eq.${b.dataset.delf}`, { method: "DELETE", prefer: "return=minimal" }); abrir("freteiros"); } catch (e) { alert(e.message); } } });
    sec.querySelectorAll("[data-delr]").forEach((b) => b.onclick = async () => { try { await rest(`regras_freteiro?id=eq.${b.dataset.delr}`, { method: "DELETE", prefer: "return=minimal" }); abrir("freteiros"); } catch (e) { alert(e.message); } });
    sec.querySelectorAll("[data-addr]").forEach((b) => b.onclick = async () => {
      const nicho = prompt("Nicho (" + NICHOS.map((n) => n.slug).join(", ") + "):"); if (!nicho) return;
      const faixa = prompt("Faixa (ex.: iPhone até o 16) — opcional:") || null;
      const tipo = prompt("Tipo: percentual, fixo_unidade ou consulta:", "percentual"); if (!tipo) return;
      const valor = tipo === "consulta" ? null : +prompt("Valor (% ou R$/un):", "0") || null;
      const base = tipo === "percentual" ? (prompt("Base: mercadoria ou nota:", "nota") || null) : null;
      const compra_minima_brl = +prompt("Compra mínima R$ (opcional):", "") || null;
      try { await rest("regras_freteiro", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ freteiro_id: +b.dataset.addr, nicho, faixa, tipo, valor, base, compra_minima_brl }) }); abrir("freteiros"); }
      catch (e) { alert(e.message); }
    });
  },

  async produtos(sec) {
    sec.innerHTML = `<h1>Produtos</h1>
      <div class="card"><h2>Importar CSV</h2>
        <p class="muted">Colunas: loja, nome, marca, sku, nicho, preco_usd, imagem_url, url, em_estoque.</p>
        <input type="file" id="csv" accept=".csv"><button class="btn sm" id="imp">Importar</button>
        <div id="rel" class="mt-2"></div></div>
      <div class="card"><input class="busca" id="bp" placeholder="Buscar produto"><div id="lp" class="mt-2"></div></div>`;
    const buscar = async () => {
      const t = sec.querySelector("#bp").value.trim(); const e = encodeURIComponent(t);
      let q = "produtos?select=id,nome,marca,sku,nicho,preco_usd,em_estoque,lojas(nome)&order=nome.asc&limit=50";
      if (t) q += `&or=(nome.ilike.*${e}*,marca.ilike.*${e}*,sku.ilike.*${e}*)`;
      try {
        const ps = (await rest(q)) || [];
        sec.querySelector("#lp").innerHTML = ps.map((p) => `<div class="row"><span>${esc(p.nome)} · ${esc(p.marca || "")} · ${esc(p.nicho || "")} · US$ ${p.preco_usd} ${p.em_estoque ? "" : "(indisp.)"}</span>
          <button class="link del" data-delp="${p.id}">Excluir</button></div>`).join("") || '<p class="muted">Nada encontrado.</p>';
        sec.querySelectorAll("[data-delp]").forEach((b) => b.onclick = async () => { if (confirm("Excluir produto?")) { await rest(`produtos?id=eq.${b.dataset.delp}`, { method: "DELETE", prefer: "return=minimal" }); buscar(); } });
      } catch (e) { sec.querySelector("#lp").innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; }
    };
    let deb; sec.querySelector("#bp").oninput = () => { clearTimeout(deb); deb = setTimeout(buscar, 250); };
    sec.querySelector("#imp").onclick = () => importarCSV(sec, buscar);
    buscar();
  },

  async alunos(sec) { await secaoAlunos(sec); },
};

// ---------------- Produtos: importação de CSV ----------------
function parseCSV(texto) {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!linhas.length) return [];
  const sep = linhas[0].includes(";") && !linhas[0].includes(",") ? ";" : ",";
  const cab = linhas[0].split(sep).map((c) => c.trim().toLowerCase());
  return linhas.slice(1).map((l) => {
    const vals = l.split(sep);
    const o = {}; cab.forEach((c, i) => o[c] = (vals[i] || "").trim());
    return o;
  });
}

async function importarCSV(sec, aoFim) {
  const rel = sec.querySelector("#rel");
  const file = sec.querySelector("#csv").files[0];
  if (!file) { msg(rel, "Escolha um arquivo .csv."); return; }
  let lojasMap = {};
  try { (await rest("lojas?select=id,nome")).forEach((l) => lojasMap[l.nome.toLowerCase()] = l.id); } catch {}
  const linhas = parseCSV(await file.text());
  let inseridos = 0, atualizados = 0, erros = 0;
  for (const r of linhas) {
    try {
      let lojaId = r.loja ? lojasMap[r.loja.toLowerCase()] : null;
      if (r.loja && !lojaId) { const nova = await rest("lojas", { method: "POST", body: JSON.stringify({ nome: r.loja }) }); lojaId = nova[0].id; lojasMap[r.loja.toLowerCase()] = lojaId; }
      const reg = { loja_id: lojaId, nome: r.nome, marca: r.marca || null, sku: r.sku || null, nicho: r.nicho || null, preco_usd: r.preco_usd ? +String(r.preco_usd).replace(",", ".") : null, imagem_url: r.imagem_url || null, url: r.url || null, em_estoque: r.em_estoque ? !/^(0|false|nao|não)$/i.test(r.em_estoque) : true, fonte: "csv", atualizado_em: new Date().toISOString() };
      let existente = null;
      if (reg.sku && lojaId) existente = (await rest(`produtos?select=id&loja_id=eq.${lojaId}&sku=eq.${encodeURIComponent(reg.sku)}`))?.[0];
      if (!existente && lojaId) existente = (await rest(`produtos?select=id&loja_id=eq.${lojaId}&nome=eq.${encodeURIComponent(reg.nome)}`))?.[0];
      if (existente) { await rest(`produtos?id=eq.${existente.id}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(reg) }); atualizados++; }
      else { await rest("produtos", { method: "POST", prefer: "return=minimal", body: JSON.stringify(reg) }); inseridos++; }
    } catch { erros++; }
  }
  rel.innerHTML = `<p class="msg ok">Inseridos: ${inseridos} · Atualizados: ${atualizados} · Com erro: ${erros}</p>`;
  aoFim();
}

// ---------------- Alunos ----------------
async function secaoAlunos(sec) {
  let perfis = [], acessos = [], progresso = [];
  try {
    [perfis, acessos, progresso] = await Promise.all([
      rest("perfis?select=id,nome,whatsapp,caminho,papel,criado_em&order=criado_em.desc"),
      rest("acessos?select=usuario_id,nicho"),
      rest("progresso_etapas?select=usuario_id,etapa,status,concluida_em"),
    ]);
  } catch (e) { sec.innerHTML = `<p class="msg erro">${esc(e.message)}</p>`; return; }
  const etapaAtual = (uid) => (progresso || []).find((p) => p.usuario_id === uid && p.status === "atual")?.etapa || "—";
  const nichosDe = (uid) => (acessos || []).filter((a) => a.usuario_id === uid).map((a) => a.nicho);

  sec.innerHTML = `<h1>Alunos</h1>
    <div class="card"><h2>Criar conta</h2>
      <div class="form-grid"><label>Número (WhatsApp)<input id="a_num" placeholder="+5531999999999"></label>
      <label>Senha provisória<input id="a_sen" value="mudar123"></label>
      <label>Nicho<select id="a_nic">${NICHOS.map((n) => `<option value="${n.slug}">${esc(n.nome)}</option>`).join("")}</select></label>
      <label>Nome<input id="a_nome"></label>
      <div class="form-acoes"><button class="btn sm" id="a_criar">Criar</button><span id="a_msg"></span></div></div></div>
    <div class="card"><h2>Contas (${(perfis || []).length})</h2>
      <table class="tbl"><thead><tr><th>Nome</th><th>Número</th><th>Nichos</th><th>Caminho</th><th>Etapa</th><th>Ações</th></tr></thead>
      <tbody>${(perfis || []).filter((p) => p.papel !== "admin").map((p) => `<tr>
        <td>${esc(p.nome || "—")}</td><td>${esc(p.whatsapp || "—")}</td>
        <td>${nichosDe(p.id).map((n) => `<span class="tag">${esc(n)}</span>`).join("") || "—"}</td>
        <td>${esc(p.caminho)}</td><td>${etapaAtual(p.id)}</td>
        <td><button class="link" data-lib="${p.id}">Liberar nicho</button>
          <button class="link" data-rev="${p.id}">Revogar</button>
          <button class="link" data-rst="${p.id}">Resetar senha</button></td></tr>`).join("")}</tbody></table></div>`;

  sec.querySelector("#a_criar").onclick = async () => {
    const m = sec.querySelector("#a_msg");
    try {
      const d = await chamarApi("/api/admin/criar-aluno", { numero: sec.querySelector("#a_num").value, senha: sec.querySelector("#a_sen").value, nicho: sec.querySelector("#a_nic").value, nome: sec.querySelector("#a_nome").value.trim() });
      msg(m, `Criado: ${d.phone}`, true); abrir("alunos");
    } catch (e) { msg(m, e.message); }
  };
  sec.querySelectorAll("[data-lib]").forEach((b) => b.onclick = async () => {
    const nicho = prompt("Nicho para liberar (" + NICHOS.map((n) => n.slug).join(", ") + "):"); if (!nicho) return;
    try { await rest("acessos", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify({ usuario_id: b.dataset.lib, nicho }) }); abrir("alunos"); } catch (e) { alert(e.message); }
  });
  sec.querySelectorAll("[data-rev]").forEach((b) => b.onclick = async () => {
    const nicho = prompt("Nicho para revogar:"); if (!nicho) return;
    try { await rest(`acessos?usuario_id=eq.${b.dataset.rev}&nicho=eq.${encodeURIComponent(nicho)}`, { method: "DELETE", prefer: "return=minimal" }); abrir("alunos"); } catch (e) { alert(e.message); }
  });
  sec.querySelectorAll("[data-rst]").forEach((b) => b.onclick = async () => {
    const senha = prompt("Nova senha provisória (6+):", "mudar123"); if (!senha) return;
    try { await chamarApi("/api/admin/resetar-senha", { usuario_id: b.dataset.rst, senha }); alert("Senha redefinida. O aluno troca no próximo acesso."); } catch (e) { alert(e.message); }
  });
}

// ---------------- Início ----------------
if (sessao()) iniciar(); else telaLogin();
