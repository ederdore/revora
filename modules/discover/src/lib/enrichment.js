// enrichment.js — Motor de enriquecimento Revora Discover
// Fase 1: Mock realista por categoria
// Fase 2: Microlink API (crawl real + HTML completo, gratuito até 100/dia)
// Fase 3: Claude API (análise IA real via Netlify Function)

// ── MICROLINK COUNTER ─────────────────────────────────────────
const MICROLINK_DAILY_LIMIT = 100;

function getMicrolinkUsage() {
  try {
    const stored = localStorage.getItem("microlink_usage");
    if (!stored) return { count: 0, date: new Date().toDateString() };
    const parsed = JSON.parse(stored);
    if (parsed.date !== new Date().toDateString()) {
      return { count: 0, date: new Date().toDateString() };
    }
    return parsed;
  } catch { return { count: 0, date: new Date().toDateString() }; }
}

function incrementMicrolinkUsage() {
  const usage = getMicrolinkUsage();
  const updated = { count: usage.count + 1, date: new Date().toDateString() };
  localStorage.setItem("microlink_usage", JSON.stringify(updated));
  return updated;
}

export function getMicrolinkStatus() {
  const usage = getMicrolinkUsage();
  return {
    used:      usage.count,
    remaining: Math.max(0, MICROLINK_DAILY_LIMIT - usage.count),
    limit:     MICROLINK_DAILY_LIMIT,
    available: usage.count < MICROLINK_DAILY_LIMIT,
    pct:       Math.round((usage.count / MICROLINK_DAILY_LIMIT) * 100),
  };
}

// ── HTML EXTRACTION HELPERS ───────────────────────────────────

/**
 * Extrai contactos e redes sociais de HTML bruto via regex.
 * Chamado sempre que Microlink retorna html.
 */
