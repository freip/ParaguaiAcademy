// Testes das fórmulas da calculadora (seção 8.5). Rode: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcular, freteDoItem, valorNota, precoMinimo, precoSugerido,
  lucroUnit, margemReal, margemValida,
} from "../app/lib/calculadora.js";

const r2 = (n) => Math.round(n * 100) / 100;
const notaDesligada = { ligada: false, ate_valor: 1650, valor_fixo: 100, percentual_acima: 7 };
const semCustos = { transporte: 0, frete_brasil: 0, embalagem: 0, outros: 0, custo_fixo_item: 0, taxa_canal: 0 };

test("caso de referência da seção 8.5 (161,06 e 80,53/un)", () => {
  const itens = [{ preco_usd: 12, qtd: 2, frete: { tipo: "percentual", valor: 22 } }];
  const res = calcular(itens, { cotacao: 5.33, nota: notaDesligada, ...semCustos, custo_fixo_item: 2.5 });
  assert.equal(r2(res.mercadoria_brl), 127.92);
  assert.equal(r2(res.freteiro_total), 28.14);
  assert.equal(r2(res.custo_total), 161.06);
  assert.equal(r2(res.custo_medio), 80.53);
});

test("só perfume com percentual sobre a mercadoria", () => {
  const itens = [{ preco_usd: 25, qtd: 10, frete: { tipo: "percentual", valor: 18 } }];
  const res = calcular(itens, { cotacao: 5, nota: notaDesligada, ...semCustos });
  // mercadoria = 25*10*5 = 1250; freteiro = 18% de 1250 = 225
  assert.equal(r2(res.mercadoria_brl), 1250);
  assert.equal(r2(res.freteiro_total), 225);
  assert.equal(r2(res.custo_total), 1475);
  assert.equal(r2(res.custo_medio), 147.5);
});

test("só celular com valor fixo por unidade", () => {
  const itens = [{ preco_usd: 300, qtd: 3, frete: { tipo: "fixo_unidade", valor: 180 } }];
  const res = calcular(itens, { cotacao: 5, nota: notaDesligada, ...semCustos });
  // mercadoria = 300*3*5 = 4500; freteiro = 180*3 = 540
  assert.equal(r2(res.freteiro_total), 540);
  assert.equal(r2(res.custo_total), 5040);
});

test("pedido misto (percentual + fixo)", () => {
  const itens = [
    { preco_usd: 25, qtd: 10, frete: { tipo: "percentual", valor: 18 } },
    { preco_usd: 300, qtd: 1, frete: { tipo: "fixo_unidade", valor: 180 } },
  ];
  const res = calcular(itens, { cotacao: 5, nota: notaDesligada, ...semCustos });
  // item1 frete = 18% de (25*10*5=1250) = 225; item2 frete = 180*1 = 180
  assert.equal(r2(res.freteiro_total), 405);
  assert.equal(r2(res.mercadoria_brl), (1250 + 1500)); // 1250 + 300*5 = 2750
});

test("nota fiscal abaixo e acima de R$ 1.650", () => {
  const abaixo = valorNota(1000, { ligada: true, ate_valor: 1650, valor_fixo: 100, percentual_acima: 7 });
  assert.equal(abaixo, 100);
  const acima = valorNota(2000, { ligada: true, ate_valor: 1650, valor_fixo: 100, percentual_acima: 7 });
  assert.equal(r2(acima), 140); // 7% de 2000
  const desligada = valorNota(2000, notaDesligada);
  assert.equal(desligada, 0);
});

test("rateio proporcional ao valor do item", () => {
  // Dois itens de valores diferentes, um custo rateável de R$ 100.
  const itens = [
    { preco_usd: 10, qtd: 1, frete: { tipo: null } }, // valor 10
    { preco_usd: 30, qtd: 1, frete: { tipo: null } }, // valor 30
  ];
  const res = calcular(itens, { cotacao: 1, nota: notaDesligada, ...semCustos, embalagem: 100 });
  // peso 1/4 e 3/4 -> rateio 25 e 75; custo_unit = preco*cotacao + rateio/qtd
  assert.equal(r2(res.itens[0].custo_unit), r2(10 + 25));
  assert.equal(r2(res.itens[1].custo_unit), r2(30 + 75));
  assert.equal(r2(res.custo_total), 140); // 40 mercadoria + 100
});

test("canal com taxa afeta preço mínimo e sugerido", () => {
  const custo = 100;
  assert.equal(r2(precoMinimo(custo, 0.12)), r2(100 / 0.88)); // ~113,64
  assert.equal(r2(precoSugerido(custo, 0.5, 0)), 200);        // margem 50%
  assert.equal(r2(precoSugerido(custo, 0.3, 0.1)), r2(100 / 0.6)); // margem 30% + canal 10%
});

test("margem inválida (margem + taxa do canal >= 1)", () => {
  assert.equal(margemValida(0.9, 0.2), false);
  assert.equal(precoSugerido(100, 0.9, 0.2), null);
  assert.equal(margemValida(0.5, 0.1), true);
});

test("lucro e margem real a partir de um preço de venda", () => {
  const custo = 80;
  assert.equal(r2(lucroUnit(100, custo, 0)), 20);
  assert.equal(r2(margemReal(100, custo, 0)), 0.2);
  // com taxa de canal 10%: receita líquida 90, lucro 10
  assert.equal(r2(lucroUnit(100, custo, 0.1)), 10);
});

test("frete 'consulta' não cobra nada", () => {
  const f = freteDoItem({ preco_usd: 100, qtd: 2, frete: { tipo: "consulta" } }, 5);
  assert.equal(f, 0);
});
