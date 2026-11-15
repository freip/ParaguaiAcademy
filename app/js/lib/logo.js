// Logo da Paraguai Academy. Usa public/paraguai-academy-logo.png quando existir;
// se não houver o arquivo, mostra uma versão em SVG (chevron verde+amarelo) com
// o nome ao lado, no mesmo estilo da marca.
const CHEVRONS = `<svg class="logo-chevrons" viewBox="0 0 110 90" aria-hidden="true">
  <path d="M6 8 L30 8 L58 45 L30 82 L6 82 L34 45 Z" fill="#19A35A"/>
  <path d="M50 8 L74 8 L102 45 L74 82 L50 82 L78 45 Z" fill="#F4B400"/></svg>`;

export function logoHTML({ grande = false } = {}) {
  return `<span class="logo${grande ? " logo-grande" : ""}">
    <img class="logo-png" src="/midia/paraguai-academy-logo.png" alt="Paraguai Academy"
      onerror="this.style.display='none';this.parentElement.querySelector('.logo-fallback').style.display='inline-flex'">
    <span class="logo-fallback" style="display:none">${CHEVRONS}
      <span class="logo-wm"><b>PARAGUAI</b><small>ACADEMY</small></span></span>
  </span>`;
}
