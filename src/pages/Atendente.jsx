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

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Figtree:wght@300;400;500;600;700;800&display=swap');`

const STATUS = {
  aguardando:  { label: 'Aguardando',  color: '#92400E', bg: '#FEF3C7', dot: '#D97706' },
  msg_enviada: { label: 'Msg Enviada', color: C.blue,    bg: C.blueDim, dot: C.blue    },
  avaliado:    { label: 'Avaliado ✓',  color: C.green,   bg: C.greenDim,dot: C.green   },
  low_rating:  { label: 'Atenção',     color: C.red,     bg: C.redDim,  dot: C.red     },
}

function Badge({ status }) {
  const s = STATUS[status] || STATUS.aguardando
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
      color: s.color, background: s.bg, border: `1px solid ${s.dot}22`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      {s.label}
    </span>
  )
}

export default function Atendente() {
  const [business, setBusiness] = useState(null)
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', item: '' })
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: biz } = await supabase.from('businesses').select('*').limit(1).single()
    setBusiness(biz)
    if (biz) {
      const { data } = await supabase.from('clients').select('*')
        .eq('business_id', biz.id).eq('visit_date', today)
        .order('created_at', { ascending: false })
      setClients(data || [])
    }
    setLoading(false)
  }

  async function addClient() {
    if (!form.name || !form.phone) return
    const now = new Date()
    const { data, error } = await supabase.from('clients').insert({
      business_id: business.id,
      name: form.name,
      phone: form.phone,
      item: form.item || business.items?.[0],
      status: 'aguardando',
      visit_date: today,
      visit_time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }).select().single()
    if (!error) {
      setClients(prev => [data, ...prev])
      setForm({ name: '', phone: '', item: '' })
      setShowForm(false)
      showToast(`${form.name.split(' ')[0]} cadastrado! ✓`)
    }
  }

  async function finalize(client) {
    setSending(client.id)
    const { error } = await supabase.from('clients').update({ status: 'msg_enviada' }).eq('id', client.id)
    if (!error) {
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: 'msg_enviada' } : c))
      showToast(`Mensagem enviada para ${client.name.split(' ')[0]}! 🚀`)
    }
    setSending(null)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const stats = [
    { label: 'Atendidos hoje', value: clients.length },
    { label: 'Msgs enviadas', value: clients.filter(c => c.status !== 'aguardando').length },
    { label: 'Avaliados', value: clients.filter(c => c.status === 'avaliado').length },
  ]

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
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 900 }}>
            Re<span style={{ color: C.amber }}>v</span>ora
          </div>
          <span style={{ fontSize: 11, background: C.amberDim, color: C.amber, padding: '3px 10px', borderRadius: 100, fontWeight: 700, border: `1px solid ${C.amberBorder}` }}>
            {business?.avatar} {business?.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.stone }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <a href="/admin" style={{ fontSize: 12, color: C.stone2, textDecoration: 'none', padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}` }}>
            Admin →
          </a>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* HEADER ROW */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>
              Atendimentos
            </h1>
            <p style={{ fontSize: 13, color: C.stone2 }}>
              {today === new Date().toISOString().split('T')[0]
                ? `Hoje · ${clients.length} cliente${clients.length !== 1 ? 's' : ''}`
                : today}
            </p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            padding: '11px 22px', borderRadius: 10, border: 'none',
            background: C.amber, color: C.ink,
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(232,160,32,0.3)',
            display: 'flex', alignItems: 'center', gap: 7,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(232,160,32,0.4)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(232,160,32,0.3)' }}
          >
            <span style={{ fontSize: 16 }}>+</span> Novo cliente
          </button>
        </div>

        {/* STATS ROW */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              flex: 1, background: C.white, border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 900, color: C.ink }}>{s.value}</div>
              <div style={{ fontSize: 12, color: C.stone2, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CLIENT LIST */}
        <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>

          {/* Col headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.5fr 80px 1fr 180px',
            padding: '10px 24px', borderBottom: `1px solid ${C.border}`,
            fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase', letterSpacing: 0.8,
          }}>
            <span>Cliente</span><span>Serviço / Produto</span><span>Hora</span><span>Status</span><span></span>
          </div>

          {clients.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>☀️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Nenhum cliente hoje ainda</div>
              <div style={{ fontSize: 13, color: C.stone2, marginBottom: 20 }}>Cadastre o primeiro atendimento do dia</div>
              <button onClick={() => setShowForm(true)} style={{
                padding: '10px 22px', borderRadius: 9, border: 'none',
                background: C.amber, color: C.ink, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>+ Cadastrar cliente</button>
            </div>
          ) : clients.map((client, i) => (
            <div key={client.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 80px 1fr 180px',
              padding: '14px 24px', alignItems: 'center',
              borderBottom: i < clients.length - 1 ? `1px solid ${C.border}` : 'none',
              transition: 'background 0.15s',
            }}
              onMouseOver={e => e.currentTarget.style.background = C.cream}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: C.amberDim, border: `1.5px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, color: C.amber,
                }}>{client.name?.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{client.name}</div>
                  <div style={{ fontSize: 11, color: C.stone }}>{client.phone}</div>
                </div>
              </div>

              {/* Item */}
              <div style={{ fontSize: 13, color: C.stone2 }}>{client.item}</div>

              {/* Time */}
              <div style={{ fontSize: 13, color: C.stone2 }}>{client.visit_time || '—'}</div>

              {/* Status */}
              <Badge status={client.status} />

              {/* Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {client.status === 'aguardando' && (
                  <button onClick={() => finalize(client)} disabled={sending === client.id} style={{
                    padding: '8px 18px', borderRadius: 8, border: 'none',
                    background: sending === client.id ? C.stone : C.ink,
                    color: C.cream, fontSize: 12, fontWeight: 700, cursor: sending === client.id ? 'wait' : 'pointer',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                    onMouseOver={e => { if (sending !== client.id) e.currentTarget.style.background = C.amber; e.currentTarget.style.color = C.ink }}
                    onMouseOut={e => { e.currentTarget.style.background = C.ink; e.currentTarget.style.color = C.cream }}
                  >
                    {sending === client.id ? 'Enviando...' : '✓ Finalizar'}
                  </button>
                )}
                {client.status === 'msg_enviada' && (
                  <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>📱 Aguardando</span>
                )}
                {client.status === 'avaliado' && (
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>🎉 Avaliou!</span>
                )}
                {client.status === 'low_rating' && (
                  <a href={`https://wa.me/55${client.phone?.replace(/\D/g, '')}`} target="_blank"
                    style={{ fontSize: 12, color: C.red, fontWeight: 700, textDecoration: 'none' }}>
                    ⚠️ Contatar
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD CLIENT MODAL */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,10,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: C.white, borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(12,10,8,0.2)' }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Novo cliente</h3>
            <p style={{ fontSize: 13, color: C.stone2, marginBottom: 24 }}>Cadastro rápido — menos de 10 segundos</p>

            {[
              { label: 'Nome completo', key: 'name', placeholder: 'Ex: Maria Santos', type: 'text' },
              { label: 'WhatsApp / Telefone', key: 'phone', placeholder: '11 99999-0000', type: 'tel' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.cream, color: C.ink, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = C.amber}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
            ))}

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>
                {business?.item_label || 'Serviço / Produto'}
              </label>
              <select value={form.item} onChange={e => setForm({ ...form, item: e.target.value })}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.cream, color: C.ink, fontSize: 14, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="">Selecione...</option>
                {(business?.items || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 9, border: `1.5px solid ${C.border}`, background: C.cream, color: C.stone2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={addClient} style={{ flex: 2, padding: '12px', borderRadius: 9, border: 'none', background: C.amber, color: C.ink, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(232,160,32,0.3)' }}>
                ✓ Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: C.ink, color: C.cream, padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', zIndex: 200, boxShadow: '0 8px 24px rgba(12,10,8,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
