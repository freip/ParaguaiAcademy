// Ponto de entrada: decide entre página pública, login, troca de senha e a
// área do aluno, e cuida da navegação por hash.
import { sessaoAtiva } from "./lib/supabase.js";
import {
  carregarContexto, precisaTrocarSenha, temAcesso, sair as logout,
} from "./auth.js";
import { PAGINA_VENDAS } from "./config.js";
import { montarNav } from "./nav.js";
import * as login from "./pages/login.js";
import * as trocarSenha from "./pages/trocarSenha.js";
import * as placeholders from "./pages/placeholders.js";
import * as trilha from "./pages/trilha.js";
import * as etapa from "./pages/etapa.js";
import * as fornecedores from "./tools/fornecedores.js";
import * as freteiros from "./tools/freteiros.js";
import * as envio from "./tools/envio.js";
import * as calculadora from "./tools/calculadora.js";
import * as lojaParceira from "./pages/lojaParceira.js";
import * as inicio from "./pages/inicio.js";
import * as suporte from "./pages/suporte.js";
import * as certificado from "./pages/certificado.js";
import * as plano from "./pages/plano.js";
import * as comprasColetivas from "./pages/comprasColetivas.js";
import * as mentoria from "./pages/mentoria.js";

// Telas da área do aluno por rota. Cada módulo exporta montar(ctx, app, view).
// As de plano Pro tratam o cadeado por dentro (mostram a prévia ao Standard).
const ROTAS = {
  "#/app/trilha": trilha,
  "#/app/calculadora": calculadora,
  "#/app/fornecedores": fornecedores,
  "#/app/freteiros": freteiros,
  "#/app/envio": envio,
  "#/app/compras-coletivas": comprasColetivas,
  "#/app/mentoria": mentoria,
  "#/app/plano": plano,
  "#/app/loja-parceira": lojaParceira,
  "#/app/suporte": suporte,
  "#/app/certificado": certificado,
};

let ctx = null;
let ctxCarregado = false;
let shellMontado = false;

const root = () => document.getElementById("root");

function rotaAtual() {
  const h = location.hash || "#/";
  const base = "#" + (h.slice(1) || "/").split("/").slice(0, 3).join("/");
  return { h, base };
}

const app = {
  ctx() { return ctx; },
  navegar(rota) { location.hash = rota; },
  async aposLogin(novoCtx) {
    ctx = novoCtx;
    ctxCarregado = true;
    location.hash = precisaTrocarSenha(ctx) ? "#/trocar-senha" : "#/app";
    render();
  },
  async recarregar() { try { ctx = await carregarContexto(); } catch {} },
  async atualizar() { await this.recarregar(); render(); },
  sair() { logout(); ctx = null; location.replace(PAGINA_VENDAS); },
};

// A página de vendas é um arquivo próprio (/plataforma), fora da SPA.
const irParaVendas = () => { location.replace(PAGINA_VENDAS); };

function telaSimples(html) {
  shellMontado = false;
  root().innerHTML = html;
}

function montarShell() {
  if (shellMontado) return;
  root().innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sidebar"></aside>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column">
        <div class="topbar" id="topbar"></div>
        <main class="main" id="view"></main>
      </div>
    </div>
    <nav class="bottomnav" id="bottomnav"></nav>
    <div class="sheet-bg" id="sheet-bg"></div>
    <div class="sheet" id="sheet"></div>`;
  shellMontado = true;
}

function render() {
  const { base } = rotaAtual();

  if (base.startsWith("#/sair")) { app.sair(); return; }

  // Públicas: quem não está logado vai para a página de vendas.
  if (base === "#/" || base === "#/aula-gratis") { irParaVendas(); return; }
  if (base === "#/entrar") {
    if (ctx) { location.hash = "#/app"; return; }
    telaSimples(login.render());
    login.aoMontar?.(ctx, app);
    return;
  }
  if (base === "#/trocar-senha") {
    if (!ctx) { location.hash = "#/entrar"; return; }
    telaSimples(trocarSenha.render());
    trocarSenha.aoMontar?.(ctx, app);
    return;
  }

  // Área do aluno (protegida)
  if (base.startsWith("#/app")) {
    if (!ctxCarregado) return;                         // ainda restaurando a sessão
    if (!ctx) { location.hash = "#/entrar"; return; }
    if (precisaTrocarSenha(ctx)) { location.hash = "#/trocar-senha"; return; }
    if (!temAcesso(ctx)) { irParaVendas(); return; }   // logado, mas sem acesso pago
    montarShell();
    montarNav(ctx);
    const view = document.getElementById("view");
    const seg = (location.hash.slice(1) || "/app").split("/"); // ["","app","trilha","3"]
    window.scrollTo(0, 0);
    if (base === "#/app") { inicio.montar(ctx, app, view); return; }
    if (base === "#/app/trilha" && seg[3]) { etapa.montar(ctx, app, view, seg[3]); return; }
    if (ROTAS[base]) { ROTAS[base].montar(ctx, app, view); return; }
    view.innerHTML = placeholders.render(ctx, base);
    return;
  }

  irParaVendas();
}

async function boot() {
  if (sessaoAtiva()) {
    try { ctx = await carregarContexto(); } catch { ctx = null; }
  }
  ctxCarregado = true;
  window.addEventListener("hashchange", render);
  render();
}

boot();
