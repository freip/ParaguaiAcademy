// Mentoria Pro (/app/mentoria). Chamadas e acompanhamento nas compras. Só o
// Pro entra; o Standard vê a prévia com cadeado.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { configuracoes, mapaConfig } from "../lib/dados.js";
import { ehPro } from "../auth.js";
import * as Upgrade from "../components/Upgrade.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

const PREVIA = [
  "Chamadas em grupo com o Mauro para revisar pedidos e preços.",
  "Chamada individual para montar seu primeiro lote.",
  "Acompanhamento na compra: o que comprar, por quanto e com quem.",
  "Revisão da sua simulação antes de você pagar o fornecedor.",
];

const LEVAR = [
  "Sua simulação salva na calculadora (ou o print dela).",
  "A lista de preços que o fornecedor te mandou.",
  "Quanto você tem para investir neste lote.",
  "Onde você pretende vender e a que preço.",
];

export async function montar(ctx, app, view) {
  if (!ehPro(ctx)) {
    view.innerHTML = Upgrade.telaTrancada("mentoria", PREVIA);
    return;
  }

  view.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {};
  try { config = mapaConfig(await configuracoes()); }
  catch (e) { view.innerHTML = erro(e.message); return; }

  const zapPro = soDigitos(config.mentoria_pro_whatsapp) || soDigitos(config.mentoria_whatsapp);
  const agenda = config.mentoria_pro_agenda || "";
  const titulo = config.mentoria_titulo || "Mentoria com o Mauro";

  const msgChamada = "Sou Pro e quero marcar minha chamada de mentoria.";
  const msgCompra = "Sou Pro e quero acompanhamento nesta compra. Já fiz a simulação na calculadora.";

  view.innerHTML = `
    <h1>Mentoria Pro ${Upgrade.tagPro()}</h1>
    <p class="sub">${esc(titulo)}: chamadas e acompanhamento nas suas compras.</p>

    <div class="card mt-4"><h2>Marcar uma chamada</h2>
      <p class="muted mt-2">Chamada individual para revisar seu pedido antes de pagar.</p>
      <div class="duvida-acoes mt-3">
        ${zapPro ? `<a class="btn ok" target="_blank" rel="noopener"
          href="https://wa.me/${zapPro}?text=${encodeURIComponent(msgChamada)}">${ic("video", 15)} Marcar no WhatsApp</a>` : ""}
        ${agenda ? `<a class="link" target="_blank" rel="noopener" href="${esc(agenda)}">Ver a agenda das chamadas ${ic("arrow", 14)}</a>` : ""}
      </div>
      ${!zapPro && !agenda ? '<span class="aviso mt-3">Contato da mentoria em breve. Fale com o suporte se precisar agora.</span>' : ""}
    </div>

    <div class="card mt-4"><h2>Acompanhamento na compra</h2>
      <p class="muted mt-2">Vai fechar um pedido? Manda a simulação que a gente confere com você:
        preço, freteiro, nota e preço de venda.</p>
      ${zapPro ? `<a class="btn mt-3" target="_blank" rel="noopener"
        href="https://wa.me/${zapPro}?text=${encodeURIComponent(msgCompra)}">${ic("send", 15)} Pedir acompanhamento</a>` : ""}
    </div>

    <div class="card mt-4"><h2>Leve isto para a chamada</h2>
      <ul class="resumo mt-3">${LEVAR.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      <p class="dica mt-3">Faça a simulação antes na <a class="link" href="#/app/calculadora">calculadora</a>.
        A chamada rende muito mais com os números na mão.</p>
    </div>`;
}
