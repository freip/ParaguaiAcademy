// Conteúdo editável da página de vendas que não vem do Supabase: fotos,
// vídeo, prints e números que só existem quando alguém os fornece.
//
// Regra única: campo vazio ("" ou []) → o bloco correspondente some da
// página sozinho. Nada aqui é inventado — os números e depoimentos reais
// entram preenchendo os campos abaixo, nunca direto no HTML.
export const CONTEUDO = {
  // Logo e foto de fundo do herói/fechamento. Se o arquivo não existir, a
  // página cai para o nome em texto (logo) ou para a cor sólida (foto) —
  // nada quebra.
  logo: "../public/paraguai-academy-logo.png",
  fronteira: "../public/fronteira.jpg",

  // Preencha a data (ex.: "1 de dezembro") para a barra de prazo aparecer.
  // Vazio = barra escondida (sem data, não tem prazo de verdade).
  prazo: {
    data: "",
  },

  // Vídeo do herói. Sem `url`, a caixa mostra "Vídeo em breve" (como no
  // resto da plataforma). Os capítulos abaixo são o roteiro sugerido — ajuste
  // o texto conforme o vídeo gravado, ou troque o `tempo` pelo real.
  video: {
    url: "",
    capa: "",
    capitulos: [
      { tempo: "0:00", texto: "Os 5 sinais de loja golpe" },
      { tempo: "0:50", texto: "A conta de um lote, ao vivo" },
      { tempo: "2:10", texto: "Como a mercadoria chega" },
    ],
  },

  // Pessoas no grupo VIP. Vazio = não mostra o número (não inventamos).
  grupoVip: {
    contagem: "",
  },

  // Prints reais de alunos (mercadoria chegando, conta fechada, golpe
  // evitado). Cada item só aparece se tiver `imagem`.
  prints: [
    { imagem: "", legenda: "Mercadoria que chegou. Foto da caixa aberta, com nome e cidade do aluno." },
    { imagem: "", legenda: "A conta fechada. Aluno mostrando o custo por unidade e por quanto vende." },
    { imagem: "", legenda: "Golpe evitado. Alguém que ia pagar uma loja falsa e conferiu a lista antes." },
  ],

  // Quem ensina. A seção inteira some se não houver nem bio nem foto nem
  // nenhum dos três números.
  mauro: {
    foto: "",
    bio: "",
    anos: "",     // anos comprando no Paraguai
    alunos: "",   // alunos atendidos
    lojas: "",    // lojas verificadas na lista
  },

  // Print real da tela de Fornecedores. Sem imagem, mostra um retrato
  // desenhado da própria tela (não é foto de ninguém, é a interface real).
  printPlataforma: {
    imagem: "",
  },
};
