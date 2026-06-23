// netlify/functions/crawl.js
// Crawl server-side — contorna robots.txt que bloqueiam Microlink
// Não usa browser headless — para sites JS-heavy usa Scrape.do

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let url;
  try {
    const body = JSON.parse(event.body || "{}");
    url = body.url;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!url || !url.startsWith("http")) {
    return { statusCode: 400, body: JSON.stringify({ error: "URL inválida" }) };
  }

  // Bloqueia URLs internas ou perigosas
  const blocked = ["localhost","127.0.0.1","0.0.0.0","169.254","10.","192.168.","172.16."];
  if (blocked.some(b => url.includes(b))) {
    return { statusCode: 403, body: JSON.stringify({ error: "URL não permitida" }) };
  }

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 18000);

    let res;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control":   "no-cache",
          "Pragma":          "no-cache",
          "Sec-Fetch-Dest":  "document",
          "Sec-Fetch-Mode":  "navigate",
          "Sec-Fetch-Site":  "none",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({ html: null, status: res.status, url }),
      };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return {
        statusCode: 200,
        body: JSON.stringify({ html: null, reason: "not_html", url }),
      };
    }

    const html = await res.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, url, length: html.length }),
    };

  } catch (err) {
    const isTimeout = err.name === "AbortError";
    return {
      statusCode: 200,
      body: JSON.stringify({
        html:   null,
        error:  isTimeout ? "timeout" : err.message,
        url,
      }),
    };
  }
}
