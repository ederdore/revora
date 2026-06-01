import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const C = {
  bg:"#0A0A0F", card:"#13131A", border:"#1E1E2E",
  accent:"#00E5A0", accentDim:"rgba(0,229,160,0.1)", accentBorder:"rgba(0,229,160,0.25)",
  purple:"#7C3AED", text:"#F0F0F5", muted:"#6B6B80",
  yellow:"#F59E0B", blue:"#3B82F6", red:"#EF4444"
}

export default function Admin() {
  const [business, setBusiness] = useState(null)
  const [clients, setClients] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

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
      name: form.name,
      segment: form.segment,
      google_link: form.google_link,
      coupon_code: form.coupon_code,
      coupon_discount: form.coupon_discount,
      coupon_expiry: form.coupon_expiry,
    }).eq('id', business.id)
    if (!error) {
      setBusiness(form)
      setEditing(false)
      showToast('Configurações salvas! ✓')
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const today = new Date().toISOString().split('T')[0]
  const todayClients = clients.filter(c => c.visit_date === today)
  const evaluated = clients.filter(c => c.status === 'avaliado').length
  const lowRating = clients.filter(c => c.status === 'low_rating')
  const conv = clients.length ? Math.round((evaluated / clients.length) * 100) : 0

  const STATUS_LABEL = {
    aguardando: { label:"Aguardando", color:C.yellow },
    msg_enviada: { label:"Msg Enviada", color:C.blue },
    avaliado: { label:"Avaliado ✓", color:C.accent },
    low_rating: { label:"⚠️ Nota Baixa", color:C.red },
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
      justifyContent:"center", color:C.muted, fontFamily:"system-ui" }}>Carregando...</div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'DM Sans',system-ui", maxWidth:480, margin:"0 auto", paddingBottom:40 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding:"18px 20px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:20 }}>⭐</span>
            <span style={{ fontWeight:800, fontSize:18 }}>StarLoop</span>
          </div>
          <div style={{ fontSize:11, color:C.muted }}>Painel do Dono · {business?.name}</div>
        </div>
        <button onClick={() => setEditing(true)} style={{ padding:"8px 14px", borderRadius:9,
          border:`1px solid ${C.border}`, background:"transparent", color:C.muted,
          fontSize:12, fontWeight:700, cursor:"pointer" }}>⚙️ Config</button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"0 20px 16px" }}>
        {[
          { icon:"👥", label:"Total Clientes", value:clients.length, color:C.purple },
          { icon:"⭐", label:"Avaliações", value:evaluated, color:C.yellow },
          { icon:"🎁", label:"Cupons", value:clients.filter(c=>c.coupon_sent).length, color:C.accent },
          { icon:"📈", label:"Conversão", value:`${conv}%`, color:C.blue },
        ].map(k => (
          <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Low rating alerts */}
      {lowRating.length > 0 && (
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ background:C.card, border:"1px solid rgba(239,68,68,0.3)", borderRadius:14, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.red, marginBottom:12 }}>⚠️ Alertas — Notas Baixas</div>
            {lowRating.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0",
                borderBottom:"1px solid rgba(239,68,68,0.1)" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(239,68,68,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{c.item} · {"⭐".repeat(c.stars || 1)}</div>
                </div>
                <a href={`https://wa.me/55${c.phone.replace(/\D/g,'')}`} target="_blank"
                  style={{ padding:"6px 12px", borderRadius:8, background:"rgba(239,68,68,0.15)",
                    border:"1px solid rgba(239,68,68,0.3)", color:C.red,
                    fontSize:11, fontWeight:700, textDecoration:"none" }}>
                  💬 Contatar
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coupon config display */}
      <div style={{ padding:"0 20px 16px" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>🎁 Cupom Ativo</div>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { l:"Código", v: business?.coupon_code },
              { l:"Desconto", v: business?.coupon_discount },
              { l:"Validade", v: business?.coupon_expiry },
            ].map(i => (
              <div key={i.l} style={{ flex:1, background:"rgba(124,58,237,0.15)",
                border:"1px solid rgba(124,58,237,0.2)", borderRadius:9, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:C.muted, marginBottom:2 }}>{i.l}</div>
                <div style={{ fontWeight:800, fontSize:13, color:"#A78BFA" }}>{i.v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8,
            background:C.accentDim, border:`1px solid ${C.accentBorder}` }}>
            <div style={{ fontSize:10, color:C.muted, marginBottom:2 }}>URL GOOGLE</div>
            <div style={{ fontSize:11, color:C.accent, wordBreak:"break-all" }}>{business?.google_link}</div>
          </div>
        </div>
      </div>

      {/* Client history */}
      <div style={{ padding:"0 20px" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>📋 Clientes Recentes</div>
          {clients.slice(0, 20).map(c => {
            const st = STATUS_LABEL[c.status] || STATUS_LABEL.aguardando
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0",
                borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:32, height:32, borderRadius:"50%",
                  background:`linear-gradient(135deg,${C.purple}66,${C.accent}66)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:13, flexShrink:0 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{c.item} · {c.visit_date}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:st.color, flexShrink:0 }}>{st.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Config modal */}
      {editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20,
            padding:28, width:"100%", maxWidth:380, maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800 }}>⚙️ Configurações</h3>
            {[
              { label:"Nome da Empresa", key:"name", placeholder:"Ex: Barbearia do João" },
              { label:"Segmento", key:"segment", placeholder:"Ex: Barbearia" },
              { label:"🔗 URL Avaliação Google *", key:"google_link", placeholder:"https://g.page/r/..." },
              { label:"Código do Cupom", key:"coupon_code", placeholder:"VOLTA10" },
              { label:"Desconto", key:"coupon_discount", placeholder:"10%" },
              { label:"Validade do Cupom", key:"coupon_expiry", placeholder:"30 dias" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                  letterSpacing:0.7, display:"block", marginBottom:5 }}>{f.label}</label>
                <input placeholder={f.placeholder} value={form[f.key] || ''}
                  onChange={e => setForm({...form,[f.key]:e.target.value})}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:9,
                    border:`1.5px solid ${f.key==='google_link' ? C.accentBorder : C.border}`,
                    background: f.key==='google_link' ? C.accentDim : "#0D0D14",
                    color:C.text, fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                />
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button onClick={() => setEditing(false)} style={{ flex:1, padding:"11px", borderRadius:9,
                border:`1px solid ${C.border}`, background:"transparent", color:C.muted,
                fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
              <button onClick={saveBusiness} style={{ flex:2, padding:"11px", borderRadius:9,
                border:"none", background:`linear-gradient(135deg,${C.accent},#00B37E)`,
                color:"#0A0A0F", fontSize:13, fontWeight:800, cursor:"pointer" }}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:C.accent, color:"#0A0A0F", padding:"11px 20px", borderRadius:12,
          fontWeight:700, fontSize:13, whiteSpace:"nowrap", zIndex:200 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
