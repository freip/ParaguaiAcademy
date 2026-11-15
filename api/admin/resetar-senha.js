// Redefine a senha de um aluno e marca para trocar no próximo acesso.
// Só funciona para quem está logado como admin.
import { SB_URL, SECRET, admH, exigirAdmin, lerBody } from "./_comum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
  if (!SECRET) return res.status(500).json({ erro: "Service role não configurada no servidor." });
  if (!(await exigirAdmin(req))) return res.status(403).json({ erro: "Sem permissão." });

  const { usuario_id, senha } = await lerBody(req);
  if (!usuario_id || !senha || senha.length < 6) return res.status(400).json({ erro: "Dados inválidos." });

  const r = await fetch(`${SB_URL}/auth/v1/admin/users/${usuario_id}`, {
    method: "PUT", headers: admH(), body: JSON.stringify({ password: senha }),
  });
  if (!r.ok) return res.status(400).json({ erro: "Falha ao redefinir a senha." });

  await fetch(`${SB_URL}/rest/v1/perfis?id=eq.${usuario_id}`, {
    method: "PATCH", headers: { ...admH(), Prefer: "return=minimal" },
    body: JSON.stringify({ deve_trocar_senha: true }),
  });
  res.status(200).json({ ok: true });
}
