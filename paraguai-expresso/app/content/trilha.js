// Conteúdo das 8 etapas da trilha. Textos editáveis aqui, sem mexer nos
// componentes. Tipagem via JSDoc (sem TypeScript). Os vídeos, o checklist e
// as regras ficam no banco; aqui mora o texto de apoio e a estrutura.

/**
 * @typedef {Object} Mensagem
 * @property {string} titulo
 * @property {string} texto
 * @property {boolean} [whatsapp]  Mostra o botão "Enviar no WhatsApp".
 * @property {"paraguai"|"brasil"} [caminho]  Mostra só no caminho indicado.
 */
/**
 * @typedef {Object} Etapa
 * @property {number} numero
 * @property {string} titulo
 * @property {string} descricao          Uma linha.
 * @property {string[]} resumo           3 a 6 tópicos curtos.
 * @property {Mensagem[]} [mensagens]
 * @property {("fornecedores"|"calculadora"|"freteiros"|"envio"|"nota")[]} [ferramentas]
 * @property {boolean} [pedeNicho]       Etapa 1: escolher nicho principal.
 * @property {boolean} [pedeCaminho]     Etapa 2: escolher Paraguai ou Brasil.
 * @property {boolean} [soParaguai]      Etapas 5 e 6.
 * @property {boolean} [comoFunciona]    Etapa 1: 4 cards "Como funciona".
 * @property {boolean} [sinaisGolpe]     Etapa 1: card "5 sinais de golpe".
 * @property {boolean} [checklistAntesPagar]  Etapa 4.
 * @property {boolean} [linhaTempo]      Etapa 5.
 * @property {boolean} [modelosAtendimento]   Etapa 8.
 * @property {boolean} [mentoria]        Etapa 8: card da mentoria.
 */

