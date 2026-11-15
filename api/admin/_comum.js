// Utilitários dos endpoints de admin (Vercel). A service role fica só aqui no
// servidor, nunca no navegador.
export const SB_URL = process.env.SB_URL || "https://jflqyoshiwiiwrjsmmzv.supabase.co";
export const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const ANON = process.env.SB_ANON || "sb_publishable_7FztbSojia-aVtCGvsVglw_fmCadtSj";

export const admH = () => ({ apikey: SECRET, Authorization: "Bearer " + SECRET, "Content-Type": "application/json" });

// Confirma que o token enviado é de um usuário com papel 'admin'.
export async function exigirAdmin(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: "Bearer " + token } });
  if (!u.ok) return null;
  const user = await u.json();
  const p = await fetch(`${SB_URL}/rest/v1/perfis?select=papel&id=eq.${user.id}`, { headers: admH() });
  const perfil = (await p.json())?.[0];
  return perfil?.papel === "admin" ? user : null;
}

export function normalizarTelefone(entrada) {
  let d = String(entrada || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return "";
  if (d.length <= 11) d = "55" + d;
  return "+" + d;
}

export async function lerBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}
