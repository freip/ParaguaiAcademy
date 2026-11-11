// Página da trilha: as 8 etapas com seus estados (concluída, atual, bloqueada
// ou não se aplica). Substitui a antiga tela "Minha trilha" + "Aulas".
import { ETAPAS } from "../content/trilha.js";
import { statusEtapa } from "../auth.js";
import { TOTAL_ETAPAS } from "../config.js";
import { ic } from "../lib/icons.js";
import { rest } from "../lib/supabase.js";
import { definirCaminho } from "../lib/dados.js";
import { erro } from "../lib/dom.js";

// Soma a duração dos vídeos de uma etapa (textos tipo "2 min 30 s").
function parseMin(s) {
  if (!s) return 0;
  const m = /(\d+)\s*min/.exec(s), seg = /(\d+)\s*s/.exec(s);
  return (m ? +m[1] : 0) + (seg ? +seg[1] / 60 : 0);
}

export async function montar(ctx, app, view) {
  if (!ctx.progresso.length) { view.innerHTML = erro("Não foi possível carregar seu progresso."); return; }

  // Duração estimada por etapa (tolerante a falha).
  let durPorEtapa = {};
  try {
    const vids = await rest("videos?select=etapa,duracao&ativo=is.true");
    for (const v of vids || []) durPorEtapa[v.etapa] = (durPorEtapa[v.etapa] || 0) + parseMin(v.duracao);
  } catch {}

  const linhas = ETAPAS.map((e) => {
    const st = statusEtapa(ctx, e.numero);
    const dur = Math.round(durPorEtapa[e.numero] || 0);
    const meta = dur ? `<span class="trilha-dur">≈ ${dur} min</span>` : "";

    if (st === "concluida") {
      return `<a class="trilha-item ok" href="#/app/trilha/${e.numero}">
        <span class="trilha-dot ok">${ic("check", 18)}</span>
        <span class="trilha-corpo"><b>${e.numero}. ${e.titulo}</b><span class="muted">${e.descricao}</span></span>
        <span class="trilha-acao">${meta}<span class="link">Rever</span></span></a>`;
    }
    if (st === "atual") {
      return `<a class="trilha-item atual" href="#/app/trilha/${e.numero}">
        <span class="trilha-dot atual">${e.numero}</span>
        <span class="trilha-corpo"><b>${e.numero}. ${e.titulo} <span class="selo">Você está aqui</span></b>
          <span class="muted">${e.descricao}</span></span>
        <span class="trilha-acao">${meta}<span class="btn sm">Continuar</span></span></a>`;
    }
    if (st === "nao_se_aplica") {
      return `<div class="trilha-item na">
        <span class="trilha-dot">${e.numero}</span>
        <span class="trilha-corpo"><b>${e.numero}. ${e.titulo}</b>
          <span class="muted">Não se aplica ao caminho Brasil.</span>
          <button class="link" data-acao="mudar-caminho">Mudar para o caminho Paraguai</button></span></div>`;
    }
    // bloqueada
    return `<div class="trilha-item bloq">
      <span class="trilha-dot">${ic("lock", 16)}</span>
      <span class="trilha-corpo"><b>${e.numero}. ${e.titulo}</b>
        <span class="muted">Conclua a etapa ${e.numero - 1} para liberar.</span></span></div>`;
  }).join("");

  view.innerHTML = `<h1>Sua trilha</h1>
    <p class="sub">${TOTAL_ETAPAS} etapas em sequência. Conclua uma para liberar a próxima.</p>
    <div class="trilha mt-4">${linhas}</div>`;

  view.onclick = async (ev) => {
    const b = ev.target.closest("[data-acao='mudar-caminho']");
    if (!b) return;
    ev.preventDefault();
    try { await definirCaminho("paraguai"); await app.atualizar(); }
    catch (e) { alert(e.message); }
  };
}
