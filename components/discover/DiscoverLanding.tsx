'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './DiscoverLanding.module.css'

/* ── Lead data (demo) ─────────────────────── */
const LEADS = [
  { name: 'NutriSport Lisboa',      city: 'Lisboa',   cat: 'Ginásio',       score: 94, cls: 'A', ai: 'Excelente fit — nutrição desportiva' },
  { name: 'Farmácia Saúde Porto',   city: 'Porto',    cat: 'Farmácia',      score: 88, cls: 'A', ai: 'Alta autoridade local, contacto direto' },
  { name: 'Green Life Store',       city: 'Braga',    cat: 'Loja Natural',  score: 82, cls: 'A', ai: 'Nicho alinhado, presença digital forte' },
  { name: 'Dra. Ana Nutrição',      city: 'Lisboa',   cat: 'Nutricionista', score: 79, cls: 'B', ai: 'Influência regional, clínica própria' },
  { name: 'CrossFit Cascais',       city: 'Cascais',  cat: 'Ginásio',       score: 76, cls: 'B', ai: 'Comunidade ativa, sem parceiro atual' },
  { name: 'Wellness Clinic Sintra', city: 'Sintra',   cat: 'Clínica',       score: 71, cls: 'B', ai: 'Público premium, abordagem diferenciada' },
  { name: 'Body & Mind Studio',     city: 'Setúbal',  cat: 'Studio',        score: 63, cls: 'B', ai: 'Crescimento recente, oportunidade' },
  { name: 'Herbolário Coimbra',     city: 'Coimbra',  cat: 'Loja Natural',  score: 58, cls: 'C', ai: 'Presença digital limitada' },
]

type Lead = typeof LEADS[number]

/* ── Score bar fill widths ────────────────── */
const BAR_WIDTHS: Record<string, string> = { A: '94%', B: '76%', C: '58%', D: '35%' }

/* ── Sub-components ───────────────────────── */
function ClassBadge({ cls }: { cls: string }) {
  return <span className={`${styles.classBadge} ${styles[`class${cls}`]}`}>{cls}</span>
}

