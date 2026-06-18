import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'

const C = {
  black:'#0A0A0A',black2:'#111111',black3:'#1A1A1A',
  yellow:'#F5C518',blue:'#1B4FD8',
  white:'#FFFFFF',muted:'#888888',
  border:'rgba(255,255,255,0.08)',border2:'rgba(255,255,255,0.14)',
  green:'#25D366',greenDark:'#128C7E',
  red:'#EF4444',
}

const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`

const MESSAGES = {
  review: (clientName, bizName, googleLink, coupon, discount) =>
    `Oi ${clientName}! 👋 Obrigado pela visita ao ${bizName}!\n\nVocê poderia nos ajudar com uma avaliação rápida no Google? Leva menos de 30 segundos:\n👉 ${googleLink}\n\nComo agradecimento, aqui está seu cupom exclusivo:\n🎁 *${coupon}* — ${discount} de desconto\n\nNos vemos em breve! 😊`,

  risk: (clientName, bizName) =>
    `Oi ${clientName}! 🙂 Sentimos sua falta no ${bizName}!\n\nFaz um tempo que não te vemos por aqui. Está tudo bem?\n\nGostaríamos de te receber novamente. Temos uma oferta especial para você voltar! 🎁\n\nQualquer dúvida, estamos aqui!`,

  return: (clientName, bizName, service) =>
    `Oi ${clientName}! ✂️ Está na hora de agendar seu próximo ${service} no ${bizName}!\n\nNão deixa passar muito tempo — agende agora e garanta seu horário. 📅\n\nAguardamos você!`,

  custom: (clientName, bizName) =>
    `Oi ${clientName}! Aqui é o ${bizName}. Como podemos te ajudar hoje? 😊`,
}

export default function EnviarMsg() {
  const { clientId } = useParams()
  const [client, setClient] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msgType, setMsgType] = useState('review')
  const [customMsg, setCustomMsg] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from('clients')
        .select('*, businesses(*)')
        .eq('id', clientId)
        .single()
      if (c) {
        setClient(c)
        setBusiness(c.businesses)
        setCustomMsg(MESSAGES.custom(c.name?.split(' ')[0], c.businesses?.name))
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  function getMsg() {
    if (!client || !business) return ''
    const first = client.name?.split(' ')[0] || client.name
    switch (msgType) {
      case 'review':  return MESSAGES.review(first, business.name, business.google_link || 'https://g.page/r/...', business.coupon_code || 'VOLTA10', business.coupon_discount || '10%')
      case 'risk':    return MESSAGES.risk(first, business.name)
      case 'return':  return MESSAGES.return(first, business.name, client.item || 'serviço')
      case 'custom':  return customMsg
      default:        return ''
    }
  }

  function openWhatsApp() {
    const msg = getMsg()
    const phone = client?.phone?.replace(/\D/g, '')
    if (!phone) return
    // Opens WhatsApp on the owner's device with pre-filled message
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setSent(true)
    // Update status in DB
    supabase.from('clients').update({ status: 'msg_enviada' }).eq('id', clientId)
  }

  const MSG_TYPES = [
    { key: 'review',  icon: '⭐', label: 'Pedir avaliação', desc: 'Google + cupom' },
    { key: 'risk',    icon: '⚠️', label: 'Cliente sumido',  desc: 'Oferta de retorno' },
    { key: 'return',  icon: '📅', label: 'Hora de voltar',  desc: 'Lembrete de serviço' },
    { key: 'custom',  icon: '✏️', label: 'Personalizada',   desc: 'Escreva sua msg' },
  ]

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.black, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", color:C.muted }}>
      <style>{FONTS}</style>
      Carregando...
    </div>
  )

  if (!client) return (
    <div style={{ minHeight:'100vh', background:C.black, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:24 }}>
      <style>{FONTS}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>😕</div>
        <div style={{ fontSize:16, fontWeight:700, color:C.white }}>Cliente não encontrado</div>
        <a href="/app/atender" style={{ display:'inline-block', marginTop:16, color:C.yellow, fontSize:13 }}>← Voltar para atendimentos</a>
      </div>
    </div>
  )

  const msg = getMsg()

  return (
    <div style={{ minHeight:'100vh', background:C.black, fontFamily:"'DM Sans',sans-serif", color:C.white }}>
      <style>{FONTS}</style>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ background:C.black2, borderBottom:`1px solid ${C.border}`, padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/app/atender" style={{ display:'flex', alignItems:'center', gap:8, color:C.muted, fontSize:13, fontWeight:600 }}>
          ← Voltar
        </a>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:900 }}>
          Re<span style={{ color:C.yellow }}>v</span>ora
        </div>
        <div style={{ width:60 }}/>
      </div>

      <div style={{ maxWidth:480, margin:'0 auto', padding:'24px 20px', animation:'fadeUp 0.4s ease' }}>

        {/* Client card */}
        <div style={{ background:C.black2, border:`1px solid ${C.border2}`, borderRadius:16, padding:'16px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:`${C.yellow}18`, border:`2px solid ${C.yellow}33`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:18, color:C.yellow, flexShrink:0 }}>
            {client.name?.charAt(0)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>{client.name}</div>
            <div style={{ fontSize:12, color:C.muted }}>{client.phone} · {client.item || '—'}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:C.muted }}>{business?.name}</div>
            <div style={{ fontSize:11, color:C.yellow, marginTop:2 }}>📱 WhatsApp pronto</div>
          </div>
        </div>

        {/* Message type selector */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Tipo de mensagem</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {MSG_TYPES.map(t => (
              <button key={t.key} onClick={() => setMsgType(t.key)} style={{
                padding:'12px 14px', borderRadius:10, border:`1.5px solid ${msgType===t.key ? C.yellow : C.border}`,
                background: msgType===t.key ? `${C.yellow}12` : C.black2,
                cursor:'pointer', textAlign:'left', transition:'all 0.15s',
              }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{t.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color: msgType===t.key ? C.yellow : C.white }}>{t.label}</div>
                <div style={{ fontSize:11, color:C.muted }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Message preview / editor */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
            {msgType === 'custom' ? 'Escreva a mensagem' : 'Prévia da mensagem'}
          </div>

          {msgType === 'custom' ? (
            <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={8}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:`1.5px solid ${C.border2}`, background:C.black2, color:C.white, fontSize:13, lineHeight:1.6, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor=C.yellow}
              onBlur={e => e.target.style.borderColor=C.border2}
            />
          ) : (
            <div style={{ background:C.black2, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
              {/* WhatsApp-style preview */}
              <div style={{ background:'#1F2C34', borderRadius:10, padding:'16px', maxWidth:'85%', marginLeft:'auto' }}>
                <div style={{ fontSize:13, lineHeight:1.65, color:'#E9EDF0', whiteSpace:'pre-wrap' }}>
                  {msg.split('*').map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}
                </div>
                <div style={{ fontSize:10, color:'#8696A0', textAlign:'right', marginTop:6 }}>
                  {new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})} ✓✓
                </div>
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:10, textAlign:'center' }}>
                💬 Será enviado via WhatsApp do seu celular
              </div>
            </div>
          )}
        </div>

        {/* Send button */}
        {!sent ? (
          <button onClick={openWhatsApp} style={{
            width:'100%', padding:'16px', borderRadius:12, border:'none',
            background:`linear-gradient(135deg,${C.green},${C.greenDark})`,
            color:C.white, fontSize:16, fontWeight:800, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            boxShadow:'0 8px 24px rgba(37,211,102,0.3)', transition:'all 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.112 1.522 5.84L.057 23.882a.5.5 0 00.611.611l6.042-1.465A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.524-5.18-1.437l-.37-.22-3.834.929.929-3.834-.22-.37A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Abrir WhatsApp e Enviar
          </button>
        ) : (
          <div style={{ background:`${C.green}15`, border:`1px solid ${C.green}33`, borderRadius:12, padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:15, fontWeight:700, color:C.white, marginBottom:4 }}>WhatsApp aberto!</div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Confirme o envio no seu WhatsApp</div>
            <a href="/app/atender" style={{ display:'inline-block', padding:'10px 20px', borderRadius:9, background:C.yellow, color:C.black, fontSize:13, fontWeight:700 }}>
              ← Voltar para atendimentos
            </a>
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop:16, padding:'12px 14px', borderRadius:9, background:C.black2, border:`1px solid ${C.border}`, fontSize:12, color:C.muted, lineHeight:1.6 }}>
          💡 O WhatsApp abrirá no <strong style={{color:C.white}}>seu celular</strong> com a mensagem pronta. Basta confirmar o envio. Nenhuma API necessária.
        </div>
      </div>
    </div>
  )
}
