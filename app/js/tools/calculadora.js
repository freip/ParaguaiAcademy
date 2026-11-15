// Calculadora de importação. Serve para a página (/app/calculadora) e para o
// bloco embutido nas etapas 3 e 8. Usa as funções puras de lib/calculadora.js.
//
// Três decisões que deixam a tela leve:
//  - a lista de produtos só aparece quando o aluno pesquisa algo;
//  - o freteiro é escolhido pelo aluno (% da compra OU R$ por unidade);
//  - só quatro custos ficam à vista; o resto mora em "Mais custos".
import { esc, brl, usd, data } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, vazio, erro, toast } from "../lib/dom.js";
import {
  calcular, precoMinimo, precoSugerido, lucroUnit, margemReal,
} from "../lib/calculadora.js";
import { cotacaoUSD } from "../lib/cotacao.js";
import {
  buscarProdutos, regraNota, listaFreteiros, regrasFreteiro,
  configuracoes, mapaConfig, salvarSimulacao, listarSimulacoes, excluirSimulacao,
} from "../lib/dados.js";
import { linkWhatsFreteiro } from "./freteiros.js";
import * as Upgrade from "../components/Upgrade.js";

const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

// Embalagem já vem preenchida com o valor que a maioria usa (editável).
const EMBALAGEM_PADRAO = 50;
const NOTA_PCT_PADRAO = 7;

