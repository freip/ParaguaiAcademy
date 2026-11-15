// Rota de servidor (Vercel) para a cotação USD-BRL, com cache de 1 hora na
// borda. Consulta uma API pública de câmbio. Se falhar, responde 502 e o
// cliente usa a última cotação guardada.
export default async function handler(req, res) {
  try {
    const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
    if (!r.ok) throw new Error("falha na API de câmbio");
    const d = await r.json();
    const valor = Number(d?.USDBRL?.bid);
    if (!(valor > 0)) throw new Error("cotação inválida");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ valor, atualizada_em: new Date().toISOString(), fonte: "awesomeapi" });
  } catch (e) {
    res.status(502).json({ erro: "cotação indisponível" });
  }
}
