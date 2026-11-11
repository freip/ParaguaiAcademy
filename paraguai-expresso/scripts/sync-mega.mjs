// Robô de coleta da Mega Eletrônicos (megaeletronicos.com).
// Lê as páginas de categoria, extrai o JSON embutido em cada card de produto
// e atualiza a tabela `produtos` no Supabase. Máximo de 1 acesso por segundo.
//
// Uso:
//   node scripts/sync-mega.mjs --dry          (coleta e mostra, não grava)
//   node scripts/sync-mega.mjs                (coleta e grava no Supabase)
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes("--dry");

const BASE = "https://www.megaeletronicos.com";
const RES = "https://resource.megaeletronicos.com";
const UA = "Mozilla/5.0 (compatible; ParaguaiAcademyBot/1.0; +https://paraguai-academy)";
const MAX_PAGINAS = 90;          // trava de segurança
const QUEDA_LIMITE = 0.30;       // >30% de queda = não mexe no estoque + alerta
const PROIBIDO = /medicament|farmac|rem[ée]dio|anvisa|tarja/i;

// Categorias da Mega -> nicho (iPhone é separado por nome dentro de "celular").
const CATEGORIAS = [
  { id: 180101, slug: "perfume-masculino", nicho: "perfumes" },
  { id: 180102, slug: "perfume-feminino", nicho: "perfumes" },
  { id: 180106, slug: "perfume-unissex", nicho: "perfumes" },
  { id: 180103, slug: "perfume-infantil", nicho: "perfumes" },
  { id: 110101, slug: "celular", nicho: "celulares" },
  { id: 20401, slug: "notebook", nicho: "eletronicos" },
  { id: 20404, slug: "macbook", nicho: "eletronicos" },
  { id: 203, slug: "tablet-amp-ipad", nicho: "eletronicos" },
  { id: 10610, slug: "fone-de-ouvido", nicho: "eletronicos" },
  { id: 10605, slug: "caixa-de-som", nicho: "eletronicos" },
  { id: 505, slug: "console", nicho: "eletronicos" },
  { id: 7120257, slug: "smartwatch", nicho: "eletronicos" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url) {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pt-BR" } });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {}
    await sleep(1500 * tentativa);
  }
  throw new Error("falha ao buscar " + url);
}

const prettify = (slug) =>
  decodeURIComponent(slug).replace(/-/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

function classificarNicho(nome, base) {
  if (/\biphone\b|\bipad\b|\bmacbook\b|\bapple\b|\bairpods\b/i.test(nome) && base === "celulares") return "apple";
  if (/\biphone\b/i.test(nome)) return "apple";
  return base;
}

function parsePagina(html) {
  const totalM = html.match(/([\d.]+)\s*resultados/i);
  const total = totalM ? parseInt(totalM[1].replace(/\./g, ""), 10) : null;

  // mapa code -> slug (a partir dos links de produto)
  const slugs = {};
  for (const m of html.matchAll(/\/producto\/(\d+)\/([a-z0-9-]+)/gi)) slugs[m[1]] = m[2];

  const produtos = [];
  for (const m of html.matchAll(/addItemToFavorite\((\{.*?\})\)/g)) {
    let obj;
    try {
      const json = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      obj = JSON.parse(json);
    } catch { continue; }
    const code = String(obj.code ?? "");
    const slug = slugs[code] || "";
    const nome = slug ? prettify(slug) : `Produto ${code}`;
    produtos.push({
      origem_id: String(obj.id),
      sku: code,
      nome,
      preco: Number(obj.price) || 0,
      promo: Number(obj.price_promo) || 0,
      hide: obj.hide_price === true || obj.hide_price === "true",
      category_id: obj.category_id,
      brand_id: obj.brand_id,
      stock: obj.stock ?? obj.status ?? obj.st ?? null,
      imagem_url: obj.image ? RES + obj.image : null,
      url: slug ? `${BASE}/producto/${code}/${slug}` : `${BASE}/producto/${code}`,
    });
  }
  return { total, produtos };
}

async function coletarCategoria(cat) {
  let pagina = 1, resultados = null, completo = true;
  const mapa = new Map();
  while (pagina <= MAX_PAGINAS) {
    const url = `${BASE}/producto/categoria/${cat.slug}/${cat.id}?page=${pagina}`;
    let html;
    try { html = await fetchHtml(url); } catch { completo = false; break; }
    await sleep(1000); // 1 acesso por segundo
    if (!html) { completo = false; break; }
    const { total, produtos } = parsePagina(html);
    if (pagina === 1) resultados = total;
    if (!produtos.length) break;                 // fim da categoria
    const antes = mapa.size;
    for (const p of produtos) mapa.set(p.origem_id, p);
    if (mapa.size === antes) break;              // nada novo (última página repetida)
    pagina++;
  }
  if (pagina > MAX_PAGINAS) completo = false;     // bateu na trava = incompleta

  // classifica nicho, aplica guardas (hide_price, medicamentos, preço promo)
  const itens = [];
  for (const p of mapa.values()) {
    if (PROIBIDO.test(p.nome) || PROIBIDO.test(cat.slug)) continue; // nunca medicamentos
    const nicho = classificarNicho(p.nome, cat.nicho);
    const preco_usd = (p.promo > 0 && p.promo < p.preco) ? p.promo : p.preco;
    itens.push({
      origem_id: p.origem_id, origem_categoria: String(cat.id), sku: p.sku, nome: p.nome,
      nicho, preco_usd, imagem_url: p.imagem_url, url: p.url,
      em_estoque: p.stock == null ? true : Number(p.stock) > 0,
      oculto: p.hide,
    });
  }
  return { categoria: cat, resultados, coletados: mapa.size, itens, completo };
}

// -------- Supabase (modo real) --------
const sb = (path, opt = {}) => fetch(`${URL}/rest/v1/${path}`, {
  ...opt, headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(opt.headers || {}) },
});