export async function montar(ctx, app, container, opts = {}) {
  const brasil = ctx.perfil?.caminho === "brasil";
  const estado = {
    busca: "",
    produtos: [],
    itens: [],
    cotacao: 5.4, cotacaoFonte: "",
    freteiroId: null,
    freteModo: "percentual",   // "percentual" (% da compra) ou "valor" (R$/unidade)
    fretePct: 18,
    freteValor: 0,
    notaLigada: false,         // opcional: o aluno liga se for emitir
    notaPct: NOTA_PCT_PADRAO,
    embalagem: EMBALAGEM_PADRAO,
    frete_brasil: 0,
    transporte: 0,
    outros: 0,
    modo: opts.modoPreco || "margem",
    margem: null,
    precosVenda: {},
  };

  container.innerHTML = skeletonLista(5);
  let freteiros = [], regras = [], config = {};
  try {
    const [cot, fr, rg, nt, cfg] = await Promise.all([
      cotacaoUSD(), listaFreteiros(), regrasFreteiro(), regraNota(), configuracoes(),
    ]);
    // No caminho Brasil o preço do item já é em reais: a conversão é 1 para 1.
    estado.cotacao = brasil ? 1 : n2(cot.valor);
    estado.cotacaoFonte = cot.fonte || "";
    freteiros = fr || []; regras = rg || [];
    const nota = (nt || [])[0];
    estado.notaPct = n2(nota?.percentual_acima ?? NOTA_PCT_PADRAO) || NOTA_PCT_PADRAO;
    config = mapaConfig(cfg);
    estado.freteiroId = freteiros[0]?.id || null;
    aplicarPadraoDoFreteiro();
  } catch (e) { container.innerHTML = erro(e.message); return; }

  // ----- freteiro -----
  const freteiroAtual = () => freteiros.find((f) => f.id === estado.freteiroId);
  const regrasDoFreteiro = () => regras.filter((r) => r.freteiro_id === estado.freteiroId);

  // Sugere o modo e o valor pela tabela do freteiro; o aluno pode trocar.
  function aplicarPadraoDoFreteiro() {
    const rs = regras.filter((r) => r.freteiro_id === estado.freteiroId && r.valor != null);
    const perc = rs.find((r) => r.tipo === "percentual");
    const fixo = rs.find((r) => r.tipo === "fixo_unidade");
    if (perc) estado.fretePct = n2(perc.valor);
    if (fixo) estado.freteValor = n2(fixo.valor);
    estado.freteModo = perc ? "percentual" : fixo ? "valor" : estado.freteModo;
  }

  // Mesma cobrança para todos os itens: é o aluno que escolhe como é cobrado.
  function freteDoItem() {
    if (brasil) return { tipo: null };
    return estado.freteModo === "percentual"
      ? { tipo: "percentual", valor: estado.fretePct }
      : { tipo: "fixo_unidade", valor: estado.freteValor };
  }

  function computar() {
    const itensCalc = estado.itens.map((it) => ({
      id: it.id, preco_usd: it.preco_usd, qtd: it.qtd, frete: freteDoItem(),
    }));
    return calcular(itensCalc, {
      cotacao: estado.cotacao,
      // Percentual simples sobre a compra (sem faixa de valor fixo).
      nota: { ligada: !brasil && estado.notaLigada, percentual: estado.notaPct },
      transporte: brasil ? 0 : estado.transporte,
      frete_brasil: estado.frete_brasil,
      embalagem: estado.embalagem,
      outros: estado.outros,
    });
  }

  // ----- busca de produtos (só busca quando há termo) -----
  async function carregarProdutos() {
    const t = estado.busca.trim();
    if (!t) { estado.produtos = []; return; }
    try { estado.produtos = (await buscarProdutos(t)) || []; }
    catch { estado.produtos = []; }
  }

  // ----- render -----
  const el = (id) => container.querySelector("#" + id);

  function renderShell() {
    container.innerHTML = `
      ${opts.embutido ? "" : `<h1>Calculadora</h1>
        <p class="sub">Quanto custa de verdade e por quanto revender.</p>
        <p class="dica mt-2">Dica: a aula de como usar está na <a class="link" href="#/app/trilha/3">etapa 3 da trilha</a>.</p>`}
      <div class="calc-grid mt-3">
        <div class="calc-left">
          <div class="card">
            <h2><span class="passo">1</span> O que você vai comprar</h2>
            <input class="busca mt-3" id="busca-prod" placeholder="Pesquise o produto por nome, marca ou SKU"
              value="${esc(estado.busca)}" autocomplete="off">
            <div id="lista-produtos"></div>
            <button class="btn plain sm mt-3" data-acao="add-manual">+ Adicionar à mão</button>
            <div id="lista-itens" class="mt-3"></div>
          </div>
          <div class="card">
            <h2><span class="passo">2</span> Custos</h2>
            <div id="custos-corpo" class="mt-3"></div>
          </div>
        </div>
        <div class="calc-right"><div class="card res-fixo" id="resumo"></div></div>
      </div>
      <div class="card mt-3"><h2>Minhas simulações</h2><div id="lista-sim" class="mt-3"></div></div>
      ${opts.embutido ? "" : `<div class="mt-4">${Upgrade.faixa(ctx, {
        titulo: "Comprando junto, a conta fecha melhor",
        texto: "No Pro você entra no grupo de compras coletivas, divide o frete e manda a simulação para a mentoria revisar.",
      })}</div>`}
      <div class="calc-barra" id="calc-barra"></div>`;
    renderCustos();
    atualizarProdutos();
    atualizarItens();
    atualizarResumo();
    atualizarSimulacoes();
  }

  function atualizarProdutos() {
    const alvo = el("lista-produtos"); if (!alvo) return;
    // Sem pesquisa, nada de lista: a tela fica limpa.
    if (!estado.busca.trim()) { alvo.innerHTML = ""; return; }
    const p = estado.produtos;
    if (!p.length) {
      alvo.innerHTML = `<div class="estado mt-3">Nada encontrado para “${esc(estado.busca.trim())}”. Use “Adicionar à mão”.</div>`;
      return;
    }
    const cot = estado.cotacao;
    const maxA = p.reduce((m, x) => (x.atualizado_em && x.atualizado_em > m ? x.atualizado_em : m), "");
    alvo.innerHTML = `<p class="muted mt-3" style="font-size:12px">${p.length} ${p.length === 1 ? "resultado" : "resultados"}${maxA ? ` · preços de ${data(maxA)}` : ""} · confirme na loja</p>` +
      p.map((prod) => {
        const estoque = prod.em_estoque ? "" : '<span class="selo-dest" style="background:var(--err-soft);color:var(--err)">Indisponível</span>';
        const loja = prod.lojas?.nome ? ` · ${esc(prod.lojas.nome)}` : "";
        const aproxBrl = cot ? ` · ~${brl(prod.preco_usd * cot)}` : "";
        const foto = prod.imagem_url
          ? `<img class="prod-foto" src="${esc(prod.imagem_url)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
          : '<div class="prod-foto"></div>';
        return `<div class="prod-row">
          ${foto}
          <div class="prod-info"><b>${esc(prod.nome)}</b>
            <span class="muted">${esc(prod.marca || "")}${loja}</span>
            <span>${usd(prod.preco_usd)}${aproxBrl} ${estoque}</span></div>
          <button class="btn sm" data-acao="add" data-pid="${prod.id}" ${prod.em_estoque ? "" : "disabled"}>+</button>
        </div>`;
      }).join("");
  }

  function atualizarItens() {
    const alvo = el("lista-itens"); if (!alvo) return;
    if (!estado.itens.length) {
      alvo.innerHTML = vazio("Seu pedido está vazio. Pesquise um produto acima.");
      return;
    }
    alvo.innerHTML = `<b>Seu pedido (${estado.itens.length})</b>` + estado.itens.map((it) => `
      <div class="item-row">
        <div class="item-top"><b>${esc(it.nome)}</b><button class="x" data-acao="rem" data-id="${esc(it.id)}">remover</button></div>
        <div class="item-ctrl">
          <label>${brasil ? "Preço R$" : "Preço US$"} <input class="in-num" data-campo="preco_usd" data-id="${esc(it.id)}" type="number" min="0" step="0.01" value="${it.preco_usd}"></label>
          <div class="qty-sm"><button data-acao="qmenos" data-id="${esc(it.id)}">−</button><span>${it.qtd}</span><button data-acao="qmais" data-id="${esc(it.id)}">+</button></div>
          <span class="muted" style="font-size:13px">Custo/un: <b id="cu-${esc(it.id)}">—</b></span>
        </div>
      </div>`).join("");
  }

  function renderCustos() {
    const corpo = el("custos-corpo"); if (!corpo) return;
    const res = computar();
    const campo = (rot, nome, val, dica) => `
      <div class="custo-linha"><label>${rot}${dica ? `<span class="muted origem">${dica}</span>` : ""}</label>
        <input class="in-num" data-campo="${nome}" type="number" min="0" step="0.01" value="${val}"></div>`;

    const link = linkWhatsFreteiro(freteiroAtual()?.whatsapp);
    const tabela = regrasDoFreteiro()
      .filter((r) => r.valor != null)
      .slice(0, 3)
      .map((r) => `${esc(r.faixa || r.nicho)}: ${r.tipo === "percentual" ? `${r.valor}%` : `${brl(r.valor)}/un`}`)
      .join(" · ");

    const blocoFreteiro = brasil ? "" : `
      <div class="custo-linha"><label>Freteiro</label>
        <select data-sel="freteiro">${freteiros.map((x) =>
          `<option value="${x.id}" ${x.id === estado.freteiroId ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>
        ${link ? `<a class="link" target="_blank" rel="noopener" href="${link}">${ic("send", 14)} pedir valor</a>` : ""}</div>
      <div class="custo-linha"><label>Como ele cobra<span class="muted origem">eletrônico costuma ser valor fixo; perfume, percentual</span></label>
        <div class="toggle-sel">
          <button class="chip-btn sm${estado.freteModo === "percentual" ? " on" : ""}" data-acao="frete-modo" data-val="percentual">% da compra</button>
          <button class="chip-btn sm${estado.freteModo === "valor" ? " on" : ""}" data-acao="frete-modo" data-val="valor">R$ por unidade</button>
        </div></div>
      <div class="custo-linha">
        <label>${estado.freteModo === "percentual" ? "Percentual do freteiro (%)" : "Valor por unidade (R$)"}</label>
        ${estado.freteModo === "percentual"
          ? `<input class="in-num" data-campo="fretePct" type="number" min="0" step="0.5" value="${estado.fretePct}">`
          : `<input class="in-num" data-campo="freteValor" type="number" min="0" step="1" value="${estado.freteValor}">`}
        <span class="muted origem" id="esp-frete">dá ${brl(res.freteiro_total)}</span></div>
      ${tabela ? `<p class="muted tabela-dica">Tabela do freteiro: ${tabela}.
        <a class="link" href="#/app/freteiros">ver completa</a></p>` : ""}`;

    const blocoNota = brasil ? "" : `
      <div class="custo-linha"><label class="chk-inline"><input type="checkbox" data-sel="nota" ${estado.notaLigada ? "checked" : ""}>
        Vou emitir nota fiscal<span class="muted origem">opcional · % sobre a compra</span></label>
        <input class="in-num" data-campo="notaPct" type="number" min="0" step="0.5" value="${estado.notaPct}" ${estado.notaLigada ? "" : "disabled"}>
        <span class="muted origem" id="esp-nota">${estado.notaLigada ? `dá ${brl(res.nota_valor)}` : "desligada"}</span></div>`;

    corpo.innerHTML = `
      ${brasil ? "" : `<div class="custo-linha"><label>Dólar hoje (R$)${estado.cotacaoFonte ? `<span class="muted origem">fonte: ${esc(estado.cotacaoFonte)}</span>` : ""}</label>
        <input class="in-num" data-campo="cotacao" type="number" min="0" step="0.01" value="${estado.cotacao}"></div>`}
      ${blocoFreteiro}
      ${blocoNota}
      ${campo("Embalagem / caixa (R$)", "embalagem", estado.embalagem)}
      <details class="mais-custos mt-2"${estado.frete_brasil || estado.transporte || estado.outros ? " open" : ""}>
        <summary>Mais custos (opcional)</summary>
        <div class="custo-linha"><label>Frete até sua casa (R$)</label>
          <input class="in-num" data-campo="frete_brasil" type="number" min="0" step="0.01" value="${estado.frete_brasil}">
          <a class="link" href="${esc(config.url_superfrete || "https://www.superfrete.com")}" target="_blank" rel="noopener">cotar</a></div>
        ${brasil ? "" : campo("Loja → transportadora (R$)", "transporte", estado.transporte)}
        ${campo("Outros custos (R$)", "outros", estado.outros)}
      </details>
      ${brasil ? '<span class="aviso mt-2">Caminho Brasil: o preço de cada item já é em reais (sem freteiro e sem nota).</span>' : ""}`;
  }

  function alertas(res) {
    const av = [];
    const lojas = [...new Set(estado.itens.map((i) => i.lojaMin).filter((v) => v != null))];
    if (estado.itens.length && lojas.length === 1 && res.somaUsd < lojas[0]) {
      av.push(`Este pedido está abaixo do mínimo da loja (${usd(lojas[0])}).`);
    }
    if (!brasil && estado.itens.length) {
      const min = regrasDoFreteiro().map((r) => r.compra_minima_brl).find((v) => v);
      if (min && res.mercadoria_brl < min) av.push(`Abaixo da compra mínima do freteiro (${brl(min)}).`);
      if (estado.freteModo === "percentual" && !estado.fretePct) av.push("Confirme o percentual do freteiro antes de comprar.");
      if (estado.freteModo === "valor" && !estado.freteValor) av.push("Confirme o valor por unidade com o freteiro.");
    }
    return av;
  }

  function atualizarResumo() {
    const res = computar();
    for (const it of estado.itens) {
      const linha = res.itens.find((l) => String(l.id) === String(it.id));
      const cu = el("cu-" + it.id); if (cu && linha) cu.textContent = brl(linha.custo_unit);
    }

    const alvo = el("resumo"); if (!alvo) return;
    const av = alertas(res);
    alvo.innerHTML = `
      <h2>Resumo</h2>
      ${brasil ? "" : `<div class="res-linha"><span>Compra em US$</span><b>${usd(res.somaUsd)}</b></div>`}
      <div class="res-linha"><span>Mercadoria</span><b>${brl(res.mercadoria_brl)}</b></div>
      <div class="res-comp mt-2">
        ${brasil ? "" : compLinha("Freteiro", res.freteiro_total)}
        ${brasil || !estado.notaLigada ? "" : compLinha("Nota fiscal", res.nota_valor)}
        ${estado.embalagem ? compLinha("Embalagem", estado.embalagem) : ""}
        ${estado.frete_brasil ? compLinha("Frete Brasil", estado.frete_brasil) : ""}
        ${estado.transporte && !brasil ? compLinha("Transporte", estado.transporte) : ""}
        ${estado.outros ? compLinha("Outros", estado.outros) : ""}
      </div>
      <hr class="sep">
      <div class="res-linha grande"><span>Custo total</span><b>${brl(res.custo_total)}</b></div>
      <div class="res-linha destaque"><span>Custo por unidade</span><b>${brl(res.custo_medio)}</b></div>
      ${av.map((a) => `<span class="aviso mt-2">${esc(a)}</span>`).join("")}
      ${estado.itens.length ? blocoPreco(res) : '<p class="muted mt-3" style="font-size:13px">Adicione produtos para ver a conta.</p>'}
      <p class="muted mt-3" style="font-size:12px">Valores estimados. Confirme dólar, frete e taxas antes de comprar.</p>
      ${estado.itens.length ? `<div class="res-acoes mt-3">
        <button class="btn sm" data-acao="salvar">Salvar</button>
        <button class="btn plain sm" data-acao="compartilhar">Compartilhar</button>
        <button class="btn plain sm" data-acao="montar-pedido">Montar pedido</button></div>` : ""}`;

    const barra = el("calc-barra");
    if (barra) barra.innerHTML = estado.itens.length
      ? `<span>Custo/un: <b>${brl(res.custo_medio)}</b></span><a class="link" href="#resumo">Ver resumo</a>` : "";
  }

  const compLinha = (rot, val) => `<div class="res-d"><span>${rot}</span><span>${brl(val)}</span></div>`;

  function blocoPreco(res) {
    const seletor = `<div class="modo-sel mt-3">
      <button class="chip-btn sm${estado.modo === "margem" ? " on" : ""}" data-acao="modo" data-val="margem">Quero uma margem</button>
      <button class="chip-btn sm${estado.modo === "preco" ? " on" : ""}" data-acao="modo" data-val="preco">Já sei o preço</button></div>`;

    if (estado.modo === "margem") {
      const presets = [0.3, 0.5, 1].map((m) =>
        `<button class="chip-btn sm${estado.margem === m ? " on" : ""}" data-acao="margem" data-val="${m}">${m * 100}%</button>`).join("");
      const custom = `<label class="mt-2" style="display:block;font-size:13px">Outra margem (%)
        <input class="in-num" data-campo="margemCustom" type="number" min="0" step="1" value="${estado.margem != null ? n2(estado.margem * 100) : ""}"></label>`;
      let tabela = '<p class="muted mt-3" style="font-size:13px">Escolha uma margem para ver o preço sugerido.</p>';
      if (estado.margem != null) {
        tabela = `<table class="tabela mt-3"><thead><tr><th>Produto</th><th>Mínimo</th><th>Sugerido</th></tr></thead><tbody>${
          estado.itens.map((it) => {
            const l = res.itens.find((x) => String(x.id) === String(it.id));
            const sug = precoSugerido(l.custo_unit, estado.margem, 0);
            return `<tr><td>${esc(it.nome)}</td><td>${brl(precoMinimo(l.custo_unit, 0))}</td>
              <td><b>${sug == null ? "—" : brl(sug)}</b></td></tr>`;
          }).join("")}</tbody></table>`;
      }
      return `<hr class="sep"><h2>Preço de venda</h2>${seletor}<div class="chips mt-2">${presets}</div>${custom}${tabela}`;
    }

    const linhas = estado.itens.map((it) => {
      const l = res.itens.find((x) => String(x.id) === String(it.id));
      const pv = estado.precosVenda[it.id];
      return `<tr><td>${esc(it.nome)}</td>
        <td><input class="in-num" data-campo="precoVenda" data-id="${esc(it.id)}" type="number" min="0" step="0.01" value="${pv ?? ""}"></td>
        <td id="lu-${esc(it.id)}">${pv ? celulaLucro(pv, l.custo_unit) : "—"}</td></tr>`;
    }).join("");
    return `<hr class="sep"><h2>Preço de venda</h2>${seletor}
      <table class="tabela mt-3"><thead><tr><th>Produto</th><th>Preço venda</th><th>Lucro/un</th></tr></thead><tbody>${linhas}</tbody></table>`;
  }

  const celulaLucro = (pv, custo_unit) =>
    `${brl(lucroUnit(pv, custo_unit, 0))} <span class="muted">(${n2(margemReal(pv, custo_unit, 0) * 100)}%)</span>`;

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
      preco_usd: +prod.preco_usd || 0, qtd: 1, url: prod.url,
    });
    atualizarItens(); atualizarResumo();
  }

  const parametros = () => ({
    cotacao: estado.cotacao, freteiroId: estado.freteiroId,
    freteModo: estado.freteModo, fretePct: estado.fretePct, freteValor: estado.freteValor,
    notaLigada: estado.notaLigada, notaPct: estado.notaPct,
    embalagem: estado.embalagem, frete_brasil: estado.frete_brasil,
    transporte: estado.transporte, outros: estado.outros,
  });

  async function salvar() {
    const nome = prompt("Nome da simulação:", "Minha simulação");
    if (nome === null) return;
    try {
      await salvarSimulacao({
        nome: nome.trim() || "Simulação", itens: estado.itens,
        parametros: parametros(), resultado: computar(),
      });
      toast("Simulação salva");
      atualizarSimulacoes();
    } catch (e) { toast(e.message); }
  }

  function carregarSim(s) {
    estado.itens = (s.itens || []).map((it) => ({ ...it }));
    const p = s.parametros || {};
    Object.assign(estado, {
      cotacao: p.cotacao ?? estado.cotacao,
      freteiroId: p.freteiroId ?? estado.freteiroId,
      freteModo: p.freteModo ?? estado.freteModo,
      fretePct: p.fretePct ?? estado.fretePct,
      freteValor: p.freteValor ?? estado.freteValor,
      notaLigada: p.notaLigada ?? false,
      notaPct: p.notaPct ?? estado.notaPct,
      embalagem: p.embalagem ?? EMBALAGEM_PADRAO,
      frete_brasil: p.frete_brasil ?? 0,
      transporte: p.transporte ?? 0,
      outros: p.outros ?? 0,
      busca: "", produtos: [],
    });
    renderShell();
  }

  function textoResumo() {
    const res = computar();
    const linhas = estado.itens.map((it) => `• ${it.qtd}x ${it.nome} (${brasil ? brl(it.preco_usd) : usd(it.preco_usd)})`).join("\n");
    return `Simulação Paraguai Academy\n${linhas}\n\nCusto total: ${brl(res.custo_total)}\nCusto por unidade: ${brl(res.custo_medio)}\n\nValores estimados.`;
  }

  function montarPedido() {
    const linhas = estado.itens.map((it) => `• ${it.qtd}x ${it.nome}`).join("\n");
    const texto = `Olá! Sou do grupo do Paraguai Academy e quero fazer este pedido:\n${linhas}\n\nPode confirmar o total?`;
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
    if (t.id === "busca-prod") {
      estado.busca = t.value;
      clearTimeout(debBusca);
      debBusca = setTimeout(async () => { await carregarProdutos(); atualizarProdutos(); }, 250);
      return;
    }
    const campo = t.dataset?.campo;
    if (!campo) return;
    if (campo === "preco_usd") {
      const it = estado.itens.find((x) => String(x.id) === t.dataset.id); if (it) it.preco_usd = +t.value || 0;
      atualizarResumo(); return;
    }
    if (campo === "precoVenda") {
      estado.precosVenda[t.dataset.id] = +t.value || 0;
      const res = computar(); const l = res.itens.find((x) => String(x.id) === t.dataset.id);
      const cel = el("lu-" + t.dataset.id);
      const pv = +t.value || 0;
      if (cel && l) cel.innerHTML = pv ? celulaLucro(pv, l.custo_unit) : "—";
      return;
    }
    if (campo === "margemCustom") return;          // aplica no change
    estado[campo] = +t.value || 0;
    atualizarResumo();
    atualizarEspelhos();
  };

  // Atualiza só os "espelhos" de valor do bloco de custos, sem redesenhar os
  // inputs (o aluno continua digitando).
  function atualizarEspelhos() {
    const res = computar();
    const f = el("esp-frete"); if (f) f.textContent = `dá ${brl(res.freteiro_total)}`;
    const n = el("esp-nota"); if (n) n.textContent = estado.notaLigada ? `dá ${brl(res.nota_valor)}` : "desligada";
  }

  container.onchange = (ev) => {
    const t = ev.target;
    if (t.dataset?.campo === "margemCustom") { const v = +t.value; estado.margem = v > 0 ? v / 100 : null; atualizarResumo(); return; }
    const sel = t.dataset?.sel;
    if (sel === "freteiro") { estado.freteiroId = +t.value; aplicarPadraoDoFreteiro(); renderCustos(); atualizarResumo(); }
    else if (sel === "nota") { estado.notaLigada = t.checked; renderCustos(); atualizarResumo(); }
  };

  container.onclick = async (ev) => {
    const b = ev.target.closest("[data-acao]"); if (!b) return;
    const ac = b.dataset.acao;
    if (ac === "add") { const prod = estado.produtos.find((p) => String(p.id) === b.dataset.pid); if (prod) addProduto(prod); return; }
    if (ac === "add-manual") {
      const nome = prompt("Nome do produto:"); if (!nome) return;
      const preco = +prompt(brasil ? "Preço em R$:" : "Preço em US$:", "0") || 0;
      estado.itens.push({ id: "man" + Date.now(), nome, preco_usd: preco, qtd: 1 });
      atualizarItens(); atualizarResumo(); return;
    }
    if (ac === "rem") { estado.itens = estado.itens.filter((x) => String(x.id) !== b.dataset.id); atualizarItens(); atualizarResumo(); return; }
    if (ac === "qmais" || ac === "qmenos") {
      const it = estado.itens.find((x) => String(x.id) === b.dataset.id);
      if (it) { it.qtd = Math.max(1, it.qtd + (ac === "qmais" ? 1 : -1)); atualizarItens(); atualizarResumo(); }
      return;
    }
    if (ac === "frete-modo") { estado.freteModo = b.dataset.val; renderCustos(); atualizarResumo(); return; }
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

  renderShell();
}
