// Formatação em português do Brasil.

export const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const usd = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "USD" });

export const data = (d) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
};

// Escapa texto para inserir em HTML com segurança.
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Primeiro nome, para a saudação.
export const primeiroNome = (nome) =>
  (String(nome || "").trim().split(/\s+/)[0]) || "";