function LiveTable({ rows }: { rows: Lead[] }) {
  const classA = rows.filter(r => r.cls === 'A').length
  const classB = rows.filter(r => r.cls === 'B').length

  return (
    <div className={styles.liveTableWrapper}>
      <div className={styles.liveTableHeader}>
        <div className={styles.liveLabel}>
          <span className={styles.liveDot} />
          Análise em tempo real
        </div>
        <span className={styles.liveCount}>
          {rows.length} / 47 empresas analisadas
        </span>
      </div>

      <div className={styles.liveTable}>
        <div className={styles.tableHead}>
          <div>Empresa</div>
          <div className={styles.colCity}>Cidade</div>
          <div className={styles.colCat}>Categoria</div>
          <div>Score</div>
          <div>Classe</div>
          <div className={styles.colAi}>IA</div>
        </div>

        <div>
          {rows.map((lead, i) => (
            <div
              key={lead.name}
              className={styles.tableRow}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={styles.rowName}>{lead.name}</div>
              <div className={`${styles.rowMeta} ${styles.colCity}`}>{lead.city}</div>
              <div className={`${styles.rowMeta} ${styles.colCat}`}>{lead.cat}</div>
              <div className={styles.scoreBarWrap}>
                <span className={styles.scoreNum}>{lead.score}</span>
                <div className={styles.scoreBar}>
                  <div
                    className={styles.scoreFill}
                    style={{ width: `${lead.score}%` }}
                  />
                </div>
              </div>
              <ClassBadge cls={lead.cls} />
              <div className={`${styles.rowAi} ${styles.colAi}`}>
                <span className={styles.rowAiArrow}>▸</span> {lead.ai}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.tableFooter}>
          <span className={styles.footerStat}><strong>{classA}</strong> Classe A</span>
          <span className={styles.footerStat}><strong>{classB}</strong> Classe B</span>
          <span className={styles.footerPowered}>Powered by Revora Intelligence</span>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ───────────────────────── */
export default function DiscoverLanding() {
  const [visibleRows, setVisibleRows] = useState<Lead[]>([])
  const indexRef = useRef(0)

  useEffect(() => {
    const delays = [800, 1400, 2000, 2600, 3400, 4200, 5000, 5800]

    const timers = LEADS.map((lead, i) =>
      setTimeout(() => {
        setVisibleRows(prev => [...prev, lead])
      }, delays[i])
    )

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className={styles.page}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.navLogo}>
          <span className={styles.navLogoDot} />
          Revora
          <span className={styles.navModule}>Discover</span>
        </Link>
        <Link href="#cta" className={styles.navCta}>Ver demonstração</Link>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBgGrid} />
        <div className={styles.heroGlow} />

        <div className={styles.heroEyebrow}>
          <span className={styles.heroEyebrowDot} />
          Inteligência Comercial B2B
        </div>

        <h1 className={styles.heroHeadline}>
          Encontre os parceiros<br />
          que <em>merecem</em> a sua atenção
        </h1>

        <p className={styles.heroSub}>
          O Revora Discover analisa, classifica e prioriza automaticamente
          as melhores oportunidades comerciais — para que a sua equipa
          foque onde importa.
        </p>

        <div className={styles.heroActions}>
          <Link href="#cta" className={styles.btnPrimary}>
            Começar agora
            <ArrowIcon />
          </Link>
          <Link href="#how" className={styles.btnGhost}>
            Como funciona
          </Link>
        </div>

        <LiveTable rows={visibleRows} />
      </section>

      <div className={styles.divider} />

      {/* ── PROBLEM ── */}
      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>O problema</div>
        <h2 className={styles.sectionTitle}>
          Prospecção manual<br />é cara e ineficiente
        </h2>
        <p className={styles.sectionSub}>
          Equipas comerciais perdem horas a pesquisar empresas que não têm
          potencial. Sem dados, sem prioridade, sem inteligência.
        </p>

        <div className={styles.problemGrid}>
          {[
            { icon: '🕐', title: 'Horas desperdiçadas',     desc: 'Pesquisar manualmente centenas de empresas para encontrar 10 que valem a pena contactar.' },
            { icon: '🎯', title: 'Sem critério de prioridade', desc: 'Sem dados estruturados, todas as oportunidades parecem iguais. A equipa contacta pela ordem errada.' },
            { icon: '📉', title: 'Taxa de conversão baixa', desc: 'Abordar empresas sem fit comercial resulta em rejeições e energia desperdiçada.' },
            { icon: '🔍', title: 'Dados dispersos',         desc: 'Informações em planilhas, LinkedIn, Google Maps — sem visão unificada de cada oportunidade.' },
          ].map(card => (
            <div key={card.title} className={styles.problemCard}>
              <div className={styles.problemIcon}>{card.icon}</div>
              <div className={styles.problemTitle}>{card.title}</div>
              <div className={styles.problemDesc}>{card.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.divider} />

      {/* ── TRANSFORMATION ── */}
      <section className={styles.section} id="how">
        <div className={styles.sectionEyebrow}>O que muda</div>
        <h2 className={styles.sectionTitle}>
          A sua equipa foca<br />onde realmente importa
        </h2>
        <p className={styles.sectionSub}>
          Chega de adivinhar. O Revora Discover diz exatamente quais empresas
          têm maior potencial — para que a sua equipa gaste energia onde há
          retorno real.
        </p>

        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <span className={styles.stepNum}>ANTES</span>
            <div className={styles.stepTitle}>Horas perdidas a pesquisar</div>
            <div className={styles.stepDesc}>
              A equipa gasta dias a identificar empresas, recolher contactos e
              tentar perceber quem tem potencial — sem nenhum critério objetivo.
            </div>
            <span className={`${styles.stepTag} ${styles.stepTagBad}`}>❌ Ineficiente</span>
          </div>
          <div className={`${styles.stepCard} ${styles.stepCardHighlight}`}>
            <span className={styles.stepNum}>COM REVORA</span>
            <div className={styles.stepTitle}>Prioridades claras em minutos</div>
            <div className={styles.stepDesc}>
              Importe a sua lista ou diga-nos o setor e a região. Em minutos
              tem um ranking das melhores oportunidades, com análise e
              recomendação por empresa.
            </div>
            <span className={`${styles.stepTag} ${styles.stepTagGood}`}>✓ Foco total</span>
          </div>
          <div className={styles.stepCard}>
            <span className={styles.stepNum}>RESULTADO</span>
            <div className={styles.stepTitle}>Mais reuniões, menos desperdício</div>
            <div className={styles.stepDesc}>
              A equipa contacta quem tem mais probabilidade de fechar. Menos
              rejeições, mais conversas que avançam, ciclos de venda mais curtos.
            </div>
            <span className={`${styles.stepTag} ${styles.stepTagWarm}`}>⚡ Alto impacto</span>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* ── PILOT ── */}
      <section className={styles.section}>
        <div className={styles.sectionEyebrow}>Caso piloto</div>
        <h2 className={styles.sectionTitle}>
          Em produção<br />com Aurifoods
        </h2>

        <div className={styles.pilotCard}>
          <div>
            <div className={styles.pilotTag}>🇵🇹 Portugal · Piloto ativo</div>
            <div className={styles.pilotTitle}>Suplementos e nutrição funcional</div>
            <p className={styles.pilotDesc}>
              A Aurifoods usa o Revora Discover para identificar e priorizar
              os melhores parceiros de distribuição em Portugal — ginásios,
              farmácias, lojas naturais e nutricionistas com maior potencial
              comercial.
            </p>
            <div className={styles.pilotStats}>
              {[
                { num: '500+',    label: 'Empresas analisadas' },
                { num: '92%',     label: 'Acurácia Classe A' },
                { num: '3h→8min', label: 'Tempo de análise' },
              ].map(s => (
                <div key={s.label} className={styles.pilotStat}>
                  <span className={styles.pilotStatNum}>{s.num}</span>
                  <span className={styles.pilotStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.pilotSegments}>
            {[
              { icon: '🏋️', name: 'Ginásios e Studios',  count: '142 leads' },
              { icon: '💊', name: 'Farmácias',            count: '98 leads'  },
              { icon: '🌿', name: 'Lojas Naturais',       count: '87 leads'  },
              { icon: '🥗', name: 'Nutricionistas',       count: '73 leads'  },
              { icon: '🏥', name: 'Clínicas Wellness',    count: '61 leads'  },
            ].map(seg => (
              <div key={seg.name} className={styles.segmentRow}>
                <span className={styles.segmentIcon}>{seg.icon}</span>
                <span className={styles.segmentName}>{seg.name}</span>
                <span className={styles.segmentCount}>{seg.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      {/* ── CTA ── */}
      <section className={styles.ctaSection} id="cta">
        <div className={styles.ctaGlow} />
        <h2 className={styles.ctaTitle}>
          Pronto para encontrar<br />as melhores oportunidades?
        </h2>
        <p className={styles.ctaSub}>
          Importe a sua lista e veja os resultados em minutos.
          Sem configuração, sem contratos.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/register" className={styles.btnPrimaryLg}>
            Começar gratuitamente <ArrowIcon />
          </Link>
          <Link href="/demo" className={styles.btnGhostLg}>
            Agendar demo
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <span className={styles.footerLogoDot} />
          Revora · Discover
        </div>
        <span className={styles.footerCopy}>© 2026 Revora. Todos os direitos reservados.</span>
      </footer>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