/** @type {Etapa[]} */
export const ETAPAS = [
  {
    numero: 1,
    titulo: "Comece aqui",
    descricao: "Como funciona a importação e como não cair em golpe.",
    resumo: [
      "O caminho completo: escolher fornecedor, fazer as contas, pedir e pagar, travessia, nota, envio e vender.",
      "As etapas liberam em ordem; as ferramentas ficam no menu.",
      "Diferença entre comprar para uso próprio e para revender.",
      "Só compre de quem está na lista da plataforma ou valide com o suporte.",
    ],
    pedeNicho: true,
    comoFunciona: true,
    sinaisGolpe: true,
  },
  {
    numero: 2,
    titulo: "Fornecedores",
    descricao: "Onde comprar: Paraguai ou Brasil.",
    resumo: [
      "Paraguai: preço menor, pedido mínimo, passa pela travessia, prazo maior.",
      "Brasil: chega mais rápido, sem travessia, mínimo em reais, custo um pouco maior.",
      "O que perguntar ao fornecedor: lista de preços, mínimo, formas de pagamento e prazo.",
      "Como identificar um fornecedor sério.",
    ],
    pedeCaminho: true,
    ferramentas: ["fornecedores"],
    mensagens: [
      { titulo: "Primeiro contato com a loja", whatsapp: true,
        texto: "Olá! Tenho interesse em comprar [PRODUTO] para revenda. Pode me enviar a lista de produtos, os preços e o pedido mínimo?" },
      { titulo: "Pedir lista de preços e pedido mínimo", whatsapp: true,
        texto: "Olá! Pode me passar a lista de preços atualizada, o pedido mínimo e as formas de pagamento? Obrigado." },
    ],
  },
  {
    numero: 3,
    titulo: "Faça as contas",
    descricao: "Descubra o custo real e o preço de venda antes de comprar.",
    resumo: [
      "O que entra no custo: produto em dólar x cotação, freteiro, transporte, nota, frete até você, embalagem e taxa do canal.",
      "No perfume o freteiro cobra percentual; no celular, valor fixo por aparelho.",
      "Use a calculadora: busque o produto, ajuste a quantidade, confira os custos e escolha a margem.",
      "Salve a simulação para abrir depois.",
    ],
    ferramentas: ["calculadora"],
  },
  {
    numero: 4,
    titulo: "Pedido e pagamento seguro",
    descricao: "Como fazer o pedido e pagar sem risco.",
    resumo: [
      "Peça a lista e a cotação do dólar do dia.",
      "Pedido mínimo costuma ficar por volta de US$ 200 no Paraguai.",
      "Confira se a conta de pagamento é da loja; guarde comprovante e recibo.",
      "Nunca pague 'taxa de liberação'.",
    ],
    checklistAntesPagar: true,
    mensagens: [
      { titulo: "Pedir lista e cotação do dia", whatsapp: true,
        texto: "Olá! Pode me enviar a lista com os preços de hoje e a cotação do dólar que vocês estão usando?" },
      { titulo: "Enviar meus dados para cadastro", whatsapp: true,
        texto: "Olá! Seguem meus dados para cadastro: [NOME COMPLETO], [DOCUMENTO], [TELEFONE]. Pode confirmar?" },
      { titulo: "Confirmar o pedido e o total", whatsapp: true,
        texto: "Quero fechar este pedido: [ITENS E QUANTIDADES]. Pode confirmar o total em US$ e em R$?" },
      { titulo: "Pedir envio para a transportadora", whatsapp: true, caminho: "paraguai",
        texto: "Pode enviar a mercadoria para a transportadora [NOME]? Me passe o recibo quando despachar, por favor." },
      { titulo: "Pedir envio para o meu endereço", whatsapp: true, caminho: "brasil",
        texto: "Pode enviar a mercadoria para o meu endereço? Seguem os dados: [ENDEREÇO COMPLETO E CEP]." },
    ],
  },
  {
    numero: 5,
    titulo: "Travessia Paraguai → Brasil",
    descricao: "Como a mercadoria sai da loja e chega ao Brasil.",
    soParaguai: true,
    linhaTempo: true,
    resumo: [
      "A loja envia para a transportadora (ex.: Paraná Express, Pedro Juan Caballero).",
      "Você recebe o recibo e repassa ao freteiro.",
      "O freteiro atravessa e prepara o envio.",
      "Informe ao freteiro: produtos, quantidade, valor e recibo.",
    ],
    ferramentas: ["freteiros"],
    mensagens: [
      { titulo: "Primeiro contato com o freteiro", whatsapp: true,
        texto: "Olá! Vou comprar na loja [NOME] e preciso trazer a mercadoria até o Brasil. Qual o valor do frete e o prazo?" },
      { titulo: "Enviar recibo e dados do pedido", whatsapp: true,
        texto: "Segue o recibo da transportadora e os dados do pedido: [PRODUTOS, QUANTIDADE, VALOR]." },
      { titulo: "Confirmar data de envio", whatsapp: true,
        texto: "Podemos confirmar a data de envio? Quero me organizar para gerar a etiqueta assim que chegar." },
    ],
  },
  {
    numero: 6,
    titulo: "Nota fiscal",
    descricao: "Quando e como pedir a nota, antes de gerar a etiqueta.",
    soParaguai: true,
    ferramentas: ["nota"],
    resumo: [
      "Peça a nota antes de gerar a etiqueta de envio.",
      "Até R$ 1.650,00 em produtos: R$ 100,00 por nota.",
      "Acima de R$ 1.650,00: 7% sobre o valor total da nota.",
      "Confirme os valores e os documentos com a equipe antes da emissão.",
    ],
    mensagens: [
      { titulo: "Solicitar emissão de nota fiscal", whatsapp: true,
        texto: "Olá! Preciso de nota fiscal para este pedido: [ITENS E VALOR]. Pode me informar o custo e os documentos necessários?" },
    ],
  },
  {
    numero: 7,
    titulo: "Envio no Brasil",
    descricao: "Como gerar a etiqueta e receber em casa.",
    ferramentas: ["envio"],
    resumo: [
      "Crie a conta na SuperFrete e preencha remetente e destinatário.",
      "Informe medidas e peso da caixa e compare as modalidades.",
      "Confira a nota fiscal antes de pagar e baixe a etiqueta em PDF.",
      "Ao receber: filme a abertura e confira quantidade e lacres.",
    ],
  },
  {
    numero: 8,
    titulo: "Hora de vender",
    descricao: "Preço, catálogo e atendimento para fazer as primeiras vendas.",
    ferramentas: ["calculadora"],
    modelosAtendimento: true,
    mentoria: true,
    resumo: [
      "Defina o preço: custo por unidade, margem, taxa de marketplace e preço mínimo.",
      "Use a calculadora no modo preço de venda.",
      "Monte o catálogo no WhatsApp com boas fotos e respostas rápidas.",
      "Cuide do pós-venda e peça avaliação.",
    ],
    mensagens: [
      { titulo: "Apresentação do catálogo", whatsapp: true,
        texto: "Olá! Tudo bem? Esse é o nosso catálogo de [PRODUTO]. Qualquer dúvida, me chame por aqui." },
      { titulo: "Envio de preço", whatsapp: true,
        texto: "O [PRODUTO] sai por [VALOR]. Posso separar uma unidade para você?" },
      { titulo: "Confirmação de pedido", whatsapp: true,
        texto: "Seu pedido está confirmado: [ITENS]. Total [VALOR]. Assim que o pagamento cair, já envio." },
      { titulo: "Pós-venda", whatsapp: true,
        texto: "Oi! Seu pedido chegou direitinho? Se puder deixar uma avaliação, ajuda muito. Obrigado!" },
    ],
  },
];

export const etapaPorNumero = (n) => ETAPAS.find((e) => e.numero === Number(n)) || null;

// Blocos de texto reutilizados em etapas específicas.
export const COMO_FUNCIONA = [
  { n: 1, titulo: "Escolha um produto", texto: "Comece pelo nicho que você liberou." },
  { n: 2, titulo: "Estude na ordem", texto: "Cada etapa tem aulas curtas e recursos práticos." },
  { n: 3, titulo: "Calcule o lucro", texto: "Veja quanto vai gastar e ganhar antes de comprar." },
  { n: 4, titulo: "Compre, receba e venda", texto: "Fale com a loja, receba pelo freteiro e venda no Brasil." },
];

export const SINAIS_GOLPE = [
  "Loja de 'atacado' que só existe no anúncio, sem endereço nem histórico.",
  "Site de rastreio falso cobrando 'taxa de liberação'.",
  "Preço bom demais para ser verdade.",
  "Pagamento para conta de pessoa diferente da loja.",
  "Pressão para pagar rápido, agora, sem pensar.",
];

export const CHECKLIST_ANTES_PAGAR = [
  "A loja está na lista da plataforma.",
  "Confirmei a cotação do dia.",
  "Conferi o total em US$ e em R$.",
  "O nome da conta bate com a loja.",
  "Combinei com o freteiro antes (só caminho Paraguai).",
  "Vou guardar o comprovante.",
];

export const LINHA_TEMPO = ["Loja", "Transportadora", "Freteiro", "Envio no Brasil", "Você"];
