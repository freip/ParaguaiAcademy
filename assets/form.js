/* ==========================================================================
   Paraguai Academy — captura de leads
   Sem dependências. Máscara + validação + UTMs + envio ao Google Apps Script.
   ========================================================================== */
(function () {
  'use strict';

  /* ======================================================================
     1) CONFIGURAÇÃO — edite apenas este bloco
     ====================================================================== */
  var CONFIG = {
    // Cole aqui a URL do app publicado do Google Apps Script
    // (termina em /exec). É a MESMA URL dos outros sites: o script roteia
    // pelo campo `evento` abaixo. Veja o passo a passo no README.md.
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyREVzbDiIPqcPmqWab7FSIVXqNmHDlUmvm3xr_tt66VVF92X6hqt4rFEuOzwdq864l/exec',

    // Nome do evento. O script grava na aba "Leads Paraguai" quando recebe
    // este valor. NÃO deixe vazio: sem `evento`, o lead cai na primeira aba,
    // junto com os leads dos outros sites.
    EVENTO: 'lead-paraguai',

    // Só preencha se você tiver criado a propriedade SHARED_SECRET no Apps
    // Script. Deixe vazio caso contrário. (Não é segurança de verdade: fica
    // visível no código da página. Serve para barrar robô bobo.)
    SEGREDO: '',

    // Função serverless da Vercel que manda o mesmo Lead pela API de
    // Conversões. Se não existir (rodando local, por exemplo), o envio
    // falha em silêncio e o formulário segue normal.
    CAPI_ENDPOINT: '/api/meta-lead',

    // Nome do conteúdo reportado ao Meta no evento Lead.
    CONTENT_NAME: 'Guia Paraguai',

    // Página de obrigado
    PAGINA_OBRIGADO: 'obrigado.html'
  };

  /* ======================================================================
     2) Atalhos
     ====================================================================== */
  var $ = function (id) { return document.getElementById(id); };

  var form      = $('lead-form');
  var btn       = $('submit-btn');
  var inpNome   = $('nome');
  var inpFone   = $('whatsapp');
  var inpConsen = $('consentimento');
  var TEXTO_BTN = btn ? btn.textContent : 'QUERO MEU GUIA GRÁTIS';

  if (!form) { return; }

  $('ano').textContent = new Date().getFullYear();

  /* ======================================================================
     3) Origem do tráfego — UTMs, fbclid e cookies do Meta

     Os anúncios usam:
       utm_source=meta&utm_medium=pago&utm_campaign={{campaign.name}}
       &utm_term={{adset.name}}&utm_content={{ad.name}}
     ====================================================================== */
  var UTM_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
  ];

  function guardar(chave, valor) {
    try { sessionStorage.setItem(chave, valor); } catch (e) {}
  }

  function recuperar(chave) {
    try { return sessionStorage.getItem(chave) || ''; } catch (e) { return ''; }
  }

  /**
   * Lê da URL e guarda na sessão. O valor guardado sobrevive à navegação
   * interna (ir até a política de privacidade e voltar, por exemplo).
   */
  function capturarUtms() {
    var params = new URLSearchParams(window.location.search);

    UTM_KEYS.forEach(function (key) {
      var valor = (params.get(key) || '').trim().slice(0, 150);
      if (valor) { guardar(key, valor); } else { valor = recuperar(key); }
      var campo = $(key);
      if (campo) { campo.value = valor; }
    });

    // fbclid: vem na URL do anúncio. Guardamos junto o instante em que foi
    // visto — é o timestamp usado para montar o _fbc quando o cookie
    // ainda não existe.
    var fbclid = (params.get('fbclid') || '').trim().slice(0, 500);
    if (fbclid) {
      guardar('fbclid', fbclid);
      if (!recuperar('fbclid_ts')) { guardar('fbclid_ts', String(Date.now())); }
    } else {
      fbclid = recuperar('fbclid');
    }
    if ($('fbclid')) { $('fbclid').value = fbclid; }
  }
  capturarUtms();

  function lerCookie(nome) {
    var achado = document.cookie.split('; ').filter(function (par) {
      return par.indexOf(nome + '=') === 0;
    })[0];
    return achado ? decodeURIComponent(achado.slice(nome.length + 1)) : '';
  }

  /**
   * _fbp e _fbc são criados pelo próprio Pixel, então só são lidos na hora
   * do envio — dar tempo ao fbq de gravá-los. Se o _fbc não existir mas
   * houver fbclid, montamos no formato que o Meta espera:
   *   fb.1.<timestamp>.<fbclid>
   */
  function lerIdentificadoresMeta() {
    var fbclid = $('fbclid') ? $('fbclid').value : '';
    var fbc = lerCookie('_fbc');

    if (!fbc && fbclid) {
      var ts = recuperar('fbclid_ts') || String(Date.now());
      fbc = 'fb.1.' + ts + '.' + fbclid;
    }

    return { fbclid: fbclid, fbp: lerCookie('_fbp'), fbc: fbc };
  }

  /** Identificador único do envio, compartilhado entre Pixel e API de
   *  Conversões. É o que faz o Meta contar um lead, e não dois. */
  function gerarEventId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (e) {}
    return 'lead-' + Date.now() + '-' + Math.random().toString(16).slice(2, 10);
  }

  /* ======================================================================
     4) Máscara de WhatsApp — (00) 00000-0000
     ====================================================================== */
  function apenasDigitos(valor) {
    return (valor || '').replace(/\D/g, '');
  }

  function mascararTelefone(valor) {
    var d = apenasDigitos(valor).slice(0, 11);
    if (d.length === 0) { return ''; }
    if (d.length <= 2)  { return '(' + d; }
    if (d.length <= 7)  { return '(' + d.slice(0, 2) + ') ' + d.slice(2); }
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  inpFone.addEventListener('input', function () {
    var antes = this.value;
    this.value = mascararTelefone(antes);
    if (this.value !== antes) { limparErro('whatsapp'); }
  });

  // Colar número com +55, espaços ou traços também funciona
  inpFone.addEventListener('paste', function (ev) {
    ev.preventDefault();
    var texto = (ev.clipboardData || window.clipboardData).getData('text');
    var d = apenasDigitos(texto);
    if (d.length > 11 && d.indexOf('55') === 0) { d = d.slice(2); }
    this.value = mascararTelefone(d);
  });

  /* ======================================================================
     5) Chips (botões de toque único) — funcionam como radio
     ====================================================================== */
  function montarGrupoChips(idGrupo) {
    var grupo = $(idGrupo);
    if (!grupo) { return; }

    var campoOculto = $(grupo.getAttribute('data-field'));
    var chips = Array.prototype.slice.call(grupo.querySelectorAll('.chip'));

    function selecionar(chip) {
      chips.forEach(function (c) {
        var ativo = (c === chip);
        c.setAttribute('aria-checked', ativo ? 'true' : 'false');
        c.tabIndex = ativo ? 0 : -1;
      });
      campoOculto.value = chip.getAttribute('data-value');
      grupo.removeAttribute('data-invalid');
      limparErro(grupo.getAttribute('data-field'));
    }

    chips.forEach(function (chip, indice) {
      chip.tabIndex = indice === 0 ? 0 : -1;

      chip.addEventListener('click', function () { selecionar(chip); });

      // Navegação por setas dentro do grupo (padrão radiogroup)
      chip.addEventListener('keydown', function (ev) {
        var passo = 0;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { passo = 1; }
        if (ev.key === 'ArrowLeft'  || ev.key === 'ArrowUp')   { passo = -1; }
        if (!passo) { return; }
        ev.preventDefault();
        var proximo = chips[(indice + passo + chips.length) % chips.length];
        proximo.focus();
        selecionar(proximo);
      });
    });
  }

  montarGrupoChips('chips-interesse');
  montarGrupoChips('chips-objetivo');

  /* ======================================================================
     6) Erros
     ====================================================================== */
  function mostrarErro(campo, mensagem) {
    var alvo = $('err-' + campo);
    if (alvo) {
      alvo.textContent = mensagem;
      alvo.classList.add('show');
    }
    var input = $(campo);
    if (input && input.type !== 'hidden') { input.setAttribute('aria-invalid', 'true'); }
    var grupo = $('chips-' + campo);
    if (grupo) { grupo.setAttribute('data-invalid', 'true'); }
  }

  function limparErro(campo) {
    var alvo = $('err-' + campo);
    if (alvo) {
      alvo.textContent = '';
      alvo.classList.remove('show');
    }
    var input = $(campo);
    if (input && input.type !== 'hidden') { input.removeAttribute('aria-invalid'); }
  }

  function limparTodosOsErros() {
    ['nome', 'whatsapp', 'interesse', 'objetivo', 'consentimento', 'geral']
      .forEach(limparErro);
    ['chips-interesse', 'chips-objetivo'].forEach(function (id) {
      var g = $(id);
      if (g) { g.removeAttribute('data-invalid'); }
    });
  }

  inpNome.addEventListener('input', function () { limparErro('nome'); });
  inpConsen.addEventListener('change', function () { limparErro('consentimento'); });

  /* ======================================================================
     7) Validação
     ====================================================================== */
  function validar() {
    limparTodosOsErros();
    var erros = [];

    // Nome
    var nome = inpNome.value.trim().replace(/\s+/g, ' ');
    if (nome.length < 2) {
      mostrarErro('nome', 'Digite seu nome para personalizarmos o envio.');
      erros.push('nome');
    } else if (!/[A-Za-zÀ-ÿ]/.test(nome)) {
      mostrarErro('nome', 'O nome precisa conter letras.');
      erros.push('nome');
    }

    // WhatsApp — 11 dígitos, DDD válido e celular começando com 9
    var fone = apenasDigitos(inpFone.value);
    if (fone.length === 0) {
      mostrarErro('whatsapp', 'Informe seu WhatsApp com DDD.');
      erros.push('whatsapp');
    } else if (fone.length !== 11) {
      mostrarErro('whatsapp', 'O WhatsApp precisa ter 11 dígitos: DDD + 9 números. Ex.: (11) 91234-5678');
      erros.push('whatsapp');
    } else if (parseInt(fone.slice(0, 2), 10) < 11) {
      mostrarErro('whatsapp', 'DDD inválido. Confira os dois primeiros números.');
      erros.push('whatsapp');
    } else if (fone.charAt(2) !== '9') {
      mostrarErro('whatsapp', 'Número de celular inválido: depois do DDD ele começa com 9.');
      erros.push('whatsapp');
    }

    // Chips
    if (!$('interesse').value) {
      mostrarErro('interesse', 'Escolha uma opção do que você quer importar.');
      erros.push('interesse');
    }
    if (!$('objetivo').value) {
      mostrarErro('objetivo', 'Escolha uma opção de objetivo.');
      erros.push('objetivo');
    }

    // Consentimento
    if (!inpConsen.checked) {
      mostrarErro('consentimento', 'Precisamos do seu aceite para enviar o guia no WhatsApp.');
      erros.push('consentimento');
    }

    // Leva o foco ao primeiro erro
    if (erros.length) {
      var primeiro = erros[0];
      var alvo = $(primeiro) && $(primeiro).type !== 'hidden'
        ? $(primeiro)
        : ($('chips-' + primeiro) ? $('chips-' + primeiro).querySelector('.chip') : null);
      if (alvo && alvo.focus) {
        alvo.focus({ preventScroll: true });
        alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return erros.length === 0;
  }

  /* ======================================================================
     8) Envio
     ====================================================================== */
  function primeiroNome(nomeCompleto) {
    var parte = nomeCompleto.trim().split(/\s+/)[0] || '';
    return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
  }

  function montarUrlObrigado(nome) {
    var params = new URLSearchParams();
    params.set('nome', nome);
    UTM_KEYS.forEach(function (key) {
      var valor = $(key) ? $(key).value : '';
      if (valor) { params.set(key, valor); }
    });
    return CONFIG.PAGINA_OBRIGADO + '?' + params.toString();
  }

  function enviarParaPlanilha(dados) {
    if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.indexOf('COLE_AQUI') === 0) {
      console.warn('[Paraguai Academy] APPS_SCRIPT_URL não configurada em assets/form.js — o lead não foi salvo.');
      return Promise.reject(new Error('apps_script_nao_configurado'));
    }

    var corpo = JSON.stringify(dados);

    // text/plain de propósito: application/json dispararia o preflight de
    // CORS (OPTIONS), que o Apps Script não responde. Assim vira requisição
    // simples e o doPost recebe o JSON inteiro em e.postData.contents.
    var cabecalhos = { 'Content-Type': 'text/plain;charset=utf-8' };

    // Teto de 15s para a requisição não ficar pendurada para sempre.
    var controle = (typeof AbortController === 'function') ? new AbortController() : null;
    var expirou = setTimeout(function () {
      if (controle) { controle.abort(); }
    }, 15000);

    function pronto(valor) { clearTimeout(expirou); return valor; }

    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: cabecalhos,
      body: corpo,
      signal: controle ? controle.signal : undefined
    }).then(
      function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.text();
      },
      function () {
        // Falha de rede ou bloqueio de CORS: reenvia em modo opaco.
        // A resposta não pode ser lida, então devolvemos vazio.
        return fetch(CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: cabecalhos,
          body: corpo
        }).then(function () { return ''; });
      }
    ).then(function (texto) {
      pronto();
      if (!texto) { return; }               // modo opaco: nada a conferir
      var resposta;
      try { resposta = JSON.parse(texto); } catch (naoEhJson) { return; }
      if (resposta && resposta.ok === false) {
        throw new Error(resposta.error || 'erro_no_servidor');
      }
    }, function (erro) {
      pronto();
      throw erro;
    });
  }

  /**
   * Evento Lead do Pixel. Só é chamado depois que o Apps Script confirmou
   * o envio — nunca no clique do botão, nunca em caso de erro.
   */
  var leadDisparado = false;

  function dispararLead(dados, eventId) {
    if (leadDisparado) { return; }
    leadDisparado = true;

    if (typeof window.fbq !== 'function') { return; }
    try {
      window.fbq('track', 'Lead', {
        content_name: CONFIG.CONTENT_NAME,
        interesse: dados.interesse,
        objetivo: dados.objetivo
      }, { eventID: eventId });
    } catch (e) {
      console.warn('[Paraguai Academy] fbq indisponível:', e);
    }
  }

  /**
   * Mesmo evento pela API de Conversões, com o MESMO event_id — é assim
   * que o Meta junta os dois e conta um lead só.
   *
   * Dispara e esquece: keepalive faz a requisição sobreviver à troca de
   * página, e qualquer falha é engolida de propósito. A API de Conversões
   * nunca pode derrubar o formulário.
   */
  function enviarParaCapi(dados, eventId) {
    try {
      fetch(CONFIG.CAPI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          event_id: eventId,
          event_source_url: window.location.href,
          nome: dados.nome,
          whatsapp: dados.whatsapp,
          interesse: dados.interesse,
          objetivo: dados.objetivo,
          fbp: dados.fbp,
          fbc: dados.fbc
        })
      }).catch(function () {});
    } catch (e) {}
  }

  var enviando = false;

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    // Trava contra clique duplo: sem isso o Lead sairia duas vezes.
    if (enviando) { return; }
    if (!validar()) { return; }

    enviando = true;
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    var nome = inpNome.value.trim().replace(/\s+/g, ' ');
    var eventId = gerarEventId();
    var meta = lerIdentificadoresMeta();

    // Espelha nos campos ocultos, para dar para conferir no DevTools.
    if ($('fbp')) { $('fbp').value = meta.fbp; }
    if ($('fbc')) { $('fbc').value = meta.fbc; }

    var dados = {
      evento:       CONFIG.EVENTO,                 // roteia para a aba certa
      nome:         nome,
      whatsapp:     inpFone.value,                 // formatado: (11) 91234-5678
      interesse:    $('interesse').value,
      objetivo:     $('objetivo').value,
      utm_source:   $('utm_source').value,
      utm_medium:   $('utm_medium').value,
      utm_campaign: $('utm_campaign').value,
      utm_content:  $('utm_content').value,
      utm_term:     $('utm_term').value,
      fbclid:       meta.fbclid,
      fbp:          meta.fbp,
      fbc:          meta.fbc,
      event_id:     eventId
    };
    if (CONFIG.SEGREDO) { dados.secret = CONFIG.SEGREDO; }

    var destino = montarUrlObrigado(primeiroNome(nome));

    enviarParaPlanilha(dados)
      .then(function () {
        // A ordem aqui importa: o lead só existe depois que a planilha
        // confirmou, então é só agora que o Lead pode sair.
        dispararLead(dados, eventId);
        enviarParaCapi(dados, eventId);

        // 300ms de folga para o fbq despachar antes da troca de página.
        setTimeout(function () {
          window.location.href = destino;
        }, 300);
      })
      .catch(function (erro) {
        // Envio falhou: nenhum Lead é disparado e o botão volta ao normal.
        console.error('[Paraguai Academy] Falha no envio:', erro);
        enviando = false;
        btn.disabled = false;
        btn.textContent = TEXTO_BTN;
        mostrarErro('geral', 'Não conseguimos enviar agora. Confira sua internet e toque novamente.');
      });
  });

})();
