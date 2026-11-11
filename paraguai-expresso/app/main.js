// Ponto de entrada: decide entre página pública, login, troca de senha e a
// área do aluno, e cuida da navegação por hash.
import { sessaoAtiva } from "./lib/supabase.js";
import {
  carregarContexto, precisaTrocarSenha, temAcesso, ferramentaLiberada, sair as logout,
} from "./auth.js";
import { ETAPA_DA_FERRAMENTA } from "./config.js";
import { montarNav } from "./nav.js";
import * as publica from "./pages/publica.js";
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

// Rotas de ferramenta: [chave da ferramenta, módulo, nome].
const FERRAMENTAS_ROTA = {
  "#/app/calculadora": ["calculadora", calculadora, "Calculadora"],
  "#/app/fornecedores": ["fornecedores", fornecedores, "Fornecedores"],
  "#/app/freteiros": ["freteiros", freteiros, "Freteiros"],
  "#/app/envio": ["envio", envio, "Envio no Brasil"],
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
  sair() { logout(); ctx = null; location.hash = "#/aula-gratis"; },
};

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

  // Públicas
  if (base === "#/" || base === "#/aula-gratis") {
    shellMontado = false;
    root().innerHTML = '<div id="pub"></div>';
    publica.montar(document.getElementById("pub"));
    return;
  }
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
    if (!temAcesso(ctx)) { location.hash = "#/aula-gratis"; return; } // logado sem acesso pago
    montarShell();
    montarNav(ctx);
    const view = document.getElementById("view");
    const seg = (location.hash.slice(1) || "/app").split("/"); // ["","app","trilha","3"]
    window.scrollTo(0, 0);
    if (base === "#/app") { inicio.montar(ctx, app, view); return; }
    if (base === "#/app/trilha" && seg[3]) { etapa.montar(ctx, app, view, seg[3]); return; }
    if (base === "#/app/trilha") { trilha.montar(ctx, app, view); return; }
    if (base === "#/app/suporte") { suporte.montar(ctx, app, view); return; }
    if (base === "#/app/certificado") { certificado.montar(ctx, app, view); return; }
    if (FERRAMENTAS_ROTA[base]) {
      const [chave, mod, nome] = FERRAMENTAS_ROTA[base];
      if (!ferramentaLiberada(ctx, ETAPA_DA_FERRAMENTA[chave])) {
        view.innerHTML = `<h1>${nome}</h1><div class="card mt-4">
          <span class="aviso">Esta ferramenta libera na etapa ${ETAPA_DA_FERRAMENTA[chave]}. Avance na trilha para desbloquear.</span></div>`;
      } else {
        mod.montar(ctx, app, view);
      }
      return;
    }
    if (base === "#/app/loja-parceira") { lojaParceira.montar(ctx, app, view); return; }
    view.innerHTML = placeholders.render(ctx, base);
    return;
  }

  shellMontado = false;
  root().innerHTML = '<div id="pub"></div>';
  publica.montar(document.getElementById("pub"));
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
