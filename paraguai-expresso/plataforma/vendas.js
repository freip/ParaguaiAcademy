// Página de vendas: dois tipos de dado.
//  1) Preço e contato — vêm do Supabase (`configuracoes`), igual já era.
//     A página nasce com o valor certo no HTML; este script só corrige se
//     o banco disser outra coisa, e ainda funciona se o banco cair.
//  2) Foto, vídeo, prints e números do Mauro — vêm de ./conteudo.js (local,
//     sem rede). Campo vazio ali = o bloco correspondente some da página.
import { SB_URL, SB_KEY, PLANO_PADRAO } from "../app/config.js";
import { embedUrl } from "../app/components/VideoSlot.js";
import { CONTEUDO } from "./conteudo.js";

const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const num = (v, padrao) => (v != null && v !== "" && Number.isFinite(+v) ? +v : padrao);
const txt = (id, valor) => { const e = document.getElementById(id); if (e) e.textContent = valor; };
const el = (id) => document.getElementById(id);

// Ícone do WhatsApp: quando a compra é combinada por lá, o botão mostra o
// canal antes do clique — em vez de um link misterioso.
const ZAP_SVG = `<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true" style="flex:none"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z"/></svg>`;

const MSG_COMPRA = (valor) =>
  `Olá! Vi a página do Paraguai Academy e quero garantir meu acesso por ${valor}. Como faço o pagamento?`;
const MSG_DUVIDA = "Olá! Vi a página do Paraguai Academy e tenho uma dúvida antes de comprar.";

// ============================================================
// PARTE 1 — conteúdo local (conteudo.js), sem rede. Roda na hora,
// antes mesmo da página terminar de carregar imagens.
// ============================================================

// Logo e foto de fundo: tenta o arquivo; se não existir, cada <img> já tem o
// onerror certo no HTML (volta para o nome em texto / cor sólida).
function aplicarImagensDeMarca() {
  for (const id of ["marca-logo", "marca-logo-pe"]) {
    const img = el(id);
    if (img && CONTEUDO.logo) img.src = CONTEUDO.logo;
  }
  const heroiFoto = el("heroi-foto");
  if (heroiFoto && CONTEUDO.fronteira) heroiFoto.src = CONTEUDO.fronteira;
  const fechamentoFoto = el("fechamento-foto");
  if (fechamentoFoto && CONTEUDO.fronteira) fechamentoFoto.src = CONTEUDO.fronteira;
}

// Barra de prazo: só existe se houver uma data real.
function aplicarPrazo() {
  const data = (CONTEUDO.prazo?.data || "").trim();
  if (!data) return;
  txt("prazo-data", data);
  el("faixa-prazo")?.removeAttribute("hidden");
}

