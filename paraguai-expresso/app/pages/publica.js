// Página pública de aula grátis (/aula-gratis). Sem login. É a única aula
// grátis da plataforma: vídeo de vendas + textos. Não revela nomes de
// fornecedores, freteiros, contatos nem o passo a passo detalhado.
import { ETAPAS } from "../content/trilha.js";
import { esc, brl } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { logoHTML } from "../lib/logo.js";
import { restPublico } from "../lib/supabase.js";
import { mapaConfig } from "../lib/dados.js";
import { PLANOS, PLANO_PADRAO } from "../config.js";
import * as VideoSlot from "../components/VideoSlot.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

const FAQ = [
  ["Preciso ir ao Paraguai?", "Não necessariamente. Você pode comprar de fornecedores à distância e receber no Brasil. O curso mostra os dois caminhos."],
  ["Preciso de CNPJ?", "Dá para começar sem, mas formalizar ajuda na nota fiscal e no crescimento. Explicamos quando e por que vale a pena."],
  ["Quanto preciso para começar?", "Depende do produto e do pedido mínimo da loja. A calculadora ajuda a planejar o investimento antes de comprar."],
  ["Quanto tempo leva para chegar?", "Varia conforme o caminho e o freteiro. Mostramos os prazos médios e como acompanhar."],
  ["Como recebo o acesso?", "Depois da compra, o acesso é liberado para o seu número. Você entra com número e senha."],
  ["Qual a diferença entre Standard e Pro?", "O Standard ensina o caminho completo e libera as ferramentas. O Pro ainda abre todos os fornecedores, o grupo de compras coletivas e a mentoria exclusiva com chamadas."],
  ["Posso começar no Standard e migrar depois?", "Sim. Você migra para o Pro quando quiser, direto dentro da plataforma."],
];

