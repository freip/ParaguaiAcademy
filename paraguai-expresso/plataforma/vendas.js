// Página de vendas: a página já nasce pintada com os valores certos no HTML
// (carrega instantâneo e funciona se o banco estiver fora). Este script só
// corrige os números e os links com o que estiver em `configuracoes`.
import { SB_URL, SB_KEY, PLANO_PADRAO } from "../app/config.js";

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v, padrao) => (v != null && v !== "" && Number.isFinite(+v) ? +v : padrao);
const txt = (id, valor) => { const e = document.getElementById(id); if (e) e.textContent = valor; };

const MSG_COMPRA = "Olá! Vi a página do Paraguai Academy e quero garantir meu acesso por R$ 49,90.";
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
  // Sem checkout configurado, a compra vira conversa no WhatsApp — melhor do
  // que um botão que não leva a lugar nenhum.
  const comprar = cfg.url_checkout || linkZap(MSG_COMPRA.replace("R$ 49,90", brl(valor)));
  const externo = /^https?:/.test(comprar);

  for (const id of ["cta-standard", "cta-final", "cta-barra"]) {
    const b = document.getElementById(id);
    if (!b) continue;
    b.href = comprar;
    if (externo) { b.target = "_blank"; b.rel = "noopener"; }
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
