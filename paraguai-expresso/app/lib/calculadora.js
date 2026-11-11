// Cálculo de custo de importação e preço de venda. Funções puras e testáveis
// (sem DOM, sem rede). As fórmulas seguem a seção 8.5 do documento.

/**
 * @typedef {Object} Frete
 * @property {"percentual"|"fixo_unidade"|"consulta"|null} tipo
 * @property {number} [valor]  Percentual (ex.: 18) ou valor fixo por unidade (R$).
 */
/**
 * @typedef {Object} Item
 * @property {string|number} [id]
 * @property {number} preco_usd
 * @property {number} qtd
 * @property {Frete} [frete]
 */
/**
 * @typedef {Object} Params
 * @property {number} cotacao
 * @property {{ligada:boolean, ate_valor:number, valor_fixo:number, percentual_acima:number}} nota
 * @property {number} transporte
 * @property {number} frete_brasil
 * @property {number} embalagem
 * @property {number} outros
 * @property {number} custo_fixo_item
 * @property {number} taxa_canal  Fração 0..1 (ex.: 0.12 para 12%).
 */

const num = (v) => (Number.isFinite(+v) ? +v : 0);

// Frete do freteiro para um item (seção 8.5).
export function freteDoItem(item, cotacao) {
  const f = item.frete || {};
  const valorItemBrl = num(item.preco_usd) * num(item.qtd) * num(cotacao);
  if (f.tipo === "percentual") return (num(f.valor) / 100) * valorItemBrl;
  if (f.tipo === "fixo_unidade") return num(f.valor) * num(item.qtd);
  return 0; // consulta / sem regra
}

// Valor da nota fiscal a partir da mercadoria em R$ (seção 8.5).
export function valorNota(mercadoria_brl, nota) {
  if (!nota || !nota.ligada) return 0;
  return mercadoria_brl <= num(nota.ate_valor)
    ? num(nota.valor_fixo)
    : (num(nota.percentual_acima) / 100) * mercadoria_brl;
}

/**
 * Calcula custos do pedido. Não arredonda (arredonde só na exibição).
 * @param {Item[]} itens
 * @param {Params} params
 */
export function calcular(itens, params) {
  const cotacao = num(params.cotacao);
  const somaUsd = itens.reduce((s, i) => s + num(i.preco_usd) * num(i.qtd), 0);
  const qtdTotal = itens.reduce((s, i) => s + num(i.qtd), 0);
  const mercadoria_brl = somaUsd * cotacao;

  const fretes = itens.map((i) => freteDoItem(i, cotacao));
  const freteiro_total = fretes.reduce((s, v) => s + v, 0);

  const nota_valor = valorNota(mercadoria_brl, params.nota);
  const custos_rateaveis =
    num(params.transporte) + nota_valor + num(params.frete_brasil) +
    num(params.embalagem) + num(params.outros);
  const custo_fixo_item = num(params.custo_fixo_item);
  const custo_total = mercadoria_brl + freteiro_total + custos_rateaveis + custo_fixo_item * qtdTotal;

  const linhas = itens.map((i, idx) => {
    const qtd = num(i.qtd) || 1;
    const valorUsd = num(i.preco_usd) * num(i.qtd);
    const peso = somaUsd > 0 ? valorUsd / somaUsd : 0;
    const custo_unit =
      num(i.preco_usd) * cotacao +
      fretes[idx] / qtd +
      (custos_rateaveis * peso) / qtd +
      custo_fixo_item;
    return { id: i.id ?? idx, frete_i: fretes[idx], peso, custo_unit };
  });

  return {
    somaUsd,
    qtdTotal,
    mercadoria_brl,
    freteiro_total,
    nota_valor,
    custos_rateaveis,
    custo_total,
    custo_medio: qtdTotal > 0 ? custo_total / qtdTotal : 0,
    itens: linhas,
  };
}

// margem e taxa_canal são frações (0..1). Retorna true se a combinação é válida.
export const margemValida = (margem, taxa_canal) => num(margem) + num(taxa_canal) < 1;

// Preço mínimo (sem lucro), cobrindo a taxa do canal.
export function precoMinimo(custo_unit, taxa_canal) {
  const t = num(taxa_canal);
  return t < 1 ? custo_unit / (1 - t) : Infinity;
}

// Preço sugerido para uma margem desejada (seção 8.5).
export function precoSugerido(custo_unit, margem, taxa_canal) {
  if (!margemValida(margem, taxa_canal)) return null;
  return custo_unit / (1 - num(margem) - num(taxa_canal));
}

// Lucro por unidade dado um preço de venda.
export function lucroUnit(preco_venda, custo_unit, taxa_canal) {
  return num(preco_venda) * (1 - num(taxa_canal)) - custo_unit;
}

// Margem real (fração) dado um preço de venda.
export function margemReal(preco_venda, custo_unit, taxa_canal) {
  const p = num(preco_venda);
  if (p <= 0) return null;
  return lucroUnit(p, custo_unit, taxa_canal) / p;
}
