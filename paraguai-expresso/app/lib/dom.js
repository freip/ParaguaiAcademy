// Helpers mínimos de DOM.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// Define o HTML de um elemento pelo id (ignora se não existir).
export const setHTML = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

// Blocos de estado reutilizáveis (carregando / vazio / erro).
export const skeletonLista = (n = 3) =>
  `<div class="card">${Array.from({ length: n }, () =>
    `<div class="skeleton sk-line" style="width:${60 + Math.random() * 35}%"></div>`).join("")}</div>`;

export const vazio = (texto) => `<div class="estado">${texto}</div>`;

export const erro = (texto = "Algo deu errado. Tente de novo.") =>
  `<div class="estado erro">${texto}</div>`;

// Mensagem flutuante rápida (feedback de ação).
let _toastT = null;
export function toast(texto) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add("on");
  clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove("on"), 2600);
}
