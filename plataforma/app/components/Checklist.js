// Autoavaliação da etapa. Tudo opcional: o aluno marca o que já fez e pode
// concluir (ou reabrir) a etapa quando quiser. Nada é obrigatório.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";

const marcado = (estado, itemId) => (estado || {})[itemId] === true;

/**
 * @param {Object[]} itens  Linhas de etapa_checklist.
 * @param {Object} estado   checklist salvo (jsonb) da etapa.
 * @param {Object} opts      { concluida }
 */
export function html(itens, estado, opts = {}) {
  const { concluida = false } = opts;
  const linhas = (itens || []).map((i) => {
    const on = marcado(estado, i.item_id);
    return `<button class="check-item${on ? " on" : ""}" data-acao="check" data-item="${esc(i.item_id)}">
      <span class="check-box">${on ? ic("check", 14) : ""}</span>
      <span class="check-label">${esc(i.label)}</span></button>`;
  }).join("");

  const botao = concluida
    ? `<button class="btn ok block mt-3" data-acao="reabrir">${ic("check", 16)} Etapa concluída — desmarcar</button>`
    : `<button class="btn block mt-3" data-acao="concluir">Marcar etapa como concluída</button>`;

  return `<div class="card">
    <h2>O que você já fez</h2>
    <p class="muted" style="font-size:13px">Opcional. Marque o que já fez — e conclua a etapa quando quiser.</p>
    <div class="checklist mt-3">${linhas}</div>
    ${botao}
  </div>`;
}
