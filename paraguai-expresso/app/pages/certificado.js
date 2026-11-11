// Certificado. Libera só quando as 8 etapas estão concluídas (ou não se
// aplicam). Impressão/salvar PDF pelo próprio navegador.
import { trilhaConcluida, nomeNicho } from "../auth.js";
import { esc, data } from "../lib/format.js";
import { NOME_PADRAO, TOTAL_ETAPAS } from "../config.js";

export async function montar(ctx, app, view) {
  if (!trilhaConcluida(ctx)) {
    view.innerHTML = `<h1>Certificado</h1>
      <div class="card mt-4"><span class="aviso">Conclua as ${TOTAL_ETAPAS} etapas da trilha para liberar o certificado.</span></div>`;
    view.onclick = null;
    return;
  }

  const nome = ctx.perfil?.nome || NOME_PADRAO;
  const nichos = ctx.nichos.map((s) => nomeNicho(ctx, s)).join(", ") || "Importação";

  view.innerHTML = `
    <div class="row-between"><h1>Certificado</h1>
      <button class="btn sm" data-acao="imprimir">Imprimir / Salvar PDF</button></div>
    <div class="certificado mt-4" id="cert">
      <div class="cert-selo">PARAGUAI <span>ACADEMY</span></div>
      <p class="cert-sub">Certificado de conclusão</p>
      <h2 class="cert-nome">${esc(nome)}</h2>
      <p class="cert-texto">concluiu a trilha de importação do Paraguai, nas 8 etapas do curso${nichos ? ` — nicho: ${esc(nichos)}` : ""}.</p>
      <p class="cert-data">${data(new Date())}</p>
    </div>
    <p class="muted mt-3" style="font-size:13px">Dica: em "Imprimir", escolha "Salvar como PDF".</p>`;

  view.onclick = (ev) => {
    if (ev.target.closest("[data-acao='imprimir']")) window.print();
  };
}
