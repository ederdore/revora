// enrichment.js — Motor de enriquecimento Revora Discover
// Cascata: Microlink → Netlify Function → Scrape.do → Mock
// Early exit quando encontra dados suficientes

// ── LIMITES E CONTADORES ──────────────────────────────────────

const LIMITS = {
  microlink:  { key: "microlink_usage",  daily: 100,  monthly: null },
  netlify:    { key: "netlify_usage",    daily: null, monthly: null }, // ilimitado
  scrapedo:   { key: "scrapedo_usage",   daily: null, monthly: 1000 },
};

function getUsage(provider) {
  try {
    const cfg = LIMITS[provider];
    const stored = localStorage.getItem(cfg.key);
    if (!stored) return { daily: 0, monthly: 0, date: new Date().toDateString(), month: new Date().toISOString().slice(0,7) };
    const parsed = JSON.parse(stored);
    const today = new Date().toDateString();
    const month = new Date().toISOString().slice(0,7);
    return {
      daily:   parsed.date  === today  ? (parsed.daily  || 0) : 0,
      monthly: parsed.month === month  ? (parsed.monthly || 0) : 0,
      date:    today,
      month,
    };
  } catch { return { daily: 0, monthly: 0, date: new Date().toDateString(), month: new Date().toISOString().slice(0,7) }; }
}

function incrementUsage(provider) {
  const cfg = LIMITS[provider];
  const usage = getUsage(provider);
  const updated = {
    daily:   usage.daily   + 1,
    monthly: usage.monthly + 1,
    date:    usage.date,
    month:   usage.month,
  };
  localStorage.setItem(cfg.key, JSON.stringify(updated));
  return updated;
}

function isAvailable(provider) {
  const cfg = LIMITS[provider];
  const usage = getUsage(provider);
  if (cfg.daily   && usage.daily   >= cfg.daily)   return false;
  if (cfg.monthly && usage.monthly >= cfg.monthly) return false;
  return true;
}

export function getProviderStatus(provider) {
  const cfg   = LIMITS[provider];
  const usage = getUsage(provider);
  return {
    provider,
    daily_used:      usage.daily,
    daily_limit:     cfg.daily   || null,
    monthly_used:    usage.monthly,
    monthly_limit:   cfg.monthly || null,
    available:       isAvailable(provider),
    daily_pct:   cfg.daily   ? Math.round((usage.daily   / cfg.daily)   * 100) : null,
    monthly_pct: cfg.monthly ? Math.round((usage.monthly / cfg.monthly) * 100) : null,
  };
}

// Compatibilidade com código existente
export function getMicrolinkStatus() {
  const s = getProviderStatus("microlink");
  return {
    used:      s.daily_used,
    remaining: Math.max(0, (s.daily_limit || 100) - s.daily_used),
    limit:     s.daily_limit || 100,
    available: s.available,
    pct:       s.daily_pct || 0,
  };
}

// ── DADOS SUFICIENTES? ────────────────────────────────────────
// Early exit quando temos pelo menos email ou telefone + 1 rede social

function hasSufficientData(extracted) {
  const hasContact  = !!(extracted.email || extracted.phone || extracted.whatsapp);
  const hasSocial   = !!(extracted.instagram || extracted.facebook || extracted.linkedin || extracted.tiktok);
  return hasContact && hasSocial;
}

// ── HTML EXTRACTION HELPERS ───────────────────────────────────

