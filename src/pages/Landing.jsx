import { useNavigate } from 'react-router-dom'

const C = {
  black:'#0A0A0A',black2:'#111111',black3:'#1A1A1A',
  blue:'#1B4FD8',blueDim:'rgba(27,79,216,0.12)',
  yellow:'#F5C518',yellowDim:'rgba(245,197,24,0.10)',
  white:'#FFFFFF',muted:'#888888',muted2:'#555555',
  border:'rgba(255,255,255,0.08)',border2:'rgba(255,255,255,0.14)',
}
const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');`
const SEGMENTS=[
  {slug:'barbearia',emoji:'✂️',label:'Barbearia',desc:'Recorrência 15–30 dias'},
  {slug:'petshop',emoji:'🐾',label:'Pet Shop',desc:'Banho, tosa, consultas'},
  {slug:'clinica',emoji:'🏥',label:'Clínica',desc:'Saúde e bem-estar'},
  {slug:'lojas',emoji:'🛍️',label:'Loja',desc:'Varejo e serviços'},
  {slug:'concessionarias',emoji:'🚗',label:'Concessionária',desc:'Revisões e pós-venda'},
]

export default function Landing(){
  return(
    <div style={{background:C.black,color:C.white,fontFamily:"'DM Sans',sans-serif",minHeight:'100vh',overflowX:'hidden'}}>
      <style>{FONTS}</style>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::selection{background:${C.yellow};color:${C.black}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .f1{animation:fadeUp 0.6s 0.0s ease both}
        .f2{animation:fadeUp 0.6s 0.12s ease both}
        .f3{animation:fadeUp 0.6s 0.24s ease both}
        .f4{animation:fadeUp 0.6s 0.36s ease both}
        .sc:hover{border-color:rgba(245,197,24,0.4)!important;transform:translateY(-2px);background:rgba(245,197,24,0.06)!important}
        .fc:hover{border-color:rgba(27,79,216,0.4)!important;transform:translateY(-2px)}
        .by:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(245,197,24,0.35)!important}
        a{text-decoration:none}
        @media(max-width:768px){.nl{display:none!important}.segs{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,height:60,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 5vw',background:'rgba(10,10,10,0.92)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:900,letterSpacing:-0.5}}>Re<span style={{color:C.yellow}}>v</span>ora</div>
        <div className="nl" style={{display:'flex',gap:24}}>
          {[['#segmentos','Segmentos'],['#como-funciona','Como funciona'],['#precos','Preços']].map(([h,l])=>(
            <a key={h} href={h} style={{fontSize:13,fontWeight:500,color:C.muted,transition:'color 0.2s'}} onMouseOver={e=>e.target.style.color=C.white} onMouseOut={e=>e.target.style.color=C.muted}>{l}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:10}}>
          <a href="/login" style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${C.border2}`,color:C.muted,fontSize:13,fontWeight:600,transition:'all 0.2s'}} onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.3)';e.currentTarget.style.color=C.white}} onMouseOut={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.muted}}>Entrar</a>
          <a href="/cadastro" style={{padding:'8px 18px',borderRadius:8,background:C.yellow,color:C.black,fontSize:13,fontWeight:800}}>Começar grátis</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',padding:'120px 5vw 80px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-300,right:-200,width:700,height:700,borderRadius:'50%',background:`radial-gradient(circle,${C.blue}14 0%,transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`,backgroundSize:'80px 80px',pointerEvents:'none',opacity:0.35}}/>
        <div style={{position:'relative',maxWidth:860}}>
          <div className="f1" style={{display:'inline-flex',alignItems:'center',gap:8,background:C.black3,border:`1px solid ${C.border2}`,borderRadius:100,padding:'6px 16px',marginBottom:28}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:C.yellow,animation:'pulse 2s ease infinite'}}/>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.yellow}}>Plataforma de Retenção de Clientes</span>
          </div>
          <h1 className="f2" style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(42px,6.5vw,84px)',fontWeight:900,lineHeight:1.04,letterSpacing:-2.5,marginBottom:24}}>
            Entenda, retenha e<br/><span style={{color:C.yellow}}>recupere</span> seus clientes.
          </h1>
          <p className="f3" style={{fontSize:'clamp(15px,1.8vw,19px)',color:'#AAAAAA',lineHeight:1.65,maxWidth:560,marginBottom:40}}>
            O Revora combina feedback, recorrência e inteligência para identificar clientes em risco — antes que eles saiam pela porta.
          </p>
          <div className="f4" style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:60}}>
            <a href="/cadastro" className="by" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'14px 30px',borderRadius:10,background:C.yellow,color:C.black,fontSize:15,fontWeight:800,boxShadow:'0 8px 24px rgba(245,197,24,0.25)',transition:'all 0.2s'}}>⚡ Começar grátis — 14 dias</a>
            <a href="#como-funciona" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'14px 24px',borderRadius:10,border:`2px solid ${C.border2}`,color:C.muted,fontSize:14,fontWeight:600}}>Como funciona →</a>
          </div>
          <div className="f4" style={{display:'flex',gap:40,flexWrap:'wrap'}}>
            {[['74%','conversão média'],['+18k','avaliações geradas'],['3x','mais retenção'],['🇧🇷🇵🇹🇮🇹','3 mercados']].map(([v,l])=>(
              <div key={l}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:900,color:C.yellow}}>{v}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div style={{background:C.yellow,padding:'13px 0',overflow:'hidden'}}>
        <div style={{display:'flex',animation:'ticker 22s linear infinite',whiteSpace:'nowrap'}}>
          {[...Array(2)].map((_,x)=>(
            <span key={x} style={{display:'contents'}}>
              {['NPS + CSAT + CES','Google Reviews','Clientes em risco','Retenção inteligente','Cupom automático','Sem API · WhatsApp','Brasil · Portugal · Itália'].map(item=>(
                <span key={item} style={{display:'inline-flex',alignItems:'center',gap:20,padding:'0 32px',fontSize:13,fontWeight:700,color:C.black}}>{item}<span style={{opacity:0.35}}>·</span></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* SEGMENTOS */}
      <section id="segmentos" style={{padding:'100px 5vw',background:C.black}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.yellow,marginBottom:14}}>Segmentos</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,letterSpacing:-1,marginBottom:14}}>Feito para o seu negócio.</h2>
            <p style={{fontSize:16,color:C.muted,maxWidth:500}}>Cada segmento tem sua própria lógica de recorrência, pesquisa e recuperação.</p>
          </div>
          <div className="segs" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
            {SEGMENTS.map(s=>(
              <a key={s.slug} href={`/${s.slug}`} className="sc" style={{display:'block',background:C.black2,border:`1.5px solid ${C.border}`,borderRadius:14,padding:'20px 16px',transition:'all 0.2s'}}>
                <div style={{fontSize:28,marginBottom:10}}>{s.emoji}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:12,color:C.muted}}>{s.desc}</div>
                <div style={{marginTop:12,fontSize:11,color:C.yellow,fontWeight:700}}>Ver mais →</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" style={{padding:'100px 5vw',background:C.black2,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:56}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.yellow,marginBottom:14}}>Como funciona</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,letterSpacing:-1}}>Feedback. Jornada. Retenção.</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
            {[
              {icon:'📋',color:C.blue,title:'Coleta de feedback',desc:'NPS, CSAT, CES e Google Reviews automáticos após cada atendimento.'},
              {icon:'🔄',color:C.yellow,title:'Jornada de retorno',desc:'O sistema sabe quando cada cliente deveria voltar baseado no serviço.'},
              {icon:'⚠️',color:'#EF4444',title:'Clientes em risco',desc:'Cliente passou do prazo sem voltar? Você recebe alerta imediato.'},
              {icon:'🎯',color:C.blue,title:'Recuperação inteligente',desc:'Ação automática: oferta, cupom ou contato baseado no perfil do cliente.'},
            ].map(f=>(
              <div key={f.title} className="fc" style={{background:C.black,border:`1.5px solid ${C.border}`,borderRadius:14,padding:24,transition:'all 0.2s'}}>
                <div style={{width:44,height:44,borderRadius:10,background:`${f.color}15`,border:`1px solid ${f.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:16}}>{f.icon}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>{f.title}</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.65}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section style={{padding:'100px 5vw',background:C.black}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{marginBottom:48}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.yellow,marginBottom:14}}>Roadmap</div>
            <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(26px,3.5vw,44px)',fontWeight:900,letterSpacing:-1}}>Mais inteligente a cada versão.</h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:2,background:C.border,borderRadius:16,overflow:'hidden'}}>
            {[
              {v:'V1',label:'Disponível',color:C.yellow,items:['Feedback automático','NPS · CSAT · CES','Google Reviews','QR Code + wa.me','Cupom fidelização']},
              {v:'V2',label:'Em breve',color:C.blue,items:['Jornada de retorno','Recorrência por serviço','Cliente em risco','Auth + multi-empresa','Alertas inteligentes']},
              {v:'V3',label:'Roadmap',color:C.muted2,items:['IA de diagnóstico','Saudável / Em risco','Insatisfeito / Promotor','Sugestão de ações','Score de retenção']},
              {v:'V4',label:'Roadmap',color:C.muted2,items:['Programa VIP','Indicações rastreadas','WhatsApp API oficial','Multi-idioma nativo','Fidelização avançada']},
            ].map((item,i)=>(
              <div key={item.v} style={{background:C.black2,padding:'32px 24px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:900,color:item.color}}>{item.v}</span>
                  <span style={{fontSize:10,fontWeight:700,background:`${item.color}18`,color:item.color,padding:'2px 8px',borderRadius:100,border:`1px solid ${item.color}30`}}>{item.label}</span>
                </div>
                <ul style={{listStyle:'none'}}>
                  {item.items.map(it=>(
                    <li key={it} style={{fontSize:13,color:i<1?'#AAAAAA':C.muted2,padding:'5px 0',borderBottom:`1px solid ${C.border}`,display:'flex',gap:8}}>
                      <span style={{color:item.color,fontWeight:700,flexShrink:0}}>{i<1?'✓':'·'}</span>{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precos" style={{padding:'100px 5vw',background:C.black2,borderTop:`1px solid ${C.border}`}}>
        <div style={{maxWidth:800,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:C.yellow,marginBottom:14}}>Preços</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(28px,4vw,48px)',fontWeight:900,letterSpacing:-1,marginBottom:12}}>Simples. Sem surpresas.</h2>
          <p style={{fontSize:15,color:C.muted,marginBottom:48}}>14 dias grátis · Sem cartão · Cancele quando quiser</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[
              {name:'Starter',price:'R$97',period:'/mês · até 100 envios',features:['Feedback pós-atendimento','NPS + CSAT automático','Google Reviews','Cupom de fidelização','1 atendente'],featured:false},
              {name:'Pro',price:'R$197',period:'/mês · ilimitado',features:['Tudo do Starter','Envios ilimitados','Múltiplos atendentes','Clientes em risco (V2)','Dashboard avançado','Suporte prioritário'],featured:true},
            ].map(plan=>(
              <div key={plan.name} style={{background:plan.featured?C.yellow:C.black,border:`1.5px solid ${plan.featured?C.yellow:C.border}`,borderRadius:16,padding:'28px 24px',textAlign:'left'}}>
                {plan.featured&&<div style={{fontSize:10,fontWeight:700,background:C.black,color:C.yellow,padding:'3px 10px',borderRadius:100,display:'inline-block',marginBottom:12,letterSpacing:1}}>MAIS POPULAR</div>}
                <div style={{fontSize:11,fontWeight:700,color:plan.featured?'rgba(0,0,0,0.5)':C.muted,letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>{plan.name}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:44,fontWeight:900,color:plan.featured?C.black:C.white,lineHeight:1,marginBottom:4}}>{plan.price}</div>
                <div style={{fontSize:13,color:plan.featured?'rgba(0,0,0,0.5)':C.muted,marginBottom:24}}>{plan.period}</div>
                <ul style={{listStyle:'none',marginBottom:24}}>
                  {plan.features.map(f=>(
                    <li key={f} style={{display:'flex',gap:8,fontSize:13,color:plan.featured?C.black:'#AAAAAA',padding:'7px 0',borderBottom:`1px solid ${plan.featured?'rgba(0,0,0,0.1)':C.border}`}}>
                      <span style={{color:plan.featured?C.black:C.yellow,fontWeight:700}}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href="/cadastro" style={{display:'block',padding:'13px',borderRadius:9,textAlign:'center',fontSize:14,fontWeight:800,background:plan.featured?C.black:C.yellow,color:plan.featured?C.yellow:C.black}}>Começar grátis</a>
              </div>
            ))}
          </div>
          <p style={{marginTop:20,fontSize:12,color:C.muted2}}>Portugal e Itália: €29/mês Starter · €59/mês Pro</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'120px 5vw',background:C.black,textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:700,height:700,borderRadius:'50%',background:`radial-gradient(circle,${C.blue}10 0%,transparent 65%)`,pointerEvents:'none'}}/>
        <div style={{position:'relative'}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:'clamp(32px,5vw,68px)',fontWeight:900,letterSpacing:-2,marginBottom:20}}>
            Pare de perder clientes<br/><span style={{color:C.yellow}}>que você já conquistou.</span>
          </h2>
          <p style={{fontSize:16,color:C.muted,maxWidth:480,margin:'0 auto 40px',lineHeight:1.7}}>Entenda, retenha e recupere seus clientes com uma plataforma simples e automatizada.</p>
          <a href="/cadastro" className="by" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'16px 36px',borderRadius:12,background:C.yellow,color:C.black,fontSize:16,fontWeight:800,boxShadow:'0 8px 24px rgba(245,197,24,0.25)',transition:'all 0.2s'}}>⚡ Começar 14 dias grátis</a>
          <div style={{display:'flex',justifyContent:'center',gap:24,marginTop:36,fontSize:13,color:C.muted2}}>
            <span>🇧🇷 Brasil</span><span>·</span><span>🇵🇹 Portugal</span><span>·</span><span>🇮🇹 Itália</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:C.black2,borderTop:`1px solid ${C.border}`,padding:'28px 5vw',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:900}}>Re<span style={{color:C.yellow}}>v</span>ora</div>
        <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
          {SEGMENTS.map(s=>(
            <a key={s.slug} href={`/${s.slug}`} style={{fontSize:12,color:C.muted2}} onMouseOver={e=>e.target.style.color=C.white} onMouseOut={e=>e.target.style.color=C.muted2}>{s.emoji} {s.label}</a>
          ))}
        </div>
        <div style={{fontSize:11,color:'#333'}}>© 2025 Revora</div>
      </footer>
    </div>
  )
}
