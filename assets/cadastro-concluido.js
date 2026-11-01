/* ==========================================================================
   Paraguai Academy — cadastro-concluido.html
   Fim do formulário. Personaliza a frase de apoio com o primeiro nome que
   vem da URL (?nome=Felipe), montada pelo assets/form.js.

   O link do grupo, o botão de copiar e o evento ClicouGrupoVIP ficam em
   assets/grupo.js, compartilhado com obrigado.html.
   ========================================================================== */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);

  /* Usa textContent (nunca innerHTML) para não injetar HTML vindo da URL. */
  function limparNome(valor) {
    var nome = (valor || '')
      .replace(/[^\p{L}\s'-]/gu, '')   // só letras, espaço, apóstrofo e hífen
      .trim()
      .split(/\s+/)[0] || '';
    if (nome.length < 2 || nome.length > 24) { return ''; }
    return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  }

  var nome = limparNome(params.get('nome'));
  var apoio = document.getElementById('lead-cadastro');

  if (apoio && nome) {
    apoio.textContent = nome +
      ', o PDF está fixado no topo do grupo. Entre agora para baixar.';
  }

})();
