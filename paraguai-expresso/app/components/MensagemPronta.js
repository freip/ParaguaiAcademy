// Mensagem pronta: texto + botão Copiar (feedback "Copiado") e, quando houver
// número, botão "Enviar no WhatsApp".
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";

/**
 * @param {Object} msg  { titulo, texto, whatsapp }
 * @param {number} idx  Índice para o botão Copiar localizar o texto.
 * @param {Object} opts { whatsappNumero } número do contato (só números).
 */
export function html(msg, idx, opts = {}) {
  const numero = opts.whatsappNumero || "";
  const botaoWhats = msg.whatsapp && numero
    ? `<a class="btn ok sm" target="_blank" rel="noopener"
         href="https://wa.me/${esc(numero)}?text=${encodeURIComponent(msg.texto)}">
         ${ic("send", 15)} Enviar no WhatsApp</a>`
    : "";
  return `<div class="card msg-card">
    <b>${esc(msg.titulo)}</b>
    <div class="msg-texto">${esc(msg.texto)}</div>
    <div class="msg-acoes">
      <button class="btn plain sm" data-acao="copiar" data-idx="${idx}">${ic("check", 15)} Copiar</button>
      ${botaoWhats}
    </div>
  </div>`;
}

// Copia o texto e dá o feedback "Copiado" no botão.
export async function copiar(botao, texto) {
  try {
    await navigator.clipboard.writeText(texto);
    const antes = botao.innerHTML;
    botao.textContent = "Copiado";
    setTimeout(() => { botao.innerHTML = antes; }, 1500);
  } catch {
    botao.textContent = "Copie manualmente";
  }
}
