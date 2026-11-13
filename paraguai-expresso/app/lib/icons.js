// Ícones estilo Feather (24x24). Caminhos do SVG por nome.
export const ICONS = {
  home:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  map:"M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z M8 2v16 M16 6v16",
  calc:"M4 2h16v20H4z M8 6h8 M8 10h.01 M12 10h.01 M16 10h.01 M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01 M16 18h.01",
  box:"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
  truck:"M1 3h15v13H1z M16 8h4l3 3v5h-7 M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  send:"M22 2L11 13 M22 2l-7 20-4-9-9-4z",
  bag:"M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  help:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17h.01",
  award:"M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.2 13.9L7 22l5-3 5 3-1.2-8.1",
  tools:"M3 6h18 M3 12h18 M3 18h18",
  bell:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  down:"M6 9l6 6 6-6",
  lock:"M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  more:"M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  check:"M20 6L9 17l-5-5",
  logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  play:"M7 5l12 7-12 7z",
  clock:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 7v5l3 2",
  arrow:"M5 12h14 M13 6l6 6-6 6",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9z",
  video:"M23 7l-7 5 7 5z M1 5h15v14H1z",
  cart:"M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2 M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",
  x:"M18 6L6 18 M6 6l12 12",
};

// Monta o <svg> de um ícone pelo nome.
export const ic = (nome, tamanho = 20) => {
  const d = ICONS[nome];
  if (!d) return "";
  const paths = d.split(" M").map((p, i) => `<path d="${i ? "M" : ""}${p}"/>`).join("");
  return `<svg class="ic" style="width:${tamanho}px;height:${tamanho}px" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
};
