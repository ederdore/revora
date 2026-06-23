// netlify/functions/crawl.js
// Crawl server-side — cascata Netlify fetch → Scrape.do
// SCRAPEDO_KEY fica server-side, nunca exposta no bundle

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let url, useScrapedo;
  try {
    const body = JSON.parse(event.body || "{}");
    url         = body.url;
    useScrapedo = body.useScrapedo === true; // frontend pede explicitamente
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!url || !url.startsWith("http")) {
    return { statusCode: 400, body: JSON.stringify({ error: "URL inválida" }) };
  }

  // Bloqueia URLs internas
  const blocked = ["localhost","127.0.0.1","0.0.0.0","169.254","10.","192.168.","172.16."];
  if (blocked.some(b => url.includes(b))) {
    return { statusCode: 403, body: JSON.stringify({ error: "URL não permitida" }) };
  }

  // ── 1. Fetch directo (gratuito, ilimitado) ──────────────────
  const html = await fetchDirect(url);
  if (html && html.length > 500) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, url, provider: "netlify" }),
    };
  }

  // ── 2. Scrape.do (só se pedido e chave disponível) ──────────
  if (useScrapedo) {
    const key = process.env.SCRAPEDO_KEY;
    if (!key) {
      return {
        statusCode: 200,
        body: JSON.stringify({ html: null, provider: "none", reason: "no_scrapedo_key" }),
      };
    }
    const scraped = await fetchScrapedo(url, key);
    if (scraped) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: scraped, url, provider: "scrapedo" }),
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ html: null, url, provider: "none", reason: "all_failed" }),
  };
}

// ── FETCH DIRECTO ─────────────────────────────────────────────
async function fetchDirect(url) {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 18000);
    let res;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
          "Cache-Control":   "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch { return null; }
}

// ── SCRAPE.DO ─────────────────────────────────────────────────
async function fetchScrapedo(url, key) {
  try {
    const scrapeUrl = `https://api.scrape.do?token=${key}&url=${encodeURIComponent(url)}&render=true`;
    const res = await fetch(scrapeUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const html = await res.text();
    return html?.length > 500 ? html : null;
  } catch { return null; }
}
