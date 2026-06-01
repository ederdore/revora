import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const C = {
  bg:"#0A0A0F", card:"#13131A", border:"#1E1E2E",
  accent:"#00E5A0", text:"#F0F0F5", muted:"#6B6B80",
  yellow:"#F59E0B", blue:"#3B82F6", red:"#EF4444"
}

const STATUS = {
  aguardando:  { label:"Aguardando",   color:C.yellow, bg:"rgba(245,158,11,0.12)" },
  msg_enviada: { label:"Msg Enviada",  color:C.blue,   bg:"rgba(59,130,246,0.12)" },
  avaliado:    { label:"Avaliado ✓",   color:C.accent, bg:"rgba(0,229,160,0.12)"  },
  low_rating:  { label:"⚠️ Nota Baixa", color:C.red,   bg:"rgba(239,68,68,0.12)" },
}

export default function Atendente() {
  const [business, setBusiness] = useState(null)
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', item:'' })
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    // Pega a primeira empresa (MVP — depois terá auth)
    const { data: biz } = await supabase.from('businesses').select('*').limit(1).single()
    setBusiness(biz)
    if (biz) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('business_id', biz.id)
        .eq('visit_date', today)
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
      visit_time: now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
    }).select().single()
    if (!error) {
      setClients(prev => [data, ...prev])
      setForm({ name:'', phone:'', item:'' })
      setShowForm(false)
      showToast(`${form.name.split(' ')[0]} cadastrado! ✓`)
    }
  }

  async function finalize(client) {
    const { error } = await supabase.from('clients')
      .update({ status: 'msg_enviada' })
      .eq('id', client.id)
    if (!error) {
      setClients(prev => prev.map(c => c.id===client.id ? {...c, status:'msg_enviada'} : c))
      showToast(`Mensagem enviada para ${client.name.split(' ')[0]}! 🚀`)
      // TODO: integrar Telegram/WhatsApp API aqui
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
      justifyContent:"center", color:C.muted, fontFamily:"system-ui" }}>Carregando...</div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'DM Sans',system-ui", paddingBottom:40 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding:"18px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:20 }}>{business?.avatar}</span>
            <span style={{ fontWeight:800, fontSize:16 }}>{business?.name}</span>
          </div>
          <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
            {new Date().toLocaleDateString('pt-BR')} · {clients.length} clientes hoje
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          padding:"9px 16px", borderRadius:10, border:"none",
          background:`linear-gradient(135deg,${C.accent},#00B37E)`,
          color:"#0A0A0F", fontWeight:800, fontSize:13, cursor:"pointer" }}>
          + Novo
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"flex", gap:8, padding:"14px 20px" }}>
        {[
          { l:"Total", v: clients.length, c: C.text },
          { l:"Enviados", v: clients.filter(c=>c.status!=='aguardando').length, c: C.blue },
          { l:"Avaliados", v: clients.filter(c=>c.status==='avaliado').length, c: C.accent },
        ].map(s => (
          <div key={s.l} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`,
            borderRadius:10, padding:"10px 12px" }}>
            <div style={{ fontSize:20, fontWeight:800, color:s.c }}>{s.v}</div>
            <div style={{ fontSize:10, color:C.muted }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Client list */}
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:10 }}>
        {clients.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 0", color:C.muted, fontSize:13 }}>
            Nenhum cliente cadastrado hoje.<br/>Clique em + Novo para começar.
          </div>
        )}
        {clients.map(client => {
          const st = STATUS[client.status] || STATUS.aguardando
          return (
            <div key={client.id} style={{ background:C.card, border:`1px solid ${C.border}`,
              borderRadius:14, padding:"14px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: client.status==='aguardando' ? 12 : 0 }}>
                <div style={{ width:40, height:40, borderRadius:"50%",
                  background:"linear-gradient(135deg,#7C3AED,#00E5A0)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:800, fontSize:16, flexShrink:0 }}>
                  {client.name.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{client.name}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{client.item} · {client.visit_time}</div>
                </div>
                <span style={{ padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700,
                  color:st.color, background:st.bg }}>
                  {st.label}
                </span>
              </div>
              {client.status === 'aguardando' && (
                <button onClick={() => finalize(client)} style={{
                  width:"100%", padding:"10px", borderRadius:9, border:"none",
                  background:"linear-gradient(135deg,#25D366,#128C7E)",
                  color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  ✓ Finalizar & Enviar Avaliação
                </button>
              )}
              {client.status === 'msg_enviada' && (
                <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(59,130,246,0.1)",
                  fontSize:12, color:"#93C5FD", textAlign:"center", marginTop:10 }}>
                  📱 Mensagem enviada · aguardando avaliação
                </div>
              )}
              {client.status === 'avaliado' && (
                <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(0,229,160,0.1)",
                  fontSize:12, color:C.accent, textAlign:"center", marginTop:10 }}>
                  🎉 Avaliou! Cupom enviado automaticamente
                </div>
              )}
              {client.status === 'low_rating' && (
                <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(239,68,68,0.1)",
                  fontSize:12, color:"#F87171", textAlign:"center", marginTop:10 }}>
                  ⚠️ Nota baixa — dono foi alertado
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add client modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20,
            padding:28, width:"100%", maxWidth:360 }}>
            <h3 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800 }}>Novo Cliente</h3>
            {[
              { label:"Nome completo", key:"name", placeholder:"Ex: Maria Santos", type:"text" },
              { label:"Telefone / WhatsApp", key:"phone", placeholder:"11 99999-0000", type:"tel" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                  letterSpacing:0.8, display:"block", marginBottom:5 }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                  onChange={e => setForm({...form,[f.key]:e.target.value})}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:9,
                    border:`1.5px solid ${C.border}`, background:"#0D0D14",
                    color:C.text, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                  onFocus={e => e.target.style.borderColor=C.accent}
                  onBlur={e => e.target.style.borderColor=C.border}
                />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
                letterSpacing:0.8, display:"block", marginBottom:5 }}>{business?.item_label || 'Serviço / Produto'}</label>
              <select value={form.item} onChange={e => setForm({...form, item:e.target.value})}
                style={{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${C.border}`,
                  background:"#0D0D14", color:C.text, fontSize:14, outline:"none", cursor:"pointer", fontFamily:"inherit" }}>
                {(business?.items || []).map(s => <option key={s} style={{ background:"#0D0D14" }}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, padding:"11px", borderRadius:9,
                border:`1px solid ${C.border}`, background:"transparent", color:C.muted,
                fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
              <button onClick={addClient} style={{ flex:2, padding:"11px", borderRadius:9, border:"none",
                background:`linear-gradient(135deg,${C.accent},#00B37E)`, color:"#0A0A0F",
                fontSize:13, fontWeight:800, cursor:"pointer" }}>✓ Cadastrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:C.accent, color:"#0A0A0F", padding:"11px 20px", borderRadius:12,
          fontWeight:700, fontSize:13, whiteSpace:"nowrap", zIndex:200,
          boxShadow:"0 8px 30px rgba(0,229,160,0.3)" }}>
          {toast}
        </div>
      )}
    </div>
  )
}
