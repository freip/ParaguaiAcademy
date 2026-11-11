// Calculadora de importação. Serve para a página (/app/calculadora) e para o
// bloco embutido nas etapas 3 e 8. Usa as funções puras de lib/calculadora.js.
import { esc, brl, usd, data } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, vazio, erro, toast } from "../lib/dom.js";
import {
  calcular, precoMinimo, precoSugerido, lucroUnit, margemReal, margemValida,
} from "../lib/calculadora.js";
import { cotacaoUSD } from "../lib/cotacao.js";
import {
  buscarProdutos, canaisVenda, regraNota, listaFreteiros, regrasFreteiro,
  pesosNichos, configuracoes, mapaConfig, salvarSimulacao, listarSimulacoes, excluirSimulacao,
} from "../lib/dados.js";
import { nomeNicho } from "../auth.js";

const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

export async function montar(ctx, app, container, opts = {}) {
  const brasil = ctx.perfil?.caminho === "brasil";
  const estado = {
    nicho: opts.nicho || ctx.perfil?.nicho_principal || ctx.nichos[0] || null,
    busca: "",
    produtos: [],
    itens: [],
    cotacao: 5.4, cotacaoFonte: "",
    freteiroId: null, freteiroPct: null,
    transporte: 0, notaLigada: !brasil, frete_brasil: 0, embalagem: 0, outros: 0,
    custo_fixo_on: false, custo_fixo_item: 0,
    canalId: null,
    modo: opts.modoPreco || "margem",
    margem: null,
    precosVenda: {},
  };

  container.innerHTML = skeletonLista(5);
  let freteiros = [], regras = [], canais = [], nota = null, pesos = {}, config = {};
  try {
    const [cot, fr, rg, cn, nt, ps, cfg] = await Promise.all([
      cotacaoUSD(), listaFreteiros(), regrasFreteiro(), canaisVenda(), regraNota(), pesosNichos(), configuracoes(),
    ]);
    estado.cotacao = n2(cot.valor); estado.cotacaoFonte = cot.fonte || "";
    freteiros = fr || []; regras = rg || []; canais = cn || [];
    nota = (nt || [])[0] || { ate_valor: 1650, valor_fixo: 100, percentual_acima: 7 };
    for (const x of ps || []) pesos[x.slug] = x.peso_padrao_g;
    config = mapaConfig(cfg);
    estado.freteiroId = freteiros[0]?.id || null;
    estado.canalId = (canais.find((c) => +c.taxa_percentual === 0) || canais[0])?.id ?? null;
  } catch (e) { container.innerHTML = erro(e.message); return; }

  // ----- helpers de cálculo -----
  const canalAtual = () => canais.find((c) => c.id === estado.canalId);
  const taxaCanal = () => (+(canalAtual()?.taxa_percentual || 0)) / 100;

  function freteDoItem(item) {
    if (brasil) return { tipo: null };
    const rs = regras.filter((r) => r.freteiro_id === estado.freteiroId && r.nicho === item.nicho);
    const perc = rs.find((r) => r.tipo === "percentual");
    if (perc) return { tipo: "percentual", valor: estado.freteiroPct ?? perc.valor, compra_min: perc.compra_minima_brl, faixa: perc.faixa };
    const fixo = rs.find((r) => r.tipo === "fixo_unidade");
    if (fixo) return { tipo: "fixo_unidade", valor: fixo.valor, faixa: fixo.faixa };
    if (rs.find((r) => r.tipo === "consulta")) return { tipo: "consulta" };
    return { tipo: null, semRegra: true };
  }

  function computar() {
    const itensCalc = estado.itens.map((it) => ({ id: it.id, preco_usd: it.preco_usd, qtd: it.qtd, frete: freteDoItem(it) }));
    const params = {
      cotacao: estado.cotacao,
      nota: brasil ? { ligada: false } : { ligada: estado.notaLigada, ate_valor: nota.ate_valor, valor_fixo: nota.valor_fixo, percentual_acima: nota.percentual_acima },
      transporte: brasil ? 0 : estado.transporte,
      frete_brasil: estado.frete_brasil, embalagem: estado.embalagem, outros: estado.outros,
      custo_fixo_item: estado.custo_fixo_on ? estado.custo_fixo_item : 0,
      taxa_canal: taxaCanal(),
    };
    return calcular(itensCalc, params);
  }

  // ----- busca de produtos -----
  async function carregarProdutos() {
    try { estado.produtos = (await buscarProdutos(estado.nicho, estado.busca)) || []; }
    catch { estado.produtos = []; }
  }

  // ----- render -----
  const el = (id) => container.querySelector("#" + id);

  async function renderShell() {
    container.innerHTML = `
      ${opts.embutido ? "" : `<h1>Calculadora</h1><p class="sub">Descubra o custo real e por quanto revender.</p>`}
      <div class="calc-grid mt-3">
        <div class="calc-left">
          <div class="card">
            <h2>Produtos</h2>
            <div class="chips mt-2">${ctx.nichos.map((s) =>
              `<button class="chip-btn${estado.nicho === s ? " on" : ""}" data-nicho="${esc(s)}">${esc(nomeNicho(ctx, s))}</button>`).join("")}</div>
            <input class="busca mt-3" id="busca-prod" placeholder="Buscar por nome, marca ou SKU" value="${esc(estado.busca)}">
            <div id="lista-produtos" class="mt-3"></div>
            <button class="btn plain sm mt-3" data-acao="add-manual">+ Adicionar produto manualmente</button>
          </div>
          <div class="card"><h2>Itens do pedido</h2><div id="lista-itens" class="mt-3"></div></div>
          <div class="card" id="bloco-custos"><h2>Custos</h2><div id="custos-corpo" class="mt-3"></div></div>
        </div>
        <div class="calc-right"><div class="card res-fixo" id="resumo"></div></div>
      </div>
      <div class="card mt-3"><h2>Minhas simulações</h2><div id="lista-sim" class="mt-3"></div></div>
      <div class="calc-barra" id="calc-barra"></div>`;
    renderCustos();
    atualizarProdutos();
    atualizarItens();
    atualizarResumo();
    atualizarSimulacoes();
  }

  function atualizarProdutos() {
    const alvo = el("lista-produtos"); if (!alvo) return;
    const p = estado.produtos;
    if (!p.length) { alvo.innerHTML = vazio("Nenhum produto encontrado. Use 'Adicionar manualmente'."); return; }
    alvo.innerHTML = `<p class="muted" style="font-size:13px">${p.length} produto(s)</p>` + p.map((prod) => {
      const estoque = prod.em_estoque ? '<span class="selo-ok">Em estoque</span>' : '<span class="selo-dest" style="background:var(--err-soft);color:var(--err)">Indisponível</span>';
      const loja = prod.lojas?.nome ? ` · ${esc(prod.lojas.nome)}` : "";
      const verLoja = prod.url ? `<a class="link" href="${esc(prod.url)}" target="_blank" rel="noopener">ver na loja</a>` : "";
      return `<div class="prod-row">
        <div class="prod-info"><b>${esc(prod.nome)}</b>
          <span class="muted">${esc(prod.marca || "")}${loja}${prod.sku ? " · " + esc(prod.sku) : ""}</span>
          <span>${usd(prod.preco_usd)} ${estoque} ${verLoja}</span></div>
        <button class="btn sm" data-acao="add" data-pid="${prod.id}" ${prod.em_estoque ? "" : "disabled"}>+ Adicionar</button>
      </div>`;
    }).join("");
  }

  function atualizarItens() {
    const alvo = el("lista-itens"); if (!alvo) return;
    if (!estado.itens.length) { alvo.innerHTML = vazio("Adicione produtos para calcular."); return; }
    alvo.innerHTML = estado.itens.map((it) => `
      <div class="item-row">
        <div class="item-top"><b>${esc(it.nome)}</b><button class="x" data-acao="rem" data-id="${esc(it.id)}">remover</button></div>
        <div class="item-ctrl">
          <label>Preço US$ <input class="in-num" data-campo="preco_usd" data-id="${esc(it.id)}" type="number" min="0" step="0.01" value="${it.preco_usd}"></label>
          <div class="qty-sm"><button data-acao="qmenos" data-id="${esc(it.id)}">−</button><span>${it.qtd}</span><button data-acao="qmais" data-id="${esc(it.id)}">+</button></div>
        </div>
        <div class="item-calc">
          <span class="muted">Subtotal: <span id="sub-${esc(it.id)}">${usd(it.preco_usd * it.qtd)}</span></span>
          <span class="muted">Custo/un: <b id="cu-${esc(it.id)}">—</b></span>
        </div>
      </div>`).join("");
  }

  function renderCustos() {
    const corpo = el("custos-corpo"); if (!corpo) return;
    const peso = pesos[estado.nicho] || 500;
    const campo = (rot, campo, val, origem) => `
      <div class="custo-linha"><label>${rot}</label>
        <input class="in-num" data-campo="${campo}" type="number" min="0" step="0.01" value="${val}">
        ${origem ? `<span class="muted origem">${origem}</span>` : ""}</div>`;
    const freteiroSel = !brasil ? `
      <div class="custo-linha"><label>Freteiro</label>
        <select data-sel="freteiro">${freteiros.map((f) => `<option value="${f.id}" ${f.id === estado.freteiroId ? "selected" : ""}>${esc(f.nome)}</option>`).join("")}</select></div>
      <div class="custo-linha"><label>Taxa do freteiro (%)<span class="muted origem">perfume: % · celular: valor fixo por faixa</span></label>
        <input class="in-num" data-campo="freteiroPct" type="number" min="0" step="0.1" placeholder="padrão da tabela" value="${estado.freteiroPct ?? ""}"></div>` : "";
    const notaLinha = !brasil ? `
      <div class="custo-linha"><label><input type="checkbox" data-sel="nota" ${estado.notaLigada ? "checked" : ""}> Nota fiscal</label>
        <span class="muted">calculada: <b id="nota-val">—</b></span></div>` : "";
    corpo.innerHTML = `
      <div class="custo-linha"><label>Cotação do dólar (R$)<span class="muted origem">${estado.cotacaoFonte ? "cotação " + esc(estado.cotacaoFonte) : ""}</span></label>
        <input class="in-num" data-campo="cotacao" type="number" min="0" step="0.01" value="${estado.cotacao}"></div>
      ${freteiroSel}
      ${brasil ? "" : campo("Transporte loja → transportadora (R$)", "transporte", estado.transporte)}
      ${notaLinha}
      <div class="custo-linha"><label>Frete até sua casa (R$)<span class="muted origem">peso estimado: ${((computarQtd() * peso) / 1000) || 0} kg</span></label>
        <input class="in-num" data-campo="frete_brasil" type="number" min="0" step="0.01" value="${estado.frete_brasil}">
        <a class="link" href="${esc(config.url_superfrete || "https://www.superfrete.com")}" target="_blank" rel="noopener">Cotar na SuperFrete</a></div>
      ${campo("Embalagem / caixa (R$)", "embalagem", estado.embalagem)}
      ${campo("Outros custos (R$)", "outros", estado.outros)}
      <div class="custo-linha"><label><input type="checkbox" data-sel="custofixo" ${estado.custo_fixo_on ? "checked" : ""}> Custo fixo por item (R$)</label>
        <input class="in-num" data-campo="custo_fixo_item" type="number" min="0" step="0.01" value="${estado.custo_fixo_item}" ${estado.custo_fixo_on ? "" : "disabled"}></div>
      <div class="custo-linha"><label>Canal de venda</label>
        <select data-sel="canal">${canais.map((c) => `<option value="${c.id}" ${c.id === estado.canalId ? "selected" : ""}>${esc(c.nome)} (${c.taxa_percentual}%)</option>`).join("")}</select></div>
      ${brasil ? '<span class="aviso mt-2">Caminho Brasil: use o preço do fornecedor em reais no campo de preço de cada item (sem freteiro e sem nota).</span>' : ""}`;
  }

  const computarQtd = () => estado.itens.reduce((s, i) => s + (+i.qtd || 0), 0);

  function alertas(res) {
    const av = [];
    // mínimo da loja (quando todos de uma loja só)
    const lojas = [...new Set(estado.itens.map((i) => i.lojaMin).filter((v) => v != null))];
    if (estado.itens.length && lojas.length === 1 && res.somaUsd < lojas[0]) av.push(`Este pedido está abaixo do mínimo da loja (${usd(lojas[0])}).`);
    // compra mínima do freteiro (perfume)
    if (!brasil) {
      const min = estado.itens.map((i) => freteDoItem(i).compra_min).find((v) => v);
      if (min && res.mercadoria_brl < min) av.push(`Abaixo da compra mínima do freteiro (${brl(min)}).`);
      if (estado.itens.some((i) => freteDoItem(i).semRegra)) av.push("Há item sem regra de frete para o nicho. Consulte o freteiro.");
    }
    return av;
  }

  function atualizarResumo() {
    const res = computar();
    // atualiza células por item
    for (const it of estado.itens) {
      const linha = res.itens.find((l) => String(l.id) === String(it.id));
      const cu = el("cu-" + it.id); if (cu && linha) cu.textContent = brl(linha.custo_unit);
      const sub = el("sub-" + it.id); if (sub) sub.textContent = usd(it.preco_usd * it.qtd);
    }
    const nv = el("nota-val"); if (nv) nv.textContent = brl(res.nota_valor);

    const alvo = el("resumo"); if (!alvo) return;
    const av = alertas(res);
    alvo.innerHTML = `
      <h2>Resumo</h2>
      <div class="res-linha"><span>Compra em US$</span><b>${usd(res.somaUsd)}</b></div>
      <div class="res-linha"><span>Em reais</span><b>${brl(res.mercadoria_brl)}</b></div>
      <hr class="sep">
      <div class="res-comp">
        ${compLinha("Mercadoria", res.mercadoria_brl)}
        ${brasil ? "" : compLinha("Freteiro", res.freteiro_total)}
        ${brasil ? "" : compLinha("Transporte", estado.transporte)}
        ${brasil ? "" : compLinha("Nota fiscal", res.nota_valor)}
        ${compLinha("Frete Brasil", estado.frete_brasil)}
        ${compLinha("Embalagem", estado.embalagem)}
        ${compLinha("Outros", estado.outros)}
        ${estado.custo_fixo_on ? compLinha("Custo fixo", estado.custo_fixo_item * res.qtdTotal) : ""}
      </div>
      <hr class="sep">
      <div class="res-linha grande"><span>Custo total</span><b>${brl(res.custo_total)}</b></div>
      <div class="res-linha"><span>Custo médio por unidade</span><b>${brl(res.custo_medio)}</b></div>
      ${av.map((a) => `<span class="aviso mt-2">${esc(a)}</span>`).join("")}
      ${estado.itens.length ? blocoPreco(res) : ""}
      <p class="muted mt-3" style="font-size:12px">Valores estimados. Confirme cotação, frete e taxas antes de comprar.</p>
      ${estado.itens.length ? `<div class="res-acoes mt-3">
        <button class="btn sm" data-acao="salvar">Salvar simulação</button>
        <button class="btn plain sm" data-acao="compartilhar">Compartilhar</button>
        <button class="btn plain sm" data-acao="montar-pedido">Montar pedido</button></div>` : ""}`;
    // barra fixa (celular)
    const barra = el("calc-barra");
    if (barra) barra.innerHTML = estado.itens.length
      ? `<span>Custo/un: <b>${brl(res.custo_medio)}</b></span><a class="link" href="#resumo">Ver resumo</a>` : "";
  }

  const compLinha = (rot, val) => `<div class="res-d"><span>${rot}</span><span>${brl(val)}</span></div>`;

  function blocoPreco(res) {
    const taxa = taxaCanal();
    const seletor = `<div class="modo-sel mt-3">
      <button class="chip-btn${estado.modo === "margem" ? " on" : ""}" data-acao="modo" data-val="margem">Quero uma margem</button>
      <button class="chip-btn${estado.modo === "preco" ? " on" : ""}" data-acao="modo" data-val="preco">Já sei o preço de venda</button></div>`;

    if (estado.modo === "margem") {
      const presets = [0.3, 0.5, 1].map((m) =>
        `<button class="chip-btn${estado.margem === m ? " on" : ""}" data-acao="margem" data-val="${m}">${m * 100}%</button>`).join("");
      const custom = `<label class="mt-2" style="display:block">Personalizada (%)
        <input class="in-num" data-campo="margemCustom" type="number" min="0" step="1" value="${estado.margem != null ? n2(estado.margem * 100) : ""}"></label>`;
      let tabela = '<p class="muted mt-3" style="font-size:13px">Escolha uma margem para ver o preço sugerido.</p>';
      if (estado.margem != null) {
        if (!margemValida(estado.margem, taxa)) {
          tabela = '<span class="aviso mt-2">Margem muito alta para este canal.</span>';
        } else {
          tabela = `<table class="tabela mt-3"><thead><tr><th>Produto</th><th>Mínimo</th><th>Sugerido</th></tr></thead><tbody>${
            estado.itens.map((it) => {
              const l = res.itens.find((x) => String(x.id) === String(it.id));
              return `<tr><td>${esc(it.nome)}</td><td>${brl(precoMinimo(l.custo_unit, taxa))}</td>
                <td><b>${brl(precoSugerido(l.custo_unit, estado.margem, taxa))}</b></td></tr>`;
            }).join("")}</tbody></table>`;
        }
      }
      return `<hr class="sep"><h2>Preço de venda</h2>${seletor}<div class="chips mt-2">${presets}</div>${custom}${tabela}`;
    }
    // modo "já sei o preço"
    const linhas = estado.itens.map((it) => {
      const l = res.itens.find((x) => String(x.id) === String(it.id));
      const pv = estado.precosVenda[it.id];
      const lucro = pv ? lucroUnit(pv, l.custo_unit, taxa) : null;
      const mg = pv ? margemReal(pv, l.custo_unit, taxa) : null;
      return `<tr><td>${esc(it.nome)}</td>
        <td><input class="in-num" data-campo="precoVenda" data-id="${esc(it.id)}" type="number" min="0" step="0.01" value="${pv ?? ""}"></td>
        <td id="lu-${esc(it.id)}">${pv ? `${brl(lucro)} <span class="muted">(${n2(mg * 100)}%)</span>` : "—"}</td></tr>`;
    }).join("");
    return `<hr class="sep"><h2>Preço de venda</h2>${seletor}
      <table class="tabela mt-3"><thead><tr><th>Produto</th><th>Preço venda</th><th>Lucro/un</th></tr></thead><tbody>${linhas}</tbody></table>`;
  }

  async function atualizarSimulacoes() {
    const alvo = el("lista-sim"); if (!alvo) return;
    let sims = [];
    try { sims = (await listarSimulacoes()) || []; } catch { sims = []; }
    if (!sims.length) { alvo.innerHTML = vazio("Nenhuma simulação salva ainda."); return; }
    alvo.innerHTML = sims.map((s) => `<div class="sim-row">
      <div><b>${esc(s.nome || "Sem nome")}</b><span class="muted"> · ${data(s.criada_em)}</span></div>
      <div class="sim-acoes">
        <button class="link" data-acao="abrir-sim" data-id="${s.id}">Abrir</button>
        <button class="link" data-acao="dup-sim" data-id="${s.id}">Duplicar</button>
        <button class="link" data-acao="del-sim" data-id="${s.id}">Excluir</button></div></div>`).join("");
    estado._sims = sims;
  }

  // ----- ações -----
  function addProduto(prod) {
    estado.itens.push({
      id: "p" + prod.id + "-" + Date.now(), nome: prod.nome, marca: prod.marca, sku: prod.sku,
      loja: prod.lojas?.nome, lojaId: prod.loja_id, lojaWhats: prod.lojas?.whatsapp, lojaMin: prod.lojas?.minimo_usd,
      preco_usd: +prod.preco_usd || 0, qtd: 1, nicho: prod.nicho, url: prod.url,
    });
    atualizarItens(); atualizarResumo();
  }

  async function salvar() {
    const nome = prompt("Nome da simulação:", "Minha simulação");
    if (nome === null) return;
    try {
      await salvarSimulacao({
        nome: nome.trim() || "Simulação", itens: estado.itens,
        parametros: { cotacao: estado.cotacao, freteiroId: estado.freteiroId, canalId: estado.canalId, notaLigada: estado.notaLigada, transporte: estado.transporte, frete_brasil: estado.frete_brasil, embalagem: estado.embalagem, outros: estado.outros, custo_fixo_on: estado.custo_fixo_on, custo_fixo_item: estado.custo_fixo_item },
        resultado: computar(),
      });
      toast("Simulação salva");
      atualizarSimulacoes();
    } catch (e) { toast(e.message); }
  }

  function carregarSim(s) {
    estado.itens = (s.itens || []).map((it) => ({ ...it }));
    const p = s.parametros || {};
    Object.assign(estado, {
      cotacao: p.cotacao ?? estado.cotacao, freteiroId: p.freteiroId ?? estado.freteiroId,
      canalId: p.canalId ?? estado.canalId, notaLigada: p.notaLigada ?? estado.notaLigada,
      transporte: p.transporte ?? 0, frete_brasil: p.frete_brasil ?? 0, embalagem: p.embalagem ?? 0,
      outros: p.outros ?? 0, custo_fixo_on: p.custo_fixo_on ?? false, custo_fixo_item: p.custo_fixo_item ?? 0,
    });
    renderShell();
  }

  function textoResumo() {
    const res = computar();
    const linhas = estado.itens.map((it) => `• ${it.qtd}x ${it.nome} (${usd(it.preco_usd)})`).join("\n");
    return `Simulação Paraguai Academy\n${linhas}\n\nCusto total: ${brl(res.custo_total)}\nCusto por unidade: ${brl(res.custo_medio)}\n\nValores estimados.`;
  }
  function montarPedido() {
    const linhas = estado.itens.map((it) => `• ${it.qtd}x ${it.nome}`).join("\n");
    const texto = `Olá! Quero fazer este pedido:\n${linhas}\n\nPode confirmar o total?`;
    const mesmaLoja = [...new Set(estado.itens.map((i) => i.lojaWhats).filter(Boolean))];
    if (mesmaLoja.length === 1) {
      window.open(`https://wa.me/${soDigitos(mesmaLoja[0])}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    } else {
      navigator.clipboard?.writeText(texto); toast("Pedido copiado");
    }
  }

  // ----- eventos (delegados no container) -----
  let debBusca;
  container.oninput = (ev) => {
    const t = ev.target;
    if (t.id === "busca-prod") { estado.busca = t.value; clearTimeout(debBusca); debBusca = setTimeout(async () => { await carregarProdutos(); atualizarProdutos(); }, 250); return; }
    const campo = t.dataset?.campo;
    if (!campo) return;
    if (campo === "preco_usd") {
      const it = estado.itens.find((x) => String(x.id) === t.dataset.id); if (it) it.preco_usd = +t.value || 0;
      atualizarResumo(); return;
    }
    if (campo === "precoVenda") {
      estado.precosVenda[t.dataset.id] = +t.value || 0;
      const it = estado.itens.find((x) => String(x.id) === t.dataset.id);
      const res = computar(); const l = res.itens.find((x) => String(x.id) === t.dataset.id);
      const cel = el("lu-" + t.dataset.id);
      if (cel && it) { const pv = +t.value || 0; cel.innerHTML = pv ? `${brl(lucroUnit(pv, l.custo_unit, taxaCanal()))} <span class="muted">(${n2(margemReal(pv, l.custo_unit, taxaCanal()) * 100)}%)</span>` : "—"; }
      return;
    }
    if (campo === "margemCustom") return; // aplica no change
    // campos de custo numéricos
    estado[campo] = +t.value || 0;
    atualizarResumo();
  };

  container.onchange = (ev) => {
    const t = ev.target;
    if (t.dataset?.campo === "margemCustom") { const v = +t.value; estado.margem = v > 0 ? v / 100 : null; atualizarResumo(); return; }
    const sel = t.dataset?.sel;
    if (sel === "freteiro") { estado.freteiroId = +t.value; estado.freteiroPct = null; atualizarResumo(); }
    else if (sel === "canal") { estado.canalId = +t.value; atualizarResumo(); }
    else if (sel === "nota") { estado.notaLigada = t.checked; atualizarResumo(); }
    else if (sel === "custofixo") { estado.custo_fixo_on = t.checked; renderCustos(); atualizarResumo(); }
  };

  container.onclick = async (ev) => {
    const b = ev.target.closest("[data-acao],[data-nicho]"); if (!b) return;
    const ac = b.dataset.acao;
    if (b.dataset.nicho) { estado.nicho = b.dataset.nicho; await carregarProdutos(); renderShell(); return; }
    if (ac === "add") { const prod = estado.produtos.find((p) => String(p.id) === b.dataset.pid); if (prod) addProduto(prod); return; }
    if (ac === "add-manual") {
      const nome = prompt("Nome do produto:"); if (!nome) return;
      const preco = +prompt("Preço em US$:", "0") || 0;
      estado.itens.push({ id: "man" + Date.now(), nome, preco_usd: preco, qtd: 1, nicho: estado.nicho });
      atualizarItens(); atualizarResumo(); return;
    }
    if (ac === "rem") { estado.itens = estado.itens.filter((x) => String(x.id) !== b.dataset.id); atualizarItens(); atualizarResumo(); return; }
    if (ac === "qmais" || ac === "qmenos") {
      const it = estado.itens.find((x) => String(x.id) === b.dataset.id);
      if (it) { it.qtd = Math.max(1, it.qtd + (ac === "qmais" ? 1 : -1)); atualizarItens(); atualizarResumo(); }
      return;
    }
    if (ac === "modo") { estado.modo = b.dataset.val; atualizarResumo(); return; }
    if (ac === "margem") { estado.margem = +b.dataset.val; atualizarResumo(); return; }
    if (ac === "salvar") { salvar(); return; }
    if (ac === "compartilhar") {
      const texto = textoResumo();
      try { await navigator.clipboard.writeText(texto); toast("Resumo copiado"); } catch {}
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
      return;
    }
    if (ac === "montar-pedido") { montarPedido(); return; }
    if (ac === "abrir-sim") { const s = (estado._sims || []).find((x) => String(x.id) === b.dataset.id); if (s) carregarSim(s); return; }
    if (ac === "dup-sim") {
      const s = (estado._sims || []).find((x) => String(x.id) === b.dataset.id);
      if (s) { try { await salvarSimulacao({ nome: (s.nome || "Simulação") + " (cópia)", itens: s.itens, parametros: s.parametros, resultado: s.resultado }); toast("Duplicada"); atualizarSimulacoes(); } catch (e) { toast(e.message); } }
      return;
    }
    if (ac === "del-sim") {
      if (!confirm("Excluir esta simulação?")) return;
      try { await excluirSimulacao(b.dataset.id); atualizarSimulacoes(); } catch (e) { toast(e.message); }
      return;
    }
  };

  await carregarProdutos();
  renderShell();
}
