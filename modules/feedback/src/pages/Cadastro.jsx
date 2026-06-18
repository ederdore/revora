import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase.js'

const C = {
  black:'#0A0A0A',black2:'#111111',black3:'#1A1A1A',
  yellow:'#F5C518',blue:'#1B4FD8',
  white:'#FFFFFF',muted:'#888888',
  border:'rgba(255,255,255,0.08)',border2:'rgba(255,255,255,0.14)',
  red:'#EF4444',green:'#22C55E',
}
const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`

const SEGMENTS=[
  {slug:'barbearia',emoji:'✂️',label:'Barbearia',items:['Corte','Barba','Corte + Barba','Acabamento','Coloração'],recorrencia:15},
  {slug:'petshop',emoji:'🐾',label:'Pet Shop',items:['Banho','Tosa','Banho + Tosa','Consulta','Vacina'],recorrencia:21},
  {slug:'clinica',emoji:'🏥',label:'Clínica',items:['Consulta','Retorno','Exame','Procedimento','Cirurgia'],recorrencia:90},
  {slug:'lojas',emoji:'🛍️',label:'Loja',items:['Compra','Troca','Encomenda','Orçamento','Retirada'],recorrencia:30},
  {slug:'concessionarias',emoji:'🚗',label:'Concessionária',items:['Test Drive','Compra','Revisão','Manutenção','Garantia'],recorrencia:180},
  {slug:'outro',emoji:'🏢',label:'Outro',items:['Serviço','Produto','Consulta','Atendimento'],recorrencia:30},
]

const STEPS=['Sua conta','Seu negócio','Sua equipe']

export default function Cadastro(){
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const preSegment=searchParams.get('segmento')||''

  const [step,setStep]=useState(0)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  // Step 0
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPass,setShowPass]=useState(false)

  // Step 1
  const [bizName,setBizName]=useState('')
  const [segment,setSegment]=useState(preSegment)
  const [phone,setPhone]=useState('')
  const [googleLink,setGoogleLink]=useState('')
  const [coupon,setCoupon]=useState('VOLTA10')
  const [discount,setDiscount]=useState('10%')

  // Step 2
  const [attendants,setAttendants]=useState([{name:'',email:''}])
  const [done,setDone]=useState(false)

  const selectedSeg=SEGMENTS.find(s=>s.slug===segment)

  function validateStep0(){
    if(!name.trim()){setError('Informe seu nome');return false}
    if(!email.trim()||!email.includes('@')){setError('Email inválido');return false}
    if(password.length<6){setError('Senha mínimo 6 caracteres');return false}
    return true
  }
  function validateStep1(){
    if(!bizName.trim()){setError('Informe o nome do negócio');return false}
    if(!segment){setError('Selecione o segmento');return false}
    return true
  }

  async function handleFinish(){
    setError('')
    setLoading(true)
    try{
      // 1. Auth
      const {data:authData,error:authError}=await supabase.auth.signUp({email,password,options:{data:{name}}})
      if(authError) throw new Error(authError.message)

      // 2. Empresa
      const {data:biz,error:bizError}=await supabase.from('businesses').insert({
        name:bizName,
        segment:selectedSeg?.label||segment,
        avatar:selectedSeg?.emoji||'🏢',
        whatsapp_number:phone.replace(/\D/g,''),
        google_link:googleLink,
        coupon_code:coupon,
        coupon_discount:discount,
        coupon_expiry:'30 dias',
        plan:'trial',status:'trial',
        country:'🇧🇷',language:'pt-BR',
      }).select().single()
      if(bizError) throw new Error(bizError.message)

      // 3. Usuário dono
      await supabase.from('users').insert({
        business_id:biz.id,name,email,
        role:'owner',auth_id:authData.user?.id,active:true,
      })

      // 4. Serviços
      if(selectedSeg){
        await supabase.from('services').insert(
          selectedSeg.items.map(item=>({
            business_id:biz.id,name:item,
            recorrencia_esperada:selectedSeg.recorrencia,active:true,
          }))
        )
      }

      // 5. Atendentes
      const valid=attendants.filter(a=>a.name.trim()&&a.email.trim())
      if(valid.length>0){
        await supabase.from('users').insert(
          valid.map(a=>({business_id:biz.id,name:a.name,email:a.email,role:'attendant',active:true}))
        )
      }

      setDone(true)
    }catch(err){
      setError(err.message)
    }
    setLoading(false)
  }

  const inp={
    width:'100%',padding:'12px 14px',borderRadius:10,
    border:`1.5px solid ${C.border}`,background:C.black2,
    color:C.white,fontSize:14,outline:'none',
    boxSizing:'border-box',fontFamily:'inherit',
  }
  const lbl={fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:6}

  // DONE SCREEN
  if(done) return(
    <div style={{minHeight:'100vh',background:C.black,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{FONTS}</style>
      <div style={{textAlign:'center',maxWidth:440}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:`${C.yellow}15`,border:`2px solid ${C.yellow}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,margin:'0 auto 24px'}}>🎉</div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:900,letterSpacing:-0.5,marginBottom:12}}>Conta criada!</h2>
        <p style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:32}}>
          Verifique seu email para confirmar o cadastro, depois acesse o painel.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <a href="/app/dashboard" style={{display:'block',padding:'14px',borderRadius:10,background:C.yellow,color:C.black,fontWeight:800,fontSize:15,textDecoration:'none',textAlign:'center'}}>
            Acessar painel do dono →
          </a>
          <a href="/login" style={{display:'block',padding:'14px',borderRadius:10,border:`1.5px solid ${C.border}`,color:C.muted,fontWeight:600,fontSize:14,textDecoration:'none',textAlign:'center'}}>
            Fazer login
          </a>
        </div>
      </div>
    </div>
  )

  return(
    <div style={{minHeight:'100vh',background:C.black,fontFamily:"'DM Sans',sans-serif",color:C.white,display:'flex'}}>
      <style>{FONTS}</style>
      <style>{`
        input:focus,select:focus{border-color:${C.yellow}!important}
        .sc:hover{border-color:rgba(245,197,24,0.5)!important;background:rgba(245,197,24,0.06)!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* LEFT SIDEBAR */}
      <div style={{width:320,background:C.black2,borderRight:`1px solid ${C.border}`,padding:'40px 32px',display:'flex',flexDirection:'column',flexShrink:0}}>
        <a href="/" style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:900,letterSpacing:-0.5,color:C.white,textDecoration:'none',marginBottom:48}}>
          Re<span style={{color:C.yellow}}>v</span>ora
        </a>

        {/* Steps */}
        <div style={{flex:1}}>
          {STEPS.map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:28}}>
              <div style={{width:30,height:30,borderRadius:'50%',border:`2px solid ${i<=step?C.yellow:C.border}`,background:i<step?C.yellow:i===step?`${C.yellow}15`:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:12,fontWeight:700,color:i<step?C.black:i===step?C.yellow:C.muted,transition:'all 0.3s'}}>
                {i<step?'✓':i+1}
              </div>
              <div style={{paddingTop:4}}>
                <div style={{fontSize:13,fontWeight:i===step?700:500,color:i===step?C.white:i<step?C.yellow:C.muted}}>{s}</div>
                <div style={{fontSize:11,color:'#333',marginTop:2}}>
                  {i===0?'Email e senha':i===1?'Nome e segmento':'Equipe (opcional)'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.muted,marginBottom:6}}>
            <span>Progresso</span><span>{Math.round(((step)/3)*100)}%</span>
          </div>
          <div style={{height:3,background:C.border,borderRadius:4}}>
            <div style={{height:'100%',width:`${((step)/3)*100}%`,background:C.yellow,borderRadius:4,transition:'width 0.4s ease'}}/>
          </div>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:20,fontSize:12,color:'#444',lineHeight:1.7}}>
          🔒 Dados protegidos<br/>
          📅 14 dias grátis · sem cartão<br/>
          🇧🇷 🇵🇹 🇮🇹 3 países
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 5vw',overflowY:'auto'}}>
        <div style={{width:'100%',maxWidth:480,animation:'fadeUp 0.4s ease'}}>

          {/* STEP 0 */}
          {step===0&&<>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:900,letterSpacing:-0.5,marginBottom:6}}>Crie sua conta</h1>
            <p style={{fontSize:14,color:C.muted,marginBottom:32}}>14 dias grátis · Sem cartão de crédito</p>

            {[
              {lbl:'Seu nome',key:'name',type:'text',placeholder:'Ex: João Silva',val:name,set:setName},
              {lbl:'Email',key:'email',type:'email',placeholder:'joao@email.com',val:email,set:setEmail},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:16}}>
                <label style={lbl}>{f.lbl}</label>
                <input type={f.type} placeholder={f.placeholder} value={f.val} onChange={e=>f.set(e.target.value)} style={inp}/>
              </div>
            ))}

            <div style={{marginBottom:28,position:'relative'}}>
              <label style={lbl}>Senha</label>
              <input type={showPass?'text':'password'} placeholder="Mínimo 6 caracteres" value={password} onChange={e=>setPassword(e.target.value)} style={{...inp,paddingRight:44}} onKeyDown={e=>e.key==='Enter'&&validateStep0()&&setStep(1)}/>
              <button onClick={()=>setShowPass(!showPass)} style={{position:'absolute',right:12,top:34,background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>{showPass?'🙈':'👁️'}</button>
            </div>

            {error&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}33`,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:16}}>{error}</div>}

            <button onClick={()=>{setError('');validateStep0()&&setStep(1)}} style={{width:'100%',padding:'14px',borderRadius:10,border:'none',background:C.yellow,color:C.black,fontSize:15,fontWeight:800,cursor:'pointer'}}>
              Continuar →
            </button>
            <p style={{textAlign:'center',marginTop:20,fontSize:13,color:C.muted}}>
              Já tem conta? <a href="/login" style={{color:C.yellow,fontWeight:700}}>Entrar</a>
            </p>
          </>}

          {/* STEP 1 */}
          {step===1&&<>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:900,letterSpacing:-0.5,marginBottom:6}}>Seu negócio</h1>
            <p style={{fontSize:14,color:C.muted,marginBottom:28}}>Configure o Revora para o seu segmento</p>

            <div style={{marginBottom:24}}>
              <label style={lbl}>Segmento</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                {SEGMENTS.map(sg=>(
                  <button key={sg.slug} className="sc" onClick={()=>setSegment(sg.slug)} style={{padding:'12px 8px',borderRadius:10,border:`1.5px solid ${segment===sg.slug?C.yellow:C.border}`,background:segment===sg.slug?`${C.yellow}12`:C.black2,cursor:'pointer',transition:'all 0.15s',textAlign:'center'}}>
                    <div style={{fontSize:20,marginBottom:4}}>{sg.emoji}</div>
                    <div style={{fontSize:11,fontWeight:700,color:segment===sg.slug?C.yellow:C.muted}}>{sg.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={lbl}>Nome do negócio</label>
              <input placeholder="Ex: Barbearia do João" value={bizName} onChange={e=>setBizName(e.target.value)} style={inp}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={lbl}>WhatsApp (com DDD)</label>
              <input placeholder="11 99999-0000" value={phone} onChange={e=>setPhone(e.target.value)} type="tel" style={inp}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={lbl}>URL Google Avaliação <span style={{textTransform:'none',letterSpacing:0,color:'#444'}}>(opcional)</span></label>
              <input placeholder="https://g.page/r/..." value={googleLink} onChange={e=>setGoogleLink(e.target.value)} style={{...inp,borderColor:googleLink?`${C.yellow}40`:C.border,background:googleLink?`${C.yellow}06`:C.black2}}/>
              <div style={{fontSize:11,color:'#444',marginTop:4}}>Google Meu Negócio → Receber avaliações → Copiar link</div>
            </div>
            <div style={{display:'flex',gap:10,marginBottom:28}}>
              <div style={{flex:1}}>
                <label style={lbl}>Cupom</label>
                <input placeholder="VOLTA10" value={coupon} onChange={e=>setCoupon(e.target.value)} style={inp}/>
              </div>
              <div style={{flex:1}}>
                <label style={lbl}>Desconto</label>
                <input placeholder="10%" value={discount} onChange={e=>setDiscount(e.target.value)} style={inp}/>
              </div>
            </div>

            {error&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}33`,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:16}}>{error}</div>}

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setError('');setStep(0)}} style={{flex:1,padding:'13px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:13,fontWeight:600,cursor:'pointer'}}>← Voltar</button>
              <button onClick={()=>{setError('');validateStep1()&&setStep(2)}} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:C.yellow,color:C.black,fontSize:14,fontWeight:800,cursor:'pointer'}}>Continuar →</button>
            </div>
          </>}

          {/* STEP 2 */}
          {step===2&&<>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:900,letterSpacing:-0.5,marginBottom:6}}>Sua equipe</h1>
            <p style={{fontSize:14,color:C.muted,marginBottom:28}}>Cadastre atendentes agora ou depois no painel</p>

            {attendants.map((att,i)=>(
              <div key={i} style={{background:C.black2,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8}}>Atendente {i+1}</span>
                  {i>0&&<button onClick={()=>setAttendants(p=>p.filter((_,idx)=>idx!==i))} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>✕</button>}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <input placeholder="Nome" value={att.name} onChange={e=>setAttendants(p=>p.map((a,idx)=>idx===i?{...a,name:e.target.value}:a))} style={{...inp,flex:1}}/>
                  <input placeholder="Email" type="email" value={att.email} onChange={e=>setAttendants(p=>p.map((a,idx)=>idx===i?{...a,email:e.target.value}:a))} style={{...inp,flex:1.5}}/>
                </div>
              </div>
            ))}

            <button onClick={()=>setAttendants(p=>[...p,{name:'',email:''}])} style={{width:'100%',padding:'11px',borderRadius:10,border:`1.5px dashed ${C.border}`,background:'transparent',color:C.muted,fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:28}}>
              + Adicionar atendente
            </button>

            {error&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}33`,borderRadius:8,padding:'10px 14px',fontSize:13,color:C.red,marginBottom:16}}>{error}</div>}

            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{setError('');setStep(1)}} style={{flex:1,padding:'13px',borderRadius:10,border:`1.5px solid ${C.border}`,background:'transparent',color:C.muted,fontSize:13,fontWeight:600,cursor:'pointer'}}>← Voltar</button>
              <button onClick={handleFinish} disabled={loading} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:loading?C.muted:C.yellow,color:C.black,fontSize:14,fontWeight:800,cursor:loading?'wait':'pointer'}}>
                {loading?'Criando conta...':'🚀 Criar conta'}
              </button>
            </div>
            <p style={{textAlign:'center',marginTop:14,fontSize:12,color:'#444'}}>Pode pular — adicione atendentes depois no painel</p>
          </>}
        </div>
      </div>
    </div>
  )
}
