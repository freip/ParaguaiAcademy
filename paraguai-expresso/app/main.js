// Ponto de entrada: decide entre página pública, login, troca de senha e a
// área do aluno, e cuida da navegação por hash.
import { sessaoAtiva } from "./lib/supabase.js";
import {
  carregarContexto, precisaTrocarSenha, temAcesso, sair as logout,
} from "./auth.js";
import { montarNav } from "./nav.js";
import * as publica from "./pages/publica.js";
import * as login from "./pages/login.js";
import * as trocarSenha from "./pages/trocarSenha.js";
import * as placeholders from "./pages/placeholders.js";
import * as trilha from "./pages/trilha.js";
import * as etapa from "./pages/etapa.js";

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
  if (base === "#/" || base === "#/aula-gratis") { telaSimples(publica.render()); return; }
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
    if (base === "#/app/trilha" && seg[3]) { etapa.montar(ctx, app, view, seg[3]); return; }
    if (base === "#/app/trilha") { trilha.montar(ctx, app, view); return; }
    view.innerHTML = placeholders.render(ctx, base);
    return;
  }

  telaSimples(publica.render());
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
