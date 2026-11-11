// Página Início (/app). Saudação, progresso em 8 segmentos, próximo passo,
// vídeo de boas-vindas, atalhos das ferramentas, resumo e nichos.
import { ETAPAS, etapaPorNumero } from "../content/trilha.js";
import {
  statusEtapa, etapaAtual, trilhaConcluida, ferramentaLiberada, nomeNicho,
} from "../auth.js";
import { ETAPA_DA_FERRAMENTA, TOTAL_ETAPAS, NOME_PADRAO } from "../config.js";
import { esc, primeiroNome } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, erro, toast } from "../lib/dom.js";
import { rest } from "../lib/supabase.js";
import {
  configuracoes, mapaConfig, listaFreteiros, listaFornecedores, listarSimulacoes,
  videosDaEtapa, assistidosDoUsuario, marcarAssistido, desmarcarAssistido,
} from "../lib/dados.js";
import * as VideoSlot from "../components/VideoSlot.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const parseMin = (s) => { const m = /(\d+)\s*min/.exec(s), g = /(\d+)\s*s/.exec(s); return (m ? +m[1] : 0) + (g ? +g[1] / 60 : 0); };

// Nomes curtos para a barra de progresso.
const CURTO = { 1: "Comece aqui", 2: "Fornecedores", 3: "Faça as contas", 4: "Pedido", 5: "Travessia", 6: "Nota fiscal", 7: "Envio", 8: "Vender" };
const NOME_FERR = { calculadora: "Calculadora", fornecedores: "Fornecedores", freteiros: "Freteiros", envio: "Envio no Brasil", nota: "Nota fiscal" };

const ATALHOS = [
  { chave: "calculadora", rota: "#/app/calculadora", nome: "Calculadora", icone: "calc", cor: "amarelo", sub: "Custo e preço de venda" },
  { chave: "fornecedores", rota: "#/app/fornecedores", nome: "Fornecedores", icone: "box", cor: "verde", sub: "Paraguai e Brasil" },
  { chave: "freteiros", rota: "#/app/freteiros", nome: "Freteiros", icone: "truck", cor: "amarelo", sub: "Quem traz do Paraguai" },
  { chave: "envio", rota: "#/app/envio", nome: "Envio no Brasil", icone: "send", cor: "verde", sub: "Etiqueta e entrega" },
];

