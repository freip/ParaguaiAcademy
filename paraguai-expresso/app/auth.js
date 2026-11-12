// Autenticação do aluno: login por número + senha, troca obrigatória de
// senha no primeiro acesso e carregamento do contexto (perfil, acessos,
// progresso) usado pela área do aluno.
import {
  authToken, rest, rpc, atualizarUsuario, sessaoAtiva, limparSessao,
} from "./lib/supabase.js";

// Normaliza o número para o formato E.164 (+55...). Precisa bater com o
// número usado quando o admin cria a conta.
export function normalizarTelefone(entrada) {
  let d = String(entrada || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return "";
  if (d.length <= 11) d = "55" + d; // sem código do país: assume Brasil
  return "+" + d;
}

export async function entrar(numero, senha) {
  const phone = normalizarTelefone(numero);
  if (!phone || phone.length < 13) throw new Error("Informe um número válido com DDD.");
  if (!senha) throw new Error("Informe sua senha.");
  await authToken("password", { phone, password: senha });
  return carregarContexto();
}

export function sair() { limparSessao(); }

// Reúne tudo que a área do aluno precisa para montar a navegação e as telas.
export async function carregarContexto() {
  const s = sessaoAtiva();
  if (!s) return null;
  const uid = s.user?.id;
  try { await rpc("inicializar_meu_progresso"); } catch {}
  const [perfilArr, acessos, progresso, nichosInfo] = await Promise.all([
    rest(`perfis?select=*&id=eq.${uid}`),
    rest(`acessos?select=nicho,liberado_em&usuario_id=eq.${uid}`),
    rest(`progresso_etapas?select=etapa,status,checklist,concluida_em&order=etapa.asc`),
    rest(`nichos?select=slug,nome,ordem&ativo=is.true&order=ordem.asc`),
  ]);
  const perfil = perfilArr?.[0] || null;
  return {
    uid,
    perfil,
    acessos: acessos || [],
    progresso: progresso || [],
    nichos: (acessos || []).map((a) => a.nicho),
    nichosInfo: nichosInfo || [],
  };
}

export async function trocarSenha(novaSenha) {
  if (!novaSenha || novaSenha.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }
  await atualizarUsuario({ password: novaSenha });
  await rpc("concluir_troca_senha");
}

// ---------- Leitura do contexto (usadas pela navegação e telas) ----------

export const temAcesso = (ctx) => !!ctx && ctx.nichos.length > 0;

export const precisaTrocarSenha = (ctx) => !!ctx?.perfil?.deve_trocar_senha;

export const statusEtapa = (ctx, n) =>
  ctx?.progresso?.find((p) => p.etapa === n)?.status || "bloqueada";

export const etapaAtual = (ctx) =>
  ctx?.progresso?.find((p) => p.status === "atual")?.etapa || null;

// Todas as ferramentas ficam sempre liberadas (nada é bloqueado). Mantida a
// assinatura porque é usada em vários lugares.
export const ferramentaLiberada = () => true;

export const etapaConcluida = (ctx, n) => statusEtapa(ctx, n) === "concluida";

// Certificado libera quando nenhuma etapa aplicável está pendente.
export const trilhaConcluida = (ctx) =>
  !!ctx?.progresso?.length &&
  ctx.progresso.every((p) => p.status === "concluida" || p.status === "nao_se_aplica");

export const nomeNicho = (ctx, slug) =>
  ctx?.nichosInfo?.find((n) => n.slug === slug)?.nome || slug;
