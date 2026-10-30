/**
 * API de Conversões do Meta — evento Lead pelo servidor.
 *
 * Roda como função serverless na Vercel (qualquer arquivo em /api vira um
 * endpoint; este fica em /api/meta-lead).
 *
 * Por que existe: o Pixel do navegador perde eventos para bloqueador de
 * anúncio, modo restrito do iOS e aba fechada cedo demais. Mandando o mesmo
 * Lead também pelo servidor, o Meta recebe os dois e — por causa do
 * event_id igual nos dois lados — conta como UM lead só.
 *
 * O token nunca aparece aqui no código nem no navegador: vem de variável de
 * ambiente. Veja a seção "API de Conversões" do README.md.
 */

const crypto = require('crypto');

const GRAPH_VERSION = 'v21.0';

/** SHA-256 em minúsculas, como o Meta exige para dados pessoais. */
function hash(valor) {
  if (!valor) return undefined;
  return crypto.createHash('sha256').update(String(valor)).digest('hex');
}

/**
 * Telefone no formato que o Meta espera: só dígitos, com o 55 do Brasil
 * na frente. "(11) 91234-5678" vira "5511912345678".
 */
function normalizarTelefone(bruto) {
  let digitos = String(bruto || '').replace(/\D/g, '');
  if (!digitos) return '';

  // Tira zeros de discagem na frente, se vierem colados.
  digitos = digitos.replace(/^0+/, '');

  // 10 ou 11 dígitos = número nacional, falta o país.
  if (digitos.length === 10 || digitos.length === 11) {
    digitos = '55' + digitos;
  }
  return digitos;
}

/**
 * Primeiro nome em minúsculas e sem acento — a normalização que o Meta
 * manda aplicar antes do hash. "João Pedro" vira "joao".
 */
function normalizarPrimeiroNome(bruto) {
  return String(bruto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // tira os acentos separados pelo NFD
    .toLowerCase()
    .trim()
    .split(/\s+/)[0] || '';
}

/** Primeiro IP real do visitante, atrás do proxy da Vercel. */
function ipDoCliente(req) {
  const encaminhado = req.headers['x-forwarded-for'];
  if (encaminhado) return String(encaminhado).split(',')[0].trim();
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : undefined;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'metodo_nao_permitido' });
  }

  const PIXEL_ID = process.env.META_PIXEL_ID;
  const TOKEN = process.env.META_CAPI_TOKEN;
  const TEST_CODE = process.env.META_TEST_EVENT_CODE;

  // Sem credencial o endpoint não quebra o formulário: responde 200 e
  // registra o motivo no log da Vercel. O lead já está na planilha e o
  // Pixel do navegador já disparou.
  if (!PIXEL_ID || !TOKEN) {
    console.warn('[meta-lead] META_PIXEL_ID ou META_CAPI_TOKEN ausente — evento não enviado.');
    return res.status(200).json({ ok: false, error: 'credenciais_ausentes' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const telefone = normalizarTelefone(body.whatsapp);
    const primeiroNome = normalizarPrimeiroNome(body.nome);

    const userData = {
      client_ip_address: ipDoCliente(req),
      client_user_agent: req.headers['user-agent']
    };

    if (telefone) userData.ph = hash(telefone);
    if (primeiroNome) userData.fn = hash(primeiroNome);
    if (body.fbp) userData.fbp = body.fbp;
    if (body.fbc) userData.fbc = body.fbc;

    const evento = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      // O mesmo id usado no fbq do navegador. É o que desduplica.
      event_id: body.event_id,
      event_source_url: body.event_source_url || req.headers.referer,
      user_data: userData,
      custom_data: {
        content_name: 'Guia Paraguai',
        interesse: body.interesse || '',
        objetivo: body.objetivo || ''
      }
    };

    const carga = { data: [evento] };
    if (TEST_CODE) carga.test_event_code = TEST_CODE;

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`;

    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(carga)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      console.error('[meta-lead] Meta recusou o evento:', JSON.stringify(resultado));
      return res.status(200).json({ ok: false, error: 'meta_recusou' });
    }

    return res.status(200).json({ ok: true, events_received: resultado.events_received });

  } catch (erro) {
    // Nunca devolve erro para o navegador: o formulário não pode depender
    // desta chamada para funcionar.
    console.error('[meta-lead] Falha inesperada:', erro);
    return res.status(200).json({ ok: false, error: 'falha_interna' });
  }
};
