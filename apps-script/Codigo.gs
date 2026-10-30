/**
 * Recebe eventos do site e grava na planilha.
 *
 * Cole este arquivo inteiro em Extensões → Apps Script da planilha de leads,
 * depois publique em Implantar → Nova implantação → Aplicativo da Web.
 *
 * São três eventos, no MESMO aplicativo web e na MESMA URL — quem decide é o
 * campo `evento` do corpo da requisição:
 *
 *   evento ausente (ou qualquer outro) → lead do formulário, primeira aba
 *   evento === 'clique-whatsapp'       → clique no WhatsApp, aba de cliques
 *   evento === 'lead-paraguai'         → lead da landing Paraguai Academy
 *
 * O padrão é o lead de propósito: as chamadas antigas do site não mandam
 * `evento` nenhum e precisam continuar caindo na aba certa depois desta
 * atualização.
 */

/** Nome da aba de cliques. Se não existir, é criada na primeira chamada. */
var ABA_CLIQUES = 'Cliques WhatsApp';

var COLUNAS_CLIQUES = ['Data', 'Origem', 'Pagina', 'Dispositivo', 'Fonte', 'Sessao'];

/** Nome da aba da landing Paraguai Academy. Idem: criada se não existir. */
var ABA_PARAGUAI = 'Leads Paraguai';

/**
 * A ordem aqui manda: tem que bater com o appendRow de gravarLeadParaguai.
 *
 * As seis ultimas foram acrescentadas a direita de proposito, em vez de
 * reordenar — assim as linhas ja gravadas continuam alinhadas. Quem ja tem
 * a aba criada com 8 colunas recebe as novas automaticamente, por
 * garantirCabecalho().
 */
var COLUNAS_PARAGUAI = [
  'Data', 'Nome', 'WhatsApp', 'Quer importar', 'Objetivo',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'fbp', 'fbc', 'event_id'
];

