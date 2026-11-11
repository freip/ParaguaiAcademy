// Página pública (sem login). Versão mínima da Fase 3; a página completa de
// aula grátis (vídeo de vendas, FAQ, etc.) é construída na Fase 9.
export function render() {
  return `<div class="main" style="max-width:820px;margin:0 auto">
    <header class="row-between" style="padding:6px 0 18px">
      <strong class="logo" style="font-weight:800;font-size:16px;letter-spacing:.5px">
        PARAGUAI <span style="color:var(--accent-ink)">ACADEMY</span></strong>
      <a class="btn plain" href="#/entrar">Entrar</a>
    </header>

    <h1>Aprenda a importar do Paraguai do jeito certo</h1>
    <p class="sub">Fornecedores de confiança, travessia, nota fiscal e envio, tudo em 8 etapas curtas.</p>

    <div class="card mt-4" style="aspect-ratio:16/9;display:grid;place-items:center;color:var(--mute)">
      Vídeo em breve
    </div>

    <a class="btn block mt-4" href="#/entrar">Quero acessar o curso por R$ 49,90</a>
    <p class="muted mt-3" style="font-size:13px;text-align:center">
      Pagamento único, acesso para sempre, com um nicho incluso. Valores de exemplo. Resultados variam.
    </p>

    <div class="card mt-4">
      <strong>O que você vai aprender</strong>
      <p class="muted mt-3">
        A página completa de aula grátis chega na fase 9. Por enquanto, se você já tem acesso,
        <a class="link" href="#/entrar">entre com sua conta</a>.
      </p>
    </div>
  </div>`;
}
