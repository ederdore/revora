// Página inicial — redireciona para as rotas certas
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const C = { bg:"#0A0A0F", accent:"#00E5A0", text:"#F0F0F5", muted:"#6B6B80" }

export default function App() {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", fontFamily:"system-ui", padding:24, gap:20 }}>
      <div style={{ fontSize:48 }}>⭐</div>
      <h1 style={{ margin:0, color:C.text, fontSize:28, fontWeight:900 }}>StarLoop</h1>
      <p style={{ margin:0, color:C.muted, fontSize:14 }}>Avaliações Google + Cupom automático</p>
      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:300, marginTop:16 }}>
        <a href="/admin" style={{ padding:"14px", borderRadius:12, background:`linear-gradient(135deg,#00E5A0,#00B37E)`,
          color:"#0A0A0F", fontWeight:800, fontSize:15, textAlign:"center", textDecoration:"none" }}>
          📊 Painel do Dono
        </a>
        <a href="/atendente" style={{ padding:"14px", borderRadius:12, border:"1.5px solid #1E1E2E",
          color:C.text, fontWeight:700, fontSize:15, textAlign:"center", textDecoration:"none" }}>
          ✂️ Tela do Atendente
        </a>
      </div>
      <p style={{ margin:0, color:C.muted, fontSize:11, marginTop:8 }}>MVP v0.1 — Validação</p>
    </div>
  )
}
