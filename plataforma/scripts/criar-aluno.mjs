// Cria uma conta de aluno (telefone + senha, sem SMS) e libera um nicho.
// Usa a Admin API do Supabase com a service role key. Rode com o Node.
//
// Como usar (PowerShell), a partir da pasta paraguai-expresso:
//   $env:SUPABASE_SERVICE_ROLE_KEY = "COLE_AQUI_A_SERVICE_ROLE_KEY"
//   node scripts/criar-aluno.mjs "+5531999999999" "senha123" perfumes "Nome do Aluno"
//
// A service role key fica em: Supabase > Project Settings > API > service_role (secret).
// Ela e secreta: nao suba no git nem compartilhe. Fica so no seu terminal.

const SB_URL = process.env.SB_URL || "https://jflqyoshiwiiwrjsmmzv.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const [, , numeroArg, senha, nicho, nome] = process.argv;

function normalizarTelefone(entrada) {
  let d = String(entrada || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return "";
  if (d.length <= 11) d = "55" + d;
  return "+" + d;
}

function sair(msg) { console.error("\n  " + msg + "\n"); process.exit(1); }

if (!KEY) sair("Defina a variavel SUPABASE_SERVICE_ROLE_KEY antes de rodar.");
if (!numeroArg || !senha || !nicho) {
  sair('Uso: node scripts/criar-aluno.mjs "+5531999999999" "senha123" perfumes "Nome (opcional)"');
}
const phone = normalizarTelefone(numeroArg);
if (phone.length < 13) sair("Numero invalido. Use o formato +55DDDNUMERO.");
if (senha.length < 6) sair("A senha precisa ter pelo menos 6 caracteres.");

const headers = {
  apikey: KEY,
  Authorization: "Bearer " + KEY,
  "Content-Type": "application/json",
};

async function main() {
  // 1) Cria o usuario com telefone ja confirmado (sem SMS).
  const rUser = await fetch(`${SB_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, password: senha, phone_confirm: true }),
  });
  const user = await rUser.json();
  if (!rUser.ok) sair("Erro ao criar usuario: " + (user.msg || user.message || JSON.stringify(user)));
  const uid = user.id;
  console.log("  Usuario criado:", uid, phone);

  // 2) Libera o nicho (service role ignora a RLS).
  const rAcesso = await fetch(`${SB_URL}/rest/v1/acessos`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ usuario_id: uid, nicho }),
  });
  if (!rAcesso.ok) sair("Usuario criado, mas falhou ao liberar o nicho: " + (await rAcesso.text()));
  console.log("  Nicho liberado:", nicho);

  // 3) Nome no perfil (opcional). nicho_principal ja ajuda a saudacao.
  const patch = { nicho_principal: nicho };
  if (nome) patch.nome = nome;
  const rPerfil = await fetch(`${SB_URL}/rest/v1/perfis?id=eq.${uid}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!rPerfil.ok) console.log("  Aviso: nao consegui atualizar o nome/nicho principal (nao e critico).");

  console.log("\n  Pronto. Entre no app com o numero", phone, "e a senha definida.");
  console.log("  No primeiro acesso ele vai pedir para trocar a senha.\n");
}

main().catch((e) => sair("Erro: " + e.message));
