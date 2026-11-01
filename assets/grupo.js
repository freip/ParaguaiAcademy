/* ==========================================================================
   Paraguai Academy — Grupo VIP

   Fonte única do link do grupo e dos comportamentos que as duas páginas do
   WhatsApp compartilham (obrigado.html e cadastro-concluido.html):

     [data-grupo-link]    recebe o href e dispara ClicouGrupoVIP no clique
     [data-grupo-copiar]  copia o link e mostra "Link copiado!" por 2s
     [data-grupo-texto]   mostra o link em texto, sem o https://
     #ano                 ano do rodapé

   PARA TROCAR O GRUPO: altere a constante LINK_DO_GRUPO abaixo. É o único
   lugar que precisa de edição. Os href escritos no HTML são apenas reserva
   para o caso raro de o JavaScript não carregar.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var LINK_DO_GRUPO = 'https://chat.whatsapp.com/CktozyU7vE9EQXjSPAumUV';

  /* ----------------------------------------------------------------------
     Evento personalizado do Pixel. Sai em qualquer botão de entrar no
     grupo e também no "Copiar link" — nos dois casos a pessoa está indo
     para o WhatsApp.
     ---------------------------------------------------------------------- */
  function rastrearClique() {
    if (typeof window.fbq !== 'function') { return; }
    try { window.fbq('trackCustom', 'ClicouGrupoVIP'); } catch (e) {}
  }

  function cada(seletor, funcao) {
    Array.prototype.forEach.call(document.querySelectorAll(seletor), funcao);
  }

  function semProtocolo(url) {
    return url.replace(/^https?:\/\//, '');
  }

  /* ----------------------------------------------------------------------
     Botões e links de entrar no grupo
     ---------------------------------------------------------------------- */
  function ligarLinks() {
    cada('[data-grupo-link]', function (link) {
      link.href = LINK_DO_GRUPO;
      link.addEventListener('click', rastrearClique);
    });

    cada('[data-grupo-texto]', function (alvo) {
      alvo.textContent = semProtocolo(LINK_DO_GRUPO);
    });
  }

  /* ----------------------------------------------------------------------
     Copiar o link

     navigator.clipboard é o caminho normal. Ele não existe em navegador
     antigo nem fora de HTTPS, então há a reserva com um campo temporário.
     ---------------------------------------------------------------------- */
  function copiar(texto) {
    var area = window.navigator.clipboard;

    if (area && typeof area.writeText === 'function') {
      return area.writeText(texto);
    }

    return new Promise(function (resolve, reject) {
      var campo = document.createElement('textarea');
      campo.value = texto;
      campo.setAttribute('readonly', '');
      campo.style.position = 'fixed';
      campo.style.top = '-1000px';
      campo.style.opacity = '0';
      document.body.appendChild(campo);
      campo.select();

      var copiou = false;
      try { copiou = document.execCommand('copy'); } catch (e) { copiou = false; }
      document.body.removeChild(campo);

      if (copiou) { resolve(); } else { reject(new Error('copia_indisponivel')); }
    });
  }

  function ligarCopiar() {
    cada('[data-grupo-copiar]', function (botao) {
      var rotulo = botao.querySelector('[data-rotulo]') || botao;
      var textoOriginal = rotulo.textContent;
      var voltar = null;

      botao.addEventListener('click', function () {
        rastrearClique();

        copiar(LINK_DO_GRUPO).then(function () {
          rotulo.textContent = 'Link copiado!';
          botao.classList.add('is-copiado');
        }, function () {
          // Sem permissão de cópia: mostra o link para a pessoa copiar à mão.
          rotulo.textContent = semProtocolo(LINK_DO_GRUPO);
        });

        clearTimeout(voltar);
        voltar = setTimeout(function () {
          rotulo.textContent = textoOriginal;
          botao.classList.remove('is-copiado');
        }, 2000);
      });
    });
  }

  function ligarAno() {
    var ano = document.getElementById('ano');
    if (ano) { ano.textContent = new Date().getFullYear(); }
  }

  ligarLinks();
  ligarCopiar();
  ligarAno();

  // Exposto para as páginas que precisam do link (não para trocá-lo).
  window.ParaguaiGrupo = { LINK: LINK_DO_GRUPO };

})(window, document);
