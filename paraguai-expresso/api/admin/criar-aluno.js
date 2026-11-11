// Cria uma conta de aluno (telefone + senha, sem SMS) e libera um nicho.
// Só funciona para quem está logado como admin.
import { SB_URL, SECRET, admH, exigirAdmin, normalizarTelefone, lerBody } from "./_comum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
  if (!SECRET) return res.status(500).json({ erro: "Service role não configurada no servidor." });
  if (!(await exigirAdmin(req))) return res.status(403).json({ erro: "Sem permissão." });

  const { numero, senha, nicho, nome } = await lerBody(req);
  const phone = normalizarTelefone(numero);
  if (phone.length < 13) return res.status(400).json({ erro: "Número inválido." });
  if (!senha || senha.length < 6) return res.status(400).json({ erro: "Senha precisa de 6+ caracteres." });

  const rc = await fetch(`${SB_URL}/auth/v1/admin/users`, {
    method: "POST", headers: admH(),
    body: JSON.stringify({ phone, password: senha, phone_confirm: true }),
  });
  const novo = await rc.json();
  if (!rc.ok) return res.status(400).json({ erro: novo.msg || novo.message || "Falha ao criar (número já existe?)." });

  if (nicho) {
    await fetch(`${SB_URL}/rest/v1/acessos`, {
      method: "POST", headers: { ...admH(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ usuario_id: novo.id, nicho }),
    });
  }
  const patch = { nicho_principal: nicho || null };
  if (nome) patch.nome = nome;
  await fetch(`${SB_URL}/rest/v1/perfis?id=eq.${novo.id}`, {
    method: "PATCH", headers: { ...admH(), Prefer: "return=minimal" }, body: JSON.stringify(patch),
  });

  res.status(200).json({ id: novo.id, phone });
}
