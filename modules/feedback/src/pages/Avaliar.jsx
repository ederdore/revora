import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase.js'

const C = {
  cream: '#FAF7F2', cream2: '#F2EDE4',
  ink: '#0C0A08', amber: '#E8A020',
  amberDim: 'rgba(232,160,32,0.10)',
  amberBorder: 'rgba(232,160,32,0.25)',
  stone: '#9B9488', stone2: '#6B6358',
  border: 'rgba(155,148,136,0.2)',
  white: '#FFFFFF',
  green: '#2A9D5C', greenDim: 'rgba(42,157,92,0.10)',
  red: '#C0392B', redDim: 'rgba(192,57,43,0.10)',
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Figtree:wght@300;400;500;600;700;800&display=swap');`

export default function Avaliar() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [business, setBusiness] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | rating | positive | negative | done
  const [selectedStar, setSelectedStar] = useState(null)
  const [hoveredStar, setHoveredStar] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('clients').select('*, businesses(*)').eq('id', id).single()
      if (!c) { setPhase('error'); return }
      setClient(c)
      setBusiness(c.businesses)
      // Already rated?
      if (c.status === 'avaliado' || c.status === 'low_rating') {
        setPhase('done')
      } else {
        setPhase('rating')
      }
    }
    load()
  }, [id])

  async function submitRating(stars) {
    setSelectedStar(stars)
    setSaving(true)
    const isPositive = stars >= 4
    const { error } = await supabase.from('clients').update({
      stars,
      status: isPositive ? 'avaliado' : 'low_rating',
      coupon_sent: isPositive,
    }).eq('id', id)
    setSaving(false)
    if (!error) setPhase(isPositive ? 'positive' : 'negative')
  }

  if (phase === 'loading') return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Figtree,sans-serif', color: C.stone }}>
      <style>{FONTS}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⭐</div>
        <div>Carregando...</div>
      </div>
    </div>
  )

  if (phase === 'error') return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Figtree,sans-serif' }}>
      <style>{FONTS}</style>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Link inválido ou expirado</div>
        <div style={{ fontSize: 14, color: C.stone2, marginTop: 8 }}>Peça um novo link ao atendente</div>
      </div>
    </div>
  )

  if (phase === 'done') return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Figtree,sans-serif' }}>
      <style>{FONTS}</style>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Avaliação já registrada!</div>
        <div style={{ fontSize: 14, color: C.stone2, marginTop: 8 }}>Obrigado pelo seu feedback</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Figtree',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
      <style>{FONTS}</style>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.3)} 100%{transform:scale(1)} }
        .star-btn { transition: transform 0.15s; cursor: pointer; background: none; border: none; padding: 4px; }
        .star-btn:hover { transform: scale(1.15); }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 900, color: C.ink }}>
            Re<span style={{ color: C.amber }}>v</span>ora
          </div>
        </div>

        {/* RATING PHASE */}
        {phase === 'rating' && (
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 8px 32px rgba(12,10,8,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{business?.avatar || '⭐'}</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
              Olá, {client?.name?.split(' ')[0]}!
            </h2>
            <p style={{ fontSize: 15, color: C.stone2, lineHeight: 1.6, marginBottom: 28 }}>
              Como foi sua experiência no <strong style={{ color: C.ink }}>{business?.name}</strong>?
            </p>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} className="star-btn"
                  onMouseEnter={() => setHoveredStar(s)}
                  onMouseLeave={() => setHoveredStar(null)}
                  onClick={() => !saving && submitRating(s)}
                  style={{ fontSize: 44, opacity: saving ? 0.5 : 1, cursor: saving ? 'wait' : 'pointer', background: 'none', border: 'none', padding: 4, transition: 'transform 0.15s' }}>
                  <span style={{ filter: s <= (hoveredStar || selectedStar || 0) ? 'none' : 'grayscale(100%) opacity(0.3)', transition: 'filter 0.15s' }}>⭐</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.stone, marginBottom: 8 }}>
              {hoveredStar === 1 ? 'Muito ruim' : hoveredStar === 2 ? 'Ruim' : hoveredStar === 3 ? 'Regular' : hoveredStar === 4 ? 'Bom' : hoveredStar === 5 ? 'Excelente!' : 'Toque em uma estrela para avaliar'}
            </div>
            {saving && <div style={{ fontSize: 13, color: C.amber, marginTop: 8, fontWeight: 600 }}>Salvando...</div>}
          </div>
        )}

        {/* POSITIVE PHASE */}
        {phase === 'positive' && (
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 8px 32px rgba(12,10,8,0.06)', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
              Que ótimo!
            </h2>
            <p style={{ fontSize: 15, color: C.stone2, lineHeight: 1.6, marginBottom: 24 }}>
              Ficamos felizes com sua avaliação de <strong>{selectedStar} estrela{selectedStar > 1 ? 's' : ''}</strong>!
            </p>

            {/* Google review CTA */}
            <div style={{ background: C.amberDim, border: `1.5px solid ${C.amberBorder}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Pode nos avaliar no Google também?</div>
              <div style={{ fontSize: 12, color: C.stone2, marginBottom: 14 }}>Leva menos de 30 segundos e ajuda muito! 🙏</div>
              <a href={business?.google_link} target="_blank" rel="noreferrer" style={{
                display: 'block', padding: '13px', borderRadius: 10,
                background: C.amber, color: C.ink, fontWeight: 800, fontSize: 14,
                textDecoration: 'none', boxShadow: '0 4px 12px rgba(232,160,32,0.3)',
              }}>
                ⭐ Avaliar no Google agora
              </a>
            </div>

            {/* Coupon */}
            {business?.coupon_code && (
              <div style={{ background: C.cream2, border: `1.5px dashed ${C.amberBorder}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, color: C.stone2, marginBottom: 6 }}>🎁 Seu cupom de presente</div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 900, color: C.amber, letterSpacing: 2, marginBottom: 4 }}>
                  {business.coupon_code}
                </div>
                <div style={{ fontSize: 13, color: C.stone2 }}>
                  <strong style={{ color: C.ink }}>{business.coupon_discount}</strong> de desconto · válido por {business.coupon_expiry}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEGATIVE PHASE */}
        {phase === 'negative' && (
          <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: '0 8px 32px rgba(12,10,8,0.06)', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: C.ink, marginBottom: 8 }}>
              Sentimos muito
            </h2>
            <p style={{ fontSize: 15, color: C.stone2, lineHeight: 1.6, marginBottom: 24 }}>
              Sua opinião é muito importante para nós. Queremos entender o que aconteceu e melhorar.
            </p>

            <div style={{ background: C.redDim, border: `1.5px solid ${C.red}22`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
                O responsável entrará em contato
              </div>
              <div style={{ fontSize: 12, color: C.stone2, lineHeight: 1.6 }}>
                Já avisamos a equipe sobre seu feedback. Em breve alguém irá falar com você para resolver.
              </div>
            </div>

            {business?.whatsapp_number && (
              <a href={`https://wa.me/55${business.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de falar sobre minha experiência.')}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'block', padding: '13px', borderRadius: 10, background: '#25D366', color: C.white, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
                💬 Falar agora no WhatsApp
              </a>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: C.stone }}>
          Powered by Revora
        </div>
      </div>
    </div>
  )
}