export async function montar(container) {
  let config = {}, v0 = null;
  try {
    const [cfg, vids] = await Promise.all([
      restPublico("configuracoes?select=chave,valor"),
      restPublico("videos?select=*&id=eq.V0"),
    ]);
    config = mapaConfig(cfg);
    v0 = (vids || [])[0] || { id: "V0", titulo: "Vídeo de vendas" };
  } catch { v0 = { id: "V0", titulo: "Vídeo de vendas" }; }

  const vStandard = +(config.plano_standard_valor || config.preco_curso || PLANO_PADRAO.standard_valor);
  const vPro = +(config.plano_pro_valor || PLANO_PADRAO.pro_valor);
  const vRec = +(config.plano_pro_recorrencia || PLANO_PADRAO.pro_recorrencia);
  const preco = brl(vStandard);
  const suporte = soDigitos(config.whatsapp_suporte);
  const checkout = config.url_checkout
    || (suporte ? `https://wa.me/${suporte}?text=${encodeURIComponent("Quero o plano Standard da Paraguai Academy.")}` : "#/entrar");
  const checkoutPro = config.url_checkout_pro
    || (suporte ? `https://wa.me/${suporte}?text=${encodeURIComponent("Quero o plano Pro da Paraguai Academy.")}` : "#/entrar");
  const alvoCheckout = /^https?:/.test(checkout) ? ' target="_blank" rel="noopener"' : "";
  const alvoPro = /^https?:/.test(checkoutPro) ? ' target="_blank" rel="noopener"' : "";

  const listaPlano = (itens, fora = []) =>
    itens.map((i) => `<li class="ok">${ic("check", 15)} ${esc(i)}</li>`).join("") +
    fora.map((i) => `<li class="fora">${ic("x", 15)} ${esc(i)}</li>`).join("");

  const blocoPlanos = `
    <div class="planos-grid mt-3">
      <div class="plano-card">
        <div class="plano-topo"><b>${PLANOS.standard.nome}</b></div>
        <p class="muted">${esc(PLANOS.standard.chamada)}</p>
        <div class="plano-preco"><b>${brl(vStandard)}</b><span class="muted">pagamento único</span></div>
        <ul class="plano-lista">${listaPlano(PLANOS.standard.inclui, PLANOS.standard.naoInclui)}</ul>
        <a class="btn plain block mt-3" data-cta ${alvoCheckout} href="${esc(checkout)}">Começar no Standard</a>
      </div>
      <div class="plano-card destaque">
        <span class="plano-fita">${ic("star", 12)} Mais completo</span>
        <div class="plano-topo"><b>${PLANOS.pro.nome}</b></div>
        <p class="muted">${esc(PLANOS.pro.chamada)}</p>
        <div class="plano-preco"><b>${brl(vPro)}</b><span class="muted">de entrada</span></div>
        <div class="plano-recorrencia">+ ${brl(vRec)} por trimestre
          <span class="muted">para manter o grupo de compras coletivas, a mentoria, as dicas e as promoções</span></div>
        <ul class="plano-lista">${listaPlano(PLANOS.pro.inclui)}</ul>
        <a class="btn block mt-3" data-cta ${alvoPro} href="${esc(checkoutPro)}">Quero o Pro</a>
      </div>
    </div>`;

  const aprender = ETAPAS.map((e) =>
    `<div class="aprender-item"><span class="num">${e.numero}</span>
      <div><b>${esc(e.titulo)}</b><span class="muted">${esc(e.descricao)}</span></div></div>`).join("");

  const faq = FAQ.map(([q, a]) =>
    `<details class="faq"><summary>${esc(q)}</summary><p class="muted">${esc(a)}</p></details>`).join("");

  const cta = (texto) =>
    `<a class="btn block" data-cta ${alvoCheckout} href="${esc(checkout)}">${esc(texto)}</a>`;

  container.innerHTML = `
    <div class="pub-wrap">
      <header class="pub-top">
        <a class="brand" href="#/aula-gratis">${logoHTML({ grande: true })}</a>
        <a class="btn ghost sm" href="#/entrar">Entrar</a>
      </header>

      <section class="pub-hero">
        <div class="pub-badge-wrap"><span class="pub-badge">Comunidade de importados</span></div>
        <h1>Aprenda a importar do Paraguai <span class="amarelo">do jeito certo</span></h1>
        <p class="sub">Fornecedores de confiança, travessia, nota fiscal e envio, tudo em 8 etapas curtas.</p>
        <div class="pub-video mt-4"><span class="pill-gratis">Aula grátis</span>
          ${VideoSlot.html(v0, { semAssistir: true })}</div>
        ${cta(`Quero começar por ${preco}`)}
        <p class="pub-selos mt-2">
          <span>${ic("check", 14)} A partir de ${preco}, pagamento único</span>
          <span>${ic("check", 14)} Acesso para sempre</span>
          <span>${ic("check", 14)} Dois planos: Standard e Pro</span></p>
      </section>

      <section class="mt-5"><h2>O que você vai <span class="amarelo">aprender</span></h2>
        <div class="aprender mt-3">${aprender}</div></section>

      <section class="mt-5"><h2>Ferramentas <span class="amarelo">incluídas</span></h2>
        <div class="grid-cards mt-3">
          <div class="mini-card"><b>Calculadora de custos</b><span class="muted">Custo real e preço de venda.</span></div>
          <div class="mini-card"><b>Fornecedores verificados</b><span class="muted">Paraguai e Brasil.</span></div>
          <div class="mini-card"><b>Freteiros com tabela</b><span class="muted">Preços por tipo de produto.</span></div>
          <div class="mini-card"><b>Tutorial de envio</b><span class="muted">Etiqueta e recebimento.</span></div>
        </div>
        <div class="print-borrado mt-3"><div class="pb-conteudo">
          <div class="res-linha"><span>Custo total</span><b>R$ •••</b></div>
          <div class="res-linha"><span>Custo por unidade</span><b>R$ ••</b></div>
          <div class="res-d"><span>Mercadoria</span><span>R$ •••</span></div>
          <div class="res-d"><span>Freteiro</span><span>R$ ••</span></div>
        </div><span class="pb-selo">${ic("lock", 14)} Disponível dentro do curso</span></div>
      </section>

      <section class="mt-5 pub-duas">
        <div class="card"><h2>Para quem é</h2><ul class="resumo mt-3">
          <li>Quem quer começar a revender com segurança.</li>
          <li>Quem já compra e quer organizar custos e envios.</li>
          <li>Quem prefere passo a passo curto e direto.</li></ul></div>
        <div class="card"><h2>Para quem não é</h2><ul class="resumo mt-3">
          <li>Quem procura renda garantida sem esforço.</li>
          <li>Quem quer comprar itens proibidos para revenda.</li>
          <li>Quem não quer seguir as etapas na ordem.</li></ul></div>
      </section>

      <section class="mt-5">
        <h2>Escolha seu <span class="amarelo">plano</span></h2>
        <p class="sub">O Standard ensina o caminho. O Pro coloca você dentro do grupo que compra junto.</p>
        ${blocoPlanos}
      </section>

      <section class="mt-5"><h2>Perguntas frequentes</h2><div class="mt-3">${faq}</div></section>

      <footer class="pub-rodape mt-5">
        <p class="muted">Valores de exemplo. Resultados variam.</p>
        ${suporte ? `<p class="muted">Contato: <a class="link" target="_blank" rel="noopener" href="https://wa.me/${suporte}">WhatsApp</a></p>` : ""}
        <p class="muted">${esc(config.cnpj || "CNPJ: a informar")}</p>
      </footer>
    </div>`;

  // Rastreamento (só se o Pixel já estiver configurado na página).
  if (typeof window.fbq === "function") { try { window.fbq("track", "ViewContent"); } catch {} }
  container.onclick = (ev) => {
    if (ev.target.closest("[data-cta]") && typeof window.fbq === "function") {
      try { window.fbq("track", "InitiateCheckout"); } catch {}
    }
    const box = ev.target.closest("[data-acao='carregar-video']");
    if (box) VideoSlot.carregarPlayer(box);
  };
}
