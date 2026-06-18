import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const C = {
  cream: '#FAF7F2', cream2: '#F2EDE4', cream3: '#EDE8DF',
  ink: '#0C0A08', ink2: '#2A2520',
  amber: '#E8A020', amberDim: 'rgba(232,160,32,0.10)', amberBorder: 'rgba(232,160,32,0.25)',
  stone: '#9B9488', stone2: '#6B6358',
  border: 'rgba(155,148,136,0.18)', borderHi: 'rgba(155,148,136,0.32)',
  white: '#FFFFFF',
  green: '#2A9D5C', greenDim: 'rgba(42,157,92,0.10)',
  red: '#C0392B', redDim: 'rgba(192,57,43,0.10)',
  blue: '#2563EB', blueDim: 'rgba(37,99,235,0.10)',
  purple: '#7C3AED', purpleDim: 'rgba(124,58,237,0.10)',
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Figtree:wght@300;400;500;600;700;800&display=swap');`

const PLAN_MAP = {
  starter: { label: 'Starter', color: C.blue,   bg: C.blueDim   },
  pro:     { label: 'Pro',     color: C.purple,  bg: C.purpleDim },
  trial:   { label: 'Trial',   color: '#92400E', bg: '#FEF3C7'   },
}
const STATUS_MAP = {
  active:  { label: 'Ativo',     color: C.green,  bg: C.greenDim },
  trial:   { label: 'Trial',     color: '#92400E', bg: '#FEF3C7'  },
  blocked: { label: 'Bloqueado', color: C.red,    bg: C.redDim   },
}

function Badge({ value, map }) {
  const s = map[value] || Object.values(map)[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:600, color:s.color, background:s.bg, whiteSpace:'nowrap', border:`1px solid ${s.color}22` }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />{s.label}
    </span>
  )
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value/max)*100, 100) : 0
  return (
    <div style={{ width:'100%', height:3, background:C.cream3, borderRadius:4, overflow:'hidden', marginTop:4 }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4 }} />
    </div>
  )
}

function KpiCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16, padding:'20px 24px', transition:'box-shadow 0.2s, border-color 0.2s' }}
      onMouseOver={e => { e.currentTarget.style.borderColor=C.amberBorder; e.currentTarget.style.boxShadow='0 6px 20px rgba(232,160,32,0.08)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow='none' }}>
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:900, color:color||C.ink, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:C.stone2, marginTop:4, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.stone, marginTop:3 }}>{sub}</div>}
    </div>
  )
}

