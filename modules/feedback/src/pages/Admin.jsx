import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const C = {
  cream: '#FAF7F2',
  cream2: '#F2EDE4',
  ink: '#0C0A08',
  ink2: '#2A2520',
  amber: '#E8A020',
  amberLight: '#F5C158',
  amberDim: 'rgba(232,160,32,0.10)',
  amberBorder: 'rgba(232,160,32,0.25)',
  stone: '#9B9488',
  stone2: '#6B6358',
  border: 'rgba(155,148,136,0.2)',
  borderHi: 'rgba(155,148,136,0.35)',
  white: '#FFFFFF',
  green: '#2A9D5C',
  greenDim: 'rgba(42,157,92,0.10)',
  red: '#C0392B',
  redDim: 'rgba(192,57,43,0.10)',
  blue: '#2563EB',
  blueDim: 'rgba(37,99,235,0.10)',
}

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Figtree:wght@300;400;500;600;700;800&display=swap');
`

const STATUS = {
  aguardando:  { label: 'Aguardando',   color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  msg_enviada: { label: 'Msg Enviada',  color: C.blue,    bg: C.blueDim, dot: C.blue    },
  avaliado:    { label: 'Avaliado ✓',   color: C.green,   bg: C.greenDim,dot: C.green   },
  low_rating:  { label: 'Atenção',      color: C.red,     bg: C.redDim,  dot: C.red     },
}

function Badge({ status }) {
  const s = STATUS[status] || STATUS.aguardando
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 600,
      color: s.color, background: s.bg,
      border: `1px solid ${s.dot}22`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

function KpiCard({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: C.white, border: `1.5px solid ${C.border}`,
      borderRadius: 16, padding: '20px 24px',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = C.amberBorder; e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,160,32,0.08)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, color: color || C.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.stone2, marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.stone, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export default function Admin() {
  const [business, setBusiness] = useState(null)
  const [clients, setClients] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('hoje')
  const [showQR, setShowQR] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: biz } = await supabase.from('businesses').select('*').limit(1).single()
    setBusiness(biz)
    setForm(biz || {})
    if (biz) {
      const { data } = await supabase.from('clients').select('*')
        .eq('business_id', biz.id).order('created_at', { ascending: false }).limit(50)
      setClients(data || [])
    }
    setLoading(false)
  }

  async function saveBusiness() {
    const { error } = await supabase.from('businesses').update({
      name: form.name, segment: form.segment,
      google_link: form.google_link, coupon_code: form.coupon_code,
      coupon_discount: form.coupon_discount, coupon_expiry: form.coupon_expiry,
    }).eq('id', business.id)
    if (!error) { setBusiness(form); setEditing(false); showToast('Configurações salvas! ✓') }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const today = new Date().toISOString().split('T')[0]
  const todayClients = clients.filter(c => c.visit_date === today)
  const evaluated = clients.filter(c => c.status === 'avaliado').length
  const lowRating = clients.filter(c => c.status === 'low_rating')
  const conv = clients.length ? Math.round((evaluated / clients.length) * 100) : 0
  const displayClients = activeTab === 'hoje' ? todayClients : clients

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Figtree,sans-serif', color: C.stone }}>
      <style>{FONTS}</style>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Figtree',sans-serif", color: C.ink }}>
      <style>{FONTS}</style>

      {/* TOP NAV */}
      <div style={{
        background: C.white, borderBottom: `1.5px solid ${C.border}`,
        padding: '0 40px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900 }}>
            Re<span style={{ color: C.amber }}>v</span>ora
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['Dashboard', 'Clientes', 'Configurações'].map((t, i) => (
              <a key={t} href={i === 2 ? '#' : '#'} onClick={i === 2 ? (e) => { e.preventDefault(); setEditing(true) } : undefined}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: i === 0 ? C.ink : C.stone2, textDecoration: 'none',
                  background: i === 0 ? C.amberDim : 'transparent',
                  border: i === 0 ? `1px solid ${C.amberBorder}` : '1px solid transparent',
                  cursor: 'pointer',
                }}>{t}</a>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowQR(true)} style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, color: C.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            📲 QR Code
          </button>
          <a href="/atendente" style={{
            padding: '8px 18px', borderRadius: 8,
            background: C.amber, color: C.ink,
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            border: `1.5px solid ${C.amber}`,
            boxShadow: '0 2px 8px rgba(232,160,32,0.25)',
          }}>+ Atendente →</a>
        </div>
      </div>

      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>

        {/* PAGE HEADER */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>
            Bom dia! 👋
          </h1>
          <p style={{ fontSize: 14, color: C.stone2 }}>
            {business?.name} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* KPI GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <KpiCard icon="👥" label="Total de clientes" value={clients.length} />
          <KpiCard icon="⭐" label="Avaliações geradas" value={evaluated} color={C.amber} />
          <KpiCard icon="🎁" label="Cupons enviados" value={clients.filter(c => c.coupon_sent).length} color={C.green} />
          <KpiCard icon="📈" label="Taxa de conversão" value={`${conv}%`} color={C.blue} />
        </div>

        {/* LOW RATING ALERTS */}
        {lowRating.length > 0 && (
          <div style={{
            background: C.redDim, border: `1.5px solid ${C.red}33`,
            borderRadius: 14, padding: '16px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 8 }}>
                {lowRating.length} cliente{lowRating.length > 1 ? 's' : ''} com experiência negativa — ação necessária
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {lowRating.map(c => (
                  <a key={c.id} href={`https://wa.me/55${c.phone?.replace(/\D/g, '')}`} target="_blank"
                    style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: C.white, color: C.red, textDecoration: 'none',
                      border: `1px solid ${C.red}33`,
                    }}>
                    💬 {c.name?.split(' ')[0]} — {'⭐'.repeat(c.stars || 1)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* CLIENT TABLE */}
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ padding: '16px 24px', borderBottom: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Clientes</div>
              <div style={{ display: 'flex', background: C.cream, borderRadius: 8, padding: 3, gap: 2 }}>
                {['hoje', 'todos'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    background: activeTab === t ? C.white : 'transparent',
                    color: activeTab === t ? C.ink : C.stone2,
                    boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}>{t === 'hoje' ? `Hoje (${todayClients.length})` : `Todos (${clients.length})`}</button>
                ))}
              </div>
            </div>

            {/* Col headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
              padding: '10px 24px', borderBottom: `1px solid ${C.border}`,
              fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase', letterSpacing: 0.8,
            }}>
              <span>Cliente</span><span>Serviço / Produto</span><span>Horário</span><span>Status</span>
            </div>

            {displayClients.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: C.stone, fontSize: 13 }}>
                Nenhum cliente {activeTab === 'hoje' ? 'hoje' : 'cadastrado'} ainda.
              </div>
            ) : displayClients.map((c, i) => (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                padding: '13px 24px', alignItems: 'center',
                borderBottom: i < displayClients.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.15s',
              }}
                onMouseOver={e => e.currentTarget.style.background = C.cream}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg,${C.amberDim},${C.amberBorder})`,
                    border: `1.5px solid ${C.amberBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: C.amber,
                  }}>{c.name?.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.stone }}>{c.phone}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.stone2 }}>{c.item}</div>
                <div style={{ fontSize: 13, color: C.stone2 }}>{c.visit_time || '—'}</div>
                <Badge status={c.status} />
              </div>
            ))}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Coupon card */}
            <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>🎁 Cupom ativo</div>
                <button onClick={() => setEditing(true)} style={{
                  padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.stone2, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>✏️ Editar</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { l: 'Código', v: business?.coupon_code },
                  { l: 'Desconto', v: business?.coupon_discount },
                  { l: 'Validade', v: business?.coupon_expiry },
                ].map(i => (
                  <div key={i.l} style={{
                    flex: 1, background: C.amberDim, border: `1px solid ${C.amberBorder}`,
                    borderRadius: 8, padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: 10, color: C.stone, marginBottom: 2 }}>{i.l}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.amber }}>{i.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: C.cream, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.stone, marginBottom: 2 }}>URL GOOGLE</div>
                <div style={{ fontSize: 11, color: C.blue, wordBreak: 'break-all' }}>{business?.google_link}</div>
              </div>
            </div>

            {/* Today summary */}
            <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📅 Hoje</div>
              {[
                { l: 'Atendimentos', v: todayClients.length },
                { l: 'Msgs enviadas', v: todayClients.filter(c => c.status !== 'aguardando').length },
                { l: 'Avaliações', v: todayClients.filter(c => c.status === 'avaliado').length },
              ].map(s => (
                <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.stone2 }}>{s.l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{s.v}</span>
                </div>
              ))}
            </div>

            {/* Links rápidos */}
            <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🔗 Links rápidos</div>
              {[
                { l: '✂️ Tela do atendente', href: '/atendente' },
                { l: '🏢 Gestão de clientes', href: '/gestao' },
                { l: '🏠 Landing page', href: '/' },
              ].map(l => (
                <a key={l.l} href={l.href} style={{
                  display: 'block', padding: '9px 12px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: C.ink, textDecoration: 'none',
                  marginBottom: 6, background: C.cream,
                  transition: 'background 0.15s',
                }}
                  onMouseOver={e => e.currentTarget.style.background = C.cream2}
                  onMouseOut={e => e.currentTarget.style.background = C.cream}
                >{l.l}</a>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* QR CODE MODAL */}
      {showQR && business && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(12,10,8,0.2)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, marginBottom: 6 }}>QR Code & Links</h3>
            <p style={{ fontSize: 13, color: C.stone2, marginBottom: 24 }}>Compartilhe ou imprima para o balcão</p>

            {/* Google Review QR */}
            <div style={{ background: C.cream, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>⭐ QR Code — Avaliação Google</div>
              <div style={{ fontSize: 12, color: C.stone2, marginBottom: 16 }}>Cliente escaneia e já abre direto na página de avaliação</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(business.google_link)}&bgcolor=FAF7F2&color=0C0A08&qzone=1`}
                  alt="QR Google"
                  style={{ borderRadius: 10, border: `1.5px solid ${C.border}` }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={business.google_link} target="_blank" style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, color: C.ink, fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                  🔗 Abrir link
                </a>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(business.google_link)}&bgcolor=FAF7F2&color=0C0A08&qzone=2`} target="_blank" download style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: C.amber, color: C.ink, fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                  ⬇️ Baixar QR
                </a>
              </div>
            </div>

            {/* WhatsApp wa.me */}
            <div style={{ background: C.cream, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>💬 QR Code — WhatsApp</div>
              <div style={{ fontSize: 12, color: C.stone2, marginBottom: 12 }}>Cliente escaneia e abre conversa no WhatsApp</div>
              {business.whatsapp_number ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`https://wa.me/55${business.whatsapp_number.replace(/\D/g,'')}?text=${encodeURIComponent('Olá! Gostaria de avaliar minha experiência 😊')}`)}&bgcolor=FAF7F2&color=0C0A08&qzone=1`}
                      alt="QR WhatsApp"
                      style={{ borderRadius: 10, border: `1.5px solid ${C.border}` }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a href={`https://wa.me/55${business.whatsapp_number.replace(/\D/g,'')}?text=${encodeURIComponent('Olá! Gostaria de avaliar minha experiência 😊')}`} target="_blank"
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, color: C.ink, fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                      🔗 Testar link
                    </a>
                    <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`https://wa.me/55${business.whatsapp_number.replace(/\D/g,'')}?text=${encodeURIComponent('Olá! Gostaria de avaliar minha experiência 😊')}`)}&bgcolor=FAF7F2&color=0C0A08&qzone=2`} target="_blank"
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#25D366', color: C.white, fontSize: 12, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                      ⬇️ Baixar QR
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ padding: '12px', borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amberBorder}`, fontSize: 12, color: C.stone2, textAlign: 'center' }}>
                  ⚠️ Adicione o número do WhatsApp nas configurações para gerar este QR Code
                </div>
              )}
            </div>

            <button onClick={() => setShowQR(false)} style={{ width: '100%', padding: '12px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.cream, color: C.stone2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}
      {/* CONFIG MODAL */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(12,10,8,0.2)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Configurações</h3>
            <p style={{ fontSize: 13, color: C.stone2, marginBottom: 24 }}>Dados usados nas mensagens automáticas</p>
            {[
              { label: 'Nome da empresa', key: 'name', placeholder: 'Ex: Barbearia do João' },
              { label: 'Segmento', key: 'segment', placeholder: 'Ex: Barbearia' },
              { label: '🔗 URL Avaliação Google', key: 'google_link', placeholder: 'https://g.page/r/...' },
              { label: 'Código do cupom', key: 'coupon_code', placeholder: 'VOLTA10' },
              { label: 'Desconto', key: 'coupon_discount', placeholder: '10%' },
              { label: 'Validade', key: 'coupon_expiry', placeholder: '30 dias' },
              { label: '📱 WhatsApp (com DDD)', key: 'whatsapp_number', placeholder: '11999990000' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input placeholder={f.placeholder} value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 9,
                    border: `1.5px solid ${f.key === 'google_link' ? C.amberBorder : C.border}`,
                    background: f.key === 'google_link' ? C.amberDim : C.cream,
                    color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = C.amber}
                  onBlur={e => e.target.style.borderColor = f.key === 'google_link' ? C.amberBorder : C.border}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.cream, color: C.stone2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveBusiness} style={{ flex: 2, padding: '11px', borderRadius: 9, border: 'none', background: C.amber, color: C.ink, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(232,160,32,0.3)' }}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: C.cream, padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', zIndex: 200, boxShadow: '0 8px 24px rgba(12,10,8,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
