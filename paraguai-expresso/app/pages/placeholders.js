// Placeholders da área do aluno para a Fase 3. Cada página é construída na
// sua fase (trilha=4, ferramentas=6, calculadora=7, início=8). Os cadeados
// de ferramenta e do certificado já funcionam de verdade aqui.
import { ferramentaLiberada, trilhaConcluida } from "../auth.js";
import { ETAPA_DA_FERRAMENTA, TOTAL_ETAPAS } from "../config.js";

const PAGINAS = {
  "#/app":               ["Início", "A nova tela inicial chega na fase 8."],
  "#/app/calculadora":   ["Calculadora", "A calculadora chega na fase 7.", "calculadora"],
  "#/app/fornecedores":  ["Fornecedores", "A lista de fornecedores chega na fase 6.", "fornecedores"],
  "#/app/freteiros":     ["Freteiros", "A lista de freteiros chega na fase 6.", "freteiros"],
  "#/app/envio":         ["Envio no Brasil", "O tutorial de envio chega na fase 6.", "envio"],
  "#/app/loja-parceira": ["Loja parceira", "A loja parceira chega na fase 6."],
  "#/app/suporte":       ["Suporte", "O card de suporte chega na fase 8."],
  "#/app/certificado":   ["Certificado", "O certificado libera ao concluir as 8 etapas."],
};

export function render(ctx, rota) {
  const [titulo, nota, ferramenta] = PAGINAS[rota] || ["Página", "Em construção."];

  if (ferramenta && !ferramentaLiberada(ctx, ETAPA_DA_FERRAMENTA[ferramenta])) {
    const n = ETAPA_DA_FERRAMENTA[ferramenta];
    return `<h1>${titulo}</h1>
      <div class="card mt-4"><span class="aviso">Esta ferramenta libera na etapa ${n}. Avance na trilha para desbloquear.</span></div>`;
  }
  if (rota === "#/app/certificado" && !trilhaConcluida(ctx)) {
    return `<h1>${titulo}</h1>
      <div class="card mt-4"><span class="aviso">Conclua as ${TOTAL_ETAPAS} etapas da trilha para liberar o certificado.</span></div>`;
  }
  return `<h1>${titulo}</h1>
    <div class="card mt-4"><p class="muted">${nota}</p></div>`;
}
