// Checklist da etapa. Itens automáticos (ex.: salvou simulação) ficam só de
// leitura. O botão "Concluí esta etapa" libera quando todos os obrigatórios
// estão marcados.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";

// Um item está marcado se o checklist salvo tem a chave como true.
const marcado = (estado, itemId) => (estado || {})[itemId] === true;

export function todosObrigatoriosOk(itens, estado) {
  return (itens || [])
    .filter((i) => i.obrigatorio)
    .every((i) => marcado(estado, i.item_id));
}

/**
 * @param {Object[]} itens  Linhas de etapa_checklist.
 * @param {Object} estado   checklist salvo (jsonb) da etapa.
 * @param {boolean} bloqueado  true quando a etapa não é a atual (só leitura).
 */
export function html(itens, estado, bloqueado = false) {
  const linhas = (itens || []).map((i) => {
    const on = marcado(estado, i.item_id);
    const auto = i.automatico;
    const desativado = bloqueado || auto;
    const cls = "check-item" + (on ? " on" : "") + (desativado ? " ro" : "");
    const acao = desativado ? "" : `data-acao="check" data-item="${esc(i.item_id)}"`;
    const marca = on ? ic("check", 14) : "";
    const dica = auto ? '<span class="muted" style="font-size:12px">automático</span>' : "";
    return `<button class="${cls}" ${acao} ${desativado ? "disabled" : ""}>
      <span class="check-box">${marca}</span>
      <span class="check-label">${esc(i.label)}</span>${dica}
    </button>`;
  }).join("");

  const pronto = todosObrigatoriosOk(itens, estado);
  const botao = bloqueado
    ? ""
    : `<button class="btn block mt-3" data-acao="concluir" ${pronto ? "" : "disabled"}>
         Concluí esta etapa</button>
       ${pronto ? "" : '<p class="muted mt-3" style="font-size:13px">Marque todos os itens para liberar.</p>'}`;

  return `<div class="card">
    <h2>Checklist da etapa</h2>
    <div class="checklist mt-3">${linhas}</div>
    ${botao}
  </div>`;
}
