// Ferramenta Freteiros. Serve para a página (/app/freteiros) e para o bloco
// embutido na etapa 5. Mostra cada freteiro, a tabela de preços completa e a
// mensagem pronta para chamar no WhatsApp.
import { esc, brl } from "../lib/format.js";
import { ic } from "../lib/icons.js";
import { skeletonLista, vazio, erro } from "../lib/dom.js";
import { listaFreteiros, regrasFreteiro } from "../lib/dados.js";
import { nomeNicho } from "../auth.js";

const soDigitos = (s) => String(s || "").replace(/\D/g, "");

// Mensagem pronta: o aluno só troca o que está entre [colchetes].
export const MSG_FRETEIRO =
  "Olá! Sou do grupo do Paraguai Academy e preciso de frete do Paraguai para o Brasil.\n\n" +
  "• Produto: [o que vou trazer]\n" +
  "• Quantidade: [quantas unidades]\n" +
  "• Valor da compra: [valor aproximado]\n" +
  "• Loja: [nome da loja e cidade]\n" +
  "• Entrega no Brasil: [sua cidade e estado]\n\n" +
  "Pode me passar o valor do frete e o prazo? Obrigado!";

export const linkWhatsFreteiro = (whatsapp, texto = MSG_FRETEIRO) => {
  const zap = soDigitos(whatsapp);
  return zap ? `https://wa.me/${zap}?text=${encodeURIComponent(texto)}` : "";
};

function descreveRegra(r) {
  if (r.tipo === "percentual") {
    const base = r.base === "nota" ? "sobre a nota fiscal" : "sobre a mercadoria";
    const min = r.compra_minima_brl ? `, compra mínima ${brl(r.compra_minima_brl)}` : "";
    return `${r.valor}% ${base}${min}`;
  }
  if (r.tipo === "fixo_unidade") return `${brl(r.valor)} por unidade`;
  return "Sob consulta";
}

export async function montar(ctx, app, container, opts = {}) {
  container.innerHTML = skeletonLista(2);
  let freteiros = [], regras = [];
  try { [freteiros, regras] = await Promise.all([listaFreteiros(), regrasFreteiro()]); }
  catch (e) { container.innerHTML = erro(e.message); return; }
  freteiros = freteiros || []; regras = regras || [];

  const card = (f) => {
    const rs = regras.filter((r) => r.freteiro_id === f.id);
    const linhas = rs.length
      ? rs.map((r) => `<tr><td>${esc(r.faixa || nomeNicho(ctx, r.nicho))}</td>
          <td>${esc(descreveRegra(r))}</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">Sem tabela cadastrada. Consulte o freteiro.</td></tr>`;
    const link = linkWhatsFreteiro(f.whatsapp);
    const botao = link
      ? `<a class="btn ok sm" target="_blank" rel="noopener" href="${link}">${ic("send", 15)} Abrir WhatsApp com a mensagem</a>`
      : '<span class="muted" style="font-size:13px">WhatsApp não cadastrado.</span>';
    return `<div class="card">
      <div class="forn-topo"><b>${esc(f.nome)}</b></div>
      <div class="forn-meta mt-2">
        ${f.cidade ? `<div><span class="muted">Cidade:</span> ${esc(f.cidade)}</div>` : ""}
        ${f.prazo ? `<div><span class="muted">Prazo:</span> ${esc(f.prazo)}</div>` : ""}
        ${f.observacoes ? `<div><span class="muted">Obs.:</span> ${esc(f.observacoes)}</div>` : ""}
      </div>
      <table class="tabela mt-3"><thead><tr><th>Produto</th><th>Cobrança</th></tr></thead>
        <tbody>${linhas}</tbody></table>
      <b class="mt-3" style="display:block">Mensagem pronta</b>
      <div class="msg-texto">${esc(MSG_FRETEIRO)}</div>
      <div class="msg-acoes">
        ${botao}
        <button class="btn plain sm" data-acao="copiar-msg">${ic("check", 15)} Copiar</button>
      </div></div>`;
  };

  function render() {
    container.innerHTML = `
      ${opts.embutido ? "" : `<h1>Freteiros</h1><p class="sub">Quem traz sua mercadoria do Paraguai até o Brasil.</p>
        <p class="dica mt-2">Dica: a aula sobre freteiros está na <a class="link" href="#/app/trilha/5">etapa 5 da trilha</a>.</p>`}
      <div class="mt-3">${freteiros.length ? freteiros.map(card).join("") : vazio("Nenhum freteiro cadastrado ainda.")}</div>
      <span class="aviso mt-3">Confirme a tabela direto com o freteiro antes de comprar.</span>
      <p class="muted mt-3" style="font-size:14px">Dica: também temos perfumes no atacado já no Brasil. Veja a
        <a class="link" href="#/app/loja-parceira">Loja parceira</a>.</p>`;
  }

  container.onclick = async (ev) => {
    const b = ev.target.closest("[data-acao='copiar-msg']");
    if (!b) return;
    try {
      await navigator.clipboard.writeText(MSG_FRETEIRO);
      const antes = b.innerHTML;
      b.textContent = "Copiado";
      setTimeout(() => { b.innerHTML = antes; }, 1500);
    } catch { b.textContent = "Copie manualmente"; }
  };

  render();
}
