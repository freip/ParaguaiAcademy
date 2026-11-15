// Página de planos (/app/plano). Explica o Standard e o Pro lado a lado e
// leva ao pagamento. É o destino de todo cadeado da plataforma.
import { esc, brl } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { configuracoes, mapaConfig } from "../lib/dados.js";
import { PLANOS, PLANO_PADRAO } from "../config.js";
import { ehPro } from "../auth.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v, padrao) => (v != null && v !== "" && Number.isFinite(+v) ? +v : padrao);

const FAQ = [
  ["Posso começar no Standard e migrar depois?",
    "Sim. Ao migrar você paga só a diferença de entrada do Pro e entra na recorrência trimestral."],
  ["A recorrência do Pro é obrigatória?",
    "Ela mantém seu lugar no grupo de compras coletivas, na mentoria e nas promoções. Sem ela, você continua com tudo do Standard."],
  ["O que são compras coletivas?",
    "Alunos juntam pedidos para bater o mínimo do fornecedor e dividir o frete. Sai mais barato para todos."],
  ["Como funciona a mentoria exclusiva?",
    "Chamadas com o Mauro, em grupo e individuais, além de acompanhamento nas suas compras: o que comprar, por quanto e com quem."],
];

export async function montar(ctx, app, view) {
  view.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {};
  try { config = mapaConfig(await configuracoes()); }
  catch (e) { view.innerHTML = erro(e.message); return; }

  const pro = ehPro(ctx);
  const vStandard = num(config.plano_standard_valor, PLANO_PADRAO.standard_valor);
  const vPro = num(config.plano_pro_valor, PLANO_PADRAO.pro_valor);
  const vRec = num(config.plano_pro_recorrencia, PLANO_PADRAO.pro_recorrencia);
  const zap = soDigitos(config.whatsapp_upgrade) || soDigitos(config.whatsapp_suporte);

  const linkPro = config.url_checkout_pro
    || (zap ? `https://wa.me/${zap}?text=${encodeURIComponent("Quero migrar para o plano Pro da Paraguai Academy.")}` : "#/app/suporte");
  const linkDuvida = zap
    ? `https://wa.me/${zap}?text=${encodeURIComponent("Tenho uma dúvida sobre os planos da Paraguai Academy.")}`
    : "#/app/suporte";
  const externo = (url) => (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : "");

  const listaInclui = (itens) =>
    itens.map((i) => `<li class="ok">${ic("check", 15)} ${esc(i)}</li>`).join("");
  const listaFora = (itens) =>
    itens.map((i) => `<li class="fora">${ic("x", 15)} ${esc(i)}</li>`).join("");

  const cardStandard = `
    <div class="plano-card${pro ? "" : " atual"}">
      <div class="plano-topo">
        <b>${PLANOS.standard.nome}</b>
        ${pro ? "" : '<span class="selo-plano">Seu plano</span>'}
      </div>
      <p class="muted">${esc(PLANOS.standard.chamada)}</p>
      <div class="plano-preco"><b>${brl(vStandard)}</b><span class="muted">pagamento único</span></div>
      <ul class="plano-lista">
        ${listaInclui(PLANOS.standard.inclui)}
        ${listaFora(PLANOS.standard.naoInclui)}
      </ul>
      ${pro ? "" : '<span class="plano-rodape muted">Você já tem este acesso.</span>'}
    </div>`;

  const cardPro = `
    <div class="plano-card destaque${pro ? " atual" : ""}">
      <span class="plano-fita">${ic("star", 12)} Mais completo</span>
      <div class="plano-topo">
        <b>${PLANOS.pro.nome}</b>
        ${pro ? '<span class="selo-plano pro">Seu plano</span>' : ""}
      </div>
      <p class="muted">${esc(PLANOS.pro.chamada)}</p>
      <div class="plano-preco"><b>${brl(vPro)}</b><span class="muted">de entrada</span></div>
      <div class="plano-recorrencia">+ ${brl(vRec)} por trimestre
        <span class="muted">para manter o grupo de compras coletivas, a mentoria, as dicas e as promoções</span></div>
      <ul class="plano-lista">${listaInclui(PLANOS.pro.inclui)}</ul>
      ${pro
        ? '<span class="plano-rodape muted">Tudo liberado. Bom proveito.</span>'
        : `<a class="btn block mt-3" href="${esc(linkPro)}"${externo(linkPro)}>Quero o Pro ${ic("arrow", 16)}</a>`}
    </div>`;

  const comparativo = [
    ["Trilha das 8 etapas e aulas", true, true],
    ["Calculadora de custo e preço", true, true],
    ["Fornecedores abertos", true, true],
    ["Freteiros com tabela", true, true],
    ["Fornecedores premium", false, true],
    ["Grupo de compras coletivas", false, true],
    ["Mentoria exclusiva com chamadas", false, true],
    ["Acompanhamento nas compras", false, true],
    ["Dicas e promoções em primeira mão", false, true],
  ];
  const marca = (v) => (v ? `<span class="tem">${ic("check", 15)}</span>` : `<span class="nao">${ic("x", 15)}</span>`);

  view.innerHTML = `
    <small class="sobrescrito">Planos</small>
    <h1>${pro ? "Você está no Pro" : "Dois jeitos de usar a Academy"}</h1>
    <p class="sub">${pro
      ? "Todos os acessos estão liberados na sua conta."
      : "O Standard ensina o caminho. O Pro coloca você dentro do grupo que compra junto."}</p>

    <div class="planos-grid mt-4">${cardStandard}${cardPro}</div>

    <div class="card mt-4"><h2>Comparando lado a lado</h2>
      <table class="tabela tabela-planos mt-3">
        <thead><tr><th>O que você tem</th><th>Standard</th><th>Pro</th></tr></thead>
        <tbody>${comparativo.map(([rot, s, p]) =>
          `<tr><td>${esc(rot)}</td><td>${marca(s)}</td><td>${marca(p)}</td></tr>`).join("")}</tbody>
      </table>
    </div>

    <div class="card mt-4"><h2>Perguntas sobre os planos</h2>
      <div class="mt-3">${FAQ.map(([q, a]) =>
        `<details class="faq"><summary>${esc(q)}</summary><p class="muted">${esc(a)}</p></details>`).join("")}</div>
    </div>

    <div class="card mt-4"><h2>Ficou com dúvida no plano?</h2>
      <p class="muted mt-2">Fale com a equipe antes de decidir. A gente te diz qual faz sentido pro seu momento.</p>
      <a class="btn ok mt-3" href="${esc(linkDuvida)}"${externo(linkDuvida)}>${ic("send", 15)} Falar com a equipe</a>
    </div>

    <p class="muted mt-3" style="font-size:12px">Valores sujeitos a alteração. A recorrência do Pro pode ser cancelada
      quando quiser — você mantém o acesso do Standard.</p>`;
}
