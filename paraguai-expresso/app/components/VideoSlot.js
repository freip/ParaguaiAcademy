// Espaço para vídeo. Sem URL: caixa 16:9 com "Vídeo em breve" (admin vê o ID
// e o roteiro). Com URL: player sob demanda (YouTube, Vimeo, Panda, Bunny).
import { esc } from "../lib/format.js";
import { ic } from "../lib/icons.js";

// Converte a URL do vídeo no endereço de embed, detectando a plataforma.
export function embedUrl(url) {
  if (!url) return null;
  const u = String(url).trim();
  try {
    const link = new URL(u);
    const host = link.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${link.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = link.searchParams.get("v") ||
        (link.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1];
      return id ? `https://www.youtube.com/embed/${id}` : u;
    }
    if (host === "vimeo.com") {
      const id = (link.pathname.match(/\/(\d+)/) || [])[1];
      return id ? `https://player.vimeo.com/video/${id}` : u;
    }
    // Panda Video, Bunny Stream e outros players: a própria URL já é o embed.
    if (/pandavideo|mediadelivery\.net|bunnycdn|iframe/.test(host) || /embed|player/.test(u)) return u;
    return u;
  } catch {
    // Pode ser só o ID de 11 caracteres do YouTube.
    if (/^[\w-]{11}$/.test(u)) return `https://www.youtube.com/embed/${u}`;
    return null;
  }
}

/**
 * @param {Object} video  Linha da tabela videos.
 * @param {Object} opts   { assistido, admin }
 */
export function html(video, opts = {}) {
  const { assistido = false, admin = false } = opts;
  const titulo = esc(video.titulo || "");
  const duracao = video.duracao ? esc(video.duracao) : "";
  const legenda = `${titulo}${duracao ? " · " + duracao : ""}`;
  const embed = embedUrl(video.url);

  if (!embed) {
    const guia = admin
      ? `<div class="video-guia"><b>${esc(video.id)}</b>
          <ul>${(video.roteiro || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>`
      : "";
    return `<div class="videoslot" data-video="${esc(video.id)}">
      <div class="video-box vazio">
        <span class="play-off">${ic("box", 26)}</span>
        <span class="video-legenda">${legenda}</span>
        <span class="muted">Vídeo em breve</span>
      </div>${guia}
      ${botaoAssistir(video.id, assistido)}
    </div>`;
  }

  return `<div class="videoslot" data-video="${esc(video.id)}">
    <div class="video-box" data-acao="carregar-video" data-embed="${esc(embed)}" role="button" tabindex="0">
      <span class="play">▶</span>
      <span class="video-legenda">${legenda}</span>
    </div>
    ${botaoAssistir(video.id, assistido)}
  </div>`;
}

export function botaoAssistir(id, assistido) {
  return assistido
    ? `<button class="btn plain sm" data-acao="assistir" data-video="${esc(id)}">${ic("check", 16)} Assistida (desfazer)</button>`
    : `<button class="btn ghost sm" data-acao="assistir" data-video="${esc(id)}">Marquei como assistida</button>`;
}

// Troca a capa pelo iframe (carregamento sob demanda).
export function carregarPlayer(box) {
  const embed = box.getAttribute("data-embed");
  if (!embed) return;
  box.outerHTML = `<div class="video-box"><iframe src="${esc(embed)}" title="Vídeo da aula"
    allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
}