function extractFromHtml(html = "") {
  // Emails — exclui extensões de imagem e padrões inválidos
  const emailRaw = [...html.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)]
    .map(m => m[0].toLowerCase())
    .filter(e => !/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(e));
  const emails = [...new Set(emailRaw)];

  // Telefones PT/BR/IT (formatos internacionais e locais)
  const phoneRaw = [
    // PT: +351 ou 00351 ou local 2x/9x
    ...html.matchAll(/(?:\+351|00351)[\s\-]?[239]\d{8}/g),
    // BR: +55 ou local (xx) 9xxxx-xxxx
    ...html.matchAll(/(?:\+55|0055)?[\s\-]?\(?\d{2}\)?[\s\-]?9\d{4}[\s\-]?\d{4}/g),
    // IT: +39 ou local
    ...html.matchAll(/(?:\+39|0039)?[\s\-]?0\d{1,3}[\s\-]?\d{6,8}/g),
  ].map(m => m[0].replace(/\s/g, "").trim());
  const phones = [...new Set(phoneRaw)];

  // WhatsApp — wa.me links
  const waRaw = [...html.matchAll(/wa\.me\/[\d+]+/g)].map(m => `https://${m[0]}`);
  const whatsapps = [...new Set(waRaw)];

  // mailto: links
  const mailtoRaw = [...html.matchAll(/mailto:([^\s"'<>&?]+)/g)].map(m => m[1].toLowerCase());
  const mailtos = [...new Set(mailtoRaw)];

  // Instagram
  const igRaw = [...html.matchAll(/instagram\.com\/([a-zA-Z0-9_.]{2,})\/?(?:["'?#\s]|$)/g)]
    .map(m => m[1])
    .filter(u => !["p","reel","stories","explore","share","accounts","about"].includes(u));
  const instagram = igRaw.length ? `https://instagram.com/${igRaw[0]}` : null;

  // Facebook
  const fbRaw = [...html.matchAll(/facebook\.com\/([a-zA-Z0-9_.]{3,})\/?(?:["'?#\s]|$)/g)]
    .map(m => m[1])
    .filter(u => !["sharer","share","plugins","photo","video","groups","pages","events","login","dialog"].includes(u));
  const facebook = fbRaw.length ? `https://facebook.com/${fbRaw[0]}` : null;

  // LinkedIn
  const liRaw = [...html.matchAll(/linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_\-]{3,})\/?(?:["'?#\s]|$)/g)]
    .map(m => m[0]);
  const linkedin = liRaw.length ? `https://${liRaw[0]}` : null;

  // TikTok
  const ttRaw = [...html.matchAll(/tiktok\.com\/@([a-zA-Z0-9_.]{2,})\/?(?:["'?#\s]|$)/g)]
    .map(m => `https://tiktok.com/@${m[1]}`);
  const tiktok = ttRaw.length ? ttRaw[0] : null;

  // YouTube
  const ytRaw = [...html.matchAll(/youtube\.com\/(?:channel|c|@)\/([a-zA-Z0-9_\-]{2,})\/?(?:["'?#\s]|$)/g)]
    .map(m => `https://youtube.com/${m[0].split("youtube.com/")[1]}`);
  const youtube = ytRaw.length ? ytRaw[0] : null;

  // Email preferido: mailto > corporativo > primeiro encontrado
  const allEmails = [...new Set([...mailtos, ...emails])];
  const corporateEmails = allEmails.filter(e => isCorporateEmail(e));
  const bestEmail = corporateEmails[0] || allEmails[0] || null;

  // Telefone preferido
  const bestPhone = phones[0] || null;

  // WhatsApp preferido
  const bestWhatsapp = whatsapps[0] || null;

  return {
    email:     bestEmail,
    phone:     bestPhone,
    whatsapp:  bestWhatsapp,
    instagram,
    facebook,
    linkedin,
    tiktok,
    youtube,
    _all_emails:    allEmails,
    _all_phones:    phones,
    _all_whatsapps: whatsapps,
  };
}

/**
 * Detecta marcas concorrentes no HTML.
 * Lista de concorrentes vem do perfil ICP do tenant.
 * Retorna: { detected: string[], count: number, is_active_reseller: bool }
 */
function detectCompetitors(html = "", competitorList = []) {
  if (!competitorList.length) return { detected: [], count: 0, is_active_reseller: false };

  const htmlLower = html.toLowerCase();
  const detected = competitorList.filter(brand =>
    htmlLower.includes(brand.toLowerCase())
  );

  return {
    detected,
    count: detected.length,
    is_active_reseller: detected.length >= 2, // vende múltiplas marcas → distribuidor activo
  };
}

// ── MICROLINK CRAWL ───────────────────────────────────────────
export async function crawlWebsite(url, competitorList = []) {
  if (!url) return null;

  const status = getMicrolinkStatus();
  if (!status.available) {
    console.warn(`[Microlink] Limite diário atingido (${MICROLINK_DAILY_LIMIT}/dia). A usar mock.`);
    return null;
  }

  try {
    const clean = url.startsWith("http") ? url : `https://${url}`;

    // Pede meta + HTML completo numa única request
    const res = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(clean)}&meta=true&screenshot=false&html=true`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    if (data.status !== "success") return null;

    incrementMicrolinkUsage();

    const d    = data.data;
    const html = d?.html || "";

    // Extrai contactos e sociais do HTML completo
    const extracted = extractFromHtml(html);

    // Detecta concorrentes
    const competitors = detectCompetitors(html, competitorList);

    // Microlink também retorna sociais nos metadados — merge com prioridade para HTML
    const instagram = extracted.instagram || d?.instagram?.url || d?.social?.instagram?.url || null;
    const facebook  = extracted.facebook  || d?.facebook?.url  || d?.social?.facebook?.url  || null;
    const linkedin  = extracted.linkedin  || d?.linkedin?.url  || d?.social?.linkedin?.url  || null;
    const youtube   = extracted.youtube   || d?.youtube?.url   || null;

    return {
      website_title:    d?.title       || null,
      meta_description: d?.description || null,
      h1_main:          d?.title       || null,
      visible_content:  [d?.description, d?.title].filter(Boolean).join(". "),
      // Contactos extraídos do HTML
      email:     extracted.email,
      phone:     extracted.phone,
      whatsapp:  extracted.whatsapp,
      // Redes sociais (HTML + meta merge)
      instagram,
      facebook,
      linkedin,
      tiktok:    extracted.tiktok  || null,
      youtube,
      // Logo
      logo: d?.logo?.url || null,
      // Concorrentes detectados
      competitors_detected:    competitors.detected,
      competitors_count:       competitors.count,
      is_active_reseller:      competitors.is_active_reseller,
      // Meta
      _source:     "microlink",
      _crawled_at: new Date().toISOString(),
      _has_html:   !!html,
      // Debug (remover em produção se necessário)
      _all_emails:    extracted._all_emails,
      _all_phones:    extracted._all_phones,
    };
  } catch (err) {
    console.warn("[Microlink] Erro no crawl:", err.message);
    return null;
  }
}

// ── CATEGORY PROFILES (mock fallback) ────────────────────────
const CATEGORY_PROFILES = {
  "Ginásio / Health Club": {
    keywords:["treino","fitness","musculação","personal trainer","aulas","ginásio","health","wellness","crossfit","pilates","yoga"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:true},
    fit_boost:30, email_prefix:"geral@",
    content:(n,c)=>`${n} é um espaço fitness completo ${c?"em "+c:"em Portugal"}, com equipamentos de última geração, personal trainers certificados e aulas de grupo. Dispomos de zona de musculação, cardio, yoga, pilates e crossfit. Nutrição desportiva disponível na recepção.`,
    strengths:["Clientela alinhada com nutrição desportiva","Personal trainers influenciam escolhas de suplementos","Tráfego elevado e recorrente","Espaço para exposição de produtos"],
    weaknesses:["Pode já ter parcerias com concorrentes","Negociação complexa em ginásios de cadeia"],
    action:"Contactar director via LinkedIn ou email — propor demonstração gratuita de produto para os sócios durante 30 dias",
  },
  "Farmácia": {
    keywords:["farmácia","medicamento","saúde","parafarmácia","suplemento","vitamina","farmacêutico"],
    signals:{has_online_store:true,sports_nutrition:false,fitness:false},
    fit_boost:25, email_prefix:"farmacia@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — farmácia com aconselhamento personalizado. Área de parafarmácia com suplementos alimentares, vitaminas e produtos de bem-estar. Encomendas online com entrega ao domicílio.`,
    strengths:["Alta credibilidade junto do consumidor","Farmacêutico recomenda activamente","Canal ideal para colágeno e suplementos funcionais","Margens atractivas"],
    weaknesses:["Processo de aprovação demorado","Necessita certificação técnica completa"],
    action:"Enviar dossier técnico ao responsável de compras — agendar reunião para apresentação das fichas técnicas e margens",
  },
  "Parafarmácia": {
    keywords:["parafarmácia","suplemento","cosmética","beleza","bem-estar","natural","vitaminas"],
    signals:{has_online_store:true,sports_nutrition:false,fitness:false},
    fit_boost:28, email_prefix:"info@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — especialistas em produtos naturais e suplementação. Gama completa de vitaminas, minerais, colágenos, proteínas. Aconselhamento personalizado.`,
    strengths:["Perfil de cliente alinhado","Abertura a marcas premium","Menor burocracia que farmácias"],
    weaknesses:["Volume mais reduzido","Concorrência directa de marcas estabelecidas"],
    action:"Contacto via Instagram ou email — propor kit de experimentação com margens atractivas e material POS incluído",
  },
  "Loja Produtos Naturais": {
    keywords:["natural","biológico","orgânico","suplemento","ervanária","dietética","vegan","proteína","colágeno"],
    signals:{has_online_store:true,sports_nutrition:true,fitness:false},
    fit_boost:32, email_prefix:"loja@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — loja especializada em produtos naturais, biológicos e suplementos. Gama de proteínas, colágenos, chás funcionais, superalimentos e produtos vegan. Consultoria nutricional gratuita.`,
    strengths:["Perfil de cliente premium muito alinhado","Alta receptividade a marcas portuguesas","Curador activo de novos produtos"],
    weaknesses:["Stock inicial pode ser limitado","Ticket médio baixo por transacção"],
    action:"Visita presencial com amostras — público destas lojas valoriza autenticidade e origem portuguesa",
  },
  "Nutricionista": {
    keywords:["nutrição","nutricionista","dieta","alimentação","consulta","emagrecimento","plano alimentar"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:false},
    fit_boost:20, email_prefix:"consultas@",
    content:(n,c)=>`${n} — nutricionista clínica e desportiva ${c?"em "+c:""}. Consultas presenciais e online. Planos alimentares personalizados com suplementação quando indicada.`,
    strengths:["Recomendação profissional tem alto impacto","Audiência digital activa","Conteúdo educativo sobre suplementos"],
    weaknesses:["Volume de vendas directo baixo","Modelo mais de influência que distribuição"],
    action:"Propor parceria de embaixador com comissão por venda — enviar amostras para teste com pacientes",
  },
  "Clínica Nutrição": {
    keywords:["clínica","nutrição","consulta","médico","saúde","wellness","medicina","funcional"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:false},
    fit_boost:22, email_prefix:"clinica@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — clínica especializada em nutrição clínica e medicina funcional. Programas de emagrecimento e nutrição desportiva. Suplementação prescrita e disponível em loja.`,
    strengths:["Alta credibilidade médica","Suplementos vendem-se na clínica","Volume de consultas garante exposição"],
    weaknesses:["Aprovação rigorosa","Necessita estudos clínicos dos produtos"],
    action:"Contactar director clínico — apresentar estudos científicos e propor protocolo de integração na prescrição nutricional",
  },
  "Personal Trainer": {
    keywords:["personal trainer","treino","coaching","fitness","musculação","online","resultados"],
    signals:{has_online_store:false,sports_nutrition:true,fitness:true},
    fit_boost:18, email_prefix:"pt@",
    content:(n,c)=>`${n} — personal trainer certificado ${c?"em "+c:""}. Treino presencial e online. Planos de nutrição e suplementação integrados.`,
    strengths:["Influência directa nas escolhas dos clientes","Audiência digital activa no Instagram","Modelo de parceria flexível"],
    weaknesses:["Volume individual baixo","Alta rotatividade de marcas recomendadas"],
    action:"Parceria via Instagram — enviar kit de produtos para conteúdo autêntico com código de desconto e comissão de 15%",
  },
  "Spa / Centro Bem-Estar": {
    keywords:["spa","bem-estar","wellness","massagem","tratamento","relaxamento","beleza","corpo"],
    signals:{has_online_store:false,sports_nutrition:false,fitness:false},
    fit_boost:12, email_prefix:"reservas@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — centro de bem-estar com tratamentos corporais, faciais e terapias holísticas. Colágenos e suplementos de bem-estar disponíveis.`,
    strengths:["Perfil premium alinhado com colágeno e beleza","Cliente disposto a pagar mais","Ambiente de confiança"],
    weaknesses:["Foco principal não é nutrição","Volume limitado e sazonal"],
    action:"Propor linha de colágeno e beleza especificamente — demonstração durante serviço de tratamento",
  },
  "Distribuidor": {
    keywords:["distribuidor","atacado","grossista","representante","revenda","wholesale","b2b","fornecedor"],
    signals:{has_online_store:false,sports_nutrition:false,fitness:false},
    fit_boost:35, email_prefix:"comercial@",
    content:(n,c)=>`${n} ${c?"em "+c:""} — empresa de distribuição B2B especializada em produtos de saúde e bem-estar. Serviço a retalho, horeca e profissionais de saúde.`,
    strengths:["Rede de distribuição já estabelecida","Acesso a múltiplos pontos de venda","Capacidade logística própria"],
    weaknesses:["Margens mais apertadas","Pode exigir exclusividade territorial"],
    action:"Agendar reunião comercial directa — apresentar condições de distribuição exclusiva ou preferencial para a região",
  },
};

const DEFAULT_PROFILE = CATEGORY_PROFILES["Loja Produtos Naturais"];

// ── MOCK ENRICHMENT (fallback quando sem Microlink) ───────────
export async function enrichCompanyMock(company) {
  await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
  const profile = CATEGORY_PROFILES[company.category] || DEFAULT_PROFILE;
  const domain = (company.website || `${company.name.toLowerCase().replace(/\s+/g,"")}.pt`).replace(/https?:\/\//,"").split("/")[0];
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
      whatsapp:         hasWhatsapp  ? `https://wa.me/351 9${Math.floor(Math.random()*2)+1}${Math.floor(Math.random()*9000000+1000000)}` : null,
      tiktok:           hasTiktok    ? `https://tiktok.com/@${company.name.toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9]/g,"").substring(0,20)}` : null,
      youtube:          null,
      contact_page_url: company.website ? `${company.website}/contactos` : null,
      competitors_detected:  [],
      competitors_count:     0,
      is_active_reseller:    false,
      enrichment_status:     "done",
      _source: "mock",
    },
    signals: {
      has_instagram:     hasInstagram,
      has_facebook:      hasFacebook,
      has_linkedin:      hasLinkedin,
      has_tiktok:        hasTiktok,
      has_email:         true,
      has_phone:         hasPhone,
      has_whatsapp:      hasWhatsapp,
      has_online_store:  profile.signals.has_online_store,
      has_blog:          rand(0.55),
      multiple_locations:rand(0.65),
      sells_competitors: false,
      is_active_reseller:false,
      custom_signals: {
        sports_nutrition: profile.signals.sports_nutrition,
        fitness:          profile.signals.fitness,
        wellness:         true,
        pharmacy:         company.category?.includes("Farmácia"),
      },
    },
  };
}

// ── MAIN ENRICH — tenta Microlink, cai para mock ─────────────
export async function enrichCompanyReal(company, icpProfile = null) {
  const microlinkStatus = getMicrolinkStatus();

  // Lista de concorrentes do perfil ICP do tenant (ex: ["AllNutrition","Prozis","Myprotein"])
  const competitorList = icpProfile?.competitor_brands || [];

  // Tenta Microlink se tiver URL e disponibilidade
  if (company.website && microlinkStatus.available) {
    const crawled = await crawlWebsite(company.website, competitorList);
    if (crawled) {
      const signals = detectSignalsFromCrawl(crawled, company);
      return {
        enrichment: {
          ...crawled,
          enrichment_status: "done",
          contact_page_url: company.website ? `${company.website}/contactos` : null,
        },
        signals,
        _source: "microlink",
      };
    }
  }

  // Fallback para mock
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
    multiple_locations:text.includes("filial")||text.includes("unidades")||text.includes("lojas")||text.includes("localizações"),
    // Concorrentes detectados no HTML
    sells_competitors:   (crawled.competitors_count  || 0) > 0,
    is_active_reseller:  crawled.is_active_reseller  || false,
    competitors_detected:crawled.competitors_detected || [],
    custom_signals: {
      sports_nutrition: text.includes("suplemento")||text.includes("proteína")||text.includes("colágeno")||text.includes("nutrição desportiva")||text.includes("creatina"),
      fitness:          text.includes("ginásio")||text.includes("fitness")||text.includes("treino")||text.includes("health club")||text.includes("crossfit"),
      wellness:         text.includes("bem-estar")||text.includes("wellness")||text.includes("saúde"),
      pharmacy:         text.includes("farmácia")||text.includes("parafarmácia")||text.includes("medicamento"),
    },
  };
}

// ── MOCK AI ANALYSIS (fallback sem Claude) ────────────────────
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
    alto:  `${company.name} ${city} apresenta perfil altamente compatível com os produtos ${clientName}. Boa presença digital e público-alvo alinhado com suplementação premium.`,
    médio: `${company.name} ${city} tem potencial moderado como parceiro para ${clientName}. Vale contacto inicial para avaliar abertura a novas marcas.`,
    baixo: `${company.name} ${city} apresenta presença digital limitada. Contacto presencial pode revelar oportunidade não visível online.`,
  };
  return {
    executive_summary:    summaries[potential],
    strengths:            profile.strengths,
    weaknesses:           profile.weaknesses,
    partnership_potential:potential,
    recommended_action:   profile.action,
    confidence_score:     0, // 0 indica mock — Claude real retorna >0
    _mock: true,
  };
}

// ── SCORING ───────────────────────────────────────────────────
export function computeScores(enrichment, signals, tenant) {
  const text = (
    (enrichment.visible_content  || "") + " " +
    (enrichment.meta_description || "")
  ).toLowerCase();

  const fitKeywords = tenant?.fit_keywords || [
    "ginásio","farmácia","nutricionista","loja natureza","parafarmácia",
    "wellness","suplementos","health club","personal trainer","sports nutrition",
    "clínica","bem-estar","colágeno","proteína","vitaminas","natural","biológico","fitness","treino",
  ];
  const fitMatches = fitKeywords.filter(k => text.includes(k.toLowerCase())).length;
  const fitScore   = Math.min(100, fitMatches * 12 + (enrichment.website_title ? 16 : 0));

  const digitalScore = Math.min(100, [
    enrichment.instagram ? 30 : 0,
    enrichment.linkedin  ? 20 : 0,
    enrichment.facebook  ? 15 : 0,
    enrichment.tiktok    ? 10 : 0,
    enrichment.website_title    ? 20 : 0,
    enrichment.meta_description ? 15 : 0,
  ].reduce((a,b)=>a+b,0));

  const contactScore = Math.min(100, [
    enrichment.email    ? 40 : 0,
    enrichment.phone    ? 30 : 0,
    enrichment.whatsapp ? 20 : 0,
    enrichment.contact_page_url ? 10 : 0,
  ].reduce((a,b)=>a+b,0));

  const authorityScore = Math.min(100, [
    enrichment.h1_main?.length > 10         ? 25 : 0,
    enrichment.meta_description?.length > 50 ? 25 : 0,
    enrichment.linkedin                      ? 25 : 0,
    enrichment.visible_content?.length > 300 ? 25 : 0,
  ].reduce((a,b)=>a+b,0));

  // Bónus por concorrentes detectados (já vende no nicho → oportunidade)
  const competitorBonus = signals?.sells_competitors
    ? (signals.is_active_reseller ? 15 : 8)
    : 0;

  const finalScore = Math.min(100, Math.round(
    fitScore       * 0.35 +
    authorityScore * 0.25 +
    digitalScore   * 0.20 +
    contactScore   * 0.20 +
    competitorBonus
  ));

  const scoreClass = finalScore >= 80 ? "A"
                   : finalScore >= 60 ? "B"
                   : finalScore >= 40 ? "C"
                   : "D";

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
  const {
    company_id, tenant_id, enrichment_status, _source, _crawled_at,
    _all_emails, _all_phones, _has_html, // remove campos debug
    ...rest
  } = enrichment;
  return {
    company_id,
    tenant_id,
    enrichment_status,
    website_title:       rest.website_title    || null,
    meta_description:    rest.meta_description || null,
    h1_main:             rest.h1_main          || null,
    visible_content:     rest.visible_content  || null,
    email:               rest.email && isCorporateEmail(rest.email) ? rest.email : null,
    phone:               rest.phone            || null,
    instagram:           rest.instagram        || null,
    linkedin:            rest.linkedin         || null,
    facebook:            rest.facebook         || null,
    tiktok:              rest.tiktok           || null,
    youtube:             rest.youtube          || null,
    whatsapp:            rest.whatsapp         || null,
    contact_page_url:    rest.contact_page_url || null,
    competitors_detected:rest.competitors_detected || [],
    competitors_count:   rest.competitors_count    || 0,
    is_active_reseller:  rest.is_active_reseller   || false,
  };
}