function extractFromHtml(html = "") {
  // Emails
  const emailRaw = [...html.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)]
    .map(m => m[0].toLowerCase())
    .filter(e => !/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(e));
  const emails = [...new Set(emailRaw)];

  // Telefones PT/BR/IT
  const phoneRaw = [
    ...html.matchAll(/(?:\+351|00351)[\s\-]?[239]\d{8}/g),
    ...html.matchAll(/(?:\+55|0055)?[\s\-]?\(?\d{2}\)?[\s\-]?9\d{4}[\s\-]?\d{4}/g),
    ...html.matchAll(/(?:\+39|0039)?[\s\-]?0\d{1,3}[\s\-]?\d{6,8}/g),
  ].map(m => m[0].replace(/\s/g,"").trim());
  const phones = [...new Set(phoneRaw)];

  // WhatsApp
  const waRaw = [...html.matchAll(/wa\.me\/[\d+]+/g)].map(m=>`https://${m[0]}`);
  const whatsapps = [...new Set(waRaw)];

  // mailto
  const mailtoRaw = [...html.matchAll(/mailto:([^\s"'<>&?]+)/g)].map(m=>m[1].toLowerCase());
  const mailtos = [...new Set(mailtoRaw)];

  // Instagram
  const igRaw = [...html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]{2,})\/?(?:["'?#\s]|$)/g)]
    .map(m=>m[1]).filter(u=>!["p","reel","stories","explore","share","accounts","about"].includes(u));
  const instagram = igRaw.length ? `https://instagram.com/${igRaw[0]}` : null;

  // Facebook
  const fbRaw = [...html.matchAll(/facebook\.com\/([a-zA-Z0-9_.]{3,})\/?(?:["'?#\s]|$)/g)]
    .map(m=>m[1]).filter(u=>!["sharer","share","plugins","photo","video","groups","pages","events","login","dialog"].includes(u));
  const facebook = fbRaw.length ? `https://facebook.com/${fbRaw[0]}` : null;

  // LinkedIn
  const liRaw = [...html.matchAll(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_\-]{3,})\/?(?:["'?#\s]|$)/g)]
    .map(m=>m[0]);
  const linkedin = liRaw.length ? `https://${liRaw[0]}` : null;

  // TikTok
  const ttRaw = [...html.matchAll(/tiktok\.com\/@([a-zA-Z0-9_.]{2,})\/?(?:["'?#\s]|$)/g)]
    .map(m=>`https://tiktok.com/@${m[1]}`);
  const tiktok = ttRaw.length ? ttRaw[0] : null;

  // YouTube
  const ytRaw = [...html.matchAll(/youtube\.com\/(?:channel|c|@)\/([a-zA-Z0-9_\-]{2,})\/?(?:["'?#\s]|$)/g)]
    .map(m=>`https://youtube.com/${m[0].split("youtube.com/")[1]}`);
  const youtube = ytRaw.length ? ytRaw[0] : null;

  // Email preferido
  const allEmails = [...new Set([...mailtos, ...emails])];
  const corporateEmails = allEmails.filter(e => isCorporateEmail(e));
  const bestEmail = corporateEmails[0] || allEmails[0] || null;

  return {
    email:     bestEmail,
    phone:     phones[0] || null,
    whatsapp:  whatsapps[0] || null,
    instagram, facebook, linkedin, tiktok, youtube,
    _all_emails: allEmails,
    _all_phones: phones,
  };
}

function detectCompetitors(html = "", competitorList = []) {
  if (!competitorList.length) return { detected: [], count: 0, is_active_reseller: false };
  const htmlLower = html.toLowerCase();
  const detected = competitorList.filter(brand => htmlLower.includes(brand.toLowerCase()));
  return {
    detected,
    count: detected.length,
    is_active_reseller: detected.length >= 2,
  };
}

// ── PROVIDER 1: MICROLINK ─────────────────────────────────────

async function crawlWithMicrolink(url, competitorList = []) {
  if (!isAvailable("microlink")) {
    console.log("[Microlink] Limite diário atingido — a passar para Netlify Function");
    return null;
  }

  const clean = url.startsWith("http") ? url : `https://${url}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    let res;
    try {
      res = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(clean)}&meta=true&screenshot=false&html=true`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    let data;
    try { data = await res.json(); } catch { return null; }

    if (data.status !== "success") {
      const rawStr = JSON.stringify(data).toLowerCase();
      const isRobotsBlocked = data.type === "ROBOTS_DISALLOWED" ||
        rawStr.includes("robots") || rawStr.includes("disallow") ||
        rawStr.includes("automated") || rawStr.includes("not allowed");
      if (isRobotsBlocked) {
        console.warn("[Microlink] robots.txt bloqueou:", url);
        return { _robots_blocked: true };
      }
      console.warn("[Microlink] Falha:", data.status, data.message || "");
      return null;
    }

    incrementUsage("microlink");
    const d    = data.data;
    const html = d?.html || "";
    const extracted   = extractFromHtml(html);
    const competitors = detectCompetitors(html, competitorList);

    const instagram = extracted.instagram || d?.instagram?.url || d?.social?.instagram?.url || null;
    const facebook  = extracted.facebook  || d?.facebook?.url  || d?.social?.facebook?.url  || null;
    const linkedin  = extracted.linkedin  || d?.linkedin?.url  || d?.social?.linkedin?.url  || null;
    const youtube   = extracted.youtube   || d?.youtube?.url   || null;

    console.log(`[Microlink] ✓ ${url}`, { email: extracted.email, phone: extracted.phone, instagram });

    return {
      website_title:    d?.title       || null,
      meta_description: d?.description || null,
      h1_main:          d?.title       || null,
      visible_content:  [d?.description, d?.title].filter(Boolean).join(". "),
      email: extracted.email, phone: extracted.phone, whatsapp: extracted.whatsapp,
      instagram, facebook, linkedin, tiktok: extracted.tiktok || null, youtube,
      logo: d?.logo?.url || null,
      competitors_detected: competitors.detected,
      competitors_count:    competitors.count,
      is_active_reseller:   competitors.is_active_reseller,
      _source:     "microlink",
      _crawled_at: new Date().toISOString(),
      _has_html:   !!html,
    };
  } catch (err) {
    if (err.name === "AbortError") console.warn("[Microlink] Timeout:", url);
    else console.warn("[Microlink] Erro:", err.message);
    return null;
  }
}

// ── PROVIDER 2: NETLIFY FUNCTION ──────────────────────────────

async function crawlWithNetlify(url, competitorList = []) {
  const clean = url.startsWith("http") ? url : `https://${url}`;

  try {
    const res = await fetch("/.netlify/functions/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: clean }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.warn("[Netlify] Erro HTTP:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data?.html) {
      console.warn("[Netlify] HTML vazio para:", url);
      return null;
    }

    const html        = data.html;
    const extracted   = extractFromHtml(html);
    const competitors = detectCompetitors(html, competitorList);

    // Extrai title e description do HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch  = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
                    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

    console.log(`[Netlify] ✓ ${url}`, { email: extracted.email, phone: extracted.phone, instagram: extracted.instagram });

    incrementUsage("netlify");
    return {
      website_title:    titleMatch?.[1]?.trim() || null,
      meta_description: descMatch?.[1]?.trim()  || null,
      h1_main:          titleMatch?.[1]?.trim() || null,
      visible_content:  [descMatch?.[1], titleMatch?.[1]].filter(Boolean).join(". "),
      email: extracted.email, phone: extracted.phone, whatsapp: extracted.whatsapp,
      instagram: extracted.instagram, facebook: extracted.facebook,
      linkedin: extracted.linkedin, tiktok: extracted.tiktok, youtube: extracted.youtube,
      competitors_detected: competitors.detected,
      competitors_count:    competitors.count,
      is_active_reseller:   competitors.is_active_reseller,
      _source:     "netlify",
      _crawled_at: new Date().toISOString(),
    };
  } catch (err) {
    if (err.name === "AbortError") console.warn("[Netlify] Timeout:", url);
    else console.warn("[Netlify] Erro:", err.message);
    return null;
  }
}

// ── PROVIDER 3: SCRAPE.DO ─────────────────────────────────────

async function crawlWithScrapedo(url, competitorList = [], apiKey = null) {
  if (!apiKey) {
    console.log("[Scrape.do] Sem chave configurada — a saltar");
    return null;
  }
  if (!isAvailable("scrapedo")) {
    console.warn("[Scrape.do] Limite mensal de 1000 requests atingido");
    return null;
  }

  const clean = url.startsWith("http") ? url : `https://${url}`;

  try {
    const scrapeUrl = `https://api.scrape.do?token=${apiKey}&url=${encodeURIComponent(clean)}&render=true`;
    const res = await fetch(scrapeUrl, { signal: AbortSignal.timeout(30000) });

    if (!res.ok) {
      console.warn("[Scrape.do] Erro HTTP:", res.status);
      return null;
    }

    const html        = await res.text();
    if (!html || html.length < 500) {
      console.warn("[Scrape.do] HTML insuficiente para:", url);
      return null;
    }

    const extracted   = extractFromHtml(html);
    const competitors = detectCompetitors(html, competitorList);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch  = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
                    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

    console.log(`[Scrape.do] ✓ ${url}`, { email: extracted.email, phone: extracted.phone, instagram: extracted.instagram });

    incrementUsage("scrapedo");
    return {
      website_title:    titleMatch?.[1]?.trim() || null,
      meta_description: descMatch?.[1]?.trim()  || null,
      h1_main:          titleMatch?.[1]?.trim() || null,
      visible_content:  [descMatch?.[1], titleMatch?.[1]].filter(Boolean).join(". "),
      email: extracted.email, phone: extracted.phone, whatsapp: extracted.whatsapp,
      instagram: extracted.instagram, facebook: extracted.facebook,
      linkedin: extracted.linkedin, tiktok: extracted.tiktok, youtube: extracted.youtube,
      competitors_detected: competitors.detected,
      competitors_count:    competitors.count,
      is_active_reseller:   competitors.is_active_reseller,
      _source:     "scrapedo",
      _crawled_at: new Date().toISOString(),
    };
  } catch (err) {
    if (err.name === "AbortError") console.warn("[Scrape.do] Timeout:", url);
    else console.warn("[Scrape.do] Erro:", err.message);
    return null;
  }
}

// ── CASCATA PRINCIPAL ─────────────────────────────────────────

export async function crawlWebsite(url, competitorList = [], scrapedoKey = null) {
  if (!url) return null;

  // 1. Microlink
  const ml = await crawlWithMicrolink(url, competitorList);
  if (ml?._robots_blocked) {
    // Bloqueado — passa directo para Netlify (mais rápido que Scrape.do)
    console.log("[Cascata] Microlink bloqueado → Netlify Function");
  } else if (ml) {
    if (hasSufficientData(ml)) {
      console.log("[Cascata] Early exit no Microlink ✓");
      return ml;
    }
    console.log("[Cascata] Microlink insuficiente → Netlify Function");
  }

  // 2. Netlify Function
  const nf = await crawlWithNetlify(url, competitorList);
  if (nf) {
    if (hasSufficientData(nf)) {
      console.log("[Cascata] Early exit no Netlify ✓");
      return nf;
    }
    // Tem alguma coisa mas incompleto — tenta Scrape.do se tiver chave
    if (!scrapedoKey) {
      console.log("[Cascata] Netlify com dados parciais — sem chave Scrape.do, a usar o que temos");
      return nf; // retorna o parcial
    }
    console.log("[Cascata] Netlify insuficiente → Scrape.do");
  }

  // 3. Scrape.do
  if (scrapedoKey) {
    const sd = await crawlWithScrapedo(url, competitorList, scrapedoKey);
    if (sd) {
      console.log("[Cascata] Early exit no Scrape.do ✓");
      return sd;
    }
  }

  // Se Netlify teve dados parciais, usa-os
  if (nf) return nf;

  // 4. Sem dados — retorna null (vai para mock)
  return ml?._robots_blocked ? { _robots_blocked: true, _source: "blocked" } : null;
}

// ── CATEGORY PROFILES (mock fallback) ────────────────────────
const CATEGORY_PROFILES = {
  "Ginásio / Health Club": {
    keywords:["treino","fitness","musculação","personal trainer","aulas","ginásio","health","wellness","crossfit","pilates","yoga"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:true},
    fit_boost:30, email_prefix:"geral@",
    content:(n,c)=>`${n} é um espaço fitness completo ${c?"em "+c:"em Portugal"}, com equipamentos de última geração, personal trainers certificados e aulas de grupo.`,
    strengths:["Clientela alinhada com nutrição desportiva","Personal trainers influenciam escolhas de suplementos","Tráfego elevado e recorrente"],
    weaknesses:["Pode já ter parcerias com concorrentes","Negociação complexa em ginásios de cadeia"],
    action:"Contactar director via LinkedIn ou email — propor demonstração gratuita de produto para os sócios durante 30 dias",
  },
  "Farmácia": {
    keywords:["farmácia","medicamento","saúde","parafarmácia","suplemento","vitamina","farmacêutico"],
    signals:{has_online_store:true,sports_nutrition:false,fitness:false},
    fit_boost:25, email_prefix:"farmacia@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — farmácia com aconselhamento personalizado. Área de parafarmácia com suplementos alimentares, vitaminas e produtos de bem-estar.`,
    strengths:["Alta credibilidade junto do consumidor","Farmacêutico recomenda activamente","Canal ideal para colágeno e suplementos funcionais"],
    weaknesses:["Processo de aprovação demorado","Necessita certificação técnica completa"],
    action:"Enviar dossier técnico ao responsável de compras — agendar reunião para apresentação das fichas técnicas e margens",
  },
  "Parafarmácia": {
    keywords:["parafarmácia","suplemento","cosmética","beleza","bem-estar","natural","vitaminas"],
    signals:{has_online_store:true,sports_nutrition:false,fitness:false},
    fit_boost:28, email_prefix:"info@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — especialistas em produtos naturais e suplementação. Gama completa de vitaminas, minerais, colágenos, proteínas.`,
    strengths:["Perfil de cliente alinhado","Abertura a marcas premium","Menor burocracia que farmácias"],
    weaknesses:["Volume mais reduzido","Concorrência directa de marcas estabelecidas"],
    action:"Contacto via Instagram ou email — propor kit de experimentação com margens atractivas",
  },
  "Loja Produtos Naturais": {
    keywords:["natural","biológico","orgânico","suplemento","ervanária","dietética","vegan","proteína","colágeno"],
    signals:{has_online_store:true,sports_nutrition:true,fitness:false},
    fit_boost:32, email_prefix:"loja@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — loja especializada em produtos naturais, biológicos e suplementos.`,
    strengths:["Perfil de cliente premium muito alinhado","Alta receptividade a marcas portuguesas"],
    weaknesses:["Stock inicial pode ser limitado","Ticket médio baixo por transacção"],
    action:"Visita presencial com amostras — público destas lojas valoriza autenticidade e origem portuguesa",
  },
  "Nutricionista": {
    keywords:["nutrição","nutricionista","dieta","alimentação","consulta","emagrecimento","plano alimentar"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:false},
    fit_boost:20, email_prefix:"consultas@",
    content:(n,c)=>`${n} — nutricionista clínica e desportiva ${c?"em "+c:""}.`,
    strengths:["Recomendação profissional tem alto impacto","Audiência digital activa"],
    weaknesses:["Volume de vendas directo baixo","Modelo mais de influência que distribuição"],
    action:"Propor parceria de embaixador com comissão por venda — enviar amostras para teste com pacientes",
  },
  "Clínica Nutrição": {
    keywords:["clínica","nutrição","consulta","médico","saúde","wellness","medicina","funcional"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:false},
    fit_boost:22, email_prefix:"clinica@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — clínica especializada em nutrição clínica e medicina funcional.`,
    strengths:["Alta credibilidade médica","Suplementos vendem-se na clínica"],
    weaknesses:["Aprovação rigorosa","Necessita estudos clínicos dos produtos"],
    action:"Contactar director clínico — apresentar estudos científicos",
  },
  "Personal Trainer": {
    keywords:["personal trainer","treino","coaching","fitness","musculação","online","resultados"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:true},
    fit_boost:18, email_prefix:"pt@",
    content:(n,c)=>`${n} — personal trainer certificado ${c?"em "+c:""}.`,
    strengths:["Influência directa nas escolhas dos clientes","Audiência digital activa no Instagram"],
    weaknesses:["Volume individual baixo","Alta rotatividade de marcas recomendadas"],
    action:"Parceria via Instagram — enviar kit de produtos com código de desconto e comissão de 15%",
  },
  "Spa / Centro Bem-Estar": {
    keywords:["spa","bem-estar","wellness","massagem","tratamento","relaxamento","beleza","corpo"],
    signals:{has_online_store:false,sports_nutrition:false,fitness:false},
    fit_boost:12, email_prefix:"reservas@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — centro de bem-estar com tratamentos corporais e terapias holísticas.`,
    strengths:["Perfil premium alinhado com colágeno e beleza","Cliente disposto a pagar mais"],
    weaknesses:["Foco principal não é nutrição","Volume limitado e sazonal"],
    action:"Propor linha de colágeno e beleza — demonstração durante serviço de tratamento",
  },
  "Distribuidor": {
    keywords:["distribuidor","atacado","grossista","representante","revenda","wholesale","b2b","fornecedor"],
    signals:{has_online_store:false,sports_nutrition:false,fitness:false},
    fit_boost:35, email_prefix:"comercial@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — empresa de distribuição B2B especializada em produtos de saúde e bem-estar.`,
    strengths:["Rede de distribuição já estabelecida","Acesso a múltiplos pontos de venda"],
    weaknesses:["Margens mais apertadas","Pode exigir exclusividade territorial"],
    action:"Agendar reunião comercial directa — apresentar condições de distribuição exclusiva ou preferencial",
  },
};

const DEFAULT_PROFILE = CATEGORY_PROFILES["Loja Produtos Naturais"];

// ── MOCK ENRICHMENT ───────────────────────────────────────────

export async function enrichCompanyMock(company) {
  await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
  const profile = CATEGORY_PROFILES[company.category] || DEFAULT_PROFILE;
  const domain = (company.website || `${company.name.toLowerCase().replace(/\s+/g,"")}.pt`)
    .replace(/https?:\/\//,"").split("/")[0];
  const rand = (p) => Math.random() > p;
  const hasInstagram = rand(0.25);
  const hasLinkedin  = rand(0.45);
  const hasFacebook  = rand(0.35);
  const hasWhatsapp  = rand(0.45);
  const hasPhone     = rand(0.15);
  const hasTiktok    = rand(0.70);

  return {
    enrichment: {
      website_title:    `${company.name} | ${company.category || "Saúde & Bem-Estar"}`,
      meta_description: `${company.name} — ${profile.keywords.slice(0,3).join(", ")}. ${company.city ? "Em "+company.city+"." : "Em Portugal."}`,
      h1_main:          company.name,
      visible_content:  profile.content(company.name, company.city),
      email:            `${profile.email_prefix}${domain}`,
      phone:            hasPhone ? `+351 ${rand(0.5)?"21":"22"} ${Math.floor(Math.random()*9000000+1000000)}` : null,
      instagram:        hasInstagram ? `https://instagram.com/${company.name.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"").substring(0,20)}` : null,
      linkedin:         hasLinkedin  ? `https://linkedin.com/company/${company.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}` : null,
      facebook:         hasFacebook  ? `https://facebook.com/${company.name.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"")}` : null,
      whatsapp:         hasWhatsapp  ? `https://wa.me/351${Math.floor(Math.random()*90000000+910000000)}` : null,
      tiktok:           hasTiktok    ? `https://tiktok.com/@${company.name.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"").substring(0,20)}` : null,
      youtube:          null,
      contact_page_url: company.website ? `${company.website}/contactos` : null,
      competitors_detected: [], competitors_count: 0, is_active_reseller: false,
      enrichment_status: "done",
      _source: "mock",
    },
    signals: {
      has_instagram: hasInstagram, has_facebook: hasFacebook, has_linkedin: hasLinkedin,
      has_tiktok: hasTiktok, has_email: true, has_phone: hasPhone, has_whatsapp: hasWhatsapp,
      has_online_store: profile.signals.has_online_store, has_blog: rand(0.55),
      multiple_locations: rand(0.65), sells_competitors: false, is_active_reseller: false,
      competitors_detected: [],
      custom_signals: {
        sports_nutrition: profile.signals.sports_nutrition,
        fitness:          profile.signals.fitness,
        wellness:         true,
        pharmacy:         company.category?.includes("Farmácia"),
      },
    },
  };
}

// ── MAIN ENRICH ───────────────────────────────────────────────

export async function enrichCompanyReal(company, icpProfile = null) {
  const competitorList = icpProfile?.competitor_brands || [];
  const scrapedoKey   = icpProfile?.scrapedo_api_key  || 
                        (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SCRAPEDO_KEY : null) ||
                        null;

  if (company.website) {
    const crawled = await crawlWebsite(company.website, competitorList, scrapedoKey);

    if (crawled?._robots_blocked && !crawled._source) {
      // Totalmente bloqueado — mock com flag
      const result = await enrichCompanyMock(company);
      return {
        ...result,
        enrichment: { ...result.enrichment, robots_blocked: true, enrichment_status: "done" },
        _source: "mock",
        _robots_blocked: true,
      };
    }

    if (crawled) {
      const signals = detectSignalsFromCrawl(crawled, company);
      return {
        enrichment: {
          ...crawled,
          enrichment_status:    "done",
          robots_blocked:       false,
          contact_page_url:     company.website ? `${company.website}/contactos` : null,
        },
        signals,
        _source: crawled._source || "unknown",
      };
    }
  }

  // Sem website ou todos os providers falharam
  const result = await enrichCompanyMock(company);
  return { ...result, _source: "mock" };
}

// ── DETECT SIGNALS FROM CRAWL ─────────────────────────────────

function detectSignalsFromCrawl(crawled, company) {
  const text = (
    (crawled.visible_content  || "") + " " +
    (crawled.meta_description || "") + " " +
    (crawled.website_title    || "")
  ).toLowerCase();

  return {
    has_instagram:     !!crawled.instagram,
    has_facebook:      !!crawled.facebook,
    has_linkedin:      !!crawled.linkedin,
    has_tiktok:        !!crawled.tiktok,
    has_email:         !!crawled.email,
    has_phone:         !!crawled.phone,
    has_whatsapp:      !!crawled.whatsapp || text.includes("whatsapp"),
    has_online_store:  text.includes("loja")||text.includes("comprar")||text.includes("shop")||text.includes("encomenda")||text.includes("carrinho"),
    has_blog:          text.includes("blog")||text.includes("artigo")||text.includes("notícia"),
    multiple_locations:text.includes("filial")||text.includes("unidades")||text.includes("lojas"),
    sells_competitors:   (crawled.competitors_count || 0) > 0,
    is_active_reseller:  crawled.is_active_reseller || false,
    competitors_detected:crawled.competitors_detected || [],
    custom_signals: {
      sports_nutrition: text.includes("suplemento")||text.includes("proteína")||text.includes("colágeno")||text.includes("creatina"),
      fitness:          text.includes("ginásio")||text.includes("fitness")||text.includes("treino")||text.includes("crossfit"),
      wellness:         text.includes("bem-estar")||text.includes("wellness")||text.includes("saúde"),
      pharmacy:         text.includes("farmácia")||text.includes("parafarmácia"),
    },
  };
}

// ── MOCK AI ANALYSIS ──────────────────────────────────────────

export async function analyzeCompanyMock(company, enrichment, tenant) {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
  const profile = CATEGORY_PROFILES[company.category] || DEFAULT_PROFILE;
  const clientName = tenant?.name || "o cliente";
  const city = company.city ? `em ${company.city}` : "em Portugal";
  const signalScore = [
    enrichment.instagram ? 2 : 0,
    enrichment.email     ? 2 : 0,
    enrichment.phone     ? 1 : 0,
    enrichment.linkedin  ? 1 : 0,
    enrichment.whatsapp  ? 1 : 0,
  ].reduce((a,b)=>a+b,0);
  const potential = signalScore >= 5 ? "alto" : signalScore >= 3 ? "médio" : "baixo";
  const summaries = {
    alto:  `${company.name} ${city} apresenta perfil altamente compatível com os produtos ${clientName}. Boa presença digital e público-alvo alinhado.`,
    médio: `${company.name} ${city} tem potencial moderado como parceiro. Vale contacto inicial para avaliar abertura.`,
    baixo: `${company.name} ${city} apresenta presença digital limitada. Contacto presencial pode revelar oportunidade.`,
  };
  return {
    executive_summary:    summaries[potential],
    strengths:            profile.strengths,
    weaknesses:           profile.weaknesses,
    partnership_potential:potential,
    recommended_action:   profile.action,
    confidence_score:     0,
    _mock: true,
  };
}

// ── SCORING ───────────────────────────────────────────────────

export function computeScores(enrichment, signals, tenant) {
  const text = ((enrichment.visible_content||"")+" "+(enrichment.meta_description||"")).toLowerCase();
  const fitKeywords = tenant?.fit_keywords || [
    "ginásio","farmácia","nutricionista","loja natureza","parafarmácia",
    "wellness","suplementos","health club","personal trainer","sports nutrition",
    "clínica","bem-estar","colágeno","proteína","vitaminas","natural","biológico","fitness","treino",
  ];
  const fitMatches   = fitKeywords.filter(k=>text.includes(k.toLowerCase())).length;
  const fitScore     = Math.min(100, fitMatches*12+(enrichment.website_title?16:0));
  const digitalScore = Math.min(100, [
    enrichment.instagram?30:0, enrichment.linkedin?20:0,
    enrichment.facebook?15:0,  enrichment.tiktok?10:0,
    enrichment.website_title?20:0, enrichment.meta_description?15:0,
  ].reduce((a,b)=>a+b,0));
  const contactScore = Math.min(100, [
    enrichment.email?40:0, enrichment.phone?30:0,
    enrichment.whatsapp?20:0, enrichment.contact_page_url?10:0,
  ].reduce((a,b)=>a+b,0));
  const authorityScore = Math.min(100, [
    enrichment.h1_main?.length>10?25:0,
    enrichment.meta_description?.length>50?25:0,
    enrichment.linkedin?25:0,
    enrichment.visible_content?.length>300?25:0,
  ].reduce((a,b)=>a+b,0));

  const competitorBonus = signals?.sells_competitors
    ? (signals.is_active_reseller ? 15 : 8) : 0;

  const finalScore = Math.min(100, Math.round(
    fitScore*0.35 + authorityScore*0.25 + digitalScore*0.20 + contactScore*0.20 + competitorBonus
  ));
  const scoreClass = finalScore>=80?"A":finalScore>=60?"B":finalScore>=40?"C":"D";

  return { fitScore, digitalScore, contactScore, authorityScore, finalScore, scoreClass, competitorBonus };
}

// ── RGPD ─────────────────────────────────────────────────────

const PERSONAL_DOMAINS = new Set([
  "gmail.com","hotmail.com","outlook.com","yahoo.com","live.com",
  "icloud.com","mail.com","sapo.pt","iol.pt","clix.pt",
]);

export function isCorporateEmail(email) {
  if (!email || !email.includes("@")) return false;
  return !PERSONAL_DOMAINS.has(email.split("@")[1].toLowerCase());
}

export function rgpdFilter(enrichment) {
  const { _source, _crawled_at, _all_emails, _all_phones, _has_html, ...rest } = enrichment;
  return {
    company_id:            rest.company_id           || null,
    tenant_id:             rest.tenant_id            || null,
    enrichment_status:     rest.enrichment_status    || null,
    website_title:         rest.website_title        || null,
    meta_description:      rest.meta_description     || null,
    h1_main:               rest.h1_main              || null,
    visible_content:       rest.visible_content      || null,
    email:                 rest.email && isCorporateEmail(rest.email) ? rest.email : null,
    phone:                 rest.phone                || null,
    instagram:             rest.instagram            || null,
    linkedin:              rest.linkedin             || null,
    facebook:              rest.facebook             || null,
    tiktok:                rest.tiktok               || null,
    youtube:               rest.youtube              || null,
    whatsapp:              rest.whatsapp             || null,
    contact_page_url:      rest.contact_page_url     || null,
    competitors_detected:  rest.competitors_detected || [],
    competitors_count:     rest.competitors_count    || 0,
    is_active_reseller:    rest.is_active_reseller   || false,
    robots_blocked:        rest.robots_blocked       || false,
  };
}
