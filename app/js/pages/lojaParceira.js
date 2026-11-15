// Loja parceira: Rota Árabe (empresa de parte dos sócios). Precisa aparecer
// identificada como loja dos sócios, por transparência com o aluno.
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { erro } from "../lib/dom.js";
import { configuracoes, mapaConfig, lojaDosSocios } from "../lib/dados.js";

export async function montar(ctx, app, view) {
  view.innerHTML = '<div class="skeleton sk-card"></div>';
  let config = {}, loja = null;
  try {
    const [cfg, ls] = await Promise.all([configuracoes(), lojaDosSocios()]);
    config = mapaConfig(cfg);
    loja = (ls || [])[0] || null;
  } catch (e) { view.innerHTML = erro(e.message); return; }

  const nome = loja?.nome || "Rota Árabe";
  const descricao = loja?.descricao || "Perfumaria árabe original, com atacado para alunos.";
  const base = config.url_rota_arabe || "https://www.rotaarabe.com.br/";
  const cupom = config.rota_arabe_cupom || "ACADEMY";
  // Acrescenta modo atacado e cupom quando a loja aceitar esses parâmetros.
  const sep = base.includes("?") ? "&" : "?";
  const url = `${base}${sep}atacado=1&cupom=${encodeURIComponent(cupom)}`;

  view.innerHTML = `
    <h1>Loja parceira</h1>
    <p class="sub">Uma opção de compra no Brasil, sem travessia.</p>
    <div class="card mt-4">
      <div class="forn-topo"><b style="font-size:20px">${esc(nome)}</b>
        <span class="selo-socios">Loja dos sócios do Paraguai Academy</span></div>
      <p class="mt-3">${esc(descricao)}</p>
      <ul class="resumo mt-3">
        <li>Pedido mínimo no atacado para alunos.</li>
        <li>Decants para experimentar antes de comprar o frasco cheio.</li>
        <li>Envio para todo o Brasil.</li>
      </ul>
      <p class="muted mt-2" style="font-size:14px">Use o cupom <b>${esc(cupom)}</b> no atacado.</p>
      <a class="btn mt-3" target="_blank" rel="noopener" href="${esc(url)}">${ic("bag", 16)} Abrir loja no atacado</a>
    </div>`;
}
