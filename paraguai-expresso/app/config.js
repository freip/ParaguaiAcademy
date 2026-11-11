// Configuração central do app (sem build; módulos ES nativos).
export const SB_URL = "https://jflqyoshiwiiwrjsmmzv.supabase.co";
// Chave pública (publishable). A RLS no banco é quem protege os dados.
export const SB_KEY = "sb_publishable_7FztbSojia-aVtCGvsVglw_fmCadtSj";

// Total de etapas da trilha.
export const TOTAL_ETAPAS = 8;

// Em qual etapa cada ferramenta é liberada (seção 3.1 do documento).
export const ETAPA_DA_FERRAMENTA = {
  fornecedores: 2,
  calculadora: 3,
  freteiros: 5,
  envio: 7,
};

// Link da comunidade (WhatsApp) — mantém o que já existia.
export const GRUPO_COMUNIDADE = "https://chat.whatsapp.com/CktozyU7vE9EQXjSPAumUV";

// Nome usado quando o perfil não tem nome preenchido.
export const NOME_PADRAO = "Importador";
