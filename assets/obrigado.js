/* ==========================================================================
   Paraguai Academy — página de obrigado
   Personaliza o título com o primeiro nome vindo da URL (?nome=Felipe).
   ========================================================================== */
(function () {
  'use strict';

  /* Link do Grupo VIP. Se mudar o grupo, troque aqui e nos dois href
     de obrigado.html (ou deixe que este script sobrescreva os dois). */
  var LINK_DO_GRUPO = 'https://chat.whatsapp.com/CktozyU7vE9EQXjSPAumUV';

  var params = new URLSearchParams(window.location.search);

  /* --------------------------------------------------------------------
     Nome — usa textContent (nunca innerHTML) para não injetar HTML da URL
     -------------------------------------------------------------------- */
  function limparNome(valor) {
    var nome = (valor || '')
      .replace(/[^\p{L}\s'-]/gu, '')   // só letras, espaço, apóstrofo e hífen
      .trim()
      .split(/\s+/)[0] || '';
    if (nome.length < 2 || nome.length > 24) { return ''; }
    return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  }

  var nome = limparNome(params.get('nome'));
  var titulo = document.getElementById('titulo-obrigado');

  if (titulo) {
    titulo.textContent = nome
      ? 'Pronto, ' + nome + '! Seu guia está te esperando no Grupo VIP'
      : 'Pronto! Seu guia está te esperando no Grupo VIP';
  }

  /* --------------------------------------------------------------------
     Link do grupo
     -------------------------------------------------------------------- */
  var botao = document.getElementById('btn-grupo');
  var linkTexto = document.getElementById('link-texto');

  if (botao) { botao.href = LINK_DO_GRUPO; }
  if (linkTexto) {
    linkTexto.href = LINK_DO_GRUPO;
    linkTexto.textContent = LINK_DO_GRUPO.replace(/^https?:\/\//, '');
  }

  /* --------------------------------------------------------------------
     Meta Pixel (opcional): medir quem chegou aqui.
     Descomente se quiser o evento adicional.
     -------------------------------------------------------------------- */
  // if (typeof window.fbq === 'function') {
  //   window.fbq('track', 'CompleteRegistration', { content_name: 'Guia Importe Sem Sair de Casa' });
  // }

  /* Clique no botão do grupo (útil para medir no Pixel) */
  if (botao && typeof window.fbq === 'function') {
    botao.addEventListener('click', function () {
      try { window.fbq('trackCustom', 'ClicouGrupoVIP'); } catch (e) {}
    });
  }

  var ano = document.getElementById('ano');
  if (ano) { ano.textContent = new Date().getFullYear(); }

})();
