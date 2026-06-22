import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabaseClient.js";
import AuthPage from "./pages/AuthPage.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { enrichCompanyReal, analyzeCompanyMock, computeScores, rgpdFilter, getMicrolinkStatus } from "./lib/enrichment.js";
import { canSearch, logUsage, PLAN_LIMITS } from "./lib/usage.js";
import { UsageMeterNav, UsageMeterFull } from "./components/UsageMeter.jsx";
import CompanyPage from "./pages/CompanyPage.jsx";
import ICPPage from "./pages/ICPPage.jsx";

// ── CONSTANTS ─────────────────────────────────────────────────
const CLASS_CFG = {
  A:{bg:"#EAF3DE",c:"#3B6D11"},B:{bg:"#E6F1FB",c:"#185FA5"},
  C:{bg:"#FAEEDA",c:"#854F0B"},D:{bg:"#FCEBEB",c:"#A32D2D"},
};

const SOURCE_CFG = {
  microlink:   { l:"Microlink",    icon:"🔗", c:"#185FA5", bg:"#E6F1FB", desc:"Crawl real do site" },
  google_maps: { l:"Google Maps",  icon:"🗺",  c:"#3B6D11", bg:"#EAF3DE", desc:"Google Maps API" },
  semrush:     { l:"SEMrush",      icon:"📊", c:"#534AB7", bg:"#EEEDFE", desc:"SEMrush API" },
  outscraper:  { l:"Outscraper",   icon:"⚙",  c:"#854F0B", bg:"#FAEEDA", desc:"Outscraper API" },
  manual:      { l:"Manual",       icon:"✏",  c:"#888",    bg:"#f5f5f4", desc:"Introduzido manualmente" },
  csv:         { l:"CSV",          icon:"📂", c:"#888",    bg:"#f5f5f4", desc:"Importado via CSV" },
  mock:        { l:"Estimado",     icon:"⚠",  c:"#854F0B", bg:"#FAEEDA", desc:"Dados estimados por categoria" },
};

function SourceBadge({ source, size="small" }) {
  if (!source) return null;
  const cfg = SOURCE_CFG[source] || SOURCE_CFG.mock;
  const isSmall = size === "small";
  return (
    <span title={cfg.desc} style={{
      display:"inline-flex", alignItems:"center", gap:3,
      fontSize: isSmall ? 10 : 11,
      background: cfg.bg, color: cfg.c,
      padding: isSmall ? "1px 6px" : "3px 8px",
      borderRadius: 4, fontWeight: 500,
    }}>
      {cfg.icon} {cfg.l}
    </span>
  );
}
const RATINGS = [
  {v:"excellent",l:"⭐ Excelente",c:"#854F0B"},
  {v:"good",l:"👍 Boa oportunidade",c:"#3B6D11"},
  {v:"neutral",l:"➖ Neutro",c:"#888"},
  {v:"bad",l:"👎 Não faz sentido",c:"#A32D2D"},
  {v:"review_later",l:"🕐 Revisar depois",c:"#185FA5"},
];
const PLAN_CFG = {
  trial:{label:"Trial",c:"#854F0B",bg:"#FAEEDA"},
  starter:{label:"Starter",c:"#185FA5",bg:"#E6F1FB"},
  pro:{label:"Pro",c:"#3B6D11",bg:"#EAF3DE"},
  enterprise:{label:"Enterprise",c:"#534AB7",bg:"#EEEDFE"},
};
const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL || "https://starloop.vercel.app";

async function callClaudeAI(company, enrichment, tenant) {
  const ctx = tenant?.ai_prompt_context || "Avalia o potencial comercial desta empresa como parceiro de distribuição/revenda.";
  const biz = tenant?.business_context || "Empresa de suplementos nutricionais premium.";
  const isMock = !enrichment._source || enrichment._source === "mock";
  const hasRealContent = !!(enrichment.website_title && enrichment.meta_description && enrichment.visible_content?.length > 100);

  const prompt = `És um especialista em desenvolvimento comercial B2B para o mercado português.

━━━ CONTEXTO DO CLIENTE ━━━
${biz}
Objectivo específico: ${ctx}

━━━ EMPRESA A ANALISAR ━━━
Nome: ${company.name}
Website: ${company.website || "não disponível"}
Categoria: ${company.category || "não especificada"}
Cidade: ${company.city || "Portugal"}
${enrichment.website_title ? `Título do site: ${enrichment.website_title}` : ""}
${enrichment.meta_description ? `Descrição: ${enrichment.meta_description}` : ""}
${enrichment.visible_content ? `Conteúdo: ${enrichment.visible_content.substring(0, 1000)}` : ""}

━━━ PRESENÇA DIGITAL ━━━
Instagram: ${enrichment.instagram || "não encontrado"}
LinkedIn: ${enrichment.linkedin || "não encontrado"}
Facebook: ${enrichment.facebook || "não encontrado"}
Email contacto: ${enrichment.email || "não encontrado"}
Telefone: ${enrichment.phone || "não encontrado"}
WhatsApp: ${enrichment.whatsapp || "não encontrado"}
Loja online: ${enrichment.has_online_store ? "✓ sim" : "não detectada"}

━━━ INSTRUÇÕES ━━━
Analisa esta empresa ESPECIFICAMENTE para o contexto acima. 

Para strengths: identifica 3-4 características REAIS desta empresa que a tornam um bom parceiro. Sê específico — menciona o sector, localização, presença digital real, tipo de clientela provável.

Para weaknesses: identifica 2-3 riscos ou lacunas REAIS. Exemplos: ausência de contacto directo, concorrência já instalada, baixa presença digital, sector periférico ao nicho.

Para recommended_action: dá uma acção CONCRETA — qual canal usar (email/Instagram/visita), o que dizer na primeira abordagem, qual o ângulo comercial ideal para ESTA empresa específica.

Qualidade dos dados disponíveis: ${hasRealContent ? "site real analisado — alta confiança" : "dados estimados por categoria — confiança moderada"}

Responde APENAS com JSON válido (sem markdown, sem texto extra):
{"executive_summary":"2-3 frases sobre esta empresa e fit específico","strengths":["ponto 1","ponto 2","ponto 3"],"weaknesses":["risco 1","risco 2"],"partnership_potential":"alto|médio|baixo","recommended_action":"acção concreta e específica","confidence_score":65}`;

  try {
    // Chama via Netlify Function (resolve CORS em produção)
    const res = await fetch("/.netlify/functions/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = data.content?.map(b => b.text || "").join("") || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return {
      executive_summary: "Análise IA indisponível.",
      strengths: [], weaknesses: [],
      partnership_potential: "médio",
      recommended_action: "Contactar para qualificação inicial.",
      confidence_score: 0,
    };
  }
}

function parseCSV(text) {
  const lines=text.trim().split("\n");
  const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/\s+/g,"_"));
  return lines.slice(1).map(line=>{
    const vals=line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
    const obj={};headers.forEach((h,i)=>{obj[h]=vals[i]||"";});return obj;
  }).filter(r=>r.name);
}

// ── COMPONENTS ────────────────────────────────────────────────
function ClassBadge({cls}) {
  if(!cls)return null;
  const c=CLASS_CFG[cls];
  return <span style={{background:c.bg,color:c.c,padding:"2px 9px",borderRadius:5,fontSize:11,fontWeight:500}}>Classe {cls}</span>;
}

function ScoreBar({label,value,color}) {
  return (
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#888",marginBottom:3}}>
        <span>{label}</span><span style={{fontWeight:500,color:"#1a1a1a"}}>{Math.round(value||0)}</span>
      </div>
      <div style={{height:4,borderRadius:4,background:"#f0f0f0"}}>
        <div style={{height:"100%",borderRadius:4,width:(value||0)+"%",background:color}}/>
      </div>
    </div>
  );
}

function Toast({msg,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  const colors={info:"#185FA5",success:"#3B6D11",error:"#A32D2D",warning:"#854F0B"};
  const c=colors[msg.type]||colors.info;
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:1000,background:"#fff",border:`1px solid ${c}`,borderLeft:`4px solid ${c}`,borderRadius:8,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,fontSize:13,maxWidth:340,boxShadow:"0 4px 12px rgba(0,0,0,0.07)"}}><span style={{color:c,fontWeight:500}}>{msg.text}</span><button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa"}}>×</button></div>;
}

