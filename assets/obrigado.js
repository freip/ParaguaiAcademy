/* ==========================================================================
   Paraguai Academy — obrigado.html
   Página de entrada no Grupo VIP para quem vem direto do anúncio (tráfego
   frio, sem formulário preenchido).

   O link do grupo, o botão de copiar e o evento ClicouGrupoVIP ficam em
   assets/grupo.js, compartilhado com cadastro-concluido.html.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     PROVA SOCIAL — quantas pessoas já entraram no grupo.
     É o único número a atualizar quando o grupo crescer.
     ---------------------------------------------------------------------- */
  var PESSOAS_NO_GRUPO = 40;

  var contador = document.getElementById('contador-grupo');
  if (contador) {
    contador.textContent = '+' + PESSOAS_NO_GRUPO + ' pessoas já entraram no grupo';
  }

})();
