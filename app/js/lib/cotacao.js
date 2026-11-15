// Cotação do dólar (USD-BRL). Tenta a rota do servidor /api/cotacao (com cache
// de 1h no Vercel); se não existir, usa a API pública direto; guarda a última
// no navegador por 1h.
const CHAVE = "pa_cotacao";

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch { return null; } };
const grava = (o) => { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch {} };

export async function cotacaoUSD() {
  const cache = ler();
  if (cache && Date.now() - cache.t < 3600e3) return cache;

  const tentativas = [
    async () => {
      const r = await fetch("/api/cotacao");
      if (!r.ok) throw new Error("sem api");
      const d = await r.json();
      return { valor: +d.valor, data: d.atualizada_em, fonte: "ao vivo" };
    },
    async () => {
      const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
      const d = await r.json();
      return { valor: +d.USDBRL.bid, fonte: "ao vivo" };
    },
  ];

  for (const t of tentativas) {
    try {
      const out = { ...(await t()), t: Date.now() };
      if (out.valor > 0) { grava(out); return out; }
    } catch {}
  }
  if (cache) return { ...cache, fonte: "cache" };
  return { valor: 5.4, t: Date.now(), fonte: "estimado" };
}