function TenantDrawer({ tenant, onClose, onUpdate }) {
  const [t, setT] = useState({...tenant})
  const [tab, setTab] = useState('overview')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('businesses').update({ name:t.name, segment:t.segment, plan:t.plan, status:t.status }).eq('id', t.id)
    if (!error) { onUpdate(t); onClose() }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex' }}>
      <div onClick={onClose} style={{ flex:1, background:'rgba(12,10,8,0.45)', backdropFilter:'blur(4px)' }} />
      <div style={{ width:440, background:C.white, borderLeft:`1.5px solid ${C.border}`, display:'flex', flexDirection:'column', overflowY:'auto', animation:'slideIn 0.25s ease' }}>
        <div style={{ padding:'24px 28px 20px', borderBottom:`1.5px solid ${C.border}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:C.amberDim, border:`1.5px solid ${C.amberBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{t.avatar||'🏢'}</div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900 }}>{t.name}</div>
              <div style={{ fontSize:12, color:C.stone2, marginTop:2 }}>{t.segment}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.stone, fontSize:18, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:'16px 28px', display:'flex', gap:12, borderBottom:`1px solid ${C.border}` }}>
          {[
            { label:'Status', key:'status', options:[{v:'active',l:'✅ Ativo'},{v:'trial',l:'⏳ Trial'},{v:'blocked',l:'🚫 Bloqueado'}] },
            { label:'Plano',  key:'plan',   options:[{v:'trial',l:'🆓 Trial'},{v:'starter',l:'🔵 Starter'},{v:'pro',l:'🟣 Pro'}] },
          ].map(f => (
            <div key={f.key} style={{ flex:1 }}>
              <label style={{ fontSize:10, fontWeight:700, color:C.stone, textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:5 }}>{f.label}</label>
              <select value={t[f.key]||''} onChange={e => setT({...t,[f.key]:e.target.value})}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:`1.5px solid ${C.border}`, background:C.cream, color:C.ink, fontSize:12, fontWeight:700, cursor:'pointer', outline:'none', fontFamily:'inherit' }}>
                {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 28px' }}>
          {[{k:'overview',l:'Visão Geral'},{k:'activity',l:'Atividade'}].map(tb => (
            <button key={tb.k} onClick={() => setTab(tb.k)} style={{ padding:'12px 14px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:tab===tb.k?C.ink:C.stone, borderBottom:tab===tb.k?`2px solid ${C.amber}`:'2px solid transparent', marginBottom:-1 }}>{tb.l}</button>
          ))}
        </div>

        <div style={{ padding:'20px 28px', flex:1 }}>
          {tab === 'overview' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                {[
                  {icon:'👥',label:'Clientes',  value:tenant._clientCount||0, color:C.ink},
                  {icon:'⭐',label:'Avaliações', value:tenant._reviewCount||0, color:C.amber},
                  {icon:'⚠️',label:'Alertas',    value:tenant._lowCount||0,   color:C.red},
                  {icon:'📈',label:'Conversão',  value:tenant._conversion||'—',color:C.green},
                ].map(s => (
                  <div key={s.label} style={{ background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:10, color:C.stone, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:C.cream, border:`1.5px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                {[
                  {l:'Email',     v:t.email||'—'},
                  {l:'WhatsApp',  v:t.whatsapp_number||'—'},
                  {l:'Google',    v:t.google_link?'✓ Configurado':'✗ Não configurado'},
                  {l:'Cupom',     v:t.coupon_code||'—'},
                  {l:'Cadastro',  v:t.created_at?new Date(t.created_at).toLocaleDateString('pt-BR'):'—'},
                ].map((i,idx,arr) => (
                  <div key={i.l} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom:idx<arr.length-1?`1px solid ${C.border}`:'none' }}>
                    <span style={{ fontSize:12, color:C.stone }}>{i.l}</span>
                    <span style={{ fontSize:12, color:C.ink, fontWeight:600 }}>{i.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'activity' && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.stone2, marginBottom:14 }}>Últimos clientes</div>
              {tenant._recentClients?.length > 0 ? tenant._recentClients.map((c,i) => (
                <div key={c.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:c.status==='avaliado'?C.green:c.status==='low_rating'?C.red:C.stone, marginTop:5, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700 }}>{c.name}</div>
                    <div style={{ fontSize:11, color:C.stone2 }}>{c.item} {c.stars?`· ${'⭐'.repeat(c.stars)}`:''}</div>
                    <div style={{ fontSize:10, color:C.stone, marginTop:2 }}>{c.visit_date} {c.visit_time}</div>
                  </div>
                </div>
              )) : <div style={{ fontSize:13, color:C.stone, textAlign:'center', padding:'24px 0' }}>Nenhuma atividade ainda</div>}
            </div>
          )}
        </div>

        <div style={{ padding:'16px 28px', borderTop:`1.5px solid ${C.border}`, display:'flex', gap:10 }}>
          {t.status !== 'blocked'
            ? <button onClick={() => setT({...t,status:'blocked'})} style={{ flex:1, padding:'10px', borderRadius:9, border:`1px solid ${C.red}33`, background:C.redDim, color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>🚫 Bloquear</button>
            : <button onClick={() => setT({...t,status:'active'})}  style={{ flex:1, padding:'10px', borderRadius:9, border:`1px solid ${C.green}33`, background:C.greenDim, color:C.green, fontSize:12, fontWeight:700, cursor:'pointer' }}>✅ Reativar</button>
          }
          <button onClick={save} disabled={saving} style={{ flex:2, padding:'10px', borderRadius:9, border:'none', background:C.amber, color:C.ink, fontSize:13, fontWeight:800, cursor:'pointer' }}>
            {saving?'Salvando...':'✓ Salvar'}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

export default function BackOffice() {
  const [businesses, setBusinesses] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [section, setSection] = useState('clients')
  const [toast, setToast] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: bizList } = await supabase.from('businesses').select('*').order('created_at', { ascending: false })
    if (!bizList) { setLoading(false); return }
    const enriched = await Promise.all(bizList.map(async biz => {
      const { data: clients } = await supabase.from('clients').select('id,status,stars,name,item,visit_date,visit_time').eq('business_id', biz.id)
      const c = clients || []
      const reviewed = c.filter(x => x.status === 'avaliado').length
      return { ...biz, _clientCount:c.length, _reviewCount:reviewed, _lowCount:c.filter(x=>x.status==='low_rating').length, _conversion:c.length>0?`${Math.round((reviewed/c.length)*100)}%`:'—', _recentClients:c.slice(0,10), _mrr:biz.plan==='pro'?197:biz.plan==='starter'?97:0 }
    }))
    setBusinesses(enriched)
    setLoading(false)
  }

  const updateBusiness = (updated) => {
    setBusinesses(prev => prev.map(b => b.id===updated.id?{...b,...updated}:b))
    showToast('Alterações salvas! ✓')
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = businesses.filter(b => {
    const q = search.toLowerCase()
    return (!q||b.name?.toLowerCase().includes(q)||b.segment?.toLowerCase().includes(q)||b.email?.toLowerCase().includes(q)) && (filterStatus==='all'||b.status===filterStatus) && (filterPlan==='all'||b.plan===filterPlan)
  })

  const active = businesses.filter(b => b.status==='active')
  const totalMRR = active.reduce((s,b) => s+(b._mrr||0), 0)
  const totalReviews = businesses.reduce((s,b) => s+(b._reviewCount||0), 0)
  const totalClients = businesses.reduce((s,b) => s+(b._clientCount||0), 0)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.cream, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Figtree,sans-serif', color:C.stone }}>
      <style>{FONTS}</style>Carregando...
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.cream, fontFamily:"'Figtree',sans-serif", color:C.ink }}>
      <style>{FONTS}</style>

      {/* NAV */}
      <div style={{ background:C.white, borderBottom:`1.5px solid ${C.border}`, padding:'0 40px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900 }}>
            Re<span style={{ color:C.amber }}>v</span>ora
            <span style={{ fontFamily:'Figtree,sans-serif', fontSize:11, fontWeight:700, color:C.stone, marginLeft:8, background:C.cream2, padding:'2px 8px', borderRadius:100 }}>Gestão</span>
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {[{k:'clients',l:'🏢 Clientes'},{k:'metrics',l:'📊 Métricas'},{k:'billing',l:'💰 Receita'}].map(n => (
              <button key={n.k} onClick={() => setSection(n.k)} style={{ padding:'6px 14px', borderRadius:8, border:section===n.k?`1px solid ${C.amberBorder}`:'1px solid transparent', cursor:'pointer', fontSize:12, fontWeight:700, background:section===n.k?C.amberDim:'transparent', color:section===n.k?C.ink:C.stone2 }}>{n.l}</button>
            ))}
          </div>
        </div>
        <a href="/admin" style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, color:C.stone2, fontSize:12, fontWeight:700, textDecoration:'none' }}>← Admin</a>
      </div>

      <div style={{ padding:'32px 40px', maxWidth:1200, margin:'0 auto' }}>

        {/* CLIENTS */}
        {section === 'clients' && <>
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>Clientes</h1>
            <p style={{ fontSize:13, color:C.stone2 }}>{businesses.length} empresas cadastradas</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
            <KpiCard icon="🏢" label="Total empresas"   value={businesses.length} />
            <KpiCard icon="✅" label="Ativas"           value={active.length} color={C.green} sub={`${businesses.filter(b=>b.status==='trial').length} em trial`} />
            <KpiCard icon="👥" label="Clientes gerados" value={totalClients} color={C.amber} />
            <KpiCard icon="⭐" label="Avaliações totais" value={totalReviews} color={C.purple} />
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:220, position:'relative' }}>
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.stone, fontSize:13 }}>🔍</span>
              <input placeholder="Buscar empresa, segmento, email..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.white, color:C.ink, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                onFocus={e => e.target.style.borderColor=C.amber} onBlur={e => e.target.style.borderColor=C.border} />
            </div>
            {[
              {val:filterStatus, set:setFilterStatus, opts:[{v:'all',l:'Todos status'},{v:'active',l:'✅ Ativo'},{v:'trial',l:'⏳ Trial'},{v:'blocked',l:'🚫 Bloqueado'}]},
              {val:filterPlan,   set:setFilterPlan,   opts:[{v:'all',l:'Todos planos'},{v:'starter',l:'🔵 Starter'},{v:'pro',l:'🟣 Pro'},{v:'trial',l:'🆓 Trial'}]},
            ].map((f,i) => (
              <select key={i} value={f.val} onChange={e => f.set(e.target.value)}
                style={{ padding:'9px 12px', borderRadius:9, border:`1.5px solid ${C.border}`, background:C.white, color:C.ink, fontSize:12, fontWeight:600, cursor:'pointer', outline:'none', fontFamily:'inherit' }}>
                {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}
          </div>
          <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2.5fr 1.2fr 1fr 1fr 1fr 90px', padding:'10px 24px', borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, color:C.stone, textTransform:'uppercase', letterSpacing:0.8 }}>
              <span>Empresa</span><span>Segmento</span><span>Plano</span><span>Status</span><span>Clientes / Reviews</span><span></span>
            </div>
            {filtered.length === 0
              ? <div style={{ padding:'48px', textAlign:'center', color:C.stone, fontSize:13 }}>Nenhuma empresa encontrada</div>
              : filtered.map((b,i) => (
                <div key={b.id} style={{ display:'grid', gridTemplateColumns:'2.5fr 1.2fr 1fr 1fr 1fr 90px', padding:'14px 24px', borderBottom:i<filtered.length-1?`1px solid ${C.border}`:'none', alignItems:'center', transition:'background 0.15s', cursor:'pointer' }}
                  onMouseOver={e => e.currentTarget.style.background=C.cream}
                  onMouseOut={e => e.currentTarget.style.background='transparent'}
                  onClick={() => setSelected(b)}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:9, background:C.amberDim, border:`1.5px solid ${C.amberBorder}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{b.avatar||'🏢'}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>{b.name}</div>
                      <div style={{ fontSize:11, color:C.stone }}>{b.email||'—'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:C.stone2 }}>{b.segment||'—'}</div>
                  <Badge value={b.plan||'trial'} map={PLAN_MAP} />
                  <Badge value={b.status||'trial'} map={STATUS_MAP} />
                  <div>
                    <div style={{ fontSize:12 }}><strong>{b._clientCount}</strong> · <span style={{ color:C.amber }}>⭐{b._reviewCount}</span></div>
                    <MiniBar value={b._reviewCount} max={b._clientCount} color={C.amber} />
                    <div style={{ fontSize:10, color:C.stone, marginTop:2 }}>{b._conversion}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSelected(b) }}
                    style={{ padding:'7px 14px', borderRadius:7, border:`1px solid ${C.border}`, background:'transparent', color:C.stone2, fontSize:11, fontWeight:700, cursor:'pointer' }}
                    onMouseOver={e => { e.target.style.borderColor=C.amber; e.target.style.color=C.amber }}
                    onMouseOut={e => { e.target.style.borderColor=C.border; e.target.style.color=C.stone2 }}>
                    Ver →
                  </button>
                </div>
              ))
            }
          </div>
          <div style={{ fontSize:11, color:C.stone, marginTop:10, textAlign:'right' }}>{filtered.length} de {businesses.length} empresas</div>
        </>}

        {/* METRICS */}
        {section === 'metrics' && <>
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>Métricas</h1>
            <p style={{ fontSize:13, color:C.stone2 }}>Performance geral da plataforma</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:24 }}>
            {[{flag:'🇧🇷',name:'Brasil',currency:'R$'},{flag:'🇵🇹',name:'Portugal',currency:'€'},{flag:'🇮🇹',name:'Itália',currency:'€'}].map(m => {
              const count = businesses.filter(b => b.country===m.flag).length
              const mrr = businesses.filter(b => b.country===m.flag && b.status==='active').reduce((s,b)=>s+(b._mrr||0),0)
              return (
                <div key={m.name} style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16, padding:24 }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>{m.flag}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, color:C.amber }}>{count}</div>
                  <div style={{ fontSize:13, color:C.stone2 }}>{m.name}</div>
                  <div style={{ fontSize:12, color:C.stone, marginTop:4 }}>{m.currency}{mrr}/mês</div>
                </div>
              )
            })}
          </div>
          <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16, padding:24 }}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:18 }}>🏆 Top por Avaliações</div>
            {[...businesses].sort((a,b)=>b._reviewCount-a._reviewCount).slice(0,8).map((b,i) => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:i<7?`1px solid ${C.border}`:'none' }}>
                <div style={{ width:24, fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:900, color:i<3?C.amber:C.stone, textAlign:'center' }}>{i+1}</div>
                <div style={{ fontSize:20 }}>{b.avatar||'🏢'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{b.name}</div>
                  <MiniBar value={b._reviewCount} max={businesses[0]?._reviewCount||1} color={C.amber} />
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:C.amber }}>⭐{b._reviewCount}</div>
                <div style={{ fontSize:11, color:C.stone }}>{b._conversion}</div>
              </div>
            ))}
          </div>
        </>}

        {/* BILLING */}
        {section === 'billing' && <>
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:30, fontWeight:900, letterSpacing:-0.5, marginBottom:4 }}>Receita</h1>
            <p style={{ fontSize:13, color:C.stone2 }}>Faturamento recorrente</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
            <KpiCard icon="💰" label="MRR Atual"    value={`R$${totalMRR}`}       color={C.green}  sub={`${active.length} ativos`} />
            <KpiCard icon="📅" label="ARR Estimado" value={`R$${totalMRR*12}`}    color={C.purple} />
            <KpiCard icon="🎯" label="Ticket Médio" value={active.length?`R$${Math.round(totalMRR/active.length)}`:'—'} color={C.amber} />
          </div>
          <div style={{ background:C.white, border:`1.5px solid ${C.border}`, borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 24px', borderBottom:`1px solid ${C.border}`, fontSize:14, fontWeight:700 }}>Clientes com receita ativa</div>
            {businesses.filter(b=>b.status==='active'&&b._mrr>0).map((b,i,arr) => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 24px', borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none', transition:'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background=C.cream}
                onMouseOut={e => e.currentTarget.style.background='transparent'}>
                <div style={{ fontSize:20 }}>{b.avatar||'🏢'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>{b.name}</div>
                  <div style={{ fontSize:11, color:C.stone }}>{b.segment} · {b.email||'—'}</div>
                </div>
                <Badge value={b.plan} map={PLAN_MAP} />
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:C.green }}>R${b._mrr}/mês</div>
                  <div style={{ fontSize:10, color:C.stone }}>{b.created_at?new Date(b.created_at).toLocaleDateString('pt-BR'):''}</div>
                </div>
              </div>
            ))}
            {businesses.filter(b=>b.status==='active'&&b._mrr>0).length===0 && (
              <div style={{ padding:'40px', textAlign:'center', color:C.stone, fontSize:13 }}>Nenhuma empresa com plano pago ainda</div>
            )}
          </div>
        </>}
      </div>

      {selected && <TenantDrawer tenant={selected} onClose={() => setSelected(null)} onUpdate={updateBusiness} />}

      {toast && (
        <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', background:C.ink, color:C.cream, padding:'12px 22px', borderRadius:12, fontWeight:700, fontSize:13, whiteSpace:'nowrap', zIndex:300, boxShadow:'0 8px 24px rgba(12,10,8,0.2)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
