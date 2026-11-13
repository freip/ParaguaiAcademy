// Página de vendas: a página já nasce pintada com os valores certos no HTML
// (carrega instantâneo e funciona se o banco estiver fora). Este script só
// corrige os números e os links com o que estiver em `configuracoes`.
import { SB_URL, SB_KEY, PLANO_PADRAO } from "../app/config.js";

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v, padrao) => (v != null && v !== "" && Number.isFinite(+v) ? +v : padrao);
const txt = (id, valor) => { const e = document.getElementById(id); if (e) e.textContent = valor; };

// Ícone do WhatsApp: quando a compra é pelo WhatsApp, o botão diz isso.
// Em Brasil, deixar o canal explícito aumenta o clique em vez de reduzir.
const ZAP_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" style="flex:none"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z"/></svg>`;

const MSG_COMPRA = (valor) =>
  `Olá! Vi a página do Paraguai Academy e quero garantir meu acesso ao plano Standard por ${valor}. Como faço o pagamento?`;
const MSG_DUVIDA = "Olá! Vi a página do Paraguai Academy e tenho uma dúvida antes de comprar.";

async function configuracoes() {
  const r = await fetch(`${SB_URL}/rest/v1/configuracoes?select=chave,valor`, {
    headers: { apikey: SB_KEY },
  });
  if (!r.ok) throw new Error("config indisponível");
  return Object.fromEntries((await r.json()).map((c) => [c.chave, c.valor]));
}

function aplicar(cfg) {
  const valor = num(cfg.plano_standard_valor ?? cfg.preco_curso, PLANO_PADRAO.standard_valor);
  const de = num(cfg.plano_standard_de, 140);
  const proValor = num(cfg.plano_pro_valor, PLANO_PADRAO.pro_valor);
  const proRec = num(cfg.plano_pro_recorrencia, PLANO_PADRAO.pro_recorrencia);
  const promo = cfg.promo_ativa !== "0" && de > valor;

  // ----- preços -----
  txt("preco-valor", brl(valor).replace(/^R\$\s*/, ""));   // o "R$" já está no HTML
  txt("preco-valor-2", brl(valor));
  txt("cta-valor", brl(valor));
  txt("preco-fechamento", brl(valor));
  txt("barra-valor", brl(valor));
  txt("pro-valor", brl(proValor));
  txt("pro-rec", brl(proRec));

  // ----- promoção (de / por) -----
  const pct = promo ? Math.round((1 - valor / de) * 100) : 0;
  for (const id of ["preco-de", "preco-de-2", "barra-de"]) txt(id, brl(de));
  for (const id of ["pct-off", "pct-off-2"]) txt(id, `${pct}% OFF`);
  if (cfg.promo_chamada) {
    txt("selo-turma", cfg.promo_chamada);
    const selo = document.getElementById("selo-turma");
    if (selo) selo.insertAdjacentHTML("afterbegin", "<i></i> ");
  }
  if (!promo) {
    // Sem promoção: tira o preço riscado em vez de mostrar desconto falso.
    for (const id of ["bloco-riscado", "fita-promo", "barra-de"]) {
      document.getElementById(id)?.remove();
    }
    document.querySelectorAll("#preco-de-2, #pct-off-2").forEach((e) => e.parentElement?.remove());
  }

  // ----- destino dos botões -----
  const zap = soDigitos(cfg.whatsapp_upgrade) || soDigitos(cfg.whatsapp_suporte);
  const linkZap = (msg) => (zap ? `https://wa.me/${zap}?text=${encodeURIComponent(msg)}` : "/#/entrar");
  // Enquanto não há checkout, a compra é combinada no WhatsApp. Não é um
  // remendo: o botão assume o canal, com ícone e texto condizentes.
  const porZap = !cfg.url_checkout && !!zap;
  const comprar = cfg.url_checkout || linkZap(MSG_COMPRA(brl(valor)));
  const externo = /^https?:/.test(comprar);

  // O botão do herói também compra: ele está dentro do cartão de preço, quem
  // clica ali já decidiu — mandar para o meio da página só perde a venda.
  for (const id of ["cta-hero", "cta-standard", "cta-final", "cta-barra"]) {
    const b = document.getElementById(id);
    if (!b) continue;
    b.href = comprar;
    if (externo) { b.target = "_blank"; b.rel = "noopener"; }
    if (porZap) b.insertAdjacentHTML("afterbegin", ZAP_SVG);
  }
  if (porZap) {
    // O texto de apoio não pode prometer um checkout que não existe.
    txt("sob-hero", "É rápido: você combina o pagamento com a equipe no WhatsApp.");
    txt("sob-standard", "Ao clicar, abre o WhatsApp da equipe com a mensagem pronta. "
      + "Você combina o pagamento e recebe o acesso no seu número.");
    txt("sob-final", "Pagamento único · acesso para sempre · você fala com a equipe no WhatsApp");
  }
  for (const id of ["link-zap-faq", "link-zap-pe"]) {
    const a = document.getElementById(id);
    if (a) a.href = linkZap(MSG_DUVIDA);
  }
  if (cfg.cnpj) txt("cnpj-pe", cfg.cnpj);
}

// ----- barra fixa de compra: aparece depois que o herói sai da tela -----
function barraFixa() {
  const barra = document.getElementById("barra-fixa");
  const heroi = document.querySelector(".heroi");
  if (!barra || !heroi) return;
  const ver = () => {
    const passou = heroi.getBoundingClientRect().bottom < 0;
    barra.classList.toggle("on", passou);
    document.body.classList.toggle("com-barra", passou);
  };
  addEventListener("scroll", ver, { passive: true });
  ver();
}

// ----- rastreamento, só se o Pixel estiver na página -----
function rastrear() {
  if (typeof window.fbq !== "function") return;
  try { window.fbq("track", "ViewContent"); } catch {}
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest("#cta-standard, #cta-final, #cta-barra")) return;
    try { window.fbq("track", "InitiateCheckout"); } catch {}
  });
}

barraFixa();
rastrear();
try { aplicar(await configuracoes()); } catch { /* fica com os valores do HTML */ }
