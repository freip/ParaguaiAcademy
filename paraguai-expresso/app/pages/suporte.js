// Página de Suporte: falar com a equipe, comunidade e mentoria.
import { esc, brl } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { GRUPO_COMUNIDADE } from "../config.js";
import { configuracoes, mapaConfig } from "../lib/dados.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

export async function montar(ctx, app, view) {
  view.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {};
  try { config = mapaConfig(await configuracoes()); }
  catch (e) { view.innerHTML = erro(e.message); return; }

  const suporte = soDigitos(config.whatsapp_suporte);
  const mentoriaWhats = soDigitos(config.mentoria_whatsapp);
  const mentoriaTitulo = config.mentoria_titulo || "Mentoria individual com o Mauro";
  const mentoriaValor = config.mentoria_valor ? ` Valor: ${brl(+config.mentoria_valor)}.` : "";

  view.innerHTML = `
    <h1>Suporte</h1>
    <p class="sub">Estamos aqui para ajudar.</p>

    <div class="card mt-4"><h2>Falar com a equipe</h2>
      <p class="muted mt-2">Tire dúvidas sobre o curso, fornecedores e envios. Respondemos em horário comercial.</p>
      ${suporte ? `<a class="btn ok mt-3" target="_blank" rel="noopener"
        href="https://wa.me/${suporte}?text=${encodeURIComponent("Olá! Preciso de ajuda com a Paraguai Academy.")}">${ic("send", 15)} Falar no WhatsApp</a>`
        : ""}</div>

    <div class="card mt-4"><h2>Comunidade</h2>
      <p class="muted mt-2">Troque experiências com outros alunos.</p>
      <a class="btn plain mt-3" target="_blank" rel="noopener" href="${esc(GRUPO_COMUNIDADE)}">${ic("users", 15)} Entrar no grupo</a></div>

    <div class="card mt-4"><h2>${esc(mentoriaTitulo)}</h2>
      <p class="mt-2">Quer ajuda individual? Faça uma mentoria com o Mauro.${mentoriaValor}</p>
      ${mentoriaWhats ? `<a class="btn mt-3" target="_blank" rel="noopener"
        href="https://wa.me/${mentoriaWhats}?text=${encodeURIComponent("Quero fazer a mentoria individual.")}">Quero a mentoria</a>`
        : '<p class="muted mt-2">Contato da mentoria em breve.</p>'}</div>`;
}
