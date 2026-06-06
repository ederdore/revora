import { useNavigate, useLocation } from 'react-router-dom'

const C = {
  black:'#0A0A0A',black2:'#111111',black3:'#1A1A1A',
  blue:'#1B4FD8',blueDim:'rgba(27,79,216,0.12)',
  yellow:'#F5C518',yellowDim:'rgba(245,197,24,0.10)',
  white:'#FFFFFF',muted:'#888888',muted2:'#555555',
  border:'rgba(255,255,255,0.08)',border2:'rgba(255,255,255,0.14)',
}

const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`

const SEGMENTS = {
  barbearia: {
    slug:'barbearia', emoji:'✂️', name:'Barbearia',
    headline:'Mais clientes voltando.', headline2:'Menos cadeira vazia.',
    sub:'O Revora monitora satisfação, avisa quando alguém sumiu e automatiza avaliações no Google — tudo pelo WhatsApp.',
    color: C.yellow, isYellow: true,
    // Unsplash free-to-use images
    heroImg:'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80&auto=format&fit=crop',
    heroAlt:'Barbearia moderna',
    sectionImg:'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&auto=format&fit=crop',
    stats:[{v:'30 dias',l:'recorrência média'},{v:'74%',l:'taxa de retorno'},{v:'3x',l:'mais avaliações'}],
    features:[
      {icon:'📅',title:'Retorno programado',desc:'Sistema avisa o cliente quando está na hora de voltar. Barbearia tem recorrência — explore isso.'},
      {icon:'⭐',title:'Avaliações no Google',desc:'Após cada atendimento, cliente recebe link direto para avaliar. Automaticamente.'},
      {icon:'🔔',title:'Cliente sumiu? Você sabe.',desc:'Se o cliente passou do prazo esperado, você recebe alerta e pode agir antes de perdê-lo.'},
      {icon:'🎁',title:'Cupom de retorno',desc:'Cliente satisfeito ganha cupom automático. Ele volta. Simples assim.'},
    ],
    testimonial:{text:'"Em 3 semanas minha nota no Google foi de 4.1 para 4.8. Clientes novos chegando toda semana."',name:'Rodrigo Mendes',biz:'💈 Barbearia Mendes — São Paulo'},
    cta:'Testar 14 dias grátis',
  },
  petshop: {
    slug:'petshop', emoji:'🐾', name:'Pet Shop',
    headline:'Dono de pet paga bem.', headline2:'Garanta que ele volte sempre.',
    sub:'O Revora avisa quando o banho está vencendo, coleta avaliações automaticamente e identifica clientes que pararam de aparecer.',
    color: C.blue, isYellow: false,
    heroImg:'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&q=80&auto=format&fit=crop',
    heroAlt:'Pet shop cachorro',
    sectionImg:'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80&auto=format&fit=crop',
    stats:[{v:'21 dias',l:'retorno médio banho'},{v:'68%',l:'taxa de retenção'},{v:'2.4x',l:'LTV com retorno'}],
    features:[
      {icon:'🔔',title:'Lembrete de banho automático',desc:'Sistema calcula quando o pet precisa voltar e manda mensagem no WhatsApp do dono.'},
      {icon:'⭐',title:'Avaliações no Google',desc:'Após cada atendimento, coleta avaliação automaticamente. Sem você fazer nada.'},
      {icon:'📊',title:'Saúde da carteira',desc:'Veja quais clientes estão saudáveis, em risco ou sumidos — numa única tela.'},
      {icon:'🎁',title:'Cupom de fidelização',desc:'Dono fiel recebe benefício automático. Ele volta. O pet também.'},
    ],
    testimonial:{text:'"Recuperei 12 clientes em 1 mês. O sistema me avisa quem sumiu e eu mando mensagem na hora."',name:'Fernanda Lima',biz:'🐾 PetCare Fernanda — Curitiba'},
    cta:'Começar grátis agora',
  },
  clinica: {
    slug:'clinica', emoji:'🏥', name:'Clínica',
    headline:'Paciente satisfeito volta.', headline2:'E indica. Automatize isso.',
    sub:'O Revora coleta NPS, CSAT e avaliações Google de forma automática — e avisa quando um paciente está em risco de abandono.',
    color: C.blue, isYellow: false,
    heroImg:'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop',
    heroAlt:'Clínica médica',
    sectionImg:'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format&fit=crop',
    stats:[{v:'180 dias',l:'retorno médio'},{v:'89%',l:'satisfação captada'},{v:'-28%',l:'abandono pós-Revora'}],
    features:[
      {icon:'📋',title:'NPS + CSAT automático',desc:'Pesquisa de satisfação enviada após cada atendimento. Resultados em tempo real.'},
      {icon:'⭐',title:'Google Reviews',desc:'Pacientes satisfeitos são direcionados para o Google. Insatisfeitos, para você resolver.'},
      {icon:'🔄',title:'Retorno programado',desc:'Sistema calcula quando o paciente deveria retornar e avisa se passar do prazo.'},
      {icon:'⚠️',title:'Alertas de risco',desc:'Identificação automática de pacientes que pararam de vir — antes que seja tarde.'},
    ],
    testimonial:{text:'"Tenho 800 pacientes. Nunca consegui acompanhar todos. Agora o sistema faz isso por mim."',name:'Dra. Ana Beatriz',biz:'🏥 Clínica AB — Belo Horizonte'},
    cta:'Testar 14 dias grátis',
  },
  lojas: {
    slug:'lojas', emoji:'🛍️', name:'Loja',
    headline:'Cliente comprou uma vez?', headline2:'Faça ele voltar sempre.',
    sub:'O Revora transforma compradores ocasionais em clientes recorrentes — com pesquisa de satisfação, cupom automático e alertas de risco.',
    color: C.yellow, isYellow: true,
    heroImg:'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80&auto=format&fit=crop',
    heroAlt:'Loja de varejo',
    sectionImg:'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80&auto=format&fit=crop',
    stats:[{v:'45 dias',l:'retorno médio'},{v:'41%',l:'taxa 2ª compra'},{v:'5x',l:'custo menor reter'}],
    features:[
      {icon:'📊',title:'Satisfação em tempo real',desc:'NPS e CSAT automáticos após cada compra. Você sabe como está a experiência.'},
      {icon:'⭐',title:'Avaliações no Google',desc:'Cliente satisfeito recebe link para avaliar automaticamente. Reputação cresce sozinha.'},
      {icon:'🎁',title:'Cupom inteligente',desc:'Clientes fiéis recebem desconto automático. Sumidos recebem oferta de reativação.'},
      {icon:'📈',title:'Dashboard de retenção',desc:'Veja promotores, clientes em risco e perdidos — e aja antes de perdê-los.'},
    ],
    testimonial:{text:'"Em 45 dias minha taxa de segunda compra subiu de 22% para 41%. O cupom automático foi o diferencial."',name:'Carlos Augusto',biz:'🛍️ Loja Augusta — Porto Alegre'},
    cta:'Começar agora',
  },
  concessionarias: {
    slug:'concessionarias', emoji:'🚗', name:'Concessionária',
    headline:'Do test drive à revisão.', headline2:'Nunca perca o cliente.',
    sub:'O Revora acompanha todo o ciclo do cliente — da compra à manutenção — coletando satisfação e identificando quem está em risco.',
    color: C.blue, isYellow: false,
    heroImg:'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80&auto=format&fit=crop',
    heroAlt:'Concessionária de carros',
    sectionImg:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80&auto=format&fit=crop',
    stats:[{v:'365 dias',l:'ciclo revisão'},{v:'-35%',l:'abandono revisão'},{v:'3.2x',l:'LTV com retenção'}],
    features:[
      {icon:'🔔',title:'Lembrete de revisão',desc:'Sistema calcula quando o cliente precisa de revisão e avisa automaticamente.'},
      {icon:'⭐',title:'NPS + Google Reviews',desc:'Coleta satisfação após compra e pós-revisão. Identificação automática de promotores.'},
      {icon:'📊',title:'Ciclo completo do cliente',desc:'Histórico de compras, revisões, satisfação e risco de churn numa tela só.'},
      {icon:'⚠️',title:'Alerta de perda iminente',desc:'Cliente não retornou para revisão? Você recebe alerta com oferta personalizada.'},
    ],
    testimonial:{text:'"Reduzimos abandono de revisões em 35% no primeiro trimestre. O sistema identifica risco antes de perder o cliente."',name:'Marcelo Teixeira',biz:'🚗 AutoTeixeira — Campinas'},
    cta:'Agendar demonstração',
  },
}

export default function SegmentLanding() {
  const { pathname } = useLocation()
  const segment = pathname.replace('/', '')
  const s = SEGMENTS[segment]
  if (!s) { window.location.href = '/'; return null }

  const ac = s.color
  const isY = s.isYellow

  return (
    <div style={{background:C.black,color:C.white,fontFamily:"'DM Sans',sans-serif",minHeight:'100vh',overflowX:'hidden'}}>
      <style>{FONTS}</style>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::selection{background:${ac};color:${isY?C.black:C.white}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .f1{animation:fadeUp 0.6s 0.0s ease both}
        .f2{animation:fadeUp 0.6s 0.12s ease both}
        .f3{animation:fadeUp 0.6s 0.24s ease both}
        .f4{animation:fadeUp 0.6s 0.36s ease both}
        .fc:hover{border-color:${ac}44!important;transform:translateY(-3px)}
        .by:hover{transform:translateY(-2px);box-shadow:0 16px 40px ${ac}44!important}
        a{text-decoration:none}
        @media(max-width:768px){.nl{display:none!important}.hero-grid{grid-template-columns:1fr!important}.feat-grid{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,height:60,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 5vw',background:'rgba(10,10,10,0.92)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${C.border}`}}>
        <a href="/" style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:900,letterSpacing:-0.5,color:C.white}}>
          Re<span style={{color:ac}}>v</span>ora
          <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:700,color:ac,background:`${ac}18`,padding:'2px 9px',borderRadius:100,marginLeft:8,border:`1px solid ${ac}33`}}>{s.emoji} {s.name}</span>
        </a>
        <div className="nl" style={{display:'flex',gap:24}}>
          {[['#como-funciona','Como funciona'],['#precos','Preços']].map(([h,l])=>(
            <a key={h} href={h} style={{fontSize:13,fontWeight:500,color:C.muted,transition:'color 0.2s'}} onMouseOver={e=>e.target.style.color=C.white} onMouseOut={e=>e.target.style.color=C.muted}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <a href="/login" style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border2}`,color:C.muted,fontSize:13,fontWeight:600}}>Entrar</a>
          <a href={`/cadastro?segmento=${s.slug}`} style={{padding:'8px 18px',borderRadius:8,background:ac,color:isY?C.black:C.white,fontSize:13,fontWeight:800}}>{s.cta}</a>
        </div>
      </nav>

      {/* HERO — grid com foto */}
      <section style={{minHeight:'100vh',display:'grid',gridTemplateColumns:'1fr 1fr',alignItems:'center',padding:'80px 5vw 60px',gap:60,position:'relative',overflow:'hidden'}} className="hero-grid">
        <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`,backgroundSize:'80px 80px',opacity:0.3,pointerEvents:'none'}}/>

        {/* Left text */}
        <div style={{position:'relative',zIndex:1}}>
          <div className="f1" style={{display:'inline-flex',alignItems:'center',gap:8,background:C.black3,border:`1px solid ${C.border2}`,borderRadius:100,padding:'6px 16px',marginBottom:28}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:ac,animation:'pulse 2s ease infinite'}}/>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:ac}}>Para {s.name}s</span>
          </div>
          <h1 className="f2" style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(36px,5vw,68px)',fontWeight:900,lineHeight:1.05,letterSpacing:-2,marginBottom:8}}>
            {s.headline}
          </h1>
          <h1 className="f2" style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(36px,5vw,68px)',fontWeight:900,lineHeight:1.05,letterSpacing:-2,color:ac,marginBottom:24}}>
            {s.headline2}
          </h1>
          <p className="f3" style={{fontSize:'clamp(15px,1.6vw,18px)',color:'#AAAAAA',lineHeight:1.65,maxWidth:520,marginBottom:36}}>
            {s.sub}
          </p>
          <div className="f4" style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:48}}>
            <a href={`/cadastro?segmento=${s.slug}`} className="by" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'14px 28px',borderRadius:10,background:ac,color:isY?C.black:C.white,fontSize:15,fontWeight:800,boxShadow:`0 8px 24px ${ac}33`,transition:'all 0.2s'}}>
              ⚡ {s.cta}
            </a>
            <a href="#como-funciona" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'14px 20px',borderRadius:10,border:`2px solid ${C.border2}`,color:C.muted,fontSize:14,fontWeight:600,transition:'all 0.2s'}} onMouseOver={e=>{e.currentTarget.style.color=C.white;e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'}} onMouseOut={e=>{e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor=C.border2}}>
              Como funciona →
            </a>
          </div>
          {/* Stats row */}
          <div className="f4" style={{display:'flex',gap:32,flexWrap:'wrap'}}>
            {s.stats.map(st=>(
              <div key={st.l}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:900,color:ac}}>{st.v}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{st.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — hero image */}
        <div className="f3" style={{position:'relative',zIndex:1}}>
          <div style={{borderRadius:20,overflow:'hidden',position:'relative',boxShadow:`0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${C.border}`}}>
            <img src={s.heroImg} alt={s.heroAlt} style={{width:'100%',height:480,objectFit:'cover',display:'block'}}
              onError={e=>{e.target.style.display='none'}}/>
            {/* Overlay gradient */}
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:'50%',background:'linear-gradient(transparent,rgba(10,10,10,0.8))'}}/>
            {/* Floating card */}
            <div style={{position:'absolute',bottom:20,left:20,right:20,background:'rgba(10,10,10,0.85)',backdropFilter:'blur(12px)',borderRadius:12,padding:'14px 16px',border:`1px solid ${C.border2}`}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:`${ac}20`,border:`2px solid ${ac}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{s.emoji}</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>Novo cliente avaliou</div>
                  <div style={{fontSize:11,color:C.muted}}>⭐⭐⭐⭐⭐ · agora mesmo</div>
                </div>
                <div style={{marginLeft:'auto',padding:'4px 10px',borderRadius:100,background:`${ac}20`,border:`1px solid ${ac}40`,fontSize:11,fontWeight:700,color:ac}}>+1 avaliação</div>
              </div>
            </div>
          </div>
          {/* Decorative blob */}
          <div style={{position:'absolute',top:-40,right:-40,width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${ac}18 0%,transparent 70%)`,pointerEvents:'none'}}/>
        </div>
      </section>

      {/* TICKER */}
      <div style={{background:ac,padding:'13px 0',overflow:'hidden'}}>
        <div style={{display:'flex',animation:'ticker 20s linear infinite',whiteSpace:'nowrap'}}>
          {[...Array(2)].map((_,x)=>(
            <span key={x} style={{display:'contents'}}>
              {['Feedback automático','NPS + CSAT','Google Reviews','Clientes em risco','Retenção inteligente','Cupom automático',`Para ${s.name}s`,'Brasil · Portugal · Itália'].map(item=>(
                <span key={item} style={{display:'inline-flex',alignItems:'center',gap:20,padding:'0 32px',fontSize:13,fontWeight:700,color:isY?C.black:C.white}}>
                  {item}<span style={{opacity:0.35}}>·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="como-funciona" style={{padding:'100px 5vw',background:C.black2,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}}>
          {/* Left — section image */}
          <div style={{borderRadius:16,overflow:'hidden',boxShadow:`0 24px 60px rgba(0,0,0,0.5)`,border:`1px solid ${C.border}`}}>
            <img src={s.sectionImg} alt={s.name} style={{width:'100%',height:400,objectFit:'cover',display:'block'}}
              onError={e=>{e.target.parentElement.style.display='none'}}/>
          </div>
          {/* Right — steps */}
          <div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:ac,marginBottom:14}}>Como funciona</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(26px,3.5vw,44px)',fontWeight:900,letterSpacing:-1,marginBottom:32}}>
              Simples para sua equipe.<br/>Poderoso para seu negócio.
            </h2>
            {[
              {n:'01',t:'Atendente cadastra',d:`Nome e WhatsApp em 10 segundos. Nenhum app necessário.`},
              {n:'02',t:'Cliente recebe pesquisa',d:`Mensagem automática no WhatsApp com fluxo de nota inteligente.`},
              {n:'03',t:'Avaliação + cupom',d:`Nota alta → Google + cupom. Nota baixa → alerta privado para você.`},
              {n:'04',t:'Você vê tudo',d:`Dashboard com satisfação, riscos, avaliações e métricas.`},
            ].map((step,i)=>(
              <div key={step.n} style={{display:'flex',gap:14,marginBottom:20,paddingBottom:20,borderBottom:i<3?`1px solid ${C.border}`:'none'}}>
                <div style={{width:32,height:32,borderRadius:'50%',border:`2px solid ${ac}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:900,color:ac}}>{step.n}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{step.t}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{step.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'80px 5vw',background:C.black}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:ac,marginBottom:14}}>Funcionalidades</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(26px,4vw,44px)',fontWeight:900,letterSpacing:-1}}>Feito para {s.name.toLowerCase()}.</h2>
          </div>
          <div className="feat-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {s.features.map(f=>(
              <div key={f.title} className="fc" style={{background:C.black2,border:`1.5px solid ${C.border}`,borderRadius:14,padding:24,transition:'all 0.2s'}}>
                <div style={{width:44,height:44,borderRadius:10,background:`${ac}12`,border:`1px solid ${ac}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:16}}>{f.icon}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{f.title}</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.65}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{padding:'80px 5vw',background:C.black2,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:680,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16,opacity:0.2}}>"</div>
          <p style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(17px,2.5vw,24px)',fontWeight:700,lineHeight:1.5,letterSpacing:-0.5,marginBottom:24}}>
            {s.testimonial.text}
          </p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:`${ac}20`,border:`2px solid ${ac}40`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:16,color:ac}}>
              {s.testimonial.name.charAt(0)}
            </div>
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:14,fontWeight:700}}>{s.testimonial.name}</div>
              <div style={{fontSize:12,color:C.muted}}>{s.testimonial.biz}</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" style={{padding:'100px 5vw',background:C.black}}>
        <div style={{maxWidth:780,margin:'0 auto'}}>
          <div style={{marginBottom:48,textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:ac,marginBottom:14}}>Preços</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,letterSpacing:-1}}>Simples. Sem surpresas.</h2>
            <p style={{fontSize:15,color:C.muted,marginTop:10}}>14 dias grátis · Cancele quando quiser · BR · PT · IT</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[
              {name:'Starter',price:'R$97',period:'/mês · até 100 envios',features:['Pesquisa pós-atendimento','Google Reviews automático','Alerta nota baixa','Cupom de fidelização','1 atendente'],featured:false},
              {name:'Pro',price:'R$197',period:'/mês · ilimitado',features:['Tudo do Starter','Envios ilimitados','Múltiplos atendentes','Clientes em risco','Dashboard avançado','Suporte prioritário'],featured:true},
            ].map(plan=>(
              <div key={plan.name} style={{background:plan.featured?ac:C.black2,border:`1.5px solid ${plan.featured?ac:C.border}`,borderRadius:16,padding:'28px 24px'}}>
                {plan.featured&&<div style={{fontSize:10,fontWeight:700,background:C.black,color:ac,padding:'3px 10px',borderRadius:100,display:'inline-block',marginBottom:12,letterSpacing:1}}>MAIS POPULAR</div>}
                <div style={{fontSize:11,fontWeight:700,color:plan.featured?(isY?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.5)'):C.muted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>{plan.name}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:44,fontWeight:900,color:plan.featured?(isY?C.black:C.white):C.white,lineHeight:1,marginBottom:4}}>{plan.price}</div>
                <div style={{fontSize:13,color:plan.featured?(isY?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.5)'):C.muted,marginBottom:24}}>{plan.period}</div>
                <ul style={{listStyle:'none',marginBottom:24}}>
                  {plan.features.map(f=>(
                    <li key={f} style={{display:'flex',gap:8,fontSize:13,color:plan.featured?(isY?C.black:'rgba(255,255,255,0.85)'):'#AAAAAA',padding:'7px 0',borderBottom:`1px solid ${plan.featured?(isY?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.12)'):C.border}`}}>
                      <span style={{color:plan.featured?(isY?C.black:C.yellow):ac,fontWeight:700}}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href={`/cadastro?segmento=${s.slug}`} style={{display:'block',padding:'13px',borderRadius:9,textAlign:'center',fontSize:14,fontWeight:800,background:plan.featured?(isY?C.black:'rgba(255,255,255,0.15)'):ac,color:plan.featured?(isY?ac:C.white):(isY?C.black:C.white)}}>
                  Começar grátis
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{padding:'120px 5vw',background:C.black2,textAlign:'center',borderTop:`1px solid ${C.border}`,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:600,borderRadius:'50%',background:`radial-gradient(circle,${ac}10 0%,transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'relative'}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(30px,5vw,60px)',fontWeight:900,letterSpacing:-2,marginBottom:16}}>
            Pare de perder clientes<br/><span style={{color:ac}}>que você já conquistou.</span>
          </h2>
          <p style={{fontSize:15,color:C.muted,maxWidth:460,margin:'0 auto 36px',lineHeight:1.7}}>
            Entenda, retenha e recupere seus clientes com uma plataforma simples e automatizada.
          </p>
          <a href={`/cadastro?segmento=${s.slug}`} className="by" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'16px 36px',borderRadius:12,background:ac,color:isY?C.black:C.white,fontSize:16,fontWeight:800,boxShadow:`0 8px 24px ${ac}25`,transition:'all 0.2s'}}>
            ⚡ {s.cta}
          </a>
          <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:32,fontSize:13,color:C.muted2}}>
            <span>🇧🇷 Brasil</span><span>·</span><span>🇵🇹 Portugal</span><span>·</span><span>🇮🇹 Itália</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:C.black,borderTop:`1px solid ${C.border}`,padding:'24px 5vw',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
        <a href="/" style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:900,color:C.white}}>Re<span style={{color:ac}}>v</span>ora</a>
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          {Object.values(SEGMENTS).map(sg=>(
            <a key={sg.slug} href={`/${sg.slug}`} style={{fontSize:12,color:sg.slug===segment?ac:C.muted2,fontWeight:sg.slug===segment?700:400}} onMouseOver={e=>e.target.style.color=C.white} onMouseOut={e=>e.target.style.color=sg.slug===segment?ac:C.muted2}>
              {sg.emoji} {sg.name}
            </a>
          ))}
        </div>
        <div style={{fontSize:11,color:'#333'}}>© 2025 Revora</div>
      </footer>
    </div>
  )
}