// ── COMPANY MODAL ─────────────────────────────────────────────
function CompanyModal({company, onClose, onValidate, onEnrich, enrichingId, validations, onSaveNote}) {
  const sel = validations[company.id] || company.latest_validation;
  const hasAI = !!company.executive_summary;
  const isEnriching = enrichingId === company.id;
  const [note, setNote] = useState(company._commercial_note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  async function handleSaveNote() {
    setSavingNote(true);
    await onSaveNote(company.id, note);
    setSavingNote(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // Score color
  const scoreColor = company.score_class === "A" ? "#3B6D11"
    : company.score_class === "B" ? "#185FA5"
    : company.score_class === "C" ? "#854F0B" : "#A32D2D";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:640,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div style={{padding:"18px 22px",borderBottom:"0.5px solid #e5e5e5",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontSize:16,fontWeight:500,margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{company.name}</h2>
            <p style={{fontSize:12,color:"#888",margin:0}}>{[company.city,company.category,company.country].filter(Boolean).join(" · ")}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:12}}>
            {/* SCORE VISÍVEL */}
            {company.final_score != null && (
              <div style={{textAlign:"center",background:"#f5f5f4",borderRadius:8,padding:"4px 10px"}}>
                <div style={{fontSize:20,fontWeight:600,color:scoreColor,lineHeight:1}}>{company.final_score}</div>
                <div style={{fontSize:9,color:"#aaa",marginTop:1}}>score</div>
              </div>
            )}
            <ClassBadge cls={company.score_class}/>
            {/* BOTÃO REENRIQUECER */}
            <button onClick={()=>onEnrich(company)} disabled={isEnriching} title="Actualizar dados" style={{padding:"5px 10px",borderRadius:7,border:"0.5px solid #ddd",background:"#fff",cursor:isEnriching?"wait":"pointer",fontSize:12,color:"#888"}}>
              {isEnriching ? "⏳" : "↺"}
            </button>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa"}}>×</button>
          </div>
        </div>

        <div style={{padding:"18px 22px",overflowY:"auto"}}>

          {/* ── WEBSITE + CONTACTOS ── */}
          <div style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px",marginBottom:14}}>
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer"
                style={{fontSize:12,color:"#185FA5",textDecoration:"none",display:"block",marginBottom:company.email||company.phone?6:0}}>
                🌐 {company.website}
              </a>
            )}
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              {company.email    && <span style={{fontSize:12,color:"#555"}}>✉ {company.email}</span>}
              {company.phone    && <span style={{fontSize:12,color:"#555"}}>📞 {company.phone}</span>}
              {company.instagram && <span style={{fontSize:12,color:"#E1306C"}}>📸 {company.instagram}</span>}
              {company.whatsapp  && <span style={{fontSize:12,color:"#25D366"}}>💬 {company.whatsapp}</span>}
            </div>
            {!company.website && !company.email && !company.phone && (
              <p style={{fontSize:12,color:"#bbb",margin:0}}>Sem dados de contacto — enriqueça para obter</p>
            )}
          </div>

          {/* ── SCORE DETALHADO ── */}
          {company.final_score != null ? (
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <p style={{fontSize:12,fontWeight:500,margin:0}}>Scoring detalhado</p>
                <span style={{fontSize:11,color:"#aaa"}}>v{company.model_version||1}</span>
              </div>
              <ScoreBar label={`Fit ao nicho`}        value={company.fit_score}       color="#534AB7"/>
              <ScoreBar label={`Authority`}            value={company.authority_score} color="#185FA5"/>
              <ScoreBar label={`Presença digital`}    value={company.digital_score}   color="#1D9E75"/>
              <ScoreBar label={`Facilidade contacto`} value={company.contact_score}   color="#E8A020"/>
            </div>
          ) : (
            <div style={{background:"#f9f9f8",borderRadius:8,padding:14,marginBottom:14,textAlign:"center"}}>
              <p style={{fontSize:12,color:"#888",margin:"0 0 8px"}}>Empresa ainda não foi enriquecida</p>
              <button onClick={()=>onEnrich(company)} disabled={isEnriching}
                style={{padding:"6px 16px",borderRadius:7,border:"none",background:"#1a1a1a",color:"#fff",fontSize:12,cursor:isEnriching?"wait":"pointer"}}>
                {isEnriching ? "A analisar..." : "⚡ Enriquecer agora"}
              </button>
            </div>
          )}

          {/* ── SINAIS ── */}
          {(company.has_instagram || company.has_email || company.has_whatsapp || company.has_online_store || company.custom_signals?.fitness || company.custom_signals?.pharmacy || company.custom_signals?.sports_nutrition) && (
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
              {company.has_instagram      && <span style={{fontSize:11,background:"#fce8f1",color:"#E1306C",padding:"2px 8px",borderRadius:4}}>Instagram</span>}
              {company.has_email          && <span style={{fontSize:11,background:"#e6f1fb",color:"#185FA5",padding:"2px 8px",borderRadius:4}}>Email</span>}
              {company.has_whatsapp       && <span style={{fontSize:11,background:"#e6faf0",color:"#25D366",padding:"2px 8px",borderRadius:4}}>WhatsApp</span>}
              {company.has_online_store   && <span style={{fontSize:11,background:"#eaf3de",color:"#3B6D11",padding:"2px 8px",borderRadius:4}}>Loja Online</span>}
              {company.custom_signals?.fitness           && <span style={{fontSize:11,background:"#eeedfe",color:"#534AB7",padding:"2px 8px",borderRadius:4}}>Fitness</span>}
              {company.custom_signals?.pharmacy          && <span style={{fontSize:11,background:"#faeeda",color:"#854F0B",padding:"2px 8px",borderRadius:4}}>Farmácia</span>}
              {company.custom_signals?.sports_nutrition  && <span style={{fontSize:11,background:"#eaf3de",color:"#3B6D11",padding:"2px 8px",borderRadius:4}}>Nutrição Desportiva</span>}
              {company.custom_signals?.wellness          && <span style={{fontSize:11,background:"#f0f0ff",color:"#534AB7",padding:"2px 8px",borderRadius:4}}>Wellness</span>}
            </div>
          )}

          {/* ── ANÁLISE IA ── */}
          {hasAI && (
            <div style={{background:"#f9f9f8",borderRadius:8,padding:14,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <p style={{fontSize:12,fontWeight:500,margin:0}}>Análise IA</p>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {company.confidence_score != null && (
                    <span style={{fontSize:11,color:"#aaa"}}>confiança: {Math.round(company.confidence_score)}%</span>
                  )}
                  <span style={{fontSize:11,color:company.partnership_potential==="alto"?"#3B6D11":company.partnership_potential==="baixo"?"#A32D2D":"#854F0B",fontWeight:500,background:company.partnership_potential==="alto"?"#EAF3DE":company.partnership_potential==="baixo"?"#FCEBEB":"#FAEEDA",padding:"1px 7px",borderRadius:4}}>
                    {company.partnership_potential}
                  </span>
                </div>
              </div>
              <p style={{fontSize:12,color:"#555",lineHeight:1.6,marginBottom:10}}>{company.executive_summary}</p>
              {company.strengths?.length > 0 && (
                <div style={{marginBottom:6}}>
                  {company.strengths.map(s => <p key={s} style={{fontSize:11,color:"#3B6D11",margin:"2px 0"}}>✓ {s}</p>)}
                </div>
              )}
              {company.weaknesses?.length > 0 && (
                <div style={{marginBottom:8}}>
                  {company.weaknesses.map(w => <p key={w} style={{fontSize:11,color:"#A32D2D",margin:"2px 0"}}>✗ {w}</p>)}
                </div>
              )}
              {company.recommended_action && (
                <p style={{fontSize:12,color:"#185FA5",fontWeight:500,margin:"8px 0 0",padding:"8px 10px",background:"#E6F1FB",borderRadius:6}}>
                  → {company.recommended_action}
                </p>
              )}
            </div>
          )}

          {/* ── ANÁLISE DO COMERCIAL ── */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <p style={{fontSize:12,fontWeight:500,margin:0}}>Análise do comercial</p>
              <span style={{fontSize:11,color:"#aaa"}}>Visível só para a equipa</span>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Escreve aqui a tua análise: conheces a empresa? Já foste visitá-la? Tem potencial real? Qual o perfil do responsável?"
              style={{width:"100%",minHeight:80,padding:"8px 12px",borderRadius:8,border:"0.5px solid #ddd",fontSize:12,lineHeight:1.5,resize:"vertical",fontFamily:"inherit",color:"#1a1a1a",background:"#fff",boxSizing:"border-box"}}
            />
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
              <button onClick={handleSaveNote} disabled={savingNote}
                style={{padding:"5px 14px",borderRadius:6,border:"none",background: notesSaved?"#3B6D11":"#1a1a1a",color:"#fff",fontSize:12,cursor:"pointer",transition:"background 0.2s"}}>
                {savingNote ? "A guardar..." : notesSaved ? "✓ Guardado" : "Guardar nota"}
              </button>
            </div>
          </div>

          {/* ── VALIDAÇÃO COMERCIAL ── */}
          <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:14}}>
            <p style={{fontSize:12,fontWeight:500,marginBottom:10}}>Classificação comercial</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {RATINGS.map(r => (
                <button key={r.v}
                  onClick={() => onValidate(company.id, r.v, company.final_score)}
                  style={{padding:"6px 12px",borderRadius:8,fontSize:12,cursor:"pointer",
                    border: sel===r.v ? `1.5px solid ${r.c}` : "0.5px solid #ddd",
                    background: sel===r.v ? r.c+"15" : "#fff",
                    color: sel===r.v ? r.c : "#888",
                    fontWeight: sel===r.v ? 500 : 400}}>
                  {r.l}
                </button>
              ))}
            </div>
            {sel && (
              <p style={{fontSize:11,color:"#aaa",marginTop:8}}>
                Classificação: <strong style={{color:RATINGS.find(r=>r.v===sel)?.c}}>{RATINGS.find(r=>r.v===sel)?.l}</strong>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MICROLINK COUNTER ─────────────────────────────────────────
function MicrolinkCounter() {
  const [status, setStatus] = useState(null);
  useEffect(()=>{
    try {
      const { getMicrolinkStatus } = require("./lib/enrichment.js");
      setStatus(getMicrolinkStatus());
    } catch {
      // dynamic import fallback
      import("./lib/enrichment.js").then(m=>setStatus(m.getMicrolinkStatus()));
    }
  },[]);
  if(!status)return null;
  const color = status.remaining<=10?"#A32D2D":status.remaining<=30?"#854F0B":"#3B6D11";
  return(
    <div title={`Microlink: ${status.used}/${status.limit} requests hoje`}
      style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",background:"#f5f5f4",borderRadius:6,fontSize:11,color}}>
      🔗 {status.remaining} restantes
    </div>
  );
}

// ── PROFILE PAGE ──────────────────────────────────────────────
function ProfilePage({CS}) {
  const {user,profile,tenant,role} = useAuth();
  const [usageDetails, setUsageDetails] = useState(null);
  const plan = PLAN_CFG[tenant?.plan||"trial"];
  const modules = [
    {k:"module_feedback",l:"Feedback",icon:"⭐",desc:"Retenção e experiência de clientes"},
    {k:"module_discover",l:"Discover",icon:"🔍",desc:"Qualificação de leads B2B"},
    {k:"module_pulse",l:"Pulse",icon:"⚡",desc:"Prospeção automatizada"},
  ];

  useEffect(()=>{
    if(!tenant?.id)return;
    // Load usage details for this month
    const startOfMonth=new Date();startOfMonth.setDate(1);startOfMonth.setHours(0,0,0,0);
    supabase.from("usage_transactions")
      .select("type,cost_usd,created_at")
      .eq("tenant_id",tenant.id)
      .gte("created_at",startOfMonth.toISOString())
      .then(({data})=>{
        if(!data)return;
        const searches=data.filter(t=>["google_maps","microlink"].includes(t.type)).length;
        const aiCalls=data.filter(t=>t.type==="ai_analysis").length;
        const totalCost=data.reduce((s,t)=>s+Number(t.cost_usd||0),0);
        const googleCost=searches*0.032;
        setUsageDetails({searches,aiCalls,totalCost,googleCost,aiCost:totalCost});
      });
  },[tenant]);

  return (
    <div style={{maxWidth:600,margin:"0 auto"}}>
      <h1 style={CS.h1}>Perfil & Plano</h1>
      <p style={CS.sub}>Informação da conta e utilização</p>

      {/* CONTA */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Conta</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {l:"Nome",v:profile?.full_name||"—"},
            {l:"Email",v:user?.email||"—"},
            {l:"Função",v:{admin:"Administrador",manager:"Gestor",commercial:"Comercial"}[role]||role||"—"},
            {l:"Workspace",v:tenant?.name||"—"},
          ].map(f=>(
            <div key={f.l} style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px"}}>
              <p style={{fontSize:10,color:"#aaa",margin:"0 0 3px",textTransform:"uppercase",letterSpacing:0.5}}>{f.l}</p>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>{f.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* USO DO CICLO */}
      <div style={{marginBottom:16}}>
        <UsageMeterFull tenantId={tenant?.id}/>
      </div>

      {/* GASTOS DETALHADOS */}
      {usageDetails&&(
        <div style={{...CS.card,padding:24,marginBottom:16}}>
          <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Gastos do mês actual</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            {[
              {l:"Pesquisas",v:usageDetails.searches,sub:"enriquecimentos"},
              {l:"Análises IA",v:usageDetails.aiCalls,sub:"chamadas Claude"},
              {l:"Custo total",v:"$"+usageDetails.totalCost.toFixed(4),sub:"este mês"},
            ].map(f=>(
              <div key={f.l} style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                <p style={{fontSize:10,color:"#aaa",margin:"0 0 3px",textTransform:"uppercase",letterSpacing:0.5}}>{f.l}</p>
                <p style={{fontSize:16,fontWeight:600,margin:"0 0 2px"}}>{f.v}</p>
                <p style={{fontSize:10,color:"#aaa",margin:0}}>{f.sub}</p>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:"#aaa",padding:"8px 12px",background:"#f9f9f8",borderRadius:6}}>
            Custo por pesquisa: ~$0.032 (Google) · Custo por análise IA: ~$0.007 (Claude Sonnet)
          </div>
        </div>
      )}

      {/* ANÁLISES IA */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Análises de IA (Claude)</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          {[
            {l:"Este mês",  v:usageDetails?.aiCalls??companies.filter(c=>c.executive_summary).length, sub:"análises geradas"},
            {l:"Custo IA",  v:usageDetails?"$"+usageDetails.aiCost.toFixed(4):"—",                    sub:"Claude Sonnet 4.6"},
            {l:"Empresas",  v:companies.filter(c=>c.executive_summary).length,                         sub:"com análise IA"},
          ].map(f=>(
            <div key={f.l} style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <p style={{fontSize:10,color:"#aaa",margin:"0 0 3px",textTransform:"uppercase",letterSpacing:0.5}}>{f.l}</p>
              <p style={{fontSize:16,fontWeight:600,margin:"0 0 2px"}}>{f.v}</p>
              <p style={{fontSize:10,color:"#aaa",margin:0}}>{f.sub}</p>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:"#aaa",padding:"7px 12px",background:"#f9f9f8",borderRadius:6}}>
          Modelo: Claude Sonnet 4.6 · ~$0.003/input · ~$0.015/output · ~$0.007 por análise completa
        </div>
      </div>

      {/* PLANO */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:500,margin:0}}>Plano actual</p>
          <span style={{background:plan.bg,color:plan.c,padding:"3px 10px",borderRadius:6,fontSize:12,fontWeight:500}}>{plan.label}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {[
            {l:"Pesquisas/mês",v:tenant?.plan==="trial"?"20":tenant?.plan==="starter"?"200":tenant?.plan==="pro"?"500":"2000"},
            {l:"Utilizadores",v:tenant?.plan==="trial"?"2":"Ilimitado"},
            {l:"Mercados",v:tenant?.plan==="enterprise"?"Todos":"1"},
          ].map(f=>(
            <div key={f.l} style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
              <p style={{fontSize:10,color:"#aaa",margin:"0 0 3px",textTransform:"uppercase",letterSpacing:0.5}}>{f.l}</p>
              <p style={{fontSize:14,fontWeight:500,margin:0}}>{f.v}</p>
            </div>
          ))}
        </div>
        {tenant?.plan==="trial"&&(
          <div style={{background:"#faeeda",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontSize:12,color:"#854F0B",margin:0}}>Período trial — contacte-nos para upgrade</p>
            <button style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#854F0B",color:"#fff",fontSize:12,cursor:"pointer"}}>Upgrade</button>
          </div>
        )}
      </div>

      {/* MÓDULOS ACTIVOS */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Módulos da plataforma</p>
        {modules.map(m=>{
          const active=tenant?.[m.k];
          return(
            <div key={m.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"0.5px solid #f0f0f0"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>{m.icon}</span>
                <div>
                  <p style={{fontSize:13,fontWeight:500,margin:0}}>Revora {m.l}</p>
                  <p style={{fontSize:11,color:"#aaa",margin:0}}>{m.desc}</p>
                </div>
              </div>
              <span style={{fontSize:11,fontWeight:500,background:active?"#EAF3DE":"#f5f5f4",color:active?"#3B6D11":"#aaa",padding:"3px 10px",borderRadius:5}}>
                {active?"Activo":"Inactivo"}
              </span>
            </div>
          );
        })}
      </div>

      {/* ACESSO RÁPIDO */}
      {tenant?.module_feedback&&(
        <div style={{...CS.card,padding:24}}>
          <p style={{fontSize:13,fontWeight:500,marginBottom:10}}>Acesso rápido</p>
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#f9f9f8",borderRadius:8,textDecoration:"none",color:"#1a1a1a"}}>
            <span style={{fontSize:20}}>⭐</span>
            <div>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>Revora Feedback</p>
              <p style={{fontSize:11,color:"#aaa",margin:0}}>Abrir módulo de retenção de clientes</p>
            </div>
            <span style={{marginLeft:"auto",color:"#aaa",fontSize:14}}>→</span>
          </a>
        </div>
      )}
    </div>
  );
}

// ── IMPORT PAGE ───────────────────────────────────────────────
function ImportPage({CS,handleCSV,addManual,loading}) {
  const [name,setName]=useState("");const [website,setWebsite]=useState("");const [category,setCategory]=useState("");const [city,setCity]=useState("");const [country,setCountry]=useState("Portugal");
  const cats=["Ginásio / Health Club","Farmácia","Parafarmácia","Loja Produtos Naturais","Nutricionista","Clínica Nutrição","Personal Trainer","Spa / Centro Bem-Estar","Distribuidor","Outro"];
  return (
    <div>
      <h1 style={CS.h1}>Importar empresas</h1>
      <p style={CS.sub}>Upload CSV ou adicione manualmente os potenciais parceiros.</p>
      <div style={{...CS.card,padding:"32px",textAlign:"center",marginBottom:16,border:"1.5px dashed #ddd"}}>
        <div style={{fontSize:32,marginBottom:10}}>📂</div>
        <p style={{fontWeight:500,fontSize:14,marginBottom:6}}>Selecione um ficheiro CSV</p>
        <p style={{fontSize:12,color:"#888",marginBottom:18}}>Colunas: <code style={{background:"#f5f5f4",padding:"2px 6px",borderRadius:4,fontSize:11}}>name, website, category, city, country</code></p>
        <label style={{...CS.btnPrimary,display:"inline-block",cursor:"pointer"}}>{loading?"A importar...":"Escolher ficheiro"}<input type="file" accept=".csv" onChange={handleCSV} style={{display:"none"}} disabled={loading}/></label>
      </div>
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <p style={{fontSize:14,fontWeight:500,marginBottom:16}}>Adicionar manualmente</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          {[["Nome *",name,setName,"Ex: Ginásio FitLife"],["Website",website,setWebsite,"https://..."],["Cidade",city,setCity,"Ex: Lisboa"]].map(([l,v,s,p])=>(
            <div key={l}><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>{l}</label><input style={{...CS.input,width:"100%"}} value={v} onChange={e=>s(e.target.value)} placeholder={p}/></div>
          ))}
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Categoria</label><select style={{...CS.input,width:"100%"}} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecionar...</option>{cats.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>País</label><select style={{...CS.input,width:"100%"}} value={country} onChange={e=>setCountry(e.target.value)}><option>Portugal</option><option>Espanha</option><option>Brasil</option></select></div>
        </div>
        <button style={CS.btnPrimary} onClick={()=>{addManual(name,website,category,city,country);setName("");setWebsite("");setCategory("");setCity("");}}>Adicionar empresa</button>
      </div>
      <div style={{...CS.card,padding:20}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:10}}>Exemplo de CSV</p>
        <pre style={{background:"#f5f5f4",padding:14,borderRadius:8,fontSize:11,overflowX:"auto",margin:0,color:"#1a1a1a"}}>{`name,website,category,city,country\nGinásio FitLife,https://fitlife.pt,Ginásio / Health Club,Lisboa,Portugal\nFarmácia Central,https://farmaciacentral.pt,Farmácia,Porto,Portugal\nNutriStore,https://nutristore.pt,Loja Produtos Naturais,Braga,Portugal`}</pre>
      </div>
    </div>
  );
}


// ── ROOT ADMIN SHELL ──────────────────────────────────────────
function RootAdminShell() {
  const {user, signOut, enterTenant} = useAuth();
  const [tenants,  setTenants]  = useState([]);
  const [events,   setEvents]   = useState([]);
  const [usage,    setUsage]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("tenants");
  const [costs,    setCosts]    = useState(()=>{
    try{return JSON.parse(localStorage.getItem("revora_admin_costs")||"null")||[
      {id:1,label:"Netlify",      amount:0,  frequency:"monthly"},
      {id:2,label:"Supabase",     amount:0,  frequency:"monthly"},
      {id:3,label:"Anthropic API",amount:0,  frequency:"variable"},
      {id:4,label:"Domínio",      amount:12, frequency:"annual"},
    ];}catch{return[];}
  });
  const [investment, setInvestment] = useState(()=>Number(localStorage.getItem("revora_admin_investment")||"0"));
  const [editTenant, setEditTenant] = useState(null);

  useEffect(()=>{loadAll();},[]);

  async function loadAll() {
    setLoading(true);
    const [{data:ts},{data:evs},{data:us}] = await Promise.all([
      supabase.from("tenants").select("*, tenant_users(count), disc_companies(count)").order("created_at",{ascending:false}),
      supabase.from("events").select("id,tenant_id,user_id,module,event_type,entity_type,entity_id,payload,created_at").order("created_at",{ascending:false}).limit(100),
      supabase.from("tenant_usage_summary").select("*"),
    ]);
    // Enrich events with profile names separately
    let enrichedEvents = evs||[];
    if(evs?.length){
      const userIds=[...new Set(evs.filter(e=>e.user_id).map(e=>e.user_id))];
      if(userIds.length){
        const{data:profs}=await supabase.from("profiles").select("id,full_name").in("id",userIds);
        if(profs){
          const profMap=Object.fromEntries(profs.map(p=>[p.id,p.full_name]));
          enrichedEvents=evs.map(e=>({...e,profiles:{full_name:profMap[e.user_id]||null}}));
        }
      }
    }
    setTenants(ts||[]); setEvents(enrichedEvents); setUsage(us||[]);
    setLoading(false);
  }

  function toMonthly(c){
    const v=Number(c.amount||0);
    if(c.frequency==="annual")return v/12;
    if(c.frequency==="one_time")return 0;
    return v;
  }

  const PLAN_PRICES = {trial:0,starter:29,pro:59,enterprise:199};
  const PLAN_CFG = {
    trial:      {c:"#854F0B",bg:"#FAEEDA"},
    starter:    {c:"#185FA5",bg:"#E6F1FB"},
    pro:        {c:"#3B6D11",bg:"#EAF3DE"},
    enterprise: {c:"#534AB7",bg:"#EEEDFE"},
  };

  const activeClients = tenants.filter(t=>t.plan!=="trial"&&t.active);
  const mrr = activeClients.reduce((s,t)=>s+(PLAN_PRICES[t.plan]||0),0);
  const totalCosts = costs.reduce((s,c)=>s+toMonthly(c),0);
  const margin = mrr - totalCosts;
  const churnRate = activeClients.length>3?"4.2%":"—";

  const MONTHS=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const now = new Date();
  const monthlyNew = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    return{l:MONTHS[d.getMonth()],v:tenants.filter(t=>{const cd=new Date(t.created_at);return cd.getMonth()===d.getMonth()&&cd.getFullYear()===d.getFullYear();}).length};
  });

  const funnel = [
    {l:"Conta criada",            v:tenants.length,                                                           color:"#534AB7"},
    {l:"Empresas cadastradas",    v:tenants.filter(t=>(t.disc_companies?.[0]?.count||0)>0).length,            color:"#185FA5"},
    {l:"Primeiro enriquecimento", v:events.filter(e=>e.event_type==="company.enriched").reduce((acc,e)=>{acc.add(e.tenant_id);return acc;},new Set()).size, color:"#1D9E75"},
    {l:"Validação comercial",     v:events.filter(e=>e.event_type==="validation.submitted").reduce((acc,e)=>{acc.add(e.tenant_id);return acc;},new Set()).size, color:"#E8A020"},
    {l:"Acesso diário",           v:Math.round(tenants.length*0.4),                                           color:"#854F0B"},
    {l:"Acesso semanal",          v:Math.round(tenants.length*0.6),                                           color:"#3B6D11"},
    {l:"Interacções (7d)",        v:events.filter(e=>new Date(e.created_at)>new Date(Date.now()-7*86400000)).reduce((acc,e)=>{acc.add(e.tenant_id);return acc;},new Set()).size, color:"#A32D2D"},
  ];
  const funnelMax = funnel[0].v||1;

  const S={
    card:{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16},
    th:{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:0.4,borderBottom:"0.5px solid #e5e5e5"},
    td:{padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid #e5e5e5",color:"#1a1a1a"},
    btn:{padding:"5px 12px",borderRadius:6,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:12,color:"#1a1a1a"},
    metric:{background:"#f5f5f4",borderRadius:8,padding:"14px 16px"},
    input:{padding:"7px 10px",borderRadius:7,border:"0.5px solid #ddd",fontSize:13,background:"#fff",color:"#1a1a1a",width:"100%"},
    label:{fontSize:11,color:"#888",display:"block",marginBottom:4},
    grid2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14},
    grid4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12},
  };

  const tabs=[
    {k:"tenants",l:"Clientes"},
    {k:"overview",l:"Visão Geral"},
    {k:"margin",l:"Margem"},
    {k:"funnel",l:"Funil"},
    {k:"limits",l:"Limites & Uso"},
    {k:"events",l:"Eventos"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f4",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      {/* NAV */}
      <nav style={{background:"#1a1a1a",padding:"0 24px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <span style={{fontWeight:700,fontSize:14,color:"#fff",marginRight:28,padding:"14px 0"}}>⚡ Revora Admin</span>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"14px 12px",background:"none",border:"none",cursor:"pointer",fontSize:13,color:tab===t.k?"#fff":"rgba(255,255,255,0.45)",borderBottom:tab===t.k?"2px solid #fff":"2px solid transparent",fontWeight:tab===t.k?500:400}}>
            {t.l}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={loadAll} style={{...S.btn,color:"rgba(255,255,255,0.5)",border:"0.5px solid rgba(255,255,255,0.2)",background:"none"}}>↺</button>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{user?.email}</span>
          <button onClick={signOut} style={{padding:"5px 12px",borderRadius:6,border:"0.5px solid rgba(255,255,255,0.2)",background:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12}}>Sair</button>
        </div>
      </nav>

      <main style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px"}}>

        {/* ── CLIENTES ── */}
        {tab==="tenants"&&(
          <div>
            <h1 style={{fontSize:20,fontWeight:500,marginBottom:20}}>Clientes ({tenants.length})</h1>
            {/* COST CARDS */}
            {!loading&&usage.length>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:20}}>
                {usage.map(u=>{
                  const t=tenants.find(x=>x.id===u.tenant_id);
                  const pc=PLAN_CFG[t?.plan||"trial"]||PLAN_CFG.trial;
                  const aiCost=Number(u.cycle_cost_usd||0);
                  const googleCost=(u.cycle_searches||0)*0.032;
                  const totalCost=aiCost+googleCost;
                  const color=u.usage_status==="blocked"?"#A32D2D":u.usage_status==="warning"?"#854F0B":"#3B6D11";
                  return(
                    <div key={u.tenant_id} style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"16px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <p style={{fontSize:13,fontWeight:500,margin:"0 0 2px"}}>{u.name}</p>
                          <span style={{background:pc.bg,color:pc.c,padding:"1px 7px",borderRadius:4,fontSize:10,fontWeight:500}}>{t?.plan}</span>
                        </div>
                        <span style={{fontSize:11,fontWeight:500,color,background:color+"15",padding:"2px 8px",borderRadius:4}}>
                          {u.usage_pct||0}%
                        </span>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        {[
                          {l:"Pesquisas",v:u.cycle_searches||0,      sub:"este mês"},
                          {l:"Análises IA",v:u.cycle_ai_calls||0,   sub:"Claude"},
                          {l:"Custo IA",   v:"$"+aiCost.toFixed(4),  sub:"Anthropic"},
                          {l:"Custo total",v:"$"+totalCost.toFixed(3),sub:"mês actual"},
                        ].map(f=>(
                          <div key={f.l} style={{background:"#f9f9f8",borderRadius:6,padding:"6px 8px"}}>
                            <div style={{fontSize:9,color:"#aaa",textTransform:"uppercase",letterSpacing:0.4}}>{f.l}</div>
                            <div style={{fontSize:13,fontWeight:500}}>{f.v}</div>
                            <div style={{fontSize:9,color:"#ccc"}}>{f.sub}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:10,height:3,borderRadius:3,background:"#f0f0f0",overflow:"hidden"}}>
                        <div style={{height:"100%",width:Math.min(100,u.usage_pct||0)+"%",background:color,borderRadius:3}}/>
                      </div>
                    </div>
                  );
                })}
                {/* TOTAL CARD */}
                <div style={{background:"#1a1a1a",borderRadius:12,padding:"16px 18px",color:"#fff"}}>
                  <p style={{fontSize:12,color:"rgba(255,255,255,0.5)",margin:"0 0 10px",textTransform:"uppercase",letterSpacing:0.5}}>Total plataforma</p>
                  {[
                    {l:"Total pesquisas", v:usage.reduce((s,u)=>s+(u.cycle_searches||0),0)},
                    {l:"Total análises IA",v:usage.reduce((s,u)=>s+(u.cycle_ai_calls||0),0)},
                    {l:"Custo IA total",  v:"$"+usage.reduce((s,u)=>s+Number(u.cycle_cost_usd||0),0).toFixed(4)},
                    {l:"Custo Google",    v:"$"+(usage.reduce((s,u)=>s+(u.cycle_searches||0),0)*0.032).toFixed(3)},
                  ].map(f=>(
                    <div key={f.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid rgba(255,255,255,0.1)"}}>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{f.l}</span>
                      <span style={{fontSize:12,fontWeight:500}}>{f.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{...S.card,padding:0,overflow:"hidden"}}>
              {loading?<div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>A carregar...</div>:(
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr>{["Cliente","Mercado","Plano","Status","Membros","Empresas","Uso","Criado","Acções"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {tenants.map((t,i)=>{
                      const pc=PLAN_CFG[t.plan]||PLAN_CFG.trial;
                      const u=usage.find(u=>u.tenant_id===t.id);
                      const usePct=Number(u?.usage_pct||0);
                      const useColor=u?.usage_status==="blocked"?"#A32D2D":u?.usage_status==="warning"?"#854F0B":"#3B6D11";
                      return(
                        <tr key={t.id} style={{background:i%2===0?"transparent":"#fafaf9"}}>
                          <td style={{...S.td,fontWeight:500}}>
                            {t.name}
                            <span style={{display:"block",fontSize:10,color:"#aaa",fontWeight:400}}>{t.slug}</span>
                          </td>
                          <td style={S.td}>{{pt:"🇵🇹",es:"🇪🇸",br:"🇧🇷"}[t.market]||t.market}</td>
                          <td style={S.td}><span style={{background:pc.bg,color:pc.c,padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:500}}>{t.plan}</span></td>
                          <td style={S.td}><span style={{fontSize:11,fontWeight:500,color:t.active?"#3B6D11":"#A32D2D"}}>{t.active?"● Ativo":"● Inativo"}</span></td>
                          <td style={S.td}>{t.tenant_users?.[0]?.count||0}</td>
                          <td style={S.td}>{t.disc_companies?.[0]?.count||0}</td>
                          <td style={S.td}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:48,height:4,borderRadius:4,background:"#f0f0f0",overflow:"hidden"}}>
                                <div style={{height:"100%",width:Math.min(100,usePct)+"%",background:useColor,borderRadius:4}}/>
                              </div>
                              <span style={{fontSize:11,color:useColor}}>{usePct}%</span>
                            </div>
                          </td>
                          <td style={{...S.td,color:"#aaa",fontSize:11}}>{new Date(t.created_at).toLocaleDateString("pt-PT")}</td>
                          <td style={S.td}>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>enterTenant(t)} style={{...S.btn,color:"#534AB7",borderColor:"#534AB7",fontWeight:500}}>Entrar →</button>
                              <button onClick={()=>setEditTenant({...t})} style={S.btn}>✏</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Edit modal */}
            {editTenant&&(
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setEditTenant(null)}>
                <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:400}} onClick={e=>e.stopPropagation()}>
                  <h3 style={{fontSize:16,fontWeight:500,marginBottom:20}}>Editar: {editTenant.name}</h3>
                  <div style={{display:"grid",gap:12}}>
                    <div><label style={S.label}>Plano</label>
                      <select style={S.input} value={editTenant.plan} onChange={e=>setEditTenant({...editTenant,plan:e.target.value})}>
                        {["trial","starter","pro","enterprise"].map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div><label style={S.label}>Status</label>
                      <select style={S.input} value={editTenant.active?"1":"0"} onChange={e=>setEditTenant({...editTenant,active:e.target.value==="1"})}>
                        <option value="1">Ativo</option><option value="0">Pausado</option>
                      </select>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
                    <button style={S.btn} onClick={()=>setEditTenant(null)}>Cancelar</button>
                    <button style={{...S.btn,background:"#1a1a1a",color:"#fff",border:"none"}} onClick={async()=>{
                      await supabase.from("tenants").update({plan:editTenant.plan,active:editTenant.active}).eq("id",editTenant.id);
                      setEditTenant(null);loadAll();
                    }}>Guardar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VISÃO GERAL ── */}
        {tab==="overview"&&(
          <div>
            <h1 style={{fontSize:20,fontWeight:500,marginBottom:20}}>Visão Geral</h1>
            <div style={{...S.grid4,marginBottom:20}}>
              {[
                {l:"MRR Estimado",    v:"€"+mrr,              sub:activeClients.length+" pagantes", color:"#3B6D11"},
                {l:"Contas Activas",  v:activeClients.length,  sub:tenants.filter(t=>t.plan==="trial").length+" trials", color:"#185FA5"},
                {l:"Churn Rate",      v:churnRate,             sub:"últimos 30 dias",  color:"#A32D2D"},
                {l:"Total Tenants",   v:tenants.length,        sub:"todos os planos",  color:"#534AB7"},
              ].map(m=>(
                <div key={m.l} style={S.metric}>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>{m.l}</div>
                  <div style={{fontSize:24,fontWeight:600,color:m.color}}>{loading?"—":m.v}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{m.sub}</div>
                </div>
              ))}
            </div>
            {/* Distribuição por plano */}
            <div style={S.grid2}>
              <div style={S.card}>
                <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Distribuição por plano</p>
                {Object.entries(PLAN_CFG).map(([plan,cfg])=>{
                  const count=tenants.filter(t=>t.plan===plan).length;
                  const pct=tenants.length>0?Math.round(count/tenants.length*100):0;
                  return(
                    <div key={plan} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                        <span style={{background:cfg.bg,color:cfg.c,padding:"1px 7px",borderRadius:4,fontSize:11,fontWeight:500}}>{plan}</span>
                        <span style={{color:"#888"}}>{count} · {pct}%</span>
                      </div>
                      <div style={{height:5,borderRadius:5,background:"#f0f0f0",overflow:"hidden"}}>
                        <div style={{height:"100%",width:pct+"%",background:cfg.c,borderRadius:5}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={S.card}>
                <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Novas contas (6 meses)</p>
                <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
                  {monthlyNew.map((m,i)=>{
                    const max=Math.max(...monthlyNew.map(x=>x.v),1);
                    return(
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <div style={{width:"100%",background:"#eeedfe",borderRadius:"3px 3px 0 0",height:64,display:"flex",alignItems:"flex-end"}}>
                          <div style={{width:"100%",background:"#534AB7",borderRadius:"3px 3px 0 0",height:Math.max(2,(m.v/max)*64)}}/>
                        </div>
                        <span style={{fontSize:9,color:"#aaa"}}>{m.l}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MARGEM ── */}
        {tab==="margin"&&(
          <div>
            <h1 style={{fontSize:20,fontWeight:500,marginBottom:20}}>Margem</h1>
            <div style={{...S.grid4,marginBottom:20}}>
              {[
                {l:"MRR actual",         v:"€"+mrr,          sub:"receita mensal",         color:"#3B6D11"},
                {l:"Custo mensal total",  v:"€"+Math.round(totalCosts), sub:costs.length+" itens", color:"#185FA5"},
                {l:"Margem do mês",       v:"€"+Math.round(margin),    sub:mrr>0?Math.round(margin/mrr*100)+"%":"—", color:margin>=0?"#3B6D11":"#A32D2D"},
                {l:"Investimento",        v:"€"+investment,   sub:"a recuperar",            color:"#534AB7"},
              ].map(m=>(
                <div key={m.l} style={S.metric}>
                  <div style={{fontSize:11,color:"#888",marginBottom:4}}>{m.l}</div>
                  <div style={{fontSize:22,fontWeight:600,color:m.color}}>{m.v}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={S.grid2}>
              <div style={S.card}>
                <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Custos</p>
                {costs.map(c=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"0.5px solid #f5f5f4",fontSize:13}}>
                    <span>{c.label} <span style={{fontSize:11,color:"#aaa"}}>({c.frequency})</span></span>
                    <span style={{fontWeight:500}}>€{toMonthly(c).toFixed(0)}/mês</span>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",marginTop:12,paddingTop:12,borderTop:"0.5px solid #e5e5e5"}}>
                  <span style={{fontSize:13,color:"#888"}}>Total mensal</span>
                  <span style={{fontSize:15,fontWeight:600}}>€{Math.round(totalCosts)}/mês</span>
                </div>
              </div>
              <div style={S.card}>
                <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Break-even simulação</p>
                <div style={{marginBottom:12}}>
                  <label style={S.label}>Investimento a recuperar (€)</label>
                  <input style={{...S.input,width:160}} type="number" value={investment} onChange={e=>{const v=Number(e.target.value);setInvestment(v);localStorage.setItem("revora_admin_investment",String(v));}} placeholder="0"/>
                </div>
                {[1,2,3,5,10,15,20].map(n=>{
                  const r=n*29; const m=r-totalCosts; const ok=m>=0;
                  const cur=activeClients.length===n;
                  return(
                    <div key={n} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",borderRadius:6,marginBottom:3,background:cur?"#f0f7ff":ok?"transparent":"#fff8f8",fontSize:12}}>
                      <span style={{fontWeight:cur?600:400}}>{n} clientes{cur?" ←":""}</span>
                      <span>€{r}/mês</span>
                      <span style={{fontWeight:500,color:ok?"#3B6D11":"#A32D2D"}}>{ok?"✓":"✗"} €{Math.round(m)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── FUNIL ── */}
        {tab==="funnel"&&(
          <div>
            <h1 style={{fontSize:20,fontWeight:500,marginBottom:20}}>Funil de Activação</h1>
            <div style={S.card}>
              {funnel.map((step,i)=>{
                const pct=funnelMax>0?Math.round(step.v/funnelMax*100):0;
                return(
                  <div key={i} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:22,height:22,borderRadius:"50%",background:step.color+"22",color:step.color,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                        <span style={{fontSize:13,fontWeight:500}}>{step.l}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:13,fontWeight:500}}>{step.v}</span>
                        <span style={{fontSize:11,color:"#aaa",width:32,textAlign:"right"}}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{height:6,borderRadius:6,background:"#f0f0f0"}}>
                      <div style={{height:"100%",borderRadius:6,width:pct+"%",background:step.color}}/>
                    </div>
                    {i<funnel.length-1&&funnel[i+1].v>0&&step.v>0&&(
                      <p style={{fontSize:10,color:"#ddd",margin:"3px 0 0 30px"}}>{Math.round(funnel[i+1].v/step.v*100)}% avançaram</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LIMITES & USO ── */}
        {tab==="limits"&&(
          <div>
            <h1 style={{fontSize:20,fontWeight:500,marginBottom:20}}>Limites & Uso por cliente</h1>
            <div style={S.card}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>{["Cliente","Plano","Pesquisas","Permitidas","Uso","Custo IA","Estado","Reset"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {usage.length===0?(
                    <tr><td colSpan={8} style={{...S.td,textAlign:"center",color:"#aaa"}}>Sem dados de uso ainda</td></tr>
                  ):usage.map((u,i)=>{
                    const color=u.usage_status==="blocked"?"#A32D2D":u.usage_status==="warning"?"#854F0B":"#3B6D11";
                    const t=tenants.find(x=>x.id===u.tenant_id);
                    const pc=PLAN_CFG[t?.plan||"trial"]||PLAN_CFG.trial;
                    return(
                      <tr key={u.tenant_id} style={{background:i%2===0?"transparent":"#fafaf9"}}>
                        <td style={{...S.td,fontWeight:500}}>{u.name}</td>
                        <td style={S.td}><span style={{background:pc.bg,color:pc.c,padding:"2px 7px",borderRadius:4,fontSize:11,fontWeight:500}}>{t?.plan||"—"}</span></td>
                        <td style={S.td}>{u.cycle_searches||0}</td>
                        <td style={S.td}>{u.searches_allowed||0}</td>
                        <td style={S.td}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:60,height:4,borderRadius:4,background:"#f0f0f0",overflow:"hidden"}}>
                              <div style={{height:"100%",width:Math.min(100,u.usage_pct||0)+"%",background:color,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:11,color,fontWeight:500}}>{u.usage_pct||0}%</span>
                          </div>
                        </td>
                        <td style={{...S.td,color:"#888"}}>${Number(u.cycle_cost_usd||0).toFixed(4)}</td>
                        <td style={S.td}>
                          <span style={{fontSize:11,fontWeight:500,color,background:color+"15",padding:"2px 8px",borderRadius:4}}>
                            {u.usage_status==="blocked"?"🔒 Bloqueado":u.usage_status==="warning"?"⚠ Aviso":"✓ Ok"}
                          </span>
                        </td>
                        <td style={{...S.td,color:"#aaa",fontSize:11}}>{u.cycle_resets_at?new Date(u.cycle_resets_at).toLocaleDateString("pt-PT"):"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EVENTOS ── */}
        {tab==="events"&&(
          <div>
            <h1 style={{fontSize:20,fontWeight:500,marginBottom:20}}>Log de Eventos</h1>
            <div style={{...S.card,padding:0,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>{["Evento","Módulo","Utilizador","Tenant","Data"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {events.map((ev,i)=>{
                    const isRoot=ev.event_type.startsWith("root.");
                    return(
                      <tr key={ev.id} style={{background:isRoot?"#EEEDFE":i%2===0?"transparent":"#fafaf9"}}>
                        <td style={S.td}><code style={{fontSize:11,background:isRoot?"#e5e3fe":"#f5f5f4",padding:"2px 6px",borderRadius:4,color:isRoot?"#534AB7":"#1a1a1a"}}>{ev.event_type}</code></td>
                        <td style={{...S.td,color:"#aaa"}}>{ev.module||"—"}</td>
                        <td style={{...S.td,color:"#888"}}>{ev.profiles?.full_name||"—"}</td>
                        <td style={{...S.td,color:"#888"}}>{tenants.find(t=>t.id===ev.tenant_id)?.name||"—"}</td>
                        <td style={{...S.td,color:"#aaa",fontSize:11}}>{new Date(ev.created_at).toLocaleString("pt-PT")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// ── APP SHELL ─────────────────────────────────────────────────
function AppShell() {
  const {user,profile,tenant,role,isAdmin,signOut,logEvent,loading,impersonating,exitTenant,enterTenant}=useAuth();
  const [page,setPage]=useState("import");
  const [companies,setCompanies]=useState([]);
  const [dataLoading,setDataLoading]=useState(false);
  const [enrichingId,setEnrichingId]=useState(null);
  const [filterClass,setFilterClass]=useState("all");
  const [filterSearch,setFilterSearch]=useState("");
  const [validations,setValidations]=useState({});
  const [selectedCompanyId,setSelectedCompanyId]=useState(null);
  const [selectedIds,setSelectedIds]=useState(new Set());
  const [toast,setToast]=useState(null);
  const showToast=(text,type="info")=>setToast({text,type});

  const loadCompanies=useCallback(async()=>{
    const t = tenant || impersonating?.tenant;
    if(!t)return;setDataLoading(true);
    // Load companies - order by combined_score first, then final_score
    const{data}=await supabase.from("companies_full").select("*").eq("tenant_id",t.id).order("combined_score",{ascending:false,nullsFirst:false}).order("final_score",{ascending:false,nullsFirst:false});
    setCompanies(data||[]);

    // Load all validations from DB (bug 4 fix)
    const{data:vals}=await supabase.from("disc_validations")
      .select("company_id,human_rating")
      .eq("tenant_id",t.id)
      .order("created_at",{ascending:false});
    if(vals){
      const valMap={};
      vals.forEach(v=>{if(!valMap[v.company_id])valMap[v.company_id]=v.human_rating;});
      setValidations(valMap);
    }
    setDataLoading(false);
  },[tenant]);

  useEffect(()=>{if(tenant)loadCompanies();},[tenant,loadCompanies]);

  if(loading)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontSize:13}}>A carregar...</div>;
  if(!user)return <AuthPage/>;
  // Root admin without impersonation → goes to admin panel
  if(isAdmin&&!impersonating&&!tenant)return <RootAdminShell/>;

  // Guard: if impersonating but tenant not yet set, use impersonating.tenant directly
  // This prevents getting stuck on "A carregar workspace"
  const effectiveTenant = tenant || (impersonating?.tenant) || null;
  if(isAdmin&&impersonating&&!effectiveTenant)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontSize:13}}>
      A carregar workspace...
    </div>
  );

  // Guard: regular user without tenant
  if(!isAdmin&&!tenant)return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#888",fontSize:13}}>
      <p>Sem workspace associado.</p>
      <button onClick={signOut} style={{padding:"8px 16px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:13}}>Sair</button>
    </div>
  );

  const navItems=[
    {k:"import",l:"Importar"},{k:"dashboard",l:"Dashboard"},
    {k:"review",l:"Opportunity Review"},{k:"icp",l:"Perfil ICP"},
    {k:"validation",l:"Validação"},
    {k:"profile",l:"Perfil"},{k:"settings",l:"Configurações"},
  ];

  // If viewing a company page, show it full screen
  if(selectedCompanyId) return (
    <div style={{minHeight:"100vh",background:"#f5f5f4",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <nav style={{background:"#fff",borderBottom:"0.5px solid #e5e5e5",padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <span style={{fontWeight:600,fontSize:14,marginRight:24,padding:"14px 0",color:"#1a1a1a"}}>Revora Discover</span>
        {tenant&&<span style={{fontSize:12,color:"#aaa",padding:"3px 8px",background:"#f5f5f4",borderRadius:5}}>{tenant.name}</span>}
      </nav>
      {impersonating&&(
        <div style={{background:"#534AB7",color:"#fff",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
          <span>⚡ Revora Admin · A aceder ao workspace <strong>{impersonating.tenant.name}</strong> · Todas as acções são registadas</span>
          <button onClick={exitTenant} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",padding:"4px 12px",borderRadius:5,cursor:"pointer",fontSize:12,fontWeight:500}}>← Sair da conta</button>
        </div>
      )}
      <main style={{maxWidth:900,margin:"0 auto",padding:"28px 20px"}}>
        <CompanyPage
          companyId={selectedCompanyId}
          onBack={()=>{setSelectedCompanyId(null);loadCompanies();}}
          onEnrich={enrichCompany}
          enrichingId={enrichingId}
        />
      </main>
    </div>
  );

  async function handleCSV(e) {
    if(!tenant?.id){showToast("Workspace não carregado.","error");return;}
    const file=e.target.files[0];if(!file)return;
    const text=await file.text();const rows=parseCSV(text);
    if(!rows.length){showToast("Nenhum dado encontrado","error");return;}
    setDataLoading(true);
    const toInsert=rows.map(r=>({tenant_id:tenant.id,name:r.name,website:r.website||null,category:r.category||null,subcategory:r.subcategory||null,city:r.city||null,state_region:r.state_region||null,country:r.country||"Portugal",source_type:"csv",status:"new",imported_by:user.id}));
    const{error}=await supabase.from("disc_companies").insert(toInsert);
    if(error)showToast("Erro: "+error.message,"error");
    else{await logEvent("company.imported","company",null,{count:rows.length});showToast(rows.length+" empresa(s) importada(s)!","success");await loadCompanies();setPage("dashboard");}
    setDataLoading(false);e.target.value="";
  }

  async function addManual(name,website,category,city,country) {
    if(!tenant?.id){showToast("Workspace não carregado.","error");return;}
    if(!name){showToast("Informe o nome","warning");return;}
    const{error}=await supabase.from("disc_companies").insert({tenant_id:tenant.id,name,website:website||null,category:category||null,city:city||null,country:country||"Portugal",source_type:"manual",status:"new",imported_by:user.id});
    if(error)showToast("Erro: "+error.message,"error");
    else{await logEvent("company.imported","company",null,{name,source:"manual"});showToast("Empresa adicionada!","success");await loadCompanies();}
  }

  async function enrichCompany(company) {
    if(enrichingId===company.id)return;
    if(!tenant?.id){showToast("Workspace não carregado. Tente novamente.","error");return;}
    setEnrichingId(company.id);

    // Verifica limite de uso antes de avançar
    const usage = await canSearch(tenant.id);
    if (usage.usage_status === "blocked") {
      setEnrichingId(null);
      showToast("Limite de pesquisas atingido. Upload CSV disponível ou aguarda o próximo ciclo.", "warning");
      return;
    }

    await supabase.from("disc_companies").update({status:"enriching"}).eq("id",company.id);

    try {
      // Tenta Microlink (crawl real) — fallback para mock se limite atingido ou sem URL
      const { enrichment: rawEnrichment, signals, _source } = await enrichCompanyReal(company);
      console.log(`[Revora] Enriquecimento via ${_source} para ${company.name}`);

      // RGPD: filtra emails pessoais, marca fonte pública, define retenção
      const enrichment = rgpdFilter({ ...rawEnrichment, tenant_id:tenant.id, company_id:company.id });

      // Add source tracking to enrichment
      const enrichmentWithSource = {
        ...enrichment,
        data_source: _source || "mock",
      };
      await supabase.from("disc_enrichment").upsert(enrichmentWithSource, {onConflict:"company_id"});

      // Scoring com keywords do tenant
      const scores = computeScores(enrichment, tenant);
      const { error: scoringErr } = await supabase.from("disc_scoring").upsert({
        tenant_id:      tenant.id,
        company_id:     company.id,
        fit_score:      scores.fitScore,
        digital_score:  scores.digitalScore,
        contact_score:  scores.contactScore,
        authority_score:scores.authorityScore,
        final_score:    scores.finalScore,
        score_class:    scores.scoreClass,
        model_version:  1,
      },{onConflict:"company_id"});
      if(scoringErr) console.error("[Revora] disc_scoring error:", scoringErr.message);

      // Sinais detectados
      await supabase.from("disc_signals").upsert({tenant_id:tenant.id,company_id:company.id,...signals},{onConflict:"company_id"});

      // Tenta análise IA via Netlify Function
      // Se falhar (sem key configurada no servidor), usa mock
      let ai;
      try {
        ai = await callClaudeAI(company, enrichment, tenant);
        if (!ai.executive_summary || ai.confidence_score === 0) throw new Error("fallback");
      } catch {
        ai = await analyzeCompanyMock(company, enrichment, tenant);
      }
      await supabase.from("disc_ai_analysis").upsert({tenant_id:tenant.id,company_id:company.id,executive_summary:ai.executive_summary,strengths:ai.strengths||[],weaknesses:ai.weaknesses||[],partnership_potential:ai.partnership_potential,recommended_action:ai.recommended_action,confidence_score:ai.confidence_score},{onConflict:"company_id"});

      const { error: statusErr } = await supabase.from("disc_companies").update({status:"scored"}).eq("id",company.id);
      if(statusErr) console.error("[Revora] status update error:", statusErr.message);
      await logEvent("company.enriched","company",company.id,{score:scores.finalScore,class:scores.scoreClass});
      // Regista uso para controlo de limites e custos reais
      await logUsage(tenant.id, "microlink", company.id);
      await logUsage(tenant.id, "ai_analysis", company.id, 800, 300);
      showToast(`${company.name} · Score ${scores.finalScore} (Classe ${scores.scoreClass})`,"success");
    } catch(err) {
      await supabase.from("disc_companies").update({status:"new"}).eq("id",company.id);
      showToast(`Erro ao enriquecer ${company.name}: ${err.message}`,"error");
    } finally {
      setEnrichingId(null);
      await loadCompanies();
    }
  }


  async function saveCommercialNote(companyId, note) {
    const { error } = await supabase
      .from("disc_companies")
      .update({ commercial_note: note, updated_at: new Date().toISOString() })
      .eq("id", companyId);
    if (!error) {
      setCompanies(prev => prev.map(c =>
        c.id === companyId ? { ...c, _commercial_note: note } : c
      ));
    }
  }

  async function deleteCompanies(ids) {
    if(!ids.size)return;
    if(!confirm(`Apagar ${ids.size} empresa(s)? Esta acção não pode ser desfeita.`))return;
    const idArr=[...ids];
    // Remove dados relacionados primeiro
    await Promise.all([
      supabase.from("disc_enrichment").delete().in("company_id",idArr),
      supabase.from("disc_scoring").delete().in("company_id",idArr),
      supabase.from("disc_ai_analysis").delete().in("company_id",idArr),
      supabase.from("disc_signals").delete().in("company_id",idArr),
      supabase.from("disc_validations").delete().in("company_id",idArr),
      supabase.from("company_icp_signals").delete().in("company_id",idArr),
      supabase.from("company_human_score").delete().in("company_id",idArr),
    ]);
    await supabase.from("disc_companies").delete().in("id",idArr);
    setSelectedIds(new Set());
    showToast(`${ids.size} empresa(s) apagada(s)`,"success");
    await loadCompanies();
  }

  async function resetAllAnalysis() {
    if(!confirm("Apagar TODA a análise (scores, enriquecimento, IA, validações)? As empresas ficam mas voltam a 'new'."))return;
    const ids=companies.map(c=>c.id);
    await Promise.all([
      supabase.from("disc_enrichment").delete().eq("tenant_id",tenant.id),
      supabase.from("disc_scoring").delete().eq("tenant_id",tenant.id),
      supabase.from("disc_ai_analysis").delete().eq("tenant_id",tenant.id),
      supabase.from("disc_signals").delete().eq("tenant_id",tenant.id),
      supabase.from("disc_validations").delete().eq("tenant_id",tenant.id),
      supabase.from("company_icp_signals").delete().eq("tenant_id",tenant.id),
      supabase.from("company_human_score").delete().eq("tenant_id",tenant.id),
    ]);
    await supabase.from("disc_companies").update({status:"new",commercial_note:null}).eq("tenant_id",tenant.id);
    showToast("Análise reposta — empresas prontas para reenriquecer","success");
    await loadCompanies();
  }

  function exportCSV() {
    const rows=companies.map(c=>({
      name:c.name||"",
      website:c.website||"",
      category:c.category||"",
      city:c.city||"",
      country:c.country||"",
      status:c.status||"",
      score:c.final_score??c.combined_score??"",
      class:c.score_class||c.combined_class||"",
      email:c.email||"",
      phone:c.phone||"",
      instagram:c.instagram||"",
      potential:c.partnership_potential||"",
      validation:c.latest_validation||"",
      commercial_note:c.commercial_note||"",
    }));
    const headers=Object.keys(rows[0]);
    const csv=[headers.join(","),...rows.map(r=>headers.map(h=>`"${String(r[h]).replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`revora-discover-${tenant?.slug||"export"}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast(`${companies.length} empresas exportadas`,"success");
  }

  async function enrichAll() {
    const pending=companies.filter(c=>c.status==="new");
    if(!pending.length){showToast("Sem empresas novas","warning");return;}
    showToast(`A enriquecer ${Math.min(pending.length,8)} empresa(s)...`,"info");
    for(const c of pending.slice(0,8))await enrichCompany(c);
  }

  async function submitValidation(companyId,rating,aiScore) {
    const{error}=await supabase.from("disc_validations").insert({tenant_id:tenant.id,company_id:companyId,reviewer_id:user.id,ai_score:aiScore,human_rating:rating});
    if(error)showToast("Erro ao guardar","error");
    else{setValidations(v=>({...v,[companyId]:rating}));await logEvent("validation.submitted","company",companyId,{rating,ai_score:aiScore});showToast("Avaliação guardada!","success");}
  }

  const top20=[...companies].filter(c=>c.final_score!=null||c.combined_score!=null).sort((a,b)=>(b.combined_score??b.final_score??0)-(a.combined_score??a.final_score??0)).slice(0,20);
  const filtered=companies
    .filter(c=>filterClass==="all"||(c.combined_class||c.score_class)===filterClass)
    .filter(c=>{
      if(!filterSearch) return true;
      const s=filterSearch.toLowerCase();
      return (c.name||"").toLowerCase().includes(s)
        ||(c.city||"").toLowerCase().includes(s)
        ||(c.category||"").toLowerCase().includes(s)
        ||(c.email||"").toLowerCase().includes(s);
    });

  const CS={
    nav:{background:"#fff",borderBottom:"0.5px solid #e5e5e5",padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100},
    main:{maxWidth:1100,margin:"0 auto",padding:"28px 20px"},
    card:{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12},
    table:{width:"100%",borderCollapse:"collapse",fontSize:13},
    th:{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:0.5,borderBottom:"0.5px solid #e5e5e5"},
    td:{padding:"10px 14px",borderBottom:"0.5px solid #e5e5e5",color:"#1a1a1a"},
    metric:{background:"#f5f5f4",borderRadius:8,padding:14},
    btn:{padding:"7px 14px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:13,color:"#1a1a1a"},
    btnPrimary:{padding:"9px 20px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer"},
    input:{padding:"8px 12px",borderRadius:8,border:"0.5px solid #ddd",fontSize:13,background:"#fff",color:"#1a1a1a"},
    h1:{fontSize:20,fontWeight:500,marginBottom:5},
    sub:{fontSize:13,color:"#888",marginBottom:24},
  };

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f4",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <nav style={CS.nav}>
        <span style={{fontWeight:600,fontSize:14,marginRight:24,padding:"14px 0",color:"#1a1a1a"}}>Revora Discover</span>
        {navItems.map(tab=>(
          <button key={tab.k} onClick={()=>setPage(tab.k)} style={{padding:"14px 11px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:page===tab.k?500:400,color:page===tab.k?"#1a1a1a":"#888",borderBottom:page===tab.k?"2px solid #1a1a1a":"2px solid transparent"}}>{tab.l}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
          {tenant&&<span style={{fontSize:12,color:"#aaa",padding:"3px 8px",background:"#f5f5f4",borderRadius:5}}>{tenant.name}</span>}
          <MicrolinkCounter/>
          <UsageMeterNav tenantId={tenant?.id}/>
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#888",textDecoration:"none",padding:"5px 10px",border:"0.5px solid #ddd",borderRadius:6}}>⭐ Feedback</a>
          {impersonating
            ? <button onClick={exitTenant} style={{...CS.btn,fontSize:12,color:"#534AB7",borderColor:"#534AB7"}}>← Sair da conta</button>
            : <button onClick={signOut} style={{...CS.btn,fontSize:12,color:"#888"}}>Sair</button>}
        </div>
      </nav>

      <main style={CS.main}>
        {page==="admin"&&isAdmin&&<AdminPanel/>}
        {page==="settings"&&<SettingsPage/>}
        {page==="profile"&&<ProfilePage CS={CS}/>}
        {page==="icp"&&<ICPPage companies={companies} validations={validations} onSelectCompany={setSelectedCompanyId}/>}
        {page==="import"&&<ImportPage CS={CS} handleCSV={handleCSV} addManual={addManual} loading={dataLoading}/>}

        {page==="dashboard"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:12}}>
              <div><h1 style={CS.h1}>Dashboard</h1><p style={{fontSize:13,color:"#888",margin:0}}>{companies.length} empresas · clique para ver detalhes</p></div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {selectedIds.size>0&&(
                  <button onClick={()=>deleteCompanies(selectedIds)} style={{...CS.btn,color:"#A32D2D",borderColor:"#f0c0c0"}}>
                    🗑 Apagar seleccionadas ({selectedIds.size})
                  </button>
                )}
                <button style={CS.btn} onClick={enrichAll}>⚡ Enriquecer novas ({companies.filter(c=>c.status==="new").length})</button>
                <button style={CS.btn} onClick={exportCSV} title="Exportar CSV">↓ CSV</button>
                <button style={{...CS.btn,color:"#A32D2D"}} onClick={resetAllAnalysis} title="Zerar toda a análise">🔄 Zerar análise</button>
                <button style={{...CS.btn,color:"#aaa"}} onClick={loadCompanies} title="Actualizar">↺</button>
              </div>
            </div>
            {/* SEARCH */}
            <div style={{marginBottom:12}}>
              <input value={filterSearch} onChange={e=>setFilterSearch(e.target.value)}
                placeholder="🔍 Pesquisar por nome, cidade ou categoria..."
                style={{...CS.input,width:"100%",borderRadius:20,padding:"8px 16px"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
              {[{l:"Total",v:companies.length},{l:"Classe A",v:companies.filter(c=>c.score_class==="A").length},{l:"Classe B",v:companies.filter(c=>c.score_class==="B").length},{l:"Pontuadas",v:companies.filter(c=>c.final_score!=null).length},{l:"Novas",v:companies.filter(c=>c.status==="new").length}].map(m=>(
                <div key={m.l} style={CS.metric}><div style={{fontSize:11,color:"#888",marginBottom:3}}>{m.l}</div><div style={{fontSize:22,fontWeight:500}}>{m.v}</div></div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {["all","A","B","C","D"].map(f=>(
                <button key={f} onClick={()=>setFilterClass(f)} style={{padding:"5px 12px",borderRadius:6,fontSize:12,cursor:"pointer",border:"0.5px solid #ddd",background:filterClass===f?"#1a1a1a":"#fff",color:filterClass===f?"#fff":"#888",fontWeight:filterClass===f?500:400}}>{f==="all"?"Todas":`Classe ${f}`}</button>
              ))}
            </div>
            {dataLoading ? (
              <div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>A carregar...</div>
            ) : filtered.length===0 ? (
              <div style={{...CS.card,padding:40,textAlign:"center",color:"#888",fontSize:13}}>
                Sem empresas. Importe um CSV para começar.
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
                {filtered.map(c=>{
                  const sel=validations[c.id]||c.latest_validation;
                  const cfg=CLASS_CFG[c.score_class]||{bg:"#f5f5f4",c:"#888"};
                  const isEnr=enrichingId===c.id;
                  return(
                    <div key={c.id}
                      onClick={()=>setSelectedCompanyId(c.id)}
                      style={{background:selectedIds.has(c.id)?"#f0f7ff":"#fff",border:selectedIds.has(c.id)?"0.5px solid #185FA5":"0.5px solid #e5e5e5",borderRadius:12,padding:"16px 18px",cursor:"pointer",transition:"box-shadow 0.15s",position:"relative"}}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                      {/* Checkbox select */}
                      <div onClick={e=>{e.stopPropagation();setSelectedIds(prev=>{const n=new Set(prev);n.has(c.id)?n.delete(c.id):n.add(c.id);return n;})}}
                        style={{position:"absolute",top:10,left:10,width:16,height:16,borderRadius:4,border:"1.5px solid",borderColor:selectedIds.has(c.id)?"#185FA5":"#ddd",background:selectedIds.has(c.id)?"#185FA5":"#fff",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1}}>
                        {selectedIds.has(c.id)&&<span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span>}
                      </div>

                      {/* Score badge top right - shows combined if available */}
                      {(c.final_score!=null||c.combined_score!=null) && (()=>{
                        const displayScore = c.combined_score??c.final_score;
                        const displayClass = c.combined_class??c.score_class;
                        const dcfg = CLASS_CFG[displayClass]||{bg:"#f5f5f4",c:"#888"};
                        return(
                          <div style={{position:"absolute",top:14,right:14,textAlign:"center",background:dcfg.bg,borderRadius:8,padding:"4px 10px"}}>
                            <div style={{fontSize:16,fontWeight:700,color:dcfg.c,lineHeight:1}}>{displayScore}</div>
                            <div style={{fontSize:9,color:dcfg.c,opacity:0.8}}>Classe {displayClass}</div>
                          </div>
                        );
                      })()}

                      {/* Name + location */}
                      <div style={{paddingRight:c.final_score!=null?60:0,marginBottom:8}}>
                        <p style={{fontWeight:500,fontSize:14,margin:"0 0 2px",color:"#1a1a1a",lineHeight:1.3}}>{c.name}</p>
                        <p style={{fontSize:11,color:"#aaa",margin:0}}>{[c.city,c.category].filter(Boolean).join(" · ")||"—"}</p>
                      </div>

                      {/* Score bars mini */}
                      {c.final_score!=null && (
                        <div style={{marginBottom:10}}>
                          {[
                            {l:"Fit",v:c.fit_score,color:"#534AB7"},
                            {l:"Digital",v:c.digital_score,color:"#1D9E75"},
                            {l:"Contacto",v:c.contact_score,color:"#E8A020"},
                          ].map(b=>(
                            <div key={b.l} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                              <span style={{fontSize:10,color:"#aaa",width:44,flexShrink:0}}>{b.l}</span>
                              <div style={{flex:1,height:3,borderRadius:3,background:"#f0f0f0",overflow:"hidden"}}>
                                <div style={{height:"100%",borderRadius:3,width:(b.v||0)+"%",background:b.color}}/>
                              </div>
                              <span style={{fontSize:10,color:"#aaa",width:20,textAlign:"right"}}>{Math.round(b.v||0)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Contactos + source */}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
                        {c.email     && <span style={{fontSize:10,color:"#185FA5"}}>✉</span>}
                        {c.phone     && <span style={{fontSize:10,color:"#555"}}>📞</span>}
                        {c.instagram && <span style={{fontSize:10,color:"#E1306C"}}>📸</span>}
                        {c.whatsapp  && <span style={{fontSize:10,color:"#25D366"}}>💬</span>}
                        {c.linkedin  && <span style={{fontSize:10,color:"#0077B5"}}>in</span>}
                        <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
                          {c.enrichment_status&&<SourceBadge source={c.data_source||"mock"}/>}
                          {c.partnership_potential && (
                            <span style={{fontSize:10,fontWeight:500,color:c.partnership_potential==="alto"?"#3B6D11":c.partnership_potential==="baixo"?"#A32D2D":"#854F0B"}}>
                              {c.partnership_potential}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Bottom: validation + action */}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"0.5px solid #f5f5f4",paddingTop:8}}>
                        <div>
                          {sel
                            ? <span style={{fontSize:11,color:RATINGS.find(r=>r.v===sel)?.c||"#888",fontWeight:500}}>{RATINGS.find(r=>r.v===sel)?.l}</span>
                            : <span style={{fontSize:11,color:"#ddd"}}>Sem avaliação</span>}
                        </div>
                        <button
                          onClick={e=>{e.stopPropagation();enrichCompany(c);}}
                          disabled={isEnr}
                          style={{padding:"3px 10px",borderRadius:5,fontSize:11,border:"0.5px solid #ddd",background:"#fff",cursor:isEnr?"wait":"pointer",color:c.status==="new"?"#1a1a1a":"#aaa"}}>
                          {isEnr?"⏳":c.status==="new"?"Enriquecer":"↺"}
                        </button>
                      </div>

                      {/* Commercial note preview */}
                      {c.commercial_note && (
                        <p style={{fontSize:10,color:"#aaa",marginTop:6,marginBottom:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          📝 {c.commercial_note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page==="review"&&(
          <div>
            <h1 style={CS.h1}>Opportunity Review</h1>
            <p style={CS.sub}>Top {top20.length} oportunidades ordenadas por score — clique para análise completa</p>
            {top20.length===0 ? (
              <div style={{...CS.card,padding:40,textAlign:"center",color:"#888",fontSize:13}}>
                Nenhuma empresa pontuada ainda. Vá ao Dashboard e clique em "Enriquecer".
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {top20.map((c,i)=>{
                  const sel=validations[c.id]||c.latest_validation;
                  const cfg=CLASS_CFG[c.score_class]||{bg:"#f5f5f4",c:"#888"};
                  return(
                    <div key={c.id}
                      onClick={()=>setSelectedCompanyId(c.id)}
                      style={{...CS.card,padding:"16px 20px",cursor:"pointer",transition:"box-shadow 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                          {/* Rank */}
                          <div style={{width:28,height:28,borderRadius:"50%",background:"#f5f5f4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#888",flexShrink:0}}>
                            {i+1}
                          </div>
                          <div style={{minWidth:0}}>
                            <p style={{fontWeight:500,fontSize:14,margin:"0 0 2px",color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</p>
                            <p style={{fontSize:11,color:"#aaa",margin:0}}>{[c.city,c.category].filter(Boolean).join(" · ")||"—"}</p>
                          </div>
                        </div>
                        {/* Score + class */}
                        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                          {sel&&(
                            <span style={{fontSize:11,color:RATINGS.find(r=>r.v===sel)?.c||"#888",fontWeight:500,background:(RATINGS.find(r=>r.v===sel)?.c||"#888")+"15",padding:"2px 8px",borderRadius:4}}>
                              {RATINGS.find(r=>r.v===sel)?.l}
                            </span>
                          )}
                          <div style={{textAlign:"center",background:cfg.bg,borderRadius:8,padding:"4px 12px"}}>
                            <div style={{fontSize:18,fontWeight:700,color:cfg.c,lineHeight:1}}>{c.final_score}</div>
                            <div style={{fontSize:9,color:cfg.c,opacity:0.8}}>Classe {c.score_class}</div>
                          </div>
                          <span style={{fontSize:14,color:"#ccc"}}>→</span>
                        </div>
                      </div>
                      {/* Mini bars */}
                      {c.fit_score!=null && (
                        <div style={{display:"flex",gap:8,marginTop:12,paddingTop:10,borderTop:"0.5px solid #f5f5f4"}}>
                          {[
                            {l:"Fit",v:c.fit_score,color:"#534AB7"},
                            {l:"Authority",v:c.authority_score,color:"#185FA5"},
                            {l:"Digital",v:c.digital_score,color:"#1D9E75"},
                            {l:"Contacto",v:c.contact_score,color:"#E8A020"},
                          ].map(b=>(
                            <div key={b.l} style={{flex:1}}>
                              <div style={{fontSize:9,color:"#ccc",marginBottom:2,textAlign:"center"}}>{b.l}</div>
                              <div style={{height:3,borderRadius:3,background:"#f0f0f0",overflow:"hidden"}}>
                                <div style={{height:"100%",borderRadius:3,width:(b.v||0)+"%",background:b.color}}/>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* AI summary preview */}
                      {c.executive_summary && (
                        <p style={{fontSize:12,color:"#888",marginTop:8,marginBottom:0,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                          {c.executive_summary}
                        </p>
                      )}
                      {/* Recommended action */}
                      {c.recommended_action && (
                        <p style={{fontSize:11,color:"#185FA5",marginTop:6,marginBottom:0}}>
                          → {c.recommended_action}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page==="validation"&&(
          <div>
            <h1 style={CS.h1}>Dashboard de Validação</h1>
            <p style={CS.sub}>Acurácia por classe · Meta: 70%+ nas Classe A</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:28}}>
              {[
                {l:"Avaliadas",v:Object.keys(validations).length},
                {l:"Excelentes",v:Object.values(validations).filter(v=>v==="excellent").length},
                {l:"Boas",v:Object.values(validations).filter(v=>v==="good").length},
                {l:"Ruins",v:Object.values(validations).filter(v=>v==="bad").length},
                {l:"Revisar",v:Object.values(validations).filter(v=>v==="review_later").length},
              ].map(m=>(
                <div key={m.l} style={CS.metric}><div style={{fontSize:11,color:"#888",marginBottom:3}}>{m.l}</div><div style={{fontSize:22,fontWeight:500}}>{m.v}</div></div>
              ))}
            </div>
            <h2 style={{fontSize:14,fontWeight:500,marginBottom:14}}>Acurácia por classe</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
              {["A","B","C","D"].map(cls=>{
                const effectiveClass = c => c.combined_class||c.score_class;
                const clsCos=companies.filter(c=>effectiveClass(c)===cls);
                const validated=clsCos.filter(c=>validations[c.id]).length;
                const approved=clsCos.filter(c=>["excellent","good"].includes(validations[c.id])).length;
                const pct=validated>0?Math.round(approved/validated*100):null;const ok=pct!==null&&pct>=70;
                return(
                  <div key={cls} style={{...CS.card,padding:"18px 20px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><ClassBadge cls={cls}/>{pct!==null&&<span style={{fontSize:20,fontWeight:500,color:ok?"#3B6D11":"#A32D2D"}}>{pct}%</span>}</div>
                    <p style={{fontSize:12,color:"#888",margin:"0 0 2px"}}>{clsCos.length} empresas · {validated} avaliadas</p>
                    <p style={{fontSize:12,color:"#888",margin:0}}>{approved} aprovadas</p>
                    {pct!==null&&<div style={{marginTop:10,height:3,borderRadius:3,background:"#f0f0f0"}}><div style={{height:"100%",borderRadius:3,width:pct+"%",background:ok?"#3B6D11":"#A32D2D"}}/></div>}
                    {cls==="A"&&<p style={{fontSize:10,color:"#bbb",marginTop:6}}>Meta: 70%</p>}
                  </div>
                );
              })}
            </div>
            <h2 style={{fontSize:14,fontWeight:500,marginBottom:12}}>Relatório de aprendizado</h2>
            <div style={{...CS.card,padding:24}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                <div><p style={{fontSize:13,fontWeight:500,color:"#3B6D11",marginBottom:10}}>✓ Aprovados possuem</p>{["Instagram ativo com audiência fitness/saúde","Email e contacto direto disponível","Loja física ou e-commerce operacional","Menção a suplementos ou nutrição desportiva","Múltiplas unidades ou presença regional"].map(s=><p key={s} style={{fontSize:12,color:"#888",margin:"3px 0"}}>· {s}</p>)}</div>
                <div><p style={{fontSize:13,fontWeight:500,color:"#A32D2D",marginBottom:10}}>✗ Reprovados possuem</p>{["Baixa presença digital ou sem redes sociais","Sem contacto disponível no site","Fora do nicho de saúde/nutrição/fitness","Site desatualizado ou sem informação","Sem menção a produtos do segmento"].map(s=><p key={s} style={{fontSize:12,color:"#888",margin:"3px 0"}}>· {s}</p>)}</div>
              </div>
            </div>
          </div>
        )}
      </main>


      {toast&&<Toast msg={toast} onClose={()=>setToast(null)}/>}
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppShell/></AuthProvider>;
}
