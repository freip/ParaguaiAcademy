// Página de Suporte: falar com a equipe, comunidade e mentoria.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { GRUPO_COMUNIDADE, ROTA_PLANO } from "../config.js";
import { configuracoes, mapaConfig } from "../lib/dados.js";
import { ehPro } from "../auth.js";
import * as Upgrade from "../components/Upgrade.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

export async function montar(ctx, app, view) {
  view.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {};
  try { config = mapaConfig(await configuracoes()); }
  catch (e) { view.innerHTML = erro(e.message); return; }

  const pro = ehPro(ctx);
  const suporte = soDigitos(config.whatsapp_suporte);
  const mentoriaTitulo = config.mentoria_titulo || "Mentoria com o Mauro";

  // O card da mentoria muda com o plano: o Pro vai direto para a tela dela.
  const cardMentoria = pro
    ? `<div class="card mt-4"><h2>${esc(mentoriaTitulo)} ${Upgrade.tagPro()}</h2>
        <p class="mt-2">Chamadas e acompanhamento nas suas compras já estão liberados na sua conta.</p>
        <a class="btn mt-3" href="#/app/mentoria">${ic("video", 16)} Abrir a Mentoria Pro</a></div>`
    : `<div class="card mt-4"><h2>${esc(mentoriaTitulo)} ${Upgrade.tagPro()}</h2>
        <p class="mt-2">A mentoria exclusiva, com chamadas e acompanhamento nas compras, faz parte do plano Pro.</p>
        <a class="btn mt-3" href="${ROTA_PLANO}">Ver o que o Pro inclui ${ic("arrow", 16)}</a></div>`;

  view.innerHTML = `
    <h1>Suporte</h1>
    <p class="sub">Estamos aqui para ajudar.</p>

    <div class="card mt-4"><h2>Falar com a equipe</h2>
      <p class="muted mt-2">Tire dúvidas sobre o curso, fornecedores e envios. Respondemos em horário comercial.</p>
      ${suporte ? `<a class="btn ok mt-3" target="_blank" rel="noopener"
        href="https://wa.me/${suporte}?text=${encodeURIComponent("Olá! Sou do grupo do Paraguai Academy e preciso de ajuda.")}">${ic("send", 15)} Falar no WhatsApp</a>`
        : '<p class="muted mt-2">Contato do suporte em breve.</p>'}</div>

    <div class="card mt-4"><h2>Comunidade</h2>
      <p class="muted mt-2">Troque experiências com outros alunos.</p>
      <a class="btn plain mt-3" target="_blank" rel="noopener" href="${esc(GRUPO_COMUNIDADE)}">${ic("users", 15)} Entrar no grupo</a></div>

    <div class="card mt-4"><h2>Compras coletivas ${pro ? "" : Upgrade.tagPro()}</h2>
      <p class="muted mt-2">Junte seu pedido ao de outros alunos para bater o mínimo e dividir o frete.</p>
      <a class="btn ${pro ? "" : "plain"} mt-3" href="${pro ? "#/app/compras-coletivas" : ROTA_PLANO}">
        ${pro ? `${ic("cart", 16)} Abrir compras coletivas` : `${ic("lock", 15)} Liberar no plano Pro`}</a></div>

    ${cardMentoria}

    <div class="card mt-4"><h2>Meu plano</h2>
      <div class="linha-info"><span>Você está no ${pro ? "Pro" : "Standard"}</span>${Upgrade.selo(ctx)}</div>
      <a class="link mt-3" style="display:inline-block" href="${ROTA_PLANO}">Ver os planos ${ic("arrow", 14)}</a></div>

    ${pro ? "" : `<div class="mt-4">${Upgrade.faixa(ctx, { compacta: true })}</div>`}`;
}
