import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

const C = {
  black:'#0A0A0A',black2:'#111111',black3:'#1A1A1A',
  yellow:'#F5C518',blue:'#1B4FD8',
  white:'#FFFFFF',muted:'#888888',
  border:'rgba(255,255,255,0.08)',border2:'rgba(255,255,255,0.14)',
  red:'#EF4444',
}
const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`

export default function Login(){
  const navigate=useNavigate()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [showPass,setShowPass]=useState(false)

  async function handleLogin(){
    setError('')
    if(!email||!password){setError('Preencha email e senha');return}
    setLoading(true)
    const {data,error:authError}=await supabase.auth.signInWithPassword({email,password})
    if(authError){setError('Email ou senha incorretos');setLoading(false);return}

    // Check role
    const {data:user}=await supabase.from('users').select('role,business_id').eq('auth_id',data.user.id).single()
    if(user?.role==='owner'||user?.role==='admin'){
      navigate('/app/dashboard')
    } else if(user?.role==='attendant'){
      navigate('/app/atender')
    } else {
      navigate('/app/dashboard')
    }
    setLoading(false)
  }

  const inp={
    width:'100%',padding:'12px 14px',borderRadius:10,
    border:`1.5px solid ${C.border}`,background:C.black2,
    color:C.white,fontSize:14,outline:'none',
    boxSizing:'border-box',fontFamily:'inherit',transition:'border-color 0.2s',
  }

  return(
    <div style={{minHeight:'100vh',background:C.black,display:'flex',fontFamily:"'DM Sans',sans-serif",color:C.white}}>
      <style>{FONTS}</style>
      <style>{`input:focus{border-color:${C.yellow}!important}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* LEFT */}
      <div style={{width:380,background:C.black2,borderRight:`1px solid ${C.border}`,padding:'40px 36px',display:'flex',flexDirection:'column',flexShrink:0}}>
        <a href="/" style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:900,letterSpacing:-0.5,color:C.white,marginBottom:48}}>
          Re<span style={{color:C.yellow}}>v</span>ora
        </a>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:900,letterSpacing:-0.5,marginBottom:12}}>Bem-vindo de volta.</h2>
          <p style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:32}}>Acesse sua conta para gerenciar clientes, feedback e retenção.</p>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[
              {icon:'⭐',text:'Feedback automático após cada atendimento'},
              {icon:'⚠️',text:'Alertas de clientes em risco'},
              {icon:'📊',text:'Dashboard de retenção em tempo real'},
            ].map(f=>(
              <div key={f.text} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:16,marginTop:1}}>{f.icon}</span>
                <span style={{fontSize:13,color:C.muted,lineHeight:1.5}}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:20,fontSize:12,color:'#444'}}>
          🇧🇷 Brasil · 🇵🇹 Portugal · 🇮🇹 Itália
        </div>
      </div>

      {/* RIGHT */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 5vw'}}>
        <div style={{width:'100%',maxWidth:400,animation:'fadeUp 0.4s ease'}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:900,letterSpacing:-0.5,marginBottom:6}}>Entrar</h1>
          <p style={{fontSize:14,color:C.muted,marginBottom:32}}>
            Não tem conta? <a href="/cadastro" style={{color:C.yellow,fontWeight:700}}>Criar grátis</a>
          </p>

          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:6}}>Email</label>
            <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}
              style={inp} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          </div>

          <div style={{marginBottom:28,position:'relative'}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:6}}>Senha</label>
            <input type={showPass?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}
              style={{...inp,paddingRight:44}} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
            <button onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:12,top:34,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>
              {showPass?'🙈':'👁️'}
            </button>
          </div>

          {error&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}33`,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:16}}>{error}</div>}

          <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'14px',borderRadius:10,border:'none',background:loading?C.muted:C.yellow,color:C.black,fontSize:15,fontWeight:800,cursor:loading?'wait':'pointer',transition:'opacity 0.2s'}}>
            {loading?'Entrando...':'Entrar →'}
          </button>

          <div style={{marginTop:20,textAlign:'center'}}>
            <a href="#" style={{fontSize:13,color:C.muted}}>Esqueceu a senha?</a>
          </div>
        </div>
      </div>
    </div>
  )
}