async function getLojaId() {
  const r = await (await sb("lojas?select=id&nome=eq." + encodeURIComponent("Mega Eletrônicos"))).json();
  if (r[0]) return r[0].id;
  const n = await (await sb("lojas", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ nome: "Mega Eletrônicos", cidade: "Ciudad del Este", site: BASE }) })).json();
  return n[0].id;
}

async function gravar(lojaId, col) {
  // conta anterior (para a guarda de 30%)
  const prev = await (await sb(`sync_mega?select=coletados&category_id=eq.${col.categoria.id}`)).json();
  const anterior = prev[0]?.coletados ?? null;
  const queda = anterior && col.coletados < anterior * (1 - QUEDA_LIMITE);
  let alerta = null;

  // upsert dos produtos coletados (chave: loja_id + origem_id)
  const now = new Date().toISOString();
  const payload = col.itens.map((it) => ({ ...it, loja_id: lojaId, fonte: "mega", atualizado_em: now, marca: null, faixa_frete: null }));
  if (payload.length) {
    await sb("produtos?on_conflict=loja_id,origem_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(payload) });
  }

  // marca indisponível só se a categoria foi coletada por completo e sem queda >30%
  if (col.completo && !queda) {
    const ids = col.itens.map((i) => i.origem_id);
    // zera estoque dos que não voltaram nesta coleta
    const notIn = ids.length ? `&origem_id=not.in.(${ids.map((x) => `"${x}"`).join(",")})` : "";
    await sb(`produtos?loja_id=eq.${lojaId}&fonte=eq.mega&origem_categoria=eq.${col.categoria.id}${notIn}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ em_estoque: false, atualizado_em: now }) });
  } else if (queda) {
    alerta = `Queda de ${anterior}→${col.coletados} (>30%). Estoque preservado.`;
  } else if (!col.completo) {
    alerta = "Coleta incompleta. Estoque preservado.";
  }

  await sb("sync_mega?on_conflict=category_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ category_id: col.categoria.id, slug: col.categoria.slug, nicho: col.categoria.nicho, total: col.resultados, coletados: col.coletados, atualizado_em: now, alerta }) });
  return alerta;
}

// -------- main --------
async function main() {
  const t0 = Date.now();
  const colecoes = [];
  for (const cat of CATEGORIAS) {
    const col = await coletarCategoria(cat);
    colecoes.push(col);
    console.log(`  ${cat.slug} (${cat.nicho}): ${col.coletados} coletados / ${col.resultados ?? "?"} no site${col.completo ? "" : " [INCOMPLETA]"}`);
  }

  if (!DRY) {
    if (!URL || !KEY) { console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."); process.exit(1); }
    const lojaId = await getLojaId();
    for (const col of colecoes) {
      const alerta = await gravar(lojaId, col);
      if (alerta) console.log(`  ALERTA ${col.categoria.slug}: ${alerta}`);
    }
  }

  const todos = colecoes.flatMap((c) => c.itens);
  const segundos = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nTotal de produtos ${DRY ? "coletados" : "gravados"}: ${todos.length}`);
  console.log(`Tempo total: ${segundos}s`);
  console.log("\n5 exemplos:");
  for (const p of todos.slice(0, 5)) console.log(`  - ${p.nome} | US$ ${p.preco_usd} | ${p.url}`);

  if (DRY && todos[0]) console.log("\n(amostra de campos do 1º produto:", JSON.stringify(todos[0]), ")");
}

main().catch((e) => { console.error("Erro:", e.message); process.exit(1); });
