// Configuração central do app (sem build; módulos ES nativos).
export const SB_URL = "https://jflqyoshiwiiwrjsmmzv.supabase.co";
// Chave pública (publishable). A RLS no banco é quem protege os dados.
export const SB_KEY = "sb_publishable_7FztbSojia-aVtCGvsVglw_fmCadtSj";

// Total de etapas da trilha.
export const TOTAL_ETAPAS = 8;

// Link da comunidade (WhatsApp) — mantém o que já existia.
export const GRUPO_COMUNIDADE = "https://chat.whatsapp.com/CktozyU7vE9EQXjSPAumUV";

// Nome usado quando o perfil não tem nome preenchido.
export const NOME_PADRAO = "Importador";

// Página de vendas (arquivo próprio, fora da SPA). É para onde vai quem não
// está logado ou ainda não tem acesso pago.
export const PAGINA_VENDAS = "/plataforma/";

// ---------- Planos ----------
// Rota da página que explica os dois planos e leva ao upgrade.
export const ROTA_PLANO = "#/app/plano";

// Valores de referência (o admin pode mudar em Configurações; estes são o
// fallback quando a chave está vazia).
export const PLANO_PADRAO = {
  standard_valor: 49.9,
  pro_valor: 500,
  pro_recorrencia: 49,
};

// O que cada plano entrega. Serve para a página de planos e para os cadeados.
export const PLANOS = {
  standard: {
    nome: "Standard",
    chamada: "Para começar a importar com segurança.",
    inclui: [
      "Trilha completa das 8 etapas, com as aulas",
      "Calculadora de custo e preço de venda",
      "Fornecedores abertos (Paraguai e Brasil)",
      "Freteiros com tabela de preços",
      "Tutorial de envio e emissão de nota",
      "Comunidade geral de importados",
      "Suporte no horário comercial",
    ],
    naoInclui: [
      "Fornecedores premium",
      "Grupo de compras coletivas",
      "Mentoria exclusiva com chamadas",
      "Acompanhamento nas compras",
    ],
  },
  pro: {
    nome: "Pro",
    chamada: "Para quem quer comprar junto e ter acompanhamento.",
    inclui: [
      "Tudo do Standard",
      "Todos os fornecedores, inclusive os premium",
      "Grupo exclusivo de compras coletivas",
      "Mentoria exclusiva com chamadas",
      "Acompanhamento nas suas compras",
      "Dicas e promoções antes de todo mundo",
    ],
    naoInclui: [],
  },
};

// Recursos que só o Pro abre (usado pelos cadeados e pelas rotas).
export const RECURSOS_PRO = {
  "compras-coletivas": {
    nome: "Compras coletivas",
    isca: "Junte-se a outros alunos para bater o pedido mínimo e comprar mais barato.",
  },
  mentoria: {
    nome: "Mentoria Pro",
    isca: "Chamadas com o Mauro e acompanhamento nas suas compras.",
  },
  fornecedores_premium: {
    nome: "Fornecedores premium",
    isca: "As lojas que fecham preço melhor para quem compra em volume.",
  },
};
