// Página de uma etapa da trilha. Mesmo layout para as 8 etapas: cabeçalho,
// vídeos, resumo, recursos (inclui ferramentas embutidas), mensagens prontas,
// checklist, botão "Concluí esta etapa" (bloqueio no servidor) e navegação.
import {
  etapaPorNumero, COMO_FUNCIONA, SINAIS_GOLPE, CHECKLIST_ANTES_PAGAR, LINHA_TEMPO,
} from "../content/trilha.js";
import { statusEtapa, etapaAtual, nomeNicho } from "../auth.js";
import { TOTAL_ETAPAS } from "../config.js";
import { esc, brl } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, erro, toast } from "../lib/dom.js";
import {
  videosDaEtapa, checklistDaEtapa, assistidosDoUsuario, marcarAssistido,
  desmarcarAssistido, configuracoes, mapaConfig, marcarChecklist, concluirEtapa,
  definirCaminho, escolherNichoPrincipal,
} from "../lib/dados.js";
import * as VideoSlot from "../components/VideoSlot.js";
import * as MensagemPronta from "../components/MensagemPronta.js";
import * as Checklist from "../components/Checklist.js";
import * as fornecedores from "../tools/fornecedores.js";
import * as freteiros from "../tools/freteiros.js";
import * as envio from "../tools/envio.js";
import * as calculadora from "../tools/calculadora.js";

const anteriorNavegavel = (ctx, n) => {
  for (let m = n - 1; m >= 1; m--) if (statusEtapa(ctx, m) !== "nao_se_aplica") return m;
  return null;
};
const proximaNavegavel = (ctx, n) => {
  for (let m = n + 1; m <= TOTAL_ETAPAS; m++) if (statusEtapa(ctx, m) !== "nao_se_aplica") return m;
  return null;
};

