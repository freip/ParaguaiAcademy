// Navegação da área do aluno: barra lateral (desktop), barra de topo e
// menu inferior (celular). Itens do Pro aparecem com cadeado no Standard.
import { ic } from "./lib/icons.js";
import { logoHTML } from "./lib/logo.js";
import { GRUPO_COMUNIDADE, ROTA_PLANO, NOME_PADRAO, TOTAL_ETAPAS } from "./config.js";
import { trilhaConcluida, etapaAtual, ehPro } from "./auth.js";
import * as Upgrade from "./components/Upgrade.js";

const iniciais = (nome) => (nome || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "AL";

const PRINCIPAIS = [
  { id: "inicio", rota: "#/app",        nome: "Início",  icone: "home" },
  { id: "trilha", rota: "#/app/trilha", nome: "Trilha",  icone: "map" },
];
const FERRAMENTAS = [
  { id: "calculadora",  rota: "#/app/calculadora",  nome: "Calculadora",     icone: "calc" },
  { id: "fornecedores", rota: "#/app/fornecedores", nome: "Fornecedores",    icone: "box" },
  { id: "freteiros",    rota: "#/app/freteiros",    nome: "Freteiros",       icone: "truck" },
  { id: "envio",        rota: "#/app/envio",        nome: "Envio no Brasil", icone: "send" },
];
// Itens do plano Pro: no Standard viram cadeado que leva à página de planos.
const DO_PRO = [
  { id: "compras-coletivas", rota: "#/app/compras-coletivas", nome: "Compras coletivas", icone: "cart",  pro: true },
  { id: "mentoria",          rota: "#/app/mentoria",          nome: "Mentoria Pro",      icone: "video", pro: true },
];
const OUTROS = [
  { id: "loja-parceira", rota: "#/app/loja-parceira", nome: "Loja parceira", icone: "bag" },
  { id: "comunidade",    rota: GRUPO_COMUNIDADE,      nome: "Comunidade",    icone: "users", externo: true },
  { id: "suporte",       rota: "#/app/suporte",       nome: "Suporte",       icone: "help" },
  { id: "certificado",   rota: "#/app/certificado",   nome: "Certificado",   icone: "award", certificado: true },
];

const rotaBase = () => "#" + (location.hash.slice(1) || "/app").split("/").slice(0, 3).join("/");
const ativo = (rota) => rotaBase() === rota ? " ativo" : "";

function itemLink(item, ctx, { ib = 19 } = {}) {
  // Item do Pro no plano Standard: cadeado que leva aos planos.
  if (item.pro && !ehPro(ctx)) {
    return `<a class="nav travado-pro" href="${ROTA_PLANO}" title="Disponível no plano Pro">
      <span class="ib">${ic("lock", ib)}</span>${item.nome}<span class="lock-tip">Pro</span></a>`;
  }
  // Certificado travado
  if (item.certificado && !trilhaConcluida(ctx)) {
    return `<button class="nav travado" title="Conclua as ${TOTAL_ETAPAS} etapas">
      <span class="ib">${ic("lock", ib)}</span>${item.nome}<span class="lock-tip">${TOTAL_ETAPAS} etapas</span></button>`;
  }
  const alvo = item.externo ? ` target="_blank" rel="noopener"` : "";
  const extra = item.id === "trilha" && etapaAtual(ctx)
    ? `<span class="badge">Etapa ${etapaAtual(ctx)} de ${TOTAL_ETAPAS}</span>` : "";
  return `<a class="nav${ativo(item.rota)}" href="${item.rota}"${alvo}>
    <span class="ib">${ic(item.icone, ib)}</span>${item.nome}${extra}</a>`;
}

function blocoPerfil(ctx) {
  const nome = ctx?.perfil?.nome || NOME_PADRAO;
  return `<a class="profile" href="${ROTA_PLANO}">
    <div class="avatar">${iniciais(ctx?.perfil?.nome)}</div>
    <div class="profile-info"><b class="nome">${nome}</b>
      <div class="perfil-selos">${Upgrade.selo(ctx)}</div></div>
  </a>`;
}

function sidebar(ctx) {
  const rodape = ehPro(ctx)
    ? `<a class="btn-comunidade" href="${GRUPO_COMUNIDADE}" target="_blank" rel="noopener">Comunidade de importados</a>`
    : `<a class="btn-upgrade" href="${ROTA_PLANO}">${ic("star", 14)} Conhecer o plano Pro</a>`;
  return `<a class="brand" href="#/app">${logoHTML()}</a>
    ${blocoPerfil(ctx)}
    <nav class="side-nav">
      ${PRINCIPAIS.map((i) => itemLink(i, ctx)).join("")}
      <div class="nav-group-label">Ferramentas</div>
      ${FERRAMENTAS.map((i) => itemLink(i, ctx)).join("")}
      <div class="nav-group-label">Plano Pro</div>
      ${DO_PRO.map((i) => itemLink(i, ctx)).join("")}
      <div class="nav-group-label">Mais</div>
      ${OUTROS.map((i) => itemLink(i, ctx)).join("")}
    </nav>
    ${rodape}`;
}

function topbar(ctx) {
  const nome = ctx?.perfil?.nome || NOME_PADRAO;
  const selo = ehPro(ctx)
    ? Upgrade.selo(ctx)
    : `<a class="selo-plano link-plano" href="${ROTA_PLANO}">${ic("star", 11)} Virar Pro</a>`;
  return `<a class="brand" href="#/app">${logoHTML()}</a>
    <span class="sp"></span>
    ${selo}
    <button class="notif" aria-label="Notificações">${ic("bell", 18)}</button>
    <div class="avatar sm" title="${nome}">${iniciais(ctx?.perfil?.nome)}</div>`;
}

function bottomnav(ctx) {
  const curtos = [
    { id: "inicio", rota: "#/app", nome: "Início", icone: "home" },
    { id: "trilha", rota: "#/app/trilha", nome: "Trilha", icone: "map" },
    { id: "calculadora", rota: "#/app/calculadora", nome: "Calcular", icone: "calc" },
    { id: "fornecedores", rota: "#/app/fornecedores", nome: "Fornec.", icone: "box" },
  ];
  const cel = (i) => `<a class="${ativo(i.rota)}" href="${i.rota}">${ic(i.icone, 20)}${i.nome}</a>`;
  return curtos.map(cel).join("") +
    `<button id="btn-mais">${ic("more", 20)}Mais</button>`;
}

function sheetMais(ctx) {
  const itens = [...FERRAMENTAS.slice(2), ...DO_PRO, ...OUTROS];
  const upgrade = ehPro(ctx) ? "" : Upgrade.faixa(ctx, { compacta: true, texto: "Compras coletivas e mentoria exclusiva." });
  return `<div class="row-between" style="margin-bottom:8px">
      <strong>Mais</strong>
      <button class="link" id="fechar-mais">Fechar</button>
    </div>
    ${upgrade}
    ${itens.map((i) => itemLink(i, ctx)).join("")}
    <a class="nav" href="${ROTA_PLANO}"><span class="ib">${ic("star", 19)}</span>Meu plano${ehPro(ctx) ? "" : '<span class="lock-tip">Standard</span>'}</a>
    <a class="nav" href="#/sair">${ic("logout", 19)}<span class="ib" style="display:none"></span>Sair</a>`;
}

export function montarNav(ctx) {
  const sb = document.getElementById("sidebar");
  const tb = document.getElementById("topbar");
  const bn = document.getElementById("bottomnav");
  const sh = document.getElementById("sheet");
  if (sb) sb.innerHTML = sidebar(ctx);
  if (tb) tb.innerHTML = topbar(ctx);
  if (bn) bn.innerHTML = bottomnav(ctx);
  if (sh) sh.innerHTML = sheetMais(ctx);

  const bg = document.getElementById("sheet-bg");
  const abrir = () => { sh?.classList.add("on"); bg?.classList.add("on"); };
  const fechar = () => { sh?.classList.remove("on"); bg?.classList.remove("on"); };
  document.getElementById("btn-mais")?.addEventListener("click", abrir);
  document.getElementById("fechar-mais")?.addEventListener("click", fechar);
  bg?.addEventListener("click", fechar);
  // Clicar num link da folha navega e fecha.
  sh?.addEventListener("click", (ev) => { if (ev.target.closest("a")) fechar(); });
}
