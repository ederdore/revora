import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase.js'

const C = {
  black:      '#0A0A0A',
  black2:     '#111111',
  black3:     '#1A1A1A',
  blue:       '#1B4FD8',
  blueLight:  '#3B6FFF',
  blueDim:    'rgba(27,79,216,0.12)',
  blueBorder: 'rgba(27,79,216,0.3)',
  yellow:     '#F5C518',
  yellowDark: '#D4A800',
  yellowDim:  'rgba(245,197,24,0.12)',
  white:      '#FFFFFF',
  muted:      '#888888',
  border:     'rgba(255,255,255,0.08)',
  borderHi:   'rgba(255,255,255,0.15)',
  red:        '#EF4444',
  green:      '#22C55E',
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`

const SEGMENTS = [
  { slug: 'barbearia',      emoji: '✂️', label: 'Barbearia',       items: ['Corte', 'Barba', 'Corte + Barba', 'Acabamento'],         recorrencia: 15 },
  { slug: 'petshop',        emoji: '🐾', label: 'Pet Shop',        items: ['Banho', 'Tosa', 'Banho + Tosa', 'Consulta'],              recorrencia: 21 },
  { slug: 'clinica',        emoji: '🏥', label: 'Clínica',         items: ['Consulta', 'Retorno', 'Exame', 'Procedimento'],           recorrencia: 90 },
  { slug: 'lojas',          emoji: '🛍️', label: 'Loja',            items: ['Compra', 'Troca', 'Encomenda', 'Orçamento'],              recorrencia: 30 },
  { slug: 'concessionarias',emoji: '🚗', label: 'Concessionária',  items: ['Test Drive', 'Compra', 'Revisão', 'Manutenção'],          recorrencia: 180 },
  { slug: 'outro',          emoji: '🏢', label: 'Outro',           items: ['Serviço', 'Produto', 'Consulta', 'Atendimento'],          recorrencia: 30 },
]

const STEPS = ['Conta', 'Empresa', 'Atendentes']

export default function Cadastro() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSegment = searchParams.get('segmento') || ''

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 0 — Conta
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Step 1 — Empresa
  const [bizName, setBizName] = useState('')
  const [segment, setSegment] = useState(preSegment)
  const [phone, setPhone] = useState('')
  const [googleLink, setGoogleLink] = useState('')
  const [coupon, setCoupon] = useState('VOLTA10')
  const [discount, setDiscount] = useState('10%')

  // Step 2 — Atendentes
  const [attendants, setAttendants] = useState([{ name: '', email: '' }])
  const [createdBusiness, setCreatedBusiness] = useState(null)
  const [done, setDone] = useState(false)

  const selectedSegment = SEGMENTS.find(s => s.slug === segment)

  async function handleStep0() {
    setError('')
    if (!name || !email || !password) { setError('Preencha todos os campos'); return }
    if (password.length < 6) { setError('Senha mínimo 6 caracteres'); return }
    setStep(1)
  }

  async function handleStep1() {
    setError('')
    if (!bizName || !segment) { setError('Preencha nome e segmento'); return }
    setStep(2)
  }

  async function handleStep2() {
    setError('')
    setLoading(true)

    try {
      // 1. Criar conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })
      if (authError) throw new Error(authError.message)

      // 2. Criar empresa
      const { data: biz, error: bizError } = await supabase.from('businesses').insert({
        name: bizName,
        segment: selectedSegment?.label || segment,
        avatar: selectedSegment?.emoji || '🏢',
        whatsapp_number: phone.replace(/\D/g, ''),
        google_link: googleLink,
        coupon_code: coupon,
        coupon_discount: discount,
        coupon_expiry: '30 dias',
        plan: 'trial',
        status: 'trial',
        country: '🇧🇷',
        language: 'pt-BR',
      }).select().single()
      if (bizError) throw new Error(bizError.message)

      setCreatedBusiness(biz)

      // 3. Criar usuário dono
      await supabase.from('users').insert({
        business_id: biz.id,
        name,
        email,
        role: 'owner',
        auth_id: authData.user?.id,
        active: true,
      })

      // 4. Criar serviços com recorrência
      if (selectedSegment) {
        await supabase.from('services').insert(
          selectedSegment.items.map(item => ({
            business_id: biz.id,
            name: item,
            recorrencia_esperada: selectedSegment.recorrencia,
            active: true,
          }))
        )
      }

      // 5. Criar atendentes (apenas os preenchidos)
      const validAttendants = attendants.filter(a => a.name && a.email)
      if (validAttendants.length > 0) {
        await supabase.from('users').insert(
          validAttendants.map(a => ({
            business_id: biz.id,
            name: a.name,
            email: a.email,
            role: 'attendant',
            active: true,
          }))
        )
      }

      setDone(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1.5px solid ${C.border}`, background: C.black2,
    color: C.white, fontSize: 14, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    display: 'block', marginBottom: 6,
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: C.black, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", padding: 24 }}>
      <style>{FONTS}</style>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${C.yellow}15`, border: `2px solid ${C.yellow}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 24px' }}>🎉</div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 12, color: C.white }}>Tudo pronto!</h2>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 32 }}>
          Sua conta foi criada. Confirme seu email e acesse o painel para começar.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a href="/admin" style={{ display: 'block', padding: '14px', borderRadius: 10, background: C.yellow, color: C.black, fontWeight: 800, fontSize: 15, textDecoration: 'none', textAlign: 'center' }}>
            Acessar painel →
          </a>
          <a href="/atendente" style={{ display: 'block', padding: '14px', borderRadius: 10, border: `1.5px solid ${C.border}`, color: C.muted, fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
            Tela do atendente
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.black, fontFamily: "'DM Sans',sans-serif", color: C.white, display: 'flex' }}>
      <style>{FONTS}</style>
      <style>{`
        input:focus { border-color: ${C.yellow} !important; }
        select:focus { border-color: ${C.yellow} !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .seg-card:hover { border-color: rgba(245,197,24,0.4) !important; }
      `}</style>

      {/* LEFT PANEL */}
      <div style={{ width: 360, background: C.black2, borderRight: `1px solid ${C.border}`, padding: '40px 36px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 48 }}>
          Re<span style={{ color: C.yellow }}>v</span>ora
        </div>

        {/* Steps */}
        <div style={{ flex: 1 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 32 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${i < step ? C.yellow : i === step ? C.yellow : C.border}`, background: i < step ? C.yellow : i === step ? `${C.yellow}15` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: i < step ? C.black : i === step ? C.yellow : C.muted }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 14, fontWeight: i === step ? 700 : 500, color: i === step ? C.white : i < step ? C.yellow : C.muted }}>{s}</div>
                <div style={{ fontSize: 11, color: i === step ? C.muted : '#333', marginTop: 2 }}>
                  {i === 0 ? 'Seus dados de acesso' : i === 1 ? 'Dados do negócio' : 'Equipe de atendimento'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom info */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24 }}>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            🔒 Seus dados são protegidos<br />
            📅 14 dias grátis sem cartão<br />
            🇧🇷 🇵🇹 🇮🇹 Brasil · Portugal · Itália
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 5vw' }}>
        <div style={{ width: '100%', maxWidth: 480, animation: 'fadeUp 0.4s ease' }}>

          {/* STEP 0 — Conta */}
          {step === 0 && (
            <>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>Crie sua conta</h1>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>14 dias grátis · Sem cartão de crédito</p>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Seu nome</label>
                <input placeholder="Ex: João Silva" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="joao@seunegocie.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 28, position: 'relative' }}>
                <label style={labelStyle}>Senha</label>
                <input type={showPass ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 44 }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>

              {error && <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>}

              <button onClick={handleStep0} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: C.yellow, color: C.black, fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'opacity 0.2s' }}>
                Continuar →
              </button>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.muted }}>
                Já tem conta? <a href="/login" style={{ color: C.yellow, fontWeight: 700 }}>Entrar</a>
              </p>
            </>
          )}

          {/* STEP 1 — Empresa */}
          {step === 1 && (
            <>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>Seu negócio</h1>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Vamos configurar o Revora para o seu segmento</p>

              {/* Segment selector */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Segmento</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {SEGMENTS.map(sg => (
                    <button key={sg.slug} className="seg-card" onClick={() => setSegment(sg.slug)} style={{ padding: '12px 8px', borderRadius: 10, border: `1.5px solid ${segment === sg.slug ? C.yellow : C.border}`, background: segment === sg.slug ? `${C.yellow}12` : C.black2, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{sg.emoji}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: segment === sg.slug ? C.yellow : C.muted }}>{sg.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nome do negócio</label>
                <input placeholder="Ex: Barbearia do João" value={bizName} onChange={e => setBizName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>WhatsApp (com DDD)</label>
                <input placeholder="11 99999-0000" value={phone} onChange={e => setPhone(e.target.value)} type="tel" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>🔗 URL de avaliação Google <span style={{ color: C.muted, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <input placeholder="https://g.page/r/..." value={googleLink} onChange={e => setGoogleLink(e.target.value)} style={{ ...inputStyle, background: googleLink ? `${C.yellow}08` : C.black2, borderColor: googleLink ? `${C.yellow}40` : C.border }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Cupom</label>
                  <input placeholder="VOLTA10" value={coupon} onChange={e => setCoupon(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Desconto</label>
                  <input placeholder="10%" value={discount} onChange={e => setDiscount(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {error && <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(0)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Voltar</button>
                <button onClick={handleStep1} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: C.yellow, color: C.black, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Continuar →</button>
              </div>
            </>
          )}

          {/* STEP 2 — Atendentes */}
          {step === 2 && (
            <>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 8 }}>Sua equipe</h1>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>Cadastre os atendentes agora ou depois no painel</p>

              {attendants.map((att, i) => (
                <div key={i} style={{ background: C.black2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>ATENDENTE {i + 1}</span>
                    {i > 0 && (
                      <button onClick={() => setAttendants(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>✕</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input placeholder="Nome" value={att.name} onChange={e => setAttendants(prev => prev.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a))} style={{ ...inputStyle, flex: 1 }} />
                    <input placeholder="Email" type="email" value={att.email} onChange={e => setAttendants(prev => prev.map((a, idx) => idx === i ? { ...a, email: e.target.value } : a))} style={{ ...inputStyle, flex: 1.5 }} />
                  </div>
                </div>
              ))}

              <button onClick={() => setAttendants(prev => [...prev, { name: '', email: '' }])} style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1.5px dashed ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 28 }}>
                + Adicionar atendente
              </button>

              {error && <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}33`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: C.red, marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '13px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Voltar</button>
                <button onClick={handleStep2} disabled={loading} style={{ flex: 2, padding: '13px', borderRadius: 10, border: 'none', background: loading ? C.muted : C.yellow, color: C.black, fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>
                  {loading ? 'Criando conta...' : '🚀 Criar conta'}
                </button>
              </div>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#444' }}>
                Pode pular — adicione atendentes depois no painel
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
