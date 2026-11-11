// Ferramenta Envio no Brasil. Serve para a página (/app/envio) e para o bloco
// embutido na etapa 7. Sem iframe: abre a SuperFrete em nova aba.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { configuracoes, mapaConfig, pesosNichos } from "../lib/dados.js";

const TUTORIAL = [
  "Acesse a SuperFrete (crie a conta se for o primeiro acesso).",
  "Preencha origem e destino.",
  "Informe os dados da caixa (medidas e peso).",
  "Calcule e escolha o frete (preço e prazo).",
  "Confira a nota fiscal antes de pagar.",
  "Pague e baixe a etiqueta em PDF.",
];
const CONFERENCIA = [
  "Filme a abertura da caixa.",
  "Confira a quantidade.",
  "Confira os lacres.",
  "Confira a nota.",
  "Fale com o suporte se faltar algo.",
];

export async function montar(ctx, app, container, opts = {}) {
  container.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {}, pesos = {};
  try {
    const [cfg, ps] = await Promise.all([configuracoes(), pesosNichos()]);
    config = mapaConfig(cfg);
    for (const n of ps || []) pesos[n.slug] = n.peso_padrao_g;
  } catch (e) { container.innerHTML = erro(e.message); return; }

  const nicho = ctx.perfil?.nicho_principal || ctx.nichos[0] || "perfumes";
  const peso = pesos[nicho] || 500;
  const urlSuper = config.url_superfrete || "https://www.superfrete.com";
  const caminho = ctx.perfil?.caminho || "paraguai";
  const remetente = caminho === "brasil"
    ? "Use os dados informados pelo fornecedor como remetente. Confirme tudo antes de gerar e pagar a etiqueta."
    : "Use sempre os dados do freteiro como remetente: nome, CPF ou CNPJ, telefone, CEP e endereço. Confirme tudo com ele antes de gerar e pagar a etiqueta.";

  const card3 = `
    <div class="grid-cards mt-3">
      <div class="mini-card"><b>Dimensões da caixa</b><span class="muted">30 × 30 × 30 cm</span></div>
      <div class="mini-card"><b>Peso por unidade</b><span class="muted">${peso} g</span></div>
      <div class="mini-card"><b>Exemplo</b><span class="muted">10 × ${peso} g = ${(10 * peso) / 1000} kg</span></div>
    </div>`;

  const tutorial = TUTORIAL.map((t, i) =>
    `<div class="mini-card"><span class="num">${i + 1}</span><span>${esc(t)}</span></div>`).join("");

  container.innerHTML = `
    ${opts.embutido ? "" : `<h1>Envio no Brasil</h1>`}
    <p class="sub">Gere a etiqueta na SuperFrete e receba em casa.</p>
    <a class="btn mt-3" target="_blank" rel="noopener" href="${esc(urlSuper)}">${ic("send", 16)} Abrir SuperFrete</a>

    <div class="card mt-4"><h2>Padrão para preencher</h2>${card3}
      <div class="mini-calc mt-3">
        <label>Quantas unidades?</label>
        <input id="qtd-peso" type="number" min="1" value="10" inputmode="numeric">
        <div>Peso total: <b id="peso-total">${(10 * peso) / 1000} kg</b></div>
      </div>
    </div>

    <div class="card mt-4"><h2>Atenção ao remetente</h2><p class="mt-2">${esc(remetente)}</p></div>

    <div class="card mt-4"><h2>Passo a passo</h2><div class="grid-cards mt-3">${tutorial}</div></div>

    <div class="card mt-4"><h2>Ao receber, confira</h2>
      <ul class="resumo mt-3">${CONFERENCIA.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;

  container.oninput = (ev) => {
    if (ev.target.id !== "qtd-peso") return;
    const q = Math.max(0, +ev.target.value || 0);
    const el = container.querySelector("#peso-total");
    if (el) el.textContent = `${(q * peso) / 1000} kg`;
  };
}
