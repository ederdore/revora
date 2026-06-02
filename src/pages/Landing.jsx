export default function Landing() {
  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --amber:#E8A020;--amber-light:#F5C158;--amber-dim:rgba(232,160,32,0.12);
          --amber-border:rgba(232,160,32,0.25);--ink:#0C0A08;--ink2:#1A1712;--ink3:#252219;
          --cream:#FAF7F2;--cream2:#F2EDE4;--stone:#9B9488;--stone2:#6B6358;
        }
        html{scroll-behavior:smooth}
        .lp-body{font-family:'Figtree',sans-serif;background:var(--cream);color:var(--ink);overflow-x:hidden}
        nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;
          justify-content:space-between;padding:0 5vw;height:64px;
          background:rgba(250,247,242,0.9);backdrop-filter:blur(12px);
          border-bottom:1px solid rgba(155,148,136,0.2)}
        .nav-logo{font-family:'Playfair Display',serif;font-size:22px;font-weight:900;color:var(--ink)}
        .nav-logo span{color:var(--amber)}
        .nav-links{display:flex;align-items:center;gap:28px}
        .nav-links a{font-size:13px;font-weight:500;color:var(--stone2);text-decoration:none;transition:color 0.2s}
        .nav-links a:hover{color:var(--ink)}
        .nav-cta{background:var(--ink);color:var(--cream);padding:9px 20px;border-radius:8px;
          font-size:13px;font-weight:700;text-decoration:none;transition:all 0.2s;border:1.5px solid var(--ink)}
        .nav-cta:hover{background:var(--amber);border-color:var(--amber);color:var(--ink)}
        .hero{min-height:100vh;display:flex;flex-direction:column;justify-content:center;
          align-items:center;text-align:center;padding:120px 5vw 80px;position:relative;overflow:hidden}
        .hero-bg{position:absolute;inset:0;background:
          radial-gradient(ellipse 80% 60% at 50% -10%,rgba(232,160,32,0.15) 0%,transparent 60%),
          radial-gradient(ellipse 50% 40% at 80% 80%,rgba(232,160,32,0.08) 0%,transparent 50%)}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:var(--ink);
          color:var(--amber-light);padding:6px 16px;border-radius:100px;font-size:11px;
          font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:28px}
        .hero h1{font-family:'Playfair Display',serif;font-size:clamp(44px,7vw,88px);font-weight:900;
          line-height:1.05;letter-spacing:-2px;color:var(--ink);max-width:900px;margin:0 auto 24px}
        .hero h1 em{font-style:italic;color:var(--amber)}
        .hero-sub{font-size:clamp(16px,2vw,20px);color:var(--stone2);font-weight:400;line-height:1.6;
          max-width:560px;margin:0 auto 40px}
        .hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
        .btn-primary{background:var(--amber);color:var(--ink);padding:16px 32px;border-radius:10px;
          font-size:15px;font-weight:800;text-decoration:none;transition:all 0.2s;border:2px solid var(--amber);
          box-shadow:0 8px 32px rgba(232,160,32,0.35);display:inline-flex;align-items:center;gap:8px}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(232,160,32,0.5)}
        .btn-ghost{background:transparent;color:var(--ink);padding:16px 32px;border-radius:10px;
          font-size:15px;font-weight:600;text-decoration:none;transition:all 0.2s;
          border:2px solid rgba(12,10,8,0.15);display:inline-flex;align-items:center;gap:8px}
        .btn-ghost:hover{border-color:var(--ink);background:var(--ink);color:var(--cream)}
        .hero-social{display:flex;align-items:center;gap:12px;margin-top:48px;font-size:12px;color:var(--stone)}
        .hero-avatars{display:flex}
        .hero-avatars span{width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--amber);
          font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;
          border:2px solid var(--cream);margin-left:-8px}
        .hero-avatars span:first-child{margin-left:0}
        .stars-row{color:var(--amber);font-size:14px;letter-spacing:1px}
        .ticker{background:var(--ink);color:var(--cream2);padding:14px 0;overflow:hidden}
        .ticker-inner{display:flex;animation:ticker 24s linear infinite;white-space:nowrap}
        .ticker-item{display:inline-flex;align-items:center;gap:12px;padding:0 40px;
          font-size:13px;font-weight:500;color:rgba(250,247,242,0.6)}
        .ticker-item strong{color:var(--amber);font-weight:700}
        .ticker-dot{width:4px;height:4px;border-radius:50%;background:var(--amber);opacity:0.5}
        section{padding:100px 5vw}
        .section-label{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
          color:var(--amber);margin-bottom:16px}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(32px,4vw,52px);
          font-weight:900;line-height:1.1;letter-spacing:-1px;color:var(--ink);margin-bottom:20px}
        .section-sub{font-size:17px;color:var(--stone2);line-height:1.7;max-width:560px}
        .how{background:var(--ink);color:var(--cream)}
        .how .section-title{color:var(--cream)}
        .how .section-sub{color:rgba(250,247,242,0.55)}
        .steps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:2px;
          margin-top:60px;background:rgba(255,255,255,0.04);border-radius:16px;overflow:hidden;
          border:1px solid rgba(255,255,255,0.06)}
        .step{padding:36px 32px;background:var(--ink2);transition:background 0.2s}
        .step:hover{background:var(--ink3)}
        .step-num{font-family:'Playfair Display',serif;font-size:56px;font-weight:900;
          color:rgba(232,160,32,0.15);line-height:1;margin-bottom:16px}
        .step h3{font-size:17px;font-weight:700;color:var(--cream);margin-bottom:10px}
        .step p{font-size:14px;color:rgba(250,247,242,0.5);line-height:1.6}
        .step-icon{width:44px;height:44px;border-radius:10px;background:var(--amber-dim);
          border:1px solid var(--amber-border);display:flex;align-items:center;justify-content:center;
          font-size:20px;margin-bottom:20px}
        .features{background:var(--cream2)}
        .features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:56px}
        .feature-card{background:var(--cream);border:1.5px solid rgba(155,148,136,0.2);
          border-radius:16px;padding:28px;transition:all 0.2s}
        .feature-card:hover{border-color:var(--amber);transform:translateY(-3px);
          box-shadow:0 16px 40px rgba(232,160,32,0.12)}
        .feature-icon{font-size:28px;margin-bottom:16px}
        .feature-card h3{font-size:17px;font-weight:700;margin-bottom:8px;color:var(--ink)}
        .feature-card p{font-size:14px;color:var(--stone2);line-height:1.65}
        .feature-tag{display:inline-block;margin-top:14px;font-size:10px;font-weight:700;
          letter-spacing:1px;text-transform:uppercase;color:var(--amber);background:var(--amber-dim);
          padding:3px 10px;border-radius:100px;border:1px solid var(--amber-border)}
        .stats{background:var(--amber);padding:60px 5vw}
        .stats-inner{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:32px;max-width:900px;margin:0 auto;text-align:center}
        .stat-value{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,60px);
          font-weight:900;color:var(--ink);line-height:1}
        .stat-label{font-size:13px;font-weight:600;color:rgba(12,10,8,0.6);margin-top:6px}
        .proof{background:var(--cream)}
        .reviews-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:56px}
        .review-card{background:var(--cream2);border:1.5px solid rgba(155,148,136,0.15);border-radius:16px;padding:24px}
        .review-stars{color:var(--amber);font-size:16px;letter-spacing:2px;margin-bottom:14px}
        .review-text{font-size:15px;color:var(--ink);line-height:1.65;font-style:italic;margin-bottom:18px}
        .review-author{display:flex;align-items:center;gap:10px}
        .review-avatar{width:38px;height:38px;border-radius:50%;background:var(--ink);color:var(--amber);
          font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .review-name{font-size:13px;font-weight:700;color:var(--ink)}
        .review-biz{font-size:11px;color:var(--stone);margin-top:2px}
        .pricing{background:var(--ink);color:var(--cream)}
        .pricing .section-title{color:var(--cream)}
        .pricing .section-sub{color:rgba(250,247,242,0.5)}
        .pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:56px;max-width:800px}
        .plan{background:var(--ink2);border:1.5px solid rgba(255,255,255,0.06);border-radius:18px;padding:32px;transition:border-color 0.2s}
        .plan:hover{border-color:rgba(232,160,32,0.4)}
        .plan.featured{background:var(--amber);border-color:var(--amber)}
        .plan-name{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(250,247,242,0.4);margin-bottom:8px}
        .plan.featured .plan-name{color:rgba(12,10,8,0.5)}
        .plan-price{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;line-height:1;color:var(--cream);margin-bottom:4px}
        .plan.featured .plan-price{color:var(--ink)}
        .plan-period{font-size:13px;color:rgba(250,247,242,0.4);margin-bottom:24px}
        .plan.featured .plan-period{color:rgba(12,10,8,0.5)}
        .plan-features{list-style:none;margin-bottom:28px}
        .plan-features li{display:flex;align-items:flex-start;gap:10px;font-size:14px;
          color:rgba(250,247,242,0.7);padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .plan.featured .plan-features li{color:rgba(12,10,8,0.7);border-bottom-color:rgba(12,10,8,0.08)}
        .plan-features li::before{content:'✓';color:var(--amber);font-weight:700;font-size:13px;flex-shrink:0;margin-top:1px}
        .plan.featured .plan-features li::before{color:var(--ink)}
        .plan-btn{display:block;width:100%;padding:13px;border-radius:9px;font-size:14px;font-weight:800;
          text-align:center;text-decoration:none;transition:all 0.2s;cursor:pointer;border:none;
          background:rgba(255,255,255,0.08);color:var(--cream)}
        .plan.featured .plan-btn{background:var(--ink);color:var(--amber)}
        .plan-badge{display:inline-block;background:var(--ink);color:var(--amber);font-size:10px;
          font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px}
        .faq{background:var(--cream2)}
        .faq-list{margin-top:48px;max-width:680px}
        .faq-item{border-bottom:1.5px solid rgba(155,148,136,0.2);padding:20px 0;cursor:pointer}
        .faq-q{display:flex;justify-content:space-between;align-items:center;font-size:16px;font-weight:700;color:var(--ink)}
        .faq-toggle{width:28px;height:28px;border-radius:50%;background:var(--amber-dim);
          border:1px solid var(--amber-border);display:flex;align-items:center;justify-content:center;
          font-size:16px;color:var(--amber);flex-shrink:0;transition:transform 0.2s}
        .faq-a{font-size:14px;color:var(--stone2);line-height:1.7;margin-top:14px;display:none}
        .faq-item.open .faq-a{display:block}
        .faq-item.open .faq-toggle{transform:rotate(45deg)}
        .cta-section{background:var(--ink);padding:120px 5vw;text-align:center;position:relative;overflow:hidden}
        .cta-section .section-title{color:var(--cream);font-size:clamp(36px,5vw,64px)}
        .cta-section .section-sub{color:rgba(250,247,242,0.5);margin:0 auto 48px}
        .cta-flags{display:flex;justify-content:center;gap:20px;margin-top:48px;font-size:13px;color:rgba(250,247,242,0.4)}
        .lp-footer{background:var(--ink);border-top:1px solid rgba(255,255,255,0.06);padding:32px 5vw;
          display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
        .lp-footer .logo{font-family:'Playfair Display',serif;font-size:18px;font-weight:900;color:var(--cream)}
        .lp-footer .logo span{color:var(--amber)}
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @media(max-width:768px){.nav-links{display:none}.pricing-grid{grid-template-columns:1fr}}
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Figtree:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      <div className="lp-body">
        <nav>
          <div className="nav-logo">Re<span>v</span>ora</div>
          <div className="nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#precos">Preços</a>
          </div>
          <a href="#precos" className="nav-cta">Começar grátis →</a>
        </nav>

        <section className="hero">
          <div className="hero-bg"></div>
          <div className="hero-eyebrow">● Reputação · Feedback · Fidelização</div>
          <h1>Transforme feedback em decisões melhores</h1>
          <p className="hero-sub">Entenda a satisfação dos seus clientes e identifique problemas antes de perder vendas</p>
          <div className="hero-actions">
            <a href="#precos" className="btn-primary">⚡ Começar gratuitamente</a>
            <a href="#como-funciona" className="btn-ghost">Testar grátis por 14 dias</a>
          </div>
          <div className="hero-social">
            <div className="hero-avatars"><span>M</span><span>A</span><span>J</span><span>C</span></div>
            <div>
              <div className="stars-row">★★★★★</div>
              <div>+230 negócios já usam o Revora</div>
            </div>
          </div>
        </section>

        <div className="ticker">
          <div className="ticker-inner">
            {[...Array(2)].map((_,x) => (
              <span key={x} style={{display:'contents'}}>
                <span className="ticker-item"><strong>+230</strong> negócios ativos <span className="ticker-dot"></span></span>
                <span className="ticker-item"><strong>+18.400</strong> avaliações geradas <span className="ticker-dot"></span></span>
                <span className="ticker-item">🇧🇷 Brasil <span className="ticker-dot"></span></span>
                <span className="ticker-item">🇵🇹 Portugal <span className="ticker-dot"></span></span>
                <span className="ticker-item">🇮🇹 Itália <span className="ticker-dot"></span></span>
                <span className="ticker-item"><strong>74%</strong> taxa de conversão média <span className="ticker-dot"></span></span>
                <span className="ticker-item">Sem app · 100% WhatsApp <span className="ticker-dot"></span></span>
              </span>
            ))}
          </div>
        </div>

        <section className="how" id="como-funciona">
          <div className="section-label">Como funciona</div>
          <div className="section-title">3 passos.<br/>Resultado imediato.</div>
          <p className="section-sub">Uma plataforma simples que cuida da sua reputação enquanto você foca no atendimento.</p>
          <div className="steps-grid">
            {[
              {n:"01",i:"👤",t:"Atendente cadastra o cliente",p:"Nome e WhatsApp em menos de 10 segundos. Funciona em qualquer celular, sem app."},
              {n:"02",i:"✓",t:"Clica em \"Finalizar\"",p:"O Revora envia automaticamente uma mensagem pedindo a nota de 1 a 5 estrelas."},
              {n:"03",i:"⭐",t:"Cliente avalia e recebe o cupom",p:"Clientes satisfeitos recebem o link do Google e um cupom. Experiências negativas geram alertas privados."},
              {n:"04",i:"📈",t:"Você vê tudo no painel",p:"Avaliações geradas, cupons enviados, conversão e alertas de clientes insatisfeitos."},
            ].map(s => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <div className="step-icon">{s.i}</div>
                <h3>{s.t}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="features" id="funcionalidades">
          <div className="section-label">Funcionalidades</div>
          <div className="section-title">Tudo que você precisa.<br/>Nada que você não usa.</div>
          <div className="features-grid">
            {[
              {i:"⭐",t:"Avaliações no Google automáticas",p:"Link direto para a página de avaliação do seu negócio. Cliente avalia em 30 segundos.",tag:"Core"},
              {i:"🎁",t:"Cupom de fidelização",p:"Após avaliar, cliente recebe automaticamente um cupom de desconto personalizado. Ele volta.",tag:"Fidelização"},
              {i:"🔔",t:"Recuperação de experiências negativas",p:"Quando um cliente não ficou satisfeito, o Revora detecta e alerta você em tempo real.",tag:"Proteção"},
              {i:"📊",t:"Painel do dono",p:"Métricas em tempo real: avaliações, cupons, conversão e histórico completo de clientes.",tag:"Gestão"},
              {i:"🔧",t:"Funciona para qualquer negócio",p:"Salão, barbearia, restaurante, oficina, petshop, loja de carros. Configure e pronto.",tag:"Flexível"},
              {i:"🌍",t:"Brasil, Portugal e Itália",p:"Mesmo produto, 3 mercados. Mensagens no idioma certo para cada país.",tag:"Multi-país"},
            ].map(f => (
              <div key={f.t} className="feature-card">
                <div className="feature-icon">{f.i}</div>
                <h3>{f.t}</h3>
                <p>{f.p}</p>
                <span className="feature-tag">{f.tag}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="stats">
          <div className="stats-inner">
            {[
              {v:"74%",l:"Taxa de conversão média"},
              {v:"+18k",l:"Avaliações geradas"},
              {v:"3x",l:"Mais avaliações em 30 dias"},
              {v:"1",l:"Clique para disparar"},
            ].map(s => (
              <div key={s.l}><div className="stat-value">{s.v}</div><div className="stat-label">{s.l}</div></div>
            ))}
          </div>
        </div>

        <section className="proof">
          <div className="section-label">Depoimentos</div>
          <div className="section-title">Negócios que já crescem com Revora</div>
          <div className="reviews-grid">
            {[
              {s:"★★★★★",t:'"Em 2 semanas saímos de 47 para 89 avaliações. Minha nota subiu de 4.1 para 4.7. Clientela nova chegando todo dia."',n:"Mariana Costa",b:"✂️ Salão M.Costa — São Paulo 🇧🇷"},
              {s:"★★★★★",t:'"Antes eu tinha que ficar pedindo avaliação na cara dura. Agora é automático e ainda tenho um painel que me avisa quando alguém ficou insatisfeito."',n:"Rui Figueiredo",b:"🔧 Auto Figueiredo — Lisboa 🇵🇹"},
              {s:"★★★★★",t:'"Il sistema è semplicissimo. Le recensioni sono aumentate del 200% in un mese. Consiglio a tutti."',n:"Giuseppe Romano",b:"🍕 Pizzeria Romano — Milano 🇮🇹"},
            ].map(r => (
              <div key={r.n} className="review-card">
                <div className="review-stars">{r.s}</div>
                <p className="review-text">{r.t}</p>
                <div className="review-author">
                  <div className="review-avatar">{r.n.charAt(0)}</div>
                  <div><div className="review-name">{r.n}</div><div className="review-biz">{r.b}</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pricing" id="precos">
          <div className="section-label">Preços</div>
          <div className="section-title">Simples.<br/>Sem surpresas.</div>
          <p className="section-sub">14 dias grátis em qualquer plano. Cancele quando quiser.</p>
          <div className="pricing-grid">
            <div className="plan">
              <div className="plan-name">Starter</div>
              <div className="plan-price">R$97</div>
              <div className="plan-period">por mês · até 100 envios</div>
              <ul className="plan-features">
                {["Envio automático pós-atendimento","Recuperação de experiências negativas","Cupom de fidelização","Painel básico","1 usuário atendente"].map(f=><li key={f}>{f}</li>)}
              </ul>
              <a href="/atendente" className="plan-btn">Começar grátis</a>
            </div>
            <div className="plan featured">
              <div className="plan-badge">Mais popular</div>
              <div className="plan-name">Pro</div>
              <div className="plan-price">R$197</div>
              <div className="plan-period">por mês · envios ilimitados</div>
              <ul className="plan-features">
                {["Tudo do Starter","Envios ilimitados","Múltiplos atendentes","Dashboard completo","Suporte prioritário","Multi-idioma PT/IT"].map(f=><li key={f}>{f}</li>)}
              </ul>
              <a href="/atendente" className="plan-btn">Começar grátis</a>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="section-label" style={{color:'var(--amber)'}}>Comece hoje</div>
          <div className="section-title">Fortaleça sua presença<br/>no Google hoje.</div>
          <p className="section-sub">Colete feedback, acompanhe a satisfação dos seus clientes e fortaleça sua presença no Google com uma plataforma simples e automatizada.</p>
          <div className="hero-actions" style={{justifyContent:'center'}}>
            <a href="/atendente" className="btn-primary" style={{fontSize:'16px',padding:'18px 36px'}}>⚡ Começar 14 dias grátis</a>
          </div>
          <div className="cta-flags">
            <span>🇧🇷 Brasil</span><span>·</span><span>🇵🇹 Portugal</span><span>·</span><span>🇮🇹 Itália</span>
          </div>
        </section>

        <footer className="lp-footer">
          <div className="logo">Re<span>v</span>ora</div>
          <p style={{fontSize:'12px',color:'rgba(250,247,242,0.3)'}}>© 2025 Revora. Todos os direitos reservados.</p>
        </footer>
      </div>
    </>
  )
}
