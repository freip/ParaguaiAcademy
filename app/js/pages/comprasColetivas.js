// Compras coletivas (/app/compras-coletivas). Só o Pro entra; o Standard vê a
// prévia com cadeado e o caminho para o upgrade.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { configuracoes, mapaConfig } from "../lib/dados.js";
import { ehPro } from "../auth.js";
import * as Upgrade from "../components/Upgrade.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

const PREVIA = [
  "Pedidos abertos da semana, com o mínimo que falta para fechar.",
  "Quem está comprando o quê, para você entrar no mesmo lote.",
  "Rateio do freteiro e do frete no Brasil combinado no grupo.",
  "Aviso quando um fornecedor abre promoção por volume.",
];

const COMO_FUNCIONA = [
  { n: 1, titulo: "Alguém abre o pedido", texto: "Um aluno publica o que vai comprar e de qual loja." },
  { n: 2, titulo: "Você entra no lote", texto: "Diz o que quer e a quantidade, dentro do prazo do pedido." },
  { n: 3, titulo: "Bate o mínimo", texto: "Juntos vocês alcançam o pedido mínimo da loja." },
  { n: 4, titulo: "Divide o frete", texto: "Freteiro e envio no Brasil rateados entre todos do lote." },
];

export async function montar(ctx, app, view) {
  if (!ehPro(ctx)) {
    view.innerHTML = Upgrade.telaTrancada("compras-coletivas", PREVIA);
    return;
  }

  view.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {};
  try { config = mapaConfig(await configuracoes()); }
  catch (e) { view.innerHTML = erro(e.message); return; }

  const grupo = config.grupo_compras_coletivas || "";
  const zap = soDigitos(config.whatsapp_suporte);

  view.innerHTML = `
    <h1>Compras coletivas ${Upgrade.tagPro()}</h1>
    <p class="sub">Junte seu pedido ao de outros alunos, bata o mínimo e divida o frete.</p>

    <div class="card mt-4"><h2>Grupo dos pedidos</h2>
      <p class="muted mt-2">É no grupo que os lotes são abertos e fechados. Entre e se apresente.</p>
      ${grupo
        ? `<a class="btn ok mt-3" target="_blank" rel="noopener" href="${esc(grupo)}">${ic("users", 16)} Entrar no grupo de compras coletivas</a>`
        : `<span class="aviso mt-3">O link do grupo está sendo preparado. ${zap ? "Fale com o suporte para entrar agora." : "Volte em breve."}</span>
           ${zap ? `<a class="btn ok mt-3" target="_blank" rel="noopener"
             href="https://wa.me/${zap}?text=${encodeURIComponent("Sou Pro e quero entrar no grupo de compras coletivas.")}">${ic("send", 15)} Pedir o acesso</a>` : ""}`}
    </div>

    <div class="card mt-4"><h2>Como funciona</h2>
      <div class="grid-cards mt-3">${COMO_FUNCIONA.map((c) =>
        `<div class="mini-card"><span class="num">${c.n}</span><b>${esc(c.titulo)}</b>
          <span class="muted">${esc(c.texto)}</span></div>`).join("")}</div>
    </div>

    <div class="card mt-4"><h2>Regras do lote</h2>
      <ul class="resumo mt-3">
        <li>Confirme sua parte antes do prazo: depois de fechado, o pedido não muda.</li>
        <li>Pague sua parte direto para quem organiza o lote, com comprovante.</li>
        <li>Use a <a class="link" href="#/app/calculadora">calculadora</a> antes de entrar: o rateio muda o custo por unidade.</li>
        <li>Combine o freteiro e o endereço de entrega no grupo, nunca no privado.</li>
      </ul>
      <span class="aviso mt-3">A Academy organiza o grupo, mas a compra é entre os alunos e a loja. Confira tudo antes de pagar.</span>
    </div>`;
}
