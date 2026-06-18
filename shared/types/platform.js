// shared/types/platform.js
// Tipos e constantes partilhados por todos os módulos Revora
// Usado como referência — cada módulo pode importar o que precisa

// ── MÓDULOS ───────────────────────────────────────────────────
export const MODULES = {
  feedback: { id: "feedback", label: "Feedback",  icon: "⭐", color: "#E8A020" },
  discover: { id: "discover", label: "Discover",  icon: "🔍", color: "#534AB7" },
  pulse:    { id: "pulse",    label: "Pulse",      icon: "⚡", color: "#1D9E75" },
};

// ── PLANOS ────────────────────────────────────────────────────
export const PLANS = {
  trial:      { label: "Trial",      color: "#854F0B", bg: "#FAEEDA" },
  starter:    { label: "Starter",    color: "#185FA5", bg: "#E6F1FB" },
  pro:        { label: "Pro",        color: "#3B6D11", bg: "#EAF3DE" },
  enterprise: { label: "Enterprise", color: "#534AB7", bg: "#EEEDFE" },
};

// ── MERCADOS ──────────────────────────────────────────────────
export const MARKETS = {
  pt: { label: "Portugal", flag: "🇵🇹", currency: "€", lang: "pt-PT" },
  es: { label: "Espanha",  flag: "🇪🇸", currency: "€", lang: "es-ES" },
  br: { label: "Brasil",   flag: "🇧🇷", currency: "R$", lang: "pt-BR" },
};

// ── ROLES (tenant_users) ──────────────────────────────────────
export const ROLES = {
  admin:      { label: "Admin",      color: "#534AB7", bg: "#EEEDFE" },
  manager:    { label: "Gestor",     color: "#185FA5", bg: "#E6F1FB" },
  commercial: { label: "Comercial",  color: "#5F5E5A", bg: "#F1EFE8" },
};

// ── DISCOVER: classes de scoring ─────────────────────────────
export const SCORE_CLASSES = {
  A: { bg: "#EAF3DE", color: "#3B6D11", label: "Classe A", min: 80 },
  B: { bg: "#E6F1FB", color: "#185FA5", label: "Classe B", min: 60 },
  C: { bg: "#FAEEDA", color: "#854F0B", label: "Classe C", min: 40 },
  D: { bg: "#FCEBEB", color: "#A32D2D", label: "Classe D", min: 0  },
};

// ── DISCOVER: avaliações humanas ─────────────────────────────
export const HUMAN_RATINGS = [
  { value: "excellent",    label: "Excelente oportunidade", icon: "⭐", color: "#854F0B" },
  { value: "good",         label: "Boa oportunidade",       icon: "👍", color: "#3B6D11" },
  { value: "neutral",      label: "Neutro",                 icon: "➖", color: "#888"    },
  { value: "bad",          label: "Não faz sentido",        icon: "👎", color: "#A32D2D" },
  { value: "review_later", label: "Revisar depois",         icon: "🕐", color: "#185FA5" },
];

// ── PULSE: sinais de resposta ─────────────────────────────────
export const REPLY_SIGNALS = {
  positive:  { label: "Interesse",   icon: "✅", color: "#3B6D11" },
  question:  { label: "Dúvida",      icon: "❓", color: "#185FA5" },
  objection: { label: "Objecção",    icon: "⚡", color: "#854F0B" },
  delay:     { label: "Adiamento",   icon: "⏳", color: "#534AB7" },
  negative:  { label: "Recusa",      icon: "❌", color: "#A32D2D" },
  optout:    { label: "Opt-out",     icon: "🚫", color: "#888"    },
};

// ── PULSE: canais de contacto ─────────────────────────────────
export const CHANNELS = {
  email:    { label: "Email",    icon: "✉",  color: "#185FA5" },
  whatsapp: { label: "WhatsApp", icon: "💬", color: "#25d366" },
  sms:      { label: "SMS",      icon: "📱", color: "#534AB7" },
};

// ── FEEDBACK: status de cliente ───────────────────────────────
export const CLIENT_STATUS = {
  aguardando:  { label: "Aguardando",  color: "#92400E", bg: "#FEF3C7", dot: "#D97706" },
  msg_enviada: { label: "Msg Enviada", color: "#185FA5", bg: "#E6F1FB", dot: "#185FA5" },
  avaliado:    { label: "Avaliado",    color: "#3B6D11", bg: "#EAF3DE", dot: "#3B6D11" },
  low_rating:  { label: "Atenção",     color: "#A32D2D", bg: "#FCEBEB", dot: "#A32D2D" },
};

// ── FEEDBACK: segmentos ───────────────────────────────────────
export const SEGMENTS = [
  { slug: "barbearia",      emoji: "✂️",  label: "Barbearia",      recorrencia: 15  },
  { slug: "petshop",        emoji: "🐾",  label: "Pet Shop",        recorrencia: 21  },
  { slug: "clinica",        emoji: "🏥",  label: "Clínica",         recorrencia: 90  },
  { slug: "lojas",          emoji: "🛍️",  label: "Loja",            recorrencia: 30  },
  { slug: "concessionarias",emoji: "🚗",  label: "Concessionária",  recorrencia: 180 },
  { slug: "outro",          emoji: "🏢",  label: "Outro",           recorrencia: 30  },
];

// ── EVENTOS: tipos por módulo ─────────────────────────────────
export const EVENT_TYPES = {
  // Platform
  "tenant.created":    "Tenant criado",
  "tenant.updated":    "Tenant actualizado",
  "member.invited":    "Membro convidado",
  "member.joined":     "Membro entrou",
  "plan.changed":      "Plano alterado",
  // Discover
  "company.imported":  "Empresas importadas",
  "company.enriched":  "Empresa enriquecida",
  "validation.submitted": "Validação submetida",
  // Pulse
  "lead.imported":     "Leads importados",
  "sequence.started":  "Sequência iniciada",
  "message.sent":      "Mensagem enviada",
  "meeting.booked":    "Reunião marcada",
  // Feedback
  "client.registered": "Cliente registado",
  "rating.submitted":  "Avaliação submetida",
  "alert.triggered":   "Alerta disparado",
};
