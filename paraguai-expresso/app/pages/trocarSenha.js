// Troca de senha obrigatória no primeiro acesso.
import { trocarSenha } from "../auth.js";

export function render() {
  return `<div class="auth-wrap"><div class="card auth-card">
    <h1>Crie uma nova senha</h1>
    <p class="sub">No primeiro acesso, defina uma senha só sua.</p>
    <form id="form-senha" novalidate>
      <div class="field">
        <label for="s1">Nova senha</label>
        <input id="s1" type="password" autocomplete="new-password" minlength="6" required>
      </div>
      <div class="field">
        <label for="s2">Repita a senha</label>
        <input id="s2" type="password" autocomplete="new-password" minlength="6" required>
      </div>
      <button class="btn block" id="btn-senha" type="submit">Salvar e continuar</button>
      <p class="form-msg erro" id="msg-senha" role="alert"></p>
    </form>
  </div></div>`;
}

export function aoMontar(_ctx, app) {
  const form = document.getElementById("form-senha");
  const msg = document.getElementById("msg-senha");
  const btn = document.getElementById("btn-senha");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "form-msg erro"; msg.textContent = "";
    const s1 = document.getElementById("s1").value;
    const s2 = document.getElementById("s2").value;
    if (s1 !== s2) { msg.textContent = "As senhas não são iguais."; return; }
    btn.disabled = true; btn.textContent = "Salvando...";
    try {
      await trocarSenha(s1);
      await app.recarregar();
      app.navegar("#/app");
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false; btn.textContent = "Salvar e continuar";
    }
  });
}
