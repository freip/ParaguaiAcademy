// Cliente mínimo do Supabase via fetch (sem SDK, sem build).
// A segurança real fica na RLS do banco; a chave aqui é pública.
import { SB_URL, SB_KEY } from "../config.js";

const SESS_KEY = "pa_sess";

const lerSessao = () => { try { return JSON.parse(localStorage.getItem(SESS_KEY)); } catch { return null; } };
const gravarSessao = (s) => { try { s ? localStorage.setItem(SESS_KEY, JSON.stringify(s)) : localStorage.removeItem(SESS_KEY); } catch {} };

let sess = lerSessao();

export const sessaoAtiva = () => sess;
export const limparSessao = () => { sess = null; gravarSessao(null); };

// Troca credenciais por tokens (grant = 'password' | 'refresh_token').
export async function authToken(grant, body) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: SB_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    throw new Error(r.status === 400 || r.status === 401
      ? "Número ou senha incorretos."
      : "Login indisponível no momento. Tente de novo.");
  }
  const t = await r.json();
  sess = {
    access: t.access_token,
    refresh: t.refresh_token,
    exp: Date.now() + (t.expires_in || 3600) * 1000,
    user: t.user || sess?.user || null,
  };
  gravarSessao(sess);
  return sess;
}

async function accessToken() {
  if (!sess) throw new Error("Sessão expirada. Entre de novo.");
  if (sess.exp - Date.now() < 60000) {
    try { await authToken("refresh_token", { refresh_token: sess.refresh }); }
    catch { limparSessao(); throw new Error("Sessão expirada. Entre de novo."); }
  }
  return sess.access;
}

async function erroDeResposta(r) {
  if (r.status === 401 || r.status === 403) return new Error("Sem permissão para esta ação.");
  if (r.status === 404) return new Error("Recurso não encontrado. O banco pode não estar configurado ainda.");
  let detalhe = ""; try { detalhe = (await r.json())?.message || ""; } catch {}
  return new Error(detalhe || "Não foi possível completar a ação. Tente de novo.");
}

// REST autenticado (RLS aplica as regras do aluno).
export async function rest(path, opt = {}) {
  const token = await accessToken();
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opt,
    headers: { apikey: SB_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json", ...(opt.headers || {}) },
  });
  if (!r.ok) throw await erroDeResposta(r);
  return r.status === 204 ? null : r.json();
}

// REST público (anon) — para a página gratuita, sem login.
export async function restPublico(path, opt = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opt,
    headers: { apikey: SB_KEY, "Content-Type": "application/json", ...(opt.headers || {}) },
  });
  if (!r.ok) throw await erroDeResposta(r);
  return r.status === 204 ? null : r.json();
}

// Chama uma função do banco (RPC).
export async function rpc(fn, args = {}) {
  return rest(`rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
    headers: { Prefer: "return=representation" },
  });
}

// Atualiza o usuário autenticado (ex.: nova senha).
export async function atualizarUsuario(dados) {
  const token = await accessToken();
  const r = await fetch(`${SB_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!r.ok) throw new Error("Não foi possível atualizar. Tente de novo.");
  return r.json();
}