export async function montar(ctx, app, view) {
  view.innerHTML = skeletonLista(4);
  const atual = etapaAtual(ctx);
  let v01 = null, config = {}, nFornec = 0, nFret = 0, nSim = 0, assistidos = new Set(), videosAtual = [];
  try {
    const [vids, cfg, forn, fret, sims, asw, vAt] = await Promise.all([
      rest("videos?select=*&id=eq.V0.1"),
      configuracoes(), listaFornecedores(), listaFreteiros(), listarSimulacoes(),
      assistidosDoUsuario(ctx.uid), atual ? videosDaEtapa(atual) : Promise.resolve([]),
    ]);
    v01 = (vids || [])[0] || null;
    config = mapaConfig(cfg);
    nFornec = (forn || []).length; nFret = (fret || []).length; nSim = (sims || []).length;
    assistidos = new Set((asw || []).map((a) => a.video_id));
    videosAtual = vAt || [];
  } catch (e) { view.innerHTML = erro(e.message); return; }

  const nome = primeiroNome(ctx.perfil?.nome) || NOME_PADRAO;
  const concluida = trilhaConcluida(ctx);
  const e1Concluida = statusEtapa(ctx, 1) === "concluida";
  const admin = ctx.perfil?.papel === "admin";
  const suporte = soDigitos(config.whatsapp_suporte);
  const mentoria = soDigitos(config.mentoria_whatsapp);
  const concluidas = ctx.progresso.filter((p) => p.status === "concluida").length;
  const pct = Math.round((concluidas / TOTAL_ETAPAS) * 100);

  const segmentos = ETAPAS.map((e) => {
    const st = statusEtapa(ctx, e.numero);
    const cls = st === "concluida" ? "ok" : st === "atual" ? "atual" : st === "nao_se_aplica" ? "na" : "";
    const marca = st === "concluida" ? "✓ " : "";
    return `<div class="seg ${cls}"><i></i><span class="seg-lbl">${marca}${e.numero}. ${esc(CURTO[e.numero])}</span></div>`;
  }).join("");

  let cardProximo;
  if (concluida) {
    cardProximo = `<div class="hero-card"><div class="hero-corpo"><small>Parabéns</small>
      <h2>Você concluiu a trilha</h2><p>Baixe seu certificado e, se quiser, libere outro nicho.</p></div>
      <a class="btn" href="#/app/certificado">Baixar certificado</a></div>`;
  } else {
    const c = etapaPorNumero(atual) || ETAPAS[0];
    const nAulas = videosAtual.length;
    const durMin = Math.round(videosAtual.reduce((s, v) => s + parseMin(v.duracao), 0));
    const ferr = c.ferramentas?.[0];
    const meta = [
      nAulas ? `${ic("play", 14)} ${nAulas} ${nAulas === 1 ? "aula" : "aulas"}` : "",
      durMin ? `${ic("clock", 14)} ${durMin} min` : "",
      ferr ? `${ic("calc", 14)} ${NOME_FERR[ferr] || ferr}` : "",
    ].filter(Boolean).join('<span class="meta-sep">·</span>');
    cardProximo = `<div class="hero-card"><div class="hero-corpo"><small>Próximo passo</small>
      <h2>Etapa ${c.numero} · ${esc(c.titulo)}</h2><p>${esc(c.descricao)}</p>
      ${meta ? `<div class="hero-meta">${meta}</div>` : ""}</div>
      <a class="btn hero-btn" href="#/app/trilha/${c.numero}">Continuar ${ic("arrow", 16)}</a></div>`;
  }

  const atalhos = ATALHOS.map((a) => {
    const lib = ferramentaLiberada(ctx, ETAPA_DA_FERRAMENTA[a.chave]);
    return lib
      ? `<a class="atalho cor-${a.cor}" href="${a.rota}">
          <div class="atalho-top"><span class="ib">${ic(a.icone, 20)}</span><span class="seta">${ic("arrow", 16)}</span></div>
          <b>${a.nome}</b><span class="muted">${a.sub}</span></a>`
      : `<div class="atalho travado">
          <div class="atalho-top"><span class="ib">${ic("lock", 20)}</span></div>
          <b>${a.nome}</b><span class="muted">Libera na etapa ${ETAPA_DA_FERRAMENTA[a.chave]}</span></div>`;
  }).join("");

  const nichos = ctx.nichos.map((s) =>
    `<div class="nicho-linha"><span>${esc(nomeNicho(ctx, s))}</span><b class="liberado">${ic("check", 14)} Liberado</b></div>`).join("");
  const linkOutroNicho = suporte
    ? `https://wa.me/${suporte}?text=${encodeURIComponent("Quero liberar outro nicho na Paraguai Academy.")}`
    : "#/app/suporte";

  view.innerHTML = `
    <small class="sobrescrito">Bem-vindo de volta</small>
    <h1>Olá, ${esc(nome)}.</h1>
    <p class="sub">${concluida
      ? `Você concluiu as ${TOTAL_ETAPAS} etapas · 100% da trilha`
      : `Você está na etapa <b class="amarelo">${atual || 1} de ${TOTAL_ETAPAS}</b> · ${pct}% da trilha concluída`}</p>

    <div class="segmentos mt-4">${segmentos}</div>

    ${cardProximo}

    ${!e1Concluida && v01 ? `<div class="mt-4"><h2>Boas-vindas</h2>
      <div class="videos mt-3">${VideoSlot.html(v01, { assistido: assistidos.has("V0.1"), admin })}</div></div>` : ""}

    <h2 class="mt-4">Ferramentas</h2>
    <div class="atalhos mt-3">${atalhos}</div>

    <div class="resumo-num mt-4">
      <div class="num-card"><b>${nFornec}</b><span>fornecedores no seu nicho</span></div>
      <div class="num-card"><b>${nFret}</b><span>freteiros de confiança</span></div>
      <div class="num-card"><b>${nSim}</b><span>simulações salvas</span></div>
    </div>

    <div class="dois-cards mt-4">
      <div class="card"><h2>Seus nichos</h2>
        <div class="mt-3">${nichos || '<span class="muted">Nenhum nicho liberado.</span>'}</div>
        <a class="link mt-3" style="display:inline-block" href="${linkOutroNicho}" ${suporte ? 'target="_blank" rel="noopener"' : ""}>Quero vender outro produto ${ic("arrow", 14)}</a></div>

      <div class="card"><h2>Ficou com dúvida?</h2>
        <p class="muted mt-2">Fale com a equipe. Respondemos em horário comercial.</p>
        <div class="duvida-acoes mt-3">
          ${suporte ? `<a class="btn ok" target="_blank" rel="noopener"
            href="https://wa.me/${suporte}?text=${encodeURIComponent("Olá! Preciso de ajuda com a Paraguai Academy.")}">${ic("send", 15)} Falar com o suporte</a>` : ""}
          <a class="link" href="${mentoria ? `https://wa.me/${mentoria}?text=${encodeURIComponent("Quero uma mentoria individual.")}` : "#/app/trilha/8"}" ${mentoria ? 'target="_blank" rel="noopener"' : ""}>Quero uma mentoria ${ic("arrow", 14)}</a>
        </div></div>
    </div>`;

  view.onclick = async (ev) => {
    const box = ev.target.closest("[data-acao='carregar-video']");
    if (box) { VideoSlot.carregarPlayer(box); return; }
    const a = ev.target.closest("[data-acao='assistir']");
    if (a) {
      const id = a.dataset.video; a.disabled = true;
      try {
        if (assistidos.has(id)) { await desmarcarAssistido(ctx.uid, id); assistidos.delete(id); }
        else { await marcarAssistido(ctx.uid, id); assistidos.add(id); }
        a.outerHTML = VideoSlot.botaoAssistir(id, assistidos.has(id));
      } catch (e) { toast(e.message); a.disabled = false; }
    }
  };
}
