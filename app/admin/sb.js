// Cliente Supabase do admin. Login por e-mail + senha, sessão própria
// (separada da do aluno). As escritas passam pela RLS (papel = admin).
const SB_URL = "https://jflqyoshiwiiwrjsmmzv.supabase.co";
const KEY = "sb_publishable_7FztbSojia-aVtCGvsVglw_fmCadtSj";
const SESS = "pa_admin";

const ler = () => { try { return JSON.parse(localStorage.getItem(SESS)); } catch { return null; } };
const grava = (s) => { try { s ? localStorage.setItem(SESS, JSON.stringify(s)) : localStorage.removeItem(SESS); } catch {} };

let sess = ler();
export const sessao = () => sess;
export const sair = () => { sess = null; grava(null); };

export async function entrar(email, senha) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: String(email).trim().toLowerCase(), password: senha }),
  });
  if (!r.ok) throw new Error(r.status === 400 || r.status === 401 ? "E-mail ou senha incorretos." : "Login indisponível.");
  const t = await r.json();
  sess = { access: t.access_token, refresh: t.refresh_token, exp: Date.now() + (t.expires_in || 3600) * 1000, user: t.user };
  grava(sess);
  return sess;
}

export async function token() {
  if (!sess) throw new Error("Sessão expirada.");
  if (sess.exp - Date.now() < 60000) {
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: sess.refresh }),
    });
    if (!r.ok) { sair(); throw new Error("Sessão expirada. Entre de novo."); }
    const t = await r.json();
    sess = { ...sess, access: t.access_token, refresh: t.refresh_token, exp: Date.now() + (t.expires_in || 3600) * 1000 };
    grava(sess);
  }
  return sess.access;
}

export async function rest(path, opt = {}) {
  const tk = await token();
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opt,
    headers: { apikey: KEY, Authorization: "Bearer " + tk, "Content-Type": "application/json", Prefer: opt.prefer || "return=representation", ...(opt.headers || {}) },
  });
  if (!r.ok) {
    let m = ""; try { m = (await r.json())?.message || ""; } catch {}
    throw new Error(m || `Erro ${r.status}.`);
  }
  return r.status === 204 ? null : r.json();
}

// Chama um endpoint serverless de admin com o token atual.
export async function chamarApi(caminho, corpo) {
  const tk = await token();
  const r = await fetch(caminho, {
    method: "POST", headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro || "Falha na operação.");
  return d;
}

export const papelDoUsuario = async (uid) => {
  const p = await rest(`perfis?select=papel&id=eq.${uid}`);
  return p?.[0]?.papel;
};