// Vídeo do herói: capa+play se tiver URL, senão o mesmo "vídeo em breve" do
// resto da plataforma (ver app/components/VideoSlot.js).
function aplicarVideo() {
  const caixa = el("video-caixa");
  if (!caixa) return;
  const { url = "", capa = "", capitulos = [] } = CONTEUDO.video || {};
  const embed = embedUrl(url);

  if (!embed) {
    caixa.innerHTML = `<div class="video-tela" aria-disabled="true">
      <span class="play" style="background:rgba(255,255,255,.12);color:#fff">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
      <span class="conteudo">Vídeo em breve</span></div>`;
  } else {
    caixa.innerHTML = `<div class="video-tela" data-embed="${embed.replace(/"/g, "&quot;")}" role="button" tabindex="0">
      ${capa ? `<img src="${capa}" alt="" onerror="this.remove()"><span class="veu"></span>` : ""}
      <span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
    </div>`;
    const tocar = () => {
      const tela = caixa.querySelector(".video-tela");
      const src = tela?.dataset.embed;
      if (!src) return;
      caixa.innerHTML = `<iframe src="${src}" title="Vídeo da Paraguai Academy"
        allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    };
    caixa.addEventListener("click", tocar, { once: true });
    caixa.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tocar(); }
    }, { once: true });
  }

  const cap = el("video-capitulos");
  if (cap) {
    cap.innerHTML = capitulos.map((c) => `<span><b>${c.tempo}</b>${c.texto}</span>`).join("");
  }
}

// Prova social: número do grupo VIP e prints de alunos. A seção inteira só
// aparece se houver pelo menos um dos dois — nada de caixa vazia no ar.
function aplicarProva() {
  const vip = String(CONTEUDO.grupoVip?.contagem || "").trim();
  const prints = (CONTEUDO.prints || []).filter((p) => p.imagem);

  if (!vip && !prints.length) return; // seção some (fica com o `hidden` do HTML)

  if (vip) {
    txt("vip-numero", vip);
    el("selo-vip")?.removeAttribute("hidden");
  }
  const alvo = el("prints");
  if (alvo && prints.length) {
    alvo.innerHTML = prints.map((p) => `<div class="print-card">
      <img src="${p.imagem}" alt="" onerror="this.closest('.print-card').remove()">
      <p>${p.legenda || ""}</p></div>`).join("");
  }
  el("secao-prova")?.removeAttribute("hidden");
}

// Quem ensina: some inteira sem bio, foto ou nenhum número.
function aplicarMauro() {
  const m = CONTEUDO.mauro || {};
  const temAlgo = m.bio || m.foto || m.anos || m.alunos || m.lojas;
  if (!temAlgo) return;

  if (m.bio) txt("mauro-bio", m.bio);

  const fotoAlvo = el("mauro-foto");
  if (fotoAlvo) {
    fotoAlvo.innerHTML = m.foto
      ? `<img class="mauro-foto" src="${m.foto}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'mauro-foto-fallback\\'>PA</div>'">`
      : `<div class="mauro-foto-fallback">PA</div>`;
  }

  const numeros = [
    [m.anos, "anos importando do Paraguai"],
    [m.alunos, "alunos atendidos"],
    [m.lojas, "lojas verificadas na lista"],
  ].filter(([v]) => v);
  const nAlvo = el("mauro-numeros");
  if (nAlvo && numeros.length) {
    nAlvo.innerHTML = numeros.map(([v, rot]) => `<div><b>${v}</b><span>${rot}</span></div>`).join("");
  }

  el("secao-mauro")?.removeAttribute("hidden");
}

// Print da plataforma: imagem real se houver, senão um retrato desenhado da
// própria tela de Fornecedores (interface real, não é foto de ninguém).
function aplicarPrintPlataforma() {
  const alvo = el("print-plataforma");
  if (!alvo) return;
  const img = CONTEUDO.printPlataforma?.imagem;
  alvo.className = "print-plataforma";
  alvo.innerHTML = img
    ? `<img src="${img}" alt="Tela de fornecedores da Paraguai Academy" onerror="this.parentElement.outerHTML=document.getElementById('mock-fornecedores-tpl').innerHTML">`
    : document.getElementById("mock-fornecedores-tpl")?.innerHTML || "";
}

// ============================================================
// PARTE 2 — preço e WhatsApp (Supabase `configuracoes`), igual já era.
// ============================================================
async function configuracoes() {
  const r = await fetch(`${SB_URL}/rest/v1/configuracoes?select=chave,valor`, { headers: { apikey: SB_KEY } });
  if (!r.ok) throw new Error("config indisponível");
  return Object.fromEntries((await r.json()).map((c) => [c.chave, c.valor]));
}

function aplicarConfig(cfg) {
  const valor = num(cfg.plano_standard_valor ?? cfg.preco_curso, PLANO_PADRAO.standard_valor);
  const vBrl = brl(valor);
  const mentoriaValor = num(cfg.mentoria_valor, 300);

  // ----- preços -----
  txt("cta-hero-valor", vBrl);
  txt("oferta-valor", vBrl.replace(/^R\$\s*/, ""));
  txt("conta-preco", vBrl);
  txt("barra-valor", vBrl);
  txt("garantia-valor", vBrl);
  txt("prazo-preco", vBrl);
  txt("oferta-ancora", brl(mentoriaValor));

  // ----- destino dos botões de compra (igual já era: WhatsApp até existir
  // checkout; o próprio computa a mesma mensagem e o mesmo link para todos) -----
  const zap = soDigitos(cfg.whatsapp_upgrade) || soDigitos(cfg.whatsapp_suporte);
  const linkZap = (msg) => (zap ? `https://wa.me/${zap}?text=${encodeURIComponent(msg)}` : "/#/entrar");
  const porZap = !cfg.url_checkout && !!zap;
  const comprar = cfg.url_checkout || linkZap(MSG_COMPRA(vBrl));
  const externo = /^https?:/.test(comprar);

  for (const id of ["cta-hero", "cta-oferta", "cta-fechamento", "cta-barra"]) {
    const b = el(id);
    if (!b) continue;
    b.href = comprar;
    if (externo) { b.target = "_blank"; b.rel = "noopener"; }
    if (porZap) b.insertAdjacentHTML("afterbegin", ZAP_SVG);
  }
  for (const id of ["link-zap-faq1", "link-zap-pe"]) {
    const a = el(id);
    if (a) a.href = linkZap(MSG_DUVIDA);
  }
  if (cfg.cnpj) txt("cnpj-pe", cfg.cnpj);
}

// ----- barra fixa de compra: aparece depois que o herói sai da tela -----
function barraFixa() {
  const barra = el("barra-fixa");
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

// ----- rastreamento, só se o Pixel estiver na página (igual já era) -----
function rastrear() {
  if (typeof window.fbq !== "function") return;
  try { window.fbq("track", "ViewContent"); } catch {}
  document.addEventListener("click", (ev) => {
    if (!ev.target.closest("#cta-hero, #cta-oferta, #cta-fechamento, #cta-barra")) return;
    try { window.fbq("track", "InitiateCheckout"); } catch {}
  });
}

aplicarImagensDeMarca();
aplicarPrazo();
aplicarVideo();
aplicarProva();
aplicarMauro();
aplicarPrintPlataforma();
barraFixa();
rastrear();
try { aplicarConfig(await configuracoes()); } catch { /* fica com os valores do HTML */ }
