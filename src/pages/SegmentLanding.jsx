import { useNavigate, useLocation } from 'react-router-dom'

// ─────────────────────────────────────────────
// PALETA AUNOR
// ─────────────────────────────────────────────
const C = {
  black:      '#0A0A0A',
  black2:     '#111111',
  black3:     '#1A1A1A',
  blue:       '#1B4FD8',
  blueDark:   '#1340B0',
  blueLight:  '#3B6FFF',
  blueDim:    'rgba(27,79,216,0.12)',
  blueBorder: 'rgba(27,79,216,0.3)',
  yellow:     '#F5C518',
  yellowDark: '#D4A800',
  yellowDim:  'rgba(245,197,24,0.12)',
  white:      '#FFFFFF',
  gray:       '#F5F5F5',
  gray2:      '#E8E8E8',
  muted:      '#888888',
  muted2:     '#555555',
  border:     'rgba(255,255,255,0.08)',
  borderLight:'rgba(0,0,0,0.08)',
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`

// ─────────────────────────────────────────────
// SEGMENTOS
// ─────────────────────────────────────────────
const SEGMENTS = {
  barbearia: {
    slug: 'barbearia',
    emoji: '✂️',
    name: 'Barbearia',
    headline: 'Mais clientes voltando. Menos cadeira vazia.',
    sub: 'O Revora monitora a satisfação dos seus clientes, avisa quando alguém sumiu e automatiza avaliações no Google — tudo pelo WhatsApp.',
    pain: 'Cliente foi uma vez e nunca mais voltou?',
    painSub: 'A maioria das barbearias perde 40% dos novos clientes por falta de follow-up.',
    color: C.yellow,
    colorDim: C.yellowDim,
    services: ['Corte', 'Barba', 'Corte + Barba', 'Acabamento', 'Coloração'],
    recorrencia: '15–30 dias',
    features: [
      { icon: '📅', title: 'Retorno programado', desc: 'Sistema avisa o cliente quando está na hora de voltar. Barbearia tem recorrência — explore isso.' },
      { icon: '⭐', title: 'Avaliações no Google', desc: 'Após cada atendimento, cliente recebe link direto para avaliar. Automaticamente.' },
      { icon: '⚠️', title: 'Cliente sumido? Você sabe.', desc: 'Se o cliente passou do prazo esperado, você recebe alerta e pode agir antes de perdê-lo.' },
      { icon: '🎁', title: 'Cupom de retorno', desc: 'Cliente satisfeito ganha cupom automático para próxima visita. Fidelização sem esforço.' },
    ],
    testimonial: {
      text: '"Em 3 semanas minha nota no Google foi de 4.1 para 4.8. Clientes novos chegando toda semana citando as avaliações."',
      name: 'Rodrigo Mendes',
      biz: '💈 Barbearia Mendes — São Paulo',
    },
    cta: 'Testar 14 dias grátis',
    stats: [{ v: '30 dias', l: 'recorrência média' }, { v: '74%', l: 'taxa de retorno' }, { v: '3x', l: 'mais avaliações' }],
  },

  petshop: {
    slug: 'petshop',
    emoji: '🐾',
    name: 'Pet Shop',
    headline: 'Dono de pet paga bem. Garanta que ele volte sempre.',
    sub: 'O Revora avisa quando o banho está vencendo, coleta avaliações automaticamente e identifica clientes que pararam de aparecer.',
    pain: 'Clientes irregulares custam mais do que você pensa.',
    painSub: 'Banho de cachorro é recorrente. Se o cliente para de vir, alguém está ganhando esse dinheiro.',
    color: C.blue,
    colorDim: C.blueDim,
    services: ['Banho', 'Tosa', 'Banho + Tosa', 'Consulta', 'Vacina'],
    recorrencia: '21–30 dias',
    features: [
      { icon: '🔔', title: 'Lembrete de banho automático', desc: 'Sistema calcula quando o pet precisa voltar e manda mensagem no WhatsApp do dono.' },
      { icon: '⭐', title: 'Avaliações no Google', desc: 'Após cada atendimento, coleta avaliação automaticamente. Sem você fazer nada.' },
      { icon: '📊', title: 'Saúde da carteira', desc: 'Veja quais clientes estão saudáveis, em risco ou sumidos — numa única tela.' },
      { icon: '🎁', title: 'Cupom de fidelização', desc: 'Dono fiel recebe benefício automático. Ele volta. O pet também.' },
    ],
    testimonial: {
      text: '"Antes eu não sabia quem tinha sumido. Agora o sistema me avisa e eu mando mensagem. Recuperei 12 clientes em 1 mês."',
      name: 'Fernanda Lima',
      biz: '🐾 PetCare Fernanda — Curitiba',
    },
    cta: 'Começar grátis agora',
    stats: [{ v: '21 dias', l: 'retorno médio banho' }, { v: '68%', l: 'taxa de retenção' }, { v: '2.4x', l: 'LTV com retorno' }],
  },

  clinica: {
    slug: 'clinica',
    emoji: '🏥',
    name: 'Clínica',
    headline: 'Paciente satisfeito volta. E indica. Automatize isso.',
    sub: 'O Revora coleta NPS, CSAT e avaliações Google de forma automática — e avisa quando um paciente está em risco de abandono.',
    pain: 'Você perde pacientes sem nem saber.',
    painSub: 'Clínicas perdem até 30% dos pacientes por ausência de follow-up entre consultas.',
    color: C.blue,
    colorDim: C.blueDim,
    services: ['Consulta', 'Retorno', 'Exame', 'Procedimento', 'Cirurgia'],
    recorrencia: '90–180 dias',
    features: [
      { icon: '📋', title: 'NPS + CSAT automático', desc: 'Pesquisa de satisfação enviada após cada atendimento. Você vê os resultados em tempo real.' },
      { icon: '⭐', title: 'Google Reviews', desc: 'Pacientes satisfeitos são direcionados para avaliar no Google. Pacientes insatisfeitos, para você resolver.' },
      { icon: '🔄', title: 'Retorno programado', desc: 'Sistema calcula quando o paciente deveria retornar e avisa se passar do prazo.' },
      { icon: '⚠️', title: 'Alertas de risco', desc: 'Identificação automática de pacientes que pararam de vir — antes que seja tarde demais.' },
    ],
    testimonial: {
      text: '"Minha clínica tem 800 pacientes. Nunca consegui acompanhar todos. Agora o sistema faz isso por mim e me avisa quem precisa de atenção."',
      name: 'Dra. Ana Beatriz',
      biz: '🏥 Clínica AB — Belo Horizonte',
    },
    cta: 'Testar 14 dias grátis',
    stats: [{ v: '180 dias', l: 'retorno médio' }, { v: '89%', l: 'satisfação captada' }, { v: '-28%', l: 'abandono pós-Revora' }],
  },

  lojas: {
    slug: 'lojas',
    emoji: '🛍️',
    name: 'Loja',
    headline: 'Cliente comprou uma vez? Faça ele voltar sempre.',
    sub: 'O Revora transforma compradores ocasionais em clientes recorrentes — com pesquisa de satisfação, cupom automático e alertas de risco.',
    pain: 'Você gasta mais para conquistar do que para reter.',
    painSub: 'Reter um cliente custa 5x menos do que conquistar um novo. A maioria das lojas ainda ignora isso.',
    color: C.yellow,
    colorDim: C.yellowDim,
    services: ['Compra', 'Troca', 'Encomenda', 'Orçamento', 'Retirada'],
    recorrencia: '30–60 dias',
    features: [
      { icon: '📊', title: 'Satisfação em tempo real', desc: 'NPS e CSAT automáticos após cada compra. Você sabe como está a experiência do cliente.' },
      { icon: '⭐', title: 'Avaliações no Google', desc: 'Cliente satisfeito recebe link para avaliar automaticamente. Sua reputação cresce sozinha.' },
      { icon: '🎁', title: 'Cupom inteligente', desc: 'Clientes fiéis recebem desconto automático. Clientes sumidos recebem oferta de reativação.' },
      { icon: '📈', title: 'Dashboard de retenção', desc: 'Veja quais clientes são promotores, em risco ou perdidos — e aja antes de perdê-los.' },
    ],
    testimonial: {
      text: '"Comecei a usar o Revora e em 45 dias minha taxa de segunda compra subiu de 22% para 41%. O cupom automático foi o que mais ajudou."',
      name: 'Carlos Augusto',
      biz: '🛍️ Loja Augusta — Porto Alegre',
    },
    cta: 'Começar agora',
    stats: [{ v: '45 dias', l: 'retorno médio' }, { v: '41%', l: 'taxa 2ª compra' }, { v: '5x', l: 'custo menor reter' }],
  },

  concessionarias: {
    slug: 'concessionarias',
    emoji: '🚗',
    name: 'Concessionária',
    headline: 'Do test drive à revisão. Nunca perca o cliente.',
    sub: 'O Revora acompanha todo o ciclo do cliente — da compra à manutenção — coletando satisfação e identificando quem está em risco de ir para a concorrência.',
    pain: 'Você vende o carro. E perde o cliente na revisão.',
    painSub: 'Concessionárias perdem 60% dos clientes após a 1ª revisão. A maioria vai para oficinas independentes.',
    color: C.blue,
    colorDim: C.blueDim,
    services: ['Test Drive', 'Compra', 'Revisão', 'Manutenção', 'Garantia'],
    recorrencia: '180–365 dias',
    features: [
      { icon: '🔔', title: 'Lembrete de revisão', desc: 'Sistema calcula quando o cliente precisa de revisão e avisa automaticamente. Antes que ele vá para outro lugar.' },
      { icon: '⭐', title: 'NPS + Google Reviews', desc: 'Coleta satisfação após compra e pós-revisão. Identificação automática de promotores e detratores.' },
      { icon: '📊', title: 'Ciclo completo do cliente', desc: 'Visão unificada de cada cliente — histórico de compras, revisões, satisfação e risco de churn.' },
      { icon: '⚠️', title: 'Alerta de perda iminente', desc: 'Cliente não retornou para revisão programada? Você recebe alerta e pode agir com oferta personalizada.' },
    ],
    testimonial: {
      text: '"Conseguimos reduzir o abandono de revisões em 35% no primeiro trimestre. O sistema identifica quem está em risco antes que a gente perca o cliente."',
      name: 'Marcelo Teixeira',
      biz: '🚗 AutoTeixeira — Campinas',
    },
    cta: 'Agendar demonstração',
    stats: [{ v: '365 dias', l: 'ciclo revisão' }, { v: '-35%', l: 'abandono revisão' }, { v: '3.2x', l: 'LTV com retenção' }],
  },
}

// ─────────────────────────────────────────────
// LANDING PAGE COMPONENT
// ─────────────────────────────────────────────
export default function SegmentLanding() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const segment = pathname.replace('/', '')
  const s = SEGMENTS[segment]

  if (!s) {
    navigate('/')
    return null
  }

  const isYellow = s.color === C.yellow
  const accentColor = s.color
  const accentDim = s.colorDim

  return (
    <div style={{ background: C.black, color: C.white, fontFamily: "'DM Sans',sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::selection { background: ${accentColor}; color: ${C.black}; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fade1{animation:fadeUp 0.6s 0.0s ease both}
        .fade2{animation:fadeUp 0.6s 0.15s ease both}
        .fade3{animation:fadeUp 0.6s 0.3s ease both}
        .fade4{animation:fadeUp 0.6s 0.45s ease both}
        .feat-card:hover { border-color: ${accentColor}44 !important; transform: translateY(-3px); }
        .btn-main:hover { transform: translateY(-2px); box-shadow: 0 16px 40px ${accentColor}44 !important; }
        .nav-link:hover { color: ${C.white} !important; }
        a { text-decoration: none; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5vw', background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
            Re<span style={{ color: accentColor }}>v</span>ora
          </div>
          <span style={{ fontSize: 11, background: `${accentColor}18`, color: accentColor, padding: '3px 9px', borderRadius: 100, fontWeight: 700, border: `1px solid ${accentColor}33` }}>
            {s.emoji} {s.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="#como-funciona" className="nav-link" style={{ fontSize: 13, fontWeight: 500, color: C.muted, transition: 'color 0.2s' }}>Como funciona</a>
          <a href="#precos" className="nav-link" style={{ fontSize: 13, fontWeight: 500, color: C.muted, transition: 'color 0.2s' }}>Preços</a>
          <a href="/cadastro" style={{ padding: '8px 20px', borderRadius: 8, background: accentColor, color: isYellow ? C.black : C.white, fontSize: 13, fontWeight: 800, border: `1.5px solid ${accentColor}`, transition: 'all 0.2s' }}>
            Começar grátis
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 5vw 80px', position: 'relative', overflow: 'hidden' }}>
        {/* BG effects */}
        <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle,${accentColor}18 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle,${C.blue}10 0%,transparent 70%)`, pointerEvents: 'none' }} />

        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize: '80px 80px', pointerEvents: 'none', opacity: 0.4 }} />

        <div style={{ position: 'relative', maxWidth: 820 }}>
          <div className="fade1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.black3, border: `1px solid ${C.border}`, borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, animation: 'pulse 2s ease infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: accentColor }}>Para {s.name}s</span>
          </div>

          <h1 className="fade2" style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(40px,6vw,76px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24, color: C.white }}>
            {s.headline.split('. ').map((part, i) => (
              <span key={i}>
                {i === 1 ? <span style={{ color: accentColor }}>{part}.</span> : part + (i < s.headline.split('. ').length - 1 ? '. ' : '')}
              </span>
            ))}
          </h1>

          <p className="fade3" style={{ fontSize: 'clamp(15px,1.8vw,19px)', color: '#AAAAAA', lineHeight: 1.65, maxWidth: 580, marginBottom: 40 }}>
            {s.sub}
          </p>

          <div className="fade4" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 56 }}>
            <a href="/cadastro" className="btn-main" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 32px', borderRadius: 10, background: accentColor, color: isYellow ? C.black : C.white, fontSize: 15, fontWeight: 800, border: `2px solid ${accentColor}`, boxShadow: `0 8px 28px ${accentColor}33`, transition: 'all 0.2s' }}>
              ⚡ {s.cta}
            </a>
            <a href="#como-funciona" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '15px 24px', borderRadius: 10, border: `2px solid ${C.border}`, color: '#888', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}>
              Ver como funciona →
            </a>
          </div>

          {/* Stats */}
          <div className="fade4" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {s.stats.map(st => (
              <div key={st.l}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 900, color: accentColor }}>{st.v}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{st.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIN SECTION ── */}
      <section style={{ background: C.black2, padding: '80px 5vw', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accentColor, marginBottom: 16 }}>O problema real</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, letterSpacing: -1, marginBottom: 16 }}>{s.pain}</h2>
          <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7 }}>{s.painSub}</p>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ background: accentColor, padding: '14px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', animation: 'ticker 20s linear infinite', whiteSpace: 'nowrap' }}>
          {[...Array(2)].map((_, x) => (
            <span key={x} style={{ display: 'contents' }}>
              {['Feedback automático', 'NPS + CSAT', 'Google Reviews', 'Clientes em risco', 'Retenção inteligente', 'Cupom automático', `Para ${s.name}s`, 'Brasil · Portugal · Itália'].map(item => (
                <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 20, padding: '0 32px', fontSize: 13, fontWeight: 700, color: isYellow ? C.black : C.white }}>
                  {item} <span style={{ opacity: 0.4 }}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" style={{ padding: '100px 5vw', background: C.black }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accentColor, marginBottom: 14 }}>Como funciona</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, letterSpacing: -1, maxWidth: 600 }}>
              Simples para sua equipe.<br />Poderoso para seu negócio.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 2, background: C.border, borderRadius: 16, overflow: 'hidden' }}>
            {[
              { n: '01', icon: '📱', t: 'Atendente cadastra', d: `Cliente é atendido. Atendente registra no sistema em 10 segundos. Nenhum app necessário.` },
              { n: '02', icon: '📩', t: 'Cliente recebe pesquisa', d: `Mensagem automática no WhatsApp com link de avaliação. Fluxo de nota inteligente.` },
              { n: '03', icon: '⭐', t: 'Avaliação e cupom', d: `Nota alta → link Google + cupom. Nota baixa → alerta privado para você resolver.` },
              { n: '04', icon: '📊', t: 'Você vê tudo', d: `Dashboard com satisfação, clientes em risco, avaliações e métricas de retenção.` },
            ].map(step => (
              <div key={step.n} style={{ background: C.black2, padding: '36px 28px', transition: 'background 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = C.black3}
                onMouseOut={e => e.currentTarget.style.background = C.black2}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 48, fontWeight: 900, color: `${accentColor}20`, lineHeight: 1, marginBottom: 16 }}>{step.n}</div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accentColor}15`, border: `1px solid ${accentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 16 }}>{step.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{step.t}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 5vw', background: C.black2 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accentColor, marginBottom: 14 }}>Funcionalidades</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, letterSpacing: -1 }}>
              Feito para {s.name.toLowerCase()}.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
            {s.features.map(f => (
              <div key={f.title} className="feat-card" style={{ background: C.black, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 24, transition: 'all 0.2s', cursor: 'default' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: `${accentColor}12`, border: `1px solid ${accentColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section style={{ padding: '80px 5vw', background: C.black }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20, opacity: 0.3 }}>"</div>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 700, lineHeight: 1.5, letterSpacing: -0.5, marginBottom: 28, color: C.white }}>
            {s.testimonial.text}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${accentColor}20`, border: `2px solid ${accentColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 16, color: accentColor }}>
              {s.testimonial.name.charAt(0)}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.testimonial.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{s.testimonial.biz}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precos" style={{ padding: '100px 5vw', background: C.black2 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accentColor, marginBottom: 14 }}>Preços</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, letterSpacing: -1 }}>Simples. Sem surpresas.</h2>
            <p style={{ fontSize: 15, color: C.muted, marginTop: 12 }}>14 dias grátis · Cancele quando quiser · Brasil, Portugal e Itália</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { name: 'Starter', price: 'R$97', period: '/mês · até 100 envios', features: ['Pesquisa pós-atendimento', 'Google Reviews automático', 'Alerta nota baixa', 'Cupom de fidelização', '1 atendente'], featured: false },
              { name: 'Pro', price: 'R$197', period: '/mês · ilimitado', features: ['Tudo do Starter', 'Envios ilimitados', 'Múltiplos atendentes', 'Clientes em risco', 'Dashboard avançado', 'Suporte prioritário'], featured: true },
            ].map(plan => (
              <div key={plan.name} style={{ background: plan.featured ? accentColor : C.black, border: `1.5px solid ${plan.featured ? accentColor : C.border}`, borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: plan.featured ? (isYellow ? '#00000077' : '#ffffff88') : C.muted, marginBottom: 8 }}>{plan.name}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 44, fontWeight: 900, color: plan.featured ? (isYellow ? C.black : C.white) : C.white, lineHeight: 1, marginBottom: 4 }}>{plan.price}</div>
                <div style={{ fontSize: 13, color: plan.featured ? (isYellow ? '#00000066' : '#ffffff66') : C.muted, marginBottom: 24 }}>{plan.period}</div>
                <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: plan.featured ? (isYellow ? C.black : C.white) : '#AAAAAA', padding: '6px 0', borderBottom: `1px solid ${plan.featured ? (isYellow ? '#00000015' : '#ffffff15') : C.border}` }}>
                      <span style={{ color: plan.featured ? (isYellow ? C.black : C.yellow) : accentColor, fontWeight: 700, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/cadastro" style={{ display: 'block', padding: '13px', borderRadius: 9, textAlign: 'center', fontSize: 14, fontWeight: 800, textDecoration: 'none', background: plan.featured ? (isYellow ? C.black : 'rgba(255,255,255,0.15)') : accentColor, color: plan.featured ? (isYellow ? accentColor : C.white) : (isYellow ? C.black : C.white), transition: 'opacity 0.2s' }}>
                  Começar grátis
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: '120px 5vw', background: C.black, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle,${accentColor}10 0%,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accentColor, marginBottom: 16 }}>Comece hoje</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(32px,5vw,64px)', fontWeight: 900, letterSpacing: -2, marginBottom: 20, maxWidth: 700, margin: '0 auto 20px' }}>
            Pare de perder clientes<br />que você já conquistou.
          </h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Entenda, retenha e recupere seus clientes — com uma plataforma feita para {s.name.toLowerCase()}s.
          </p>
          <a href="/cadastro" className="btn-main" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '18px 40px', borderRadius: 12, background: accentColor, color: isYellow ? C.black : C.white, fontSize: 16, fontWeight: 800, border: `2px solid ${accentColor}`, boxShadow: `0 8px 28px ${accentColor}33`, transition: 'all 0.2s', textDecoration: 'none' }}>
            ⚡ {s.cta}
          </a>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 40, fontSize: 13, color: C.muted }}>
            <span>🇧🇷 Brasil</span><span>·</span><span>🇵🇹 Portugal</span><span>·</span><span>🇮🇹 Itália</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: C.black2, borderTop: `1px solid ${C.border}`, padding: '28px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 900 }}>Re<span style={{ color: accentColor }}>v</span>ora</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {Object.keys(SEGMENTS).map(slug => (
            <a key={slug} href={`/${slug}`} style={{ fontSize: 12, color: slug === segment ? accentColor : C.muted, fontWeight: slug === segment ? 700 : 400, textDecoration: 'none' }}>
              {SEGMENTS[slug].emoji} {SEGMENTS[slug].name}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#444' }}>© 2025 Revora</div>
      </footer>
    </div>
  )
}
