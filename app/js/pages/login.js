// Tela de login (número + senha).
import { entrar } from "../auth.js";
import { logoHTML } from "../lib/logo.js";

export function render() {
  return `<div class="auth-wrap"><div class="card auth-card">
    <div class="auth-logo">${logoHTML({ grande: true })}</div>
    <h1>Entrar</h1>
    <p class="sub">Acesse a área do aluno com seu número e senha.</p>
    <form id="form-login" novalidate>
      <div class="field">
        <label for="num">Número (WhatsApp)</label>
        <input id="num" name="num" type="tel" inputmode="tel" autocomplete="username"
               placeholder="(00) 00000-0000" required>
      </div>
      <div class="field">
        <label for="sen">Senha</label>
        <input id="sen" name="sen" type="password" autocomplete="current-password" required>
      </div>
      <button class="btn block" id="btn-login" type="submit">Entrar</button>
      <p class="form-msg erro" id="msg-login" role="alert"></p>
    </form>
    <p class="muted mt-3" style="font-size:14px">
      Ainda não tem acesso? <a class="link" href="#/aula-gratis">Conheça o curso</a>.
    </p>
  </div></div>`;
}

export function aoMontar(_ctx, app) {
  const form = document.getElementById("form-login");
  const msg = document.getElementById("msg-login");
  const btn = document.getElementById("btn-login");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    btn.disabled = true; btn.textContent = "Entrando...";
    try {
      const ctx = await entrar(form.num.value, form.sen.value);
      await app.aposLogin(ctx);
    } catch (err) {
      msg.textContent = err.message;
      btn.disabled = false; btn.textContent = "Entrar";
    }
  });
}