export async function montar(ctx, app, view, numero) {
  numero = Math.min(Math.max(1, +numero || 1), TOTAL_ETAPAS);
  const conteudo = etapaPorNumero(numero);
  if (!conteudo) { view.innerHTML = erro("Etapa não encontrada."); return; }

  const status = statusEtapa(ctx, numero);
  const voltar = `<a class="link" href="#/app/trilha">${ic("map", 15)} Voltar à trilha</a>`;

  // Guardas de acesso por URL direta
  if (status === "bloqueada") {
    view.innerHTML = `${voltar}<h1 class="mt-3">Etapa ${numero}</h1>
      <div class="card mt-4"><span class="aviso">Conclua a etapa ${numero - 1} para liberar esta.</span></div>`;
    view.onclick = null; return;
  }
  if (status === "nao_se_aplica") {
    view.innerHTML = `${voltar}<h1 class="mt-3">Etapa ${numero}</h1>
      <div class="card mt-4"><span class="aviso">Esta etapa não se aplica ao caminho Brasil.</span>
      <button class="btn plain mt-3" data-acao="mudar-caminho">Mudar para o caminho Paraguai</button></div>`;
    view.onclick = async (ev) => {
      if (!ev.target.closest("[data-acao='mudar-caminho']")) return;
      try { await definirCaminho("paraguai"); await app.atualizar(); } catch (e) { toast(e.message); }
    };
    return;
  }

  // Carrega os dados da etapa
  view.innerHTML = voltar + skeletonLista(4);
  let videos = [], defsChecklist = [], assistidos = new Set(), config = {};
  try {
    const [vs, cl, asw, cfg] = await Promise.all([
      videosDaEtapa(numero), checklistDaEtapa(numero), assistidosDoUsuario(ctx.uid), configuracoes(),
    ]);
    videos = vs || [];
    defsChecklist = cl || [];
    assistidos = new Set((asw || []).map((a) => a.video_id));
    config = mapaConfig(cfg);
  } catch (e) { view.innerHTML = erro(e.message); return; }

  const prog = ctx.progresso.find((p) => p.etapa === numero) || { checklist: {} };
  const estado = { ...(prog.checklist || {}) };
  const soLeitura = status !== "atual";
  const admin = ctx.perfil?.papel === "admin";
  const caminho = ctx.perfil?.caminho || "paraguai";
  const mensagens = (conteudo.mensagens || []).filter((m) => !m.caminho || m.caminho === caminho);
  const el = (id) => document.getElementById(id);

  view.innerHTML = `${voltar}
    <div class="mt-3"><span class="muted">Etapa ${numero} de ${TOTAL_ETAPAS}</span>
      <h1>${esc(conteudo.titulo)}</h1><p class="sub">${esc(conteudo.descricao)}</p></div>
    ${videos.length ? `<div class="videos mt-4">${videos.map((v) =>
      VideoSlot.html(v, { assistido: assistidos.has(v.id), admin })).join("")}</div>` : ""}
    <div class="card mt-4"><h2>Resumo</h2>
      <ul class="resumo mt-3">${conteudo.resumo.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    ${blocosEspeciais(conteudo, ctx, config)}
    ${mensagens.length ? `<div class="mt-4"><h2>Mensagens prontas</h2>
      <p class="sub">Copie, troque o que está entre [colchetes] e envie.</p>
      ${mensagens.map((m, i) => MensagemPronta.html(m, i, {})).join("")}</div>` : ""}
    <div id="bloco-checklist" class="mt-4">${Checklist.html(defsChecklist, estado, soLeitura)}</div>
    ${navegacao(ctx, numero)}`;

  // Monta as ferramentas embutidas (mesmo componente da página)
  for (const f of conteudo.ferramentas || []) {
    const alvo = el(`embed-${f}`);
    if (!alvo) continue;
    if (f === "fornecedores") fornecedores.montar(ctx, app, alvo, { embutido: true });
    else if (f === "freteiros") freteiros.montar(ctx, app, alvo, { embutido: true });
    else if (f === "envio") envio.montar(ctx, app, alvo, { embutido: true });
    else if (f === "calculadora") calculadora.montar(ctx, app, alvo, { embutido: true, modoPreco: numero === 8 ? "preco" : "margem" });
  }

  const renderChecklist = () => {
    const c = el("bloco-checklist");
    if (c) c.innerHTML = Checklist.html(defsChecklist, estado, soLeitura);
  };

  view.onkeydown = (ev) => {
    const box = ev.target.closest?.("[data-acao='carregar-video']");
    if (box && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); VideoSlot.carregarPlayer(box); }
  };

  view.onclick = async (ev) => {
    const alvo = ev.target.closest("[data-acao]");
    if (!alvo) return;
    const acao = alvo.dataset.acao;

    if (acao === "carregar-video") { VideoSlot.carregarPlayer(alvo); return; }
    if (acao === "copiar") { MensagemPronta.copiar(alvo, mensagens[+alvo.dataset.idx].texto); return; }

    if (acao === "assistir") {
      const id = alvo.dataset.video; alvo.disabled = true;
      try {
        if (assistidos.has(id)) { await desmarcarAssistido(ctx.uid, id); assistidos.delete(id); }
        else { await marcarAssistido(ctx.uid, id); assistidos.add(id); }
        alvo.outerHTML = VideoSlot.botaoAssistir(id, assistidos.has(id));
      } catch (e) { toast(e.message); alvo.disabled = false; }
      return;
    }

    if (acao === "check") {
      const item = alvo.dataset.item; const novo = estado[item] !== true;
      alvo.disabled = true;
      try { await marcarChecklist(numero, item, novo); estado[item] = novo; renderChecklist(); }
      catch (e) { toast(e.message); alvo.disabled = false; }
      return;
    }

    if (acao === "concluir") {
      alvo.disabled = true; alvo.textContent = "Salvando...";
      try {
        await concluirEtapa(numero);
        await app.recarregar();
        const prox = etapaAtual(app.ctx());
        if (prox) { toast(`Etapa ${prox} liberada`); location.hash = `#/app/trilha/${prox}`; }
        else { toast("Você concluiu a trilha"); location.hash = "#/app/trilha"; }
      } catch (e) { toast(e.message); alvo.disabled = false; alvo.textContent = "Concluí esta etapa"; }
      return;
    }

    if (acao === "escolher-nicho") {
      try { await escolherNichoPrincipal(alvo.dataset.nicho); await app.atualizar(); }
      catch (e) { toast(e.message); }
      return;
    }
    if (acao === "escolher-caminho" || acao === "mudar-caminho") {
      const c = acao === "mudar-caminho" ? "paraguai" : alvo.dataset.caminho;
      try { await definirCaminho(c); await app.atualizar(); } catch (e) { toast(e.message); }
      return;
    }
  };
}

// ---------- Recursos especiais por etapa ----------

function blocosEspeciais(conteudo, ctx, config) {
  let out = "";
  if (conteudo.comoFunciona) out += cardComoFunciona();
  if (conteudo.pedeNicho) out += cardEscolhaNicho(ctx);
  if (conteudo.sinaisGolpe) out += cardSinaisGolpe();
  if (conteudo.pedeCaminho) out += cardEscolhaCaminho(ctx);
  for (const f of conteudo.ferramentas || []) out += f === "nota" ? cardNota() : cardFerramenta(f);
  if (conteudo.checklistAntesPagar) out += cardAntesPagar();
  if (conteudo.linhaTempo) out += cardLinhaTempo();
  if (conteudo.mentoria) out += cardMentoria(config);
  return out;
}

const cardComoFunciona = () =>
  `<div class="card mt-4"><h2>Como funciona</h2>
    <div class="grid-cards mt-3">${COMO_FUNCIONA.map((c) =>
      `<div class="mini-card"><span class="num">${c.n}</span><b>${esc(c.titulo)}</b>
        <span class="muted">${esc(c.texto)}</span></div>`).join("")}</div></div>`;