function doPost(e) {
  try {
    var body = lerCorpo(e);
    if (!body) {
      return json({ ok: false, error: 'corpo_vazio' });
    }

    // Senha opcional. Enquanto não existir a propriedade SHARED_SECRET no
    // script, qualquer chamada é aceita — a URL já é secreta por si só.
    var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (secret && body.secret !== secret) {
      return json({ ok: false, error: 'unauthorized' });
    }

    if (body.evento === 'clique-whatsapp') {
      gravarClique(body);
    } else if (body.evento === 'lead-paraguai') {
      gravarLeadParaguai(body);
    } else {
      gravarLead(body);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * Lê o corpo da requisição em JSON ou em formulário.
 *
 * O site manda JSON com Content-Type text/plain (é o que não dispara preflight
 * de CORS, que o Apps Script não sabe responder). A queda para `e.parameter`
 * existe só como rede de segurança: se algum navegador ficar com uma versão
 * antiga do JS em cache mandando form-urlencoded, o lead não se perde.
 *
 * Para quem já manda JSON, o comportamento é exatamente o de antes.
 */
function lerCorpo(e) {
  if (!e) { return null; }

  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (naoEhJson) {
      // Não era JSON: segue para os parâmetros de formulário.
    }
  }

  if (e.parameter && Object.keys(e.parameter).length) {
    return e.parameter;
  }

  return null;
}

/**
 * Lead do formulário, na primeira aba.
 *
 * A ordem do appendRow abaixo tem que bater com a ordem das colunas:
 *
 *   A Data | B Nome | C Telefone | D Email | E Origem | F Status
 *   G Cidade | H Tipo | I Tamanho | J Fotos | K Mensagem
 *
 * As cinco últimas foram acrescentadas à direita de propósito, em vez de
 * reordenar: assim as linhas que já estavam na planilha continuam alinhadas.
 * Se você mudar as colunas, mude esta lista junto.
 */
function gravarLead(body) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  sheet.appendRow([
    new Date(),            // A Data — objeto de data real, o Sheets formata sozinho
    body.nome || '',       // B
    body.telefone || '',   // C
    body.email || '',      // D
    body.origem || 'Site', // E
    'Novo',                // F Status inicial de todo lead que chega pelo site
    body.cidade || '',     // G
    body.tipo || '',       // H
    body.tamanho || '',    // I
    body.fotos || 0,       // J Quantidade de fotos oferecidas, não os arquivos
    body.mensagem || ''    // K
  ]);
}

/**
 * Clique num botão de WhatsApp, na aba de cliques.
 *
 *   A Data | B Origem | C Pagina | D Dispositivo | E Fonte | F Sessao
 *
 * Origem é qual botão do site foi clicado (hero, header, fab...), e Sessao é um
 * código aleatório por visita: a mesma pessoa clicando três vezes gera três
 * linhas com a mesma sessão, então dá para separar cliques de pessoas.
 */
function gravarClique(body) {
  var sheet = abaDeCliques();

  sheet.appendRow([
    new Date(),                    // A
    body.origem || 'desconhecida', // B
    body.pagina || '/',            // C
    body.dispositivo || '',        // D
    body.fonte || 'direto',        // E
    body.sessao || ''              // F
  ]);
}

/**
 * Lead da landing Paraguai Academy, em aba separada.
 *
 *   A Data | B Nome | C WhatsApp | D Quer importar | E Objetivo
 *   F utm_source | G utm_medium | H utm_campaign
 *
 * Fica fora da primeira aba de propósito: as perguntas são outras (o que quer
 * importar, objetivo) e misturar com os leads antigos sujaria as duas pontas.
 * Se um dia quiser juntar tudo, dá para puxar com QUERY numa aba de resumo.
 */
function gravarLeadParaguai(body) {
  var sheet = abaDoParaguai();

  sheet.appendRow([
    new Date(),                // A
    body.nome || '',           // B
    body.whatsapp || '',       // C
    body.interesse || '',      // D
    body.objetivo || '',       // E
    body.utm_source || '',     // F
    body.utm_medium || '',     // G
    body.utm_campaign || '',   // H
    body.utm_content || '',    // I
    body.utm_term || '',       // J
    body.fbclid || '',         // K
    body.fbp || '',            // L
    body.fbc || '',            // M
    body.event_id || ''        // N — mesmo id mandado ao Pixel e a CAPI
  ]);
}

/** Devolve a aba de cliques, criando-a com o cabeçalho se ainda não existir. */
function abaDeCliques() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = planilha.getSheetByName(ABA_CLIQUES);

  if (!sheet) {
    sheet = planilha.insertSheet(ABA_CLIQUES);
    sheet.appendRow(COLUNAS_CLIQUES);
    sheet.getRange(1, 1, 1, COLUNAS_CLIQUES.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/** Devolve a aba do Paraguai, criando-a com o cabeçalho se ainda não existir. */
function abaDoParaguai() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = planilha.getSheetByName(ABA_PARAGUAI);

  if (!sheet) {
    sheet = planilha.insertSheet(ABA_PARAGUAI);
    sheet.setColumnWidth(1, 150); // Data
    sheet.setColumnWidth(2, 180); // Nome
    sheet.setColumnWidth(3, 150); // WhatsApp
    sheet.setColumnWidth(4, 260); // Quer importar
    sheet.setColumnWidth(5, 220); // Objetivo
  }

  garantirCabecalho(sheet, COLUNAS_PARAGUAI);

  return sheet;
}

/**
 * Mantem o cabecalho em dia sem destruir nada.
 *
 * Aba vazia  -> escreve o cabecalho inteiro.
 * Aba antiga -> acrescenta so as colunas que faltam, a direita. As colunas
 *               e as linhas que ja existiam ficam exatamente onde estavam.
 *
 * E idempotente: rodar varias vezes nao duplica nem reescreve nada.
 */
function garantirCabecalho(sheet, colunas) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(colunas);
    sheet.getRange(1, 1, 1, colunas.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return;
  }

  var existentes = sheet.getLastColumn();
  if (existentes < colunas.length) {
    var faltando = colunas.slice(existentes);
    sheet.getRange(1, existentes + 1, 1, faltando.length)
         .setValues([faltando])
         .setFontWeight('bold');
  }
}

/** Abrir a URL no navegador cai aqui — serve para conferir que está no ar. */
function doGet() {
  return json({ ok: true, status: 'online' });
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * TESTE — rode no editor para conferir a aba do Paraguai sem usar o site.
 * Apague a linha de teste da planilha depois.
 */
function testarParaguai() {
  var resposta = doPost({
    postData: {
      contents: JSON.stringify({
        evento: 'lead-paraguai',
        nome: 'Teste Paraguai Academy',
        whatsapp: '(11) 91234-5678',
        interesse: 'Perfumes',
        objetivo: 'Começar a revender',
        utm_source: 'teste',
        utm_medium: 'manual',
        utm_campaign: 'validacao',
        utm_content: 'anuncio-teste',
        utm_term: 'conjunto-teste',
        fbclid: 'TESTE_fbclid',
        fbp: 'fb.1.1700000000000.1234567890',
        fbc: 'fb.1.1700000000000.TESTE_fbclid',
        event_id: 'teste-' + new Date().getTime()
      })
    }
  });
  Logger.log(resposta.getContent());
}
