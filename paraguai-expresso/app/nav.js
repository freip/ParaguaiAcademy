// Navegação da área do aluno: barra lateral (desktop), barra de topo e
// menu inferior (celular). Os itens seguem a ordem da seção 3.1.
import { ic } from "./lib/icons.js";
import { GRUPO_COMUNIDADE, ETAPA_DA_FERRAMENTA, NOME_PADRAO, TOTAL_ETAPAS } from "./config.js";
import {
  ferramentaLiberada, trilhaConcluida, etapaAtual, nomeNicho,
} from "./auth.js";

const PRINCIPAIS = [
  { id: "inicio", rota: "#/app",        nome: "Início",  icone: "home" },
  { id: "trilha", rota: "#/app/trilha", nome: "Trilha",  icone: "map" },
];
const FERRAMENTAS = [
  { id: "calculadora",  rota: "#/app/calculadora",  nome: "Calculadora",     icone: "calc", ferramenta: "calculadora" },
  { id: "fornecedores", rota: "#/app/fornecedores", nome: "Fornecedores",    icone: "box",  ferramenta: "fornecedores" },
  { id: "freteiros",    rota: "#/app/freteiros",    nome: "Freteiros",       icone: "truck", ferramenta: "freteiros" },
  { id: "envio",        rota: "#/app/envio",        nome: "Envio no Brasil", icone: "send", ferramenta: "envio" },
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
  // Ferramenta ainda travada
  if (item.ferramenta && !ferramentaLiberada(ctx, ETAPA_DA_FERRAMENTA[item.ferramenta])) {
    const n = ETAPA_DA_FERRAMENTA[item.ferramenta];
    return `<button class="nav travado" title="Libera na etapa ${n}">
      <span class="ib">${ic("lock", ib)}</span>${item.nome}<span class="lock-tip">Etapa ${n}</span></button>`;
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
  const chips = (ctx?.nichos || []).map((s) => `<span class="nicho-chip">${nomeNicho(ctx, s)}</span>`).join("");
  return `<div class="profile">
    <div class="avatar">${ic("user", 40)}</div>
    <span class="nome">${nome}</span>
    <div class="nichos">${chips || '<span class="muted" style="font-size:12px">Sem nicho liberado</span>'}</div>
  </div>`;
}

function sidebar(ctx) {
  return `<div class="brand">
      <a class="logo" href="#/app">PARAGUAI <span>ACADEMY</span></a>
      <span class="lang">BR ${ic("down", 12)}</span>
    </div>
    ${blocoPerfil(ctx)}
    ${PRINCIPAIS.map((i) => itemLink(i, ctx)).join("")}
    <div class="nav-group-label">Ferramentas</div>
    ${FERRAMENTAS.map((i) => itemLink(i, ctx)).join("")}
    <div class="nav-group-label">Mais</div>
    ${OUTROS.map((i) => itemLink(i, ctx)).join("")}`;
}

function topbar(ctx) {
  const nome = ctx?.perfil?.nome || NOME_PADRAO;
  return `<a class="logo" href="#/app">PARAGUAI <span>ACADEMY</span></a>
    <span class="sp"></span>
    <button class="notif" aria-label="Notificações">${ic("bell", 16)}</button>
    <div class="avatar" style="width:34px;height:34px" title="${nome}">${ic("user", 20)}</div>`;
}

function bottomnav(ctx) {
  const curtos = [
    { id: "inicio", rota: "#/app", nome: "Início", icone: "home" },
    { id: "trilha", rota: "#/app/trilha", nome: "Trilha", icone: "map" },
    { id: "calculadora", rota: "#/app/calculadora", nome: "Calcular", icone: "calc", ferramenta: "calculadora" },
    { id: "fornecedores", rota: "#/app/fornecedores", nome: "Fornec.", icone: "box", ferramenta: "fornecedores" },
  ];
  const cel = (i) => {
    const travada = i.ferramenta && !ferramentaLiberada(ctx, ETAPA_DA_FERRAMENTA[i.ferramenta]);
    const icone = travada ? "lock" : i.icone;
    const cls = travada ? "" : ativo(i.rota);
    return travada
      ? `<button class="${cls}">${ic(icone, 20)}${i.nome}</button>`
      : `<a class="${cls}" href="${i.rota}">${ic(icone, 20)}${i.nome}</a>`;
  };
  return curtos.map(cel).join("") +
    `<button id="btn-mais">${ic("more", 20)}Mais</button>`;
}

function sheetMais(ctx) {
  const itens = [...FERRAMENTAS.slice(2), ...OUTROS];
  return `<div class="row-between" style="margin-bottom:8px">
      <strong>Mais</strong>
      <button class="link" id="fechar-mais">Fechar</button>
    </div>
    ${itens.map((i) => itemLink(i, ctx)).join("")}
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
}