const cardSinaisGolpe = () =>
  `<div class="card mt-4"><h2>5 sinais de golpe</h2>
    <ul class="resumo mt-3">${SINAIS_GOLPE.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`;

const cardAntesPagar = () =>
  `<div class="card mt-4"><h2>Antes de pagar</h2>
    <ul class="resumo mt-3">${CHECKLIST_ANTES_PAGAR.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
    <p class="muted mt-3" style="font-size:13px">Lista informativa, para conferir antes de transferir.</p></div>`;

const cardLinhaTempo = () =>
  `<div class="card mt-4"><h2>O caminho da mercadoria</h2>
    <div class="timeline mt-3">${LINHA_TEMPO.map((p, i) =>
      `<span class="tl-item">${esc(p)}</span>${i < LINHA_TEMPO.length - 1 ? '<span class="tl-seta">→</span>' : ""}`).join("")}</div></div>`;

function cardEscolhaNicho(ctx) {
  if (ctx.nichos.length <= 1) {
    const slug = ctx.nichos[0];
    return `<div class="card mt-4"><h2>Seu nicho</h2>
      <p class="mt-3">Seu nicho: <b>${slug ? esc(nomeNicho(ctx, slug)) : "nenhum liberado"}</b></p></div>`;
  }
  const atual = ctx.perfil?.nicho_principal;
  return `<div class="card mt-4"><h2>Escolha seu nicho principal</h2>
    <div class="chips mt-3">${ctx.nichos.map((s) =>
      `<button class="chip-btn${s === atual ? " on" : ""}" data-acao="escolher-nicho" data-nicho="${esc(s)}">
        ${esc(nomeNicho(ctx, s))}</button>`).join("")}</div></div>`;
}

function cardEscolhaCaminho(ctx) {
  const c = ctx.perfil?.caminho || "paraguai";
  const opcao = (valor, titulo, texto) =>
    `<button class="escolha-card${c === valor ? " on" : ""}" data-acao="escolher-caminho" data-caminho="${valor}">
      <b>${titulo}</b><span class="muted">${texto}</span></button>`;
  return `<div class="card mt-4"><h2>Como você vai comprar?</h2>
    <p class="sub">Isso define se as etapas 5 e 6 (travessia e nota) se aplicam a você.</p>
    <div class="escolha-grid mt-3">
      ${opcao("paraguai", "Vou comprar do Paraguai", "Passa pela travessia e pela nota fiscal.")}
      ${opcao("brasil", "Vou comprar no Brasil", "Sem travessia; o fornecedor envia direto.")}
    </div></div>`;
}

function cardFerramenta(f) {
  const nomes = { fornecedores: "Fornecedores", freteiros: "Freteiros", envio: "Envio no Brasil", calculadora: "Calculadora" };
  return `<h2 class="embed-title mt-4">${nomes[f] || f}</h2><div id="embed-${f}"></div>`;
}

const cardNota = () =>
  `<div class="card mt-4"><h2>Nota fiscal</h2>
    <span class="aviso mt-3">Emita a nota antes de gerar a etiqueta de envio.</span>
    <ul class="resumo mt-3">
      <li>Até R$ 1.650,00 em produtos: R$ 100,00 por nota.</li>
      <li>Acima de R$ 1.650,00: 7% sobre o valor total da nota.</li>
    </ul>
    <p class="muted" style="font-size:13px">Confirme os valores e os documentos com a equipe antes da emissão.</p></div>`;

function cardMentoria(config) {
  const titulo = config.mentoria_titulo || "Mentoria individual com o Mauro";
  const valor = config.mentoria_valor ? ` Valor: ${brl(+config.mentoria_valor)}.` : "";
  const whats = (config.mentoria_whatsapp || "").replace(/\D/g, "");
  const botao = whats
    ? `<a class="btn ok mt-3" target="_blank" rel="noopener"
         href="https://wa.me/${whats}?text=${encodeURIComponent("Quero fazer a mentoria individual.")}">
         Quero a mentoria</a>`
    : `<p class="muted mt-3">Contato da mentoria em breve.</p>`;
  return `<div class="card mt-4"><h2>${esc(titulo)}</h2>
    <p class="mt-3">Quer ajuda individual? Faça uma mentoria com o Mauro.${valor}</p>${botao}</div>`;
}

function navegacao(ctx, numero) {
  const prev = anteriorNavegavel(ctx, numero);
  const next = proximaNavegavel(ctx, numero);
  const nextBloq = !next || statusEtapa(ctx, next) === "bloqueada";
  return `<div class="row-between mt-4">
    ${prev ? `<a class="btn plain" href="#/app/trilha/${prev}">Etapa anterior</a>` : "<span></span>"}
    ${!nextBloq ? `<a class="btn plain" href="#/app/trilha/${next}">Próxima etapa</a>`
      : `<button class="btn plain" disabled>Próxima etapa</button>`}
  </div>`;
}
