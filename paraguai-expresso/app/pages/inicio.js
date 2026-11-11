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
  assistidosDoUsuario, marcarAssistido, desmarcarAssistido,
} from "../lib/dados.js";
import * as VideoSlot from "../components/VideoSlot.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

const ATALHOS = [
  { chave: "calculadora", rota: "#/app/calculadora", nome: "Calculadora", icone: "calc" },
  { chave: "fornecedores", rota: "#/app/fornecedores", nome: "Fornecedores", icone: "box" },
  { chave: "freteiros", rota: "#/app/freteiros", nome: "Freteiros", icone: "truck" },
  { chave: "envio", rota: "#/app/envio", nome: "Envio no Brasil", icone: "send" },
];

export async function montar(ctx, app, view) {
  view.innerHTML = skeletonLista(4);
  let v01 = null, config = {}, nFornec = 0, nFret = 0, nSim = 0, assistidos = new Set();
  try {
    const [vids, cfg, forn, fret, sims, asw] = await Promise.all([
      rest("videos?select=*&id=eq.V0.1"),
      configuracoes(), listaFornecedores(), listaFreteiros(), listarSimulacoes(),
      assistidosDoUsuario(ctx.uid),
    ]);
    v01 = (vids || [])[0] || null;
    config = mapaConfig(cfg);
    nFornec = (forn || []).length; nFret = (fret || []).length; nSim = (sims || []).length;
    assistidos = new Set((asw || []).map((a) => a.video_id));
  } catch (e) { view.innerHTML = erro(e.message); return; }

  const nome = primeiroNome(ctx.perfil?.nome) || NOME_PADRAO;
  const atual = etapaAtual(ctx);
  const concluida = trilhaConcluida(ctx);
  const e1Concluida = statusEtapa(ctx, 1) === "concluida";
  const admin = ctx.perfil?.papel === "admin";
  const suporte = soDigitos(config.whatsapp_suporte);

  const segmentos = ETAPAS.map((e) => {
    const st = statusEtapa(ctx, e.numero);
    const cls = st === "concluida" ? "ok" : st === "atual" ? "atual" : st === "nao_se_aplica" ? "na" : "";
    return `<div class="seg ${cls}" title="${esc(e.titulo)}"><i></i><span>${e.numero}</span></div>`;
  }).join("");

  const cardProximo = concluida
    ? `<div class="hero-card"><div><small>Parabéns</small><h2>Você concluiu a trilha</h2>
        <p>Baixe seu certificado e, se quiser, libere outro nicho.</p></div>
        <a class="btn" href="#/app/certificado">Baixar certificado</a></div>`
    : (() => {
        const c = etapaPorNumero(atual) || ETAPAS[0];
        return `<div class="hero-card"><div><small>Próximo passo</small>
          <h2>Etapa ${c.numero}: ${esc(c.titulo)}</h2><p>${esc(c.descricao)}</p></div>
          <a class="btn" href="#/app/trilha/${c.numero}">Continuar</a></div>`;
      })();

  const atalhos = ATALHOS.map((a) => {
    const lib = ferramentaLiberada(ctx, ETAPA_DA_FERRAMENTA[a.chave]);
    return lib
      ? `<a class="atalho" href="${a.rota}"><span class="ib">${ic(a.icone, 20)}</span>${a.nome}</a>`
      : `<div class="atalho travado"><span class="ib">${ic("lock", 20)}</span>${a.nome}
          <span class="muted" style="font-size:11px">Etapa ${ETAPA_DA_FERRAMENTA[a.chave]}</span></div>`;
  }).join("");

  const nichos = ctx.nichos.map((s) =>
    `<div class="nicho-linha"><span>${esc(nomeNicho(ctx, s))}</span><b class="liberado">Liberado</b></div>`).join("");
  const linkOutroNicho = suporte
    ? `https://wa.me/${suporte}?text=${encodeURIComponent("Quero liberar outro nicho na Paraguai Academy.")}`
    : "#/app/suporte";

  view.innerHTML = `
    <small class="sobrescrito">Bem-vindo de volta</small>
    <h1>Olá, ${esc(nome)}.</h1>
    <p class="sub">${concluida ? "Você concluiu as 8 etapas." : `Você está na etapa ${atual || 1} de ${TOTAL_ETAPAS}.`}</p>

    <div class="segmentos mt-4">${segmentos}</div>

    ${cardProximo}

    ${!e1Concluida && v01 ? `<div class="mt-4"><h2>Boas-vindas</h2>
      <div class="videos mt-3">${VideoSlot.html(v01, { assistido: assistidos.has("V0.1"), admin })}</div></div>` : ""}

    <h2 class="mt-4">Ferramentas</h2>
    <div class="atalhos mt-3">${atalhos}</div>

    <div class="resumo-num mt-4">
      <div class="num-card"><b>${nFornec}</b><span>fornecedores do seu nicho</span></div>
      <div class="num-card"><b>${nFret}</b><span>freteiros</span></div>
      <div class="num-card"><b>${nSim}</b><span>simulações salvas</span></div>
    </div>

    <div class="card mt-4"><h2>Seus nichos</h2>
      <div class="mt-3">${nichos || '<span class="muted">Nenhum nicho liberado.</span>'}</div>
      <a class="link mt-3" style="display:inline-block" href="${linkOutroNicho}" ${suporte ? 'target="_blank" rel="noopener"' : ""}>Quero vender outro produto</a></div>

    <div class="card mt-4"><h2>Ficou com dúvida?</h2>
      <p class="muted mt-2">Fale com a equipe. Respondemos em horário comercial.</p>
      ${suporte ? `<a class="btn ok mt-3" target="_blank" rel="noopener"
        href="https://wa.me/${suporte}?text=${encodeURIComponent("Olá! Preciso de ajuda com a Paraguai Academy.")}">Falar com o suporte</a>`
        : '<p class="aviso mt-2">Configure o WhatsApp do suporte no admin.</p>'}
      <a class="link mt-3" style="display:block" href="#/app/trilha/8">Quero uma mentoria individual</a></div>`;

  // vídeo de boas-vindas (play + marcar assistida)
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
