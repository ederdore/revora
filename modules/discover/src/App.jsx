import { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { supabase } from "./supabaseClient.js";
import AuthPage from "./pages/AuthPage.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { enrichCompanyMock, analyzeCompanyMock, computeScores, rgpdFilter } from "./lib/enrichment.js";
import { canSearch, logUsage, PLAN_LIMITS } from "./lib/usage.js";
import { UsageMeterNav, UsageMeterFull } from "./components/UsageMeter.jsx";
import CompanyPage from "./pages/CompanyPage.jsx";

// ── CONSTANTS ─────────────────────────────────────────────────
const CLASS_CFG = {
  A:{bg:"#EAF3DE",c:"#3B6D11"},B:{bg:"#E6F1FB",c:"#185FA5"},
  C:{bg:"#FAEEDA",c:"#854F0B"},D:{bg:"#FCEBEB",c:"#A32D2D"},
};
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
  const prompt = `És um analista comercial especializado em parcerias B2B em Portugal.

Contexto: ${biz}
Instrução: ${ctx}

Empresa:
Nome: ${company.name}
Website: ${company.website || "—"}
Categoria: ${company.category || "—"}
Cidade: ${company.city || "—"}
Título: ${enrichment.website_title || "—"}
Descrição: ${enrichment.meta_description || "—"}
Conteúdo: ${(enrichment.visible_content || "").substring(0, 600)}
Instagram: ${enrichment.instagram || "não"}
Email: ${enrichment.email || "não"}

Responde APENAS com JSON sem markdown:
{"executive_summary":"2-3 frases","strengths":["s1","s2"],"weaknesses":["w1"],"partnership_potential":"alto|médio|baixo","recommended_action":"ação concreta","confidence_score":70}`;

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

// ── PROFILE PAGE ──────────────────────────────────────────────
function ProfilePage({CS}) {
  const {user,profile,tenant,role} = useAuth();
  const plan = PLAN_CFG[tenant?.plan||"trial"];
  const modules = [
    {k:"module_feedback",l:"Feedback",icon:"⭐",desc:"Retenção e experiência de clientes"},
    {k:"module_discover",l:"Discover",icon:"🔍",desc:"Qualificação de leads B2B"},
    {k:"module_pulse",l:"Pulse",icon:"⚡",desc:"Prospeção automatizada"},
  ];
  return (
    <div style={{maxWidth:600,margin:"0 auto"}}>
      <h1 style={CS.h1}>Perfil & Plano</h1>
      <p style={CS.sub}>Informação da conta e módulos activos</p>

      {/* UTILIZADOR */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Conta</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            {l:"Nome",v:profile?.full_name||"—"},
            {l:"Email",v:user?.email||"—"},
            {l:"Role",v:role||"—"},
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

      {/* PLANO */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:500,margin:0}}>Plano actual</p>
          <span style={{background:plan.bg,color:plan.c,padding:"3px 10px",borderRadius:6,fontSize:12,fontWeight:500}}>{plan.label}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {[
            {l:"Empresas",v:tenant?.plan==="trial"?"50":"Ilimitado"},
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
            <p style={{fontSize:12,color:"#854F0B",margin:0}}>Período trial — upgrade para acesso completo</p>
            <button style={{padding:"5px 12px",borderRadius:6,border:"none",background:"#854F0B",color:"#fff",fontSize:12,cursor:"pointer"}}>Upgrade</button>
          </div>
        )}
      </div>

      {/* MÓDULOS */}
      <div style={{...CS.card,padding:24,marginBottom:16}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Módulos</p>
        {modules.map(m=>{
          const active = tenant?.[m.k];
          return (
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

      {/* ACESSO AO FEEDBACK */}
      <div style={{...CS.card,padding:24}}>
        <p style={{fontSize:13,fontWeight:500,marginBottom:10}}>Acesso rápido</p>
        <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#f9f9f8",borderRadius:8,textDecoration:"none",color:"#1a1a1a"}}>
          <span style={{fontSize:20}}>⭐</span>
          <div>
            <p style={{fontSize:13,fontWeight:500,margin:0}}>Revora Feedback</p>
            <p style={{fontSize:11,color:"#aaa",margin:0}}>Abrir módulo de retenção de clientes</p>
          </div>
          <span style={{marginLeft:"auto",color:"#aaa",fontSize:14}}>→</span>
        </a>
      </div>
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

// ── APP SHELL ─────────────────────────────────────────────────
function AppShell() {
  const {user,profile,tenant,role,isAdmin,signOut,logEvent,loading}=useAuth();
  const [page,setPage]=useState("import");
  const [companies,setCompanies]=useState([]);
  const [dataLoading,setDataLoading]=useState(false);
  const [enrichingId,setEnrichingId]=useState(null);
  const [filterClass,setFilterClass]=useState("all");
  const [validations,setValidations]=useState({});
  const [selectedCompanyId,setSelectedCompanyId]=useState(null);
  const [toast,setToast]=useState(null);
  const showToast=(text,type="info")=>setToast({text,type});

  const loadCompanies=useCallback(async()=>{
    if(!tenant)return;setDataLoading(true);
    const{data}=await supabase.from("companies_full").select("*").eq("tenant_id",tenant.id).order("final_score",{ascending:false,nullsFirst:false});
    setCompanies(data||[]);setDataLoading(false);
  },[tenant]);

  useEffect(()=>{if(tenant)loadCompanies();},[tenant,loadCompanies]);

  if(loading)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontSize:13}}>A carregar...</div>;
  if(!user)return <AuthPage/>;

  const navItems=[
    {k:"import",l:"Importar"},{k:"dashboard",l:"Dashboard"},
    {k:"review",l:"Opportunity Review"},{k:"validation",l:"Validação"},
    {k:"profile",l:"Perfil"},{k:"settings",l:"Configurações"},
    ...(isAdmin?[{k:"admin",l:"Admin ⚡"}]:[]),
  ];

  // If viewing a company page, show it full screen
  if(selectedCompanyId) return (
    <div style={{minHeight:"100vh",background:"#f5f5f4",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
      <nav style={{background:"#fff",borderBottom:"0.5px solid #e5e5e5",padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <span style={{fontWeight:600,fontSize:14,marginRight:24,padding:"14px 0",color:"#1a1a1a"}}>Revora Discover</span>
        {tenant&&<span style={{fontSize:12,color:"#aaa",padding:"3px 8px",background:"#f5f5f4",borderRadius:5}}>{tenant.name}</span>}
      </nav>
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
    if(!name){showToast("Informe o nome","warning");return;}
    const{error}=await supabase.from("disc_companies").insert({tenant_id:tenant.id,name,website:website||null,category:category||null,city:city||null,country:country||"Portugal",source_type:"manual",status:"new",imported_by:user.id});
    if(error)showToast("Erro: "+error.message,"error");
    else{await logEvent("company.imported","company",null,{name,source:"manual"});showToast("Empresa adicionada!","success");await loadCompanies();}
  }

  async function enrichCompany(company) {
    if(enrichingId===company.id)return;
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
      // Fase 1: Mock realista por categoria (substitui por Microlink quando disponível)
      const { enrichment: rawEnrichment, signals } = await enrichCompanyMock(company);

      // RGPD: filtra emails pessoais, marca fonte pública, define retenção
      const enrichment = rgpdFilter({ ...rawEnrichment, tenant_id:tenant.id, company_id:company.id });

      await supabase.from("disc_enrichment").upsert(enrichment, {onConflict:"company_id"});

      // Scoring com keywords do tenant
      const scores = computeScores(enrichment, tenant);
      await supabase.from("disc_scoring").upsert({tenant_id:tenant.id,company_id:company.id,...scores},{onConflict:"company_id"});

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

      await supabase.from("disc_companies").update({status:"scored"}).eq("id",company.id);
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

  const top20=companies.filter(c=>c.final_score!=null).slice(0,20);
  const filtered=filterClass==="all"?companies:companies.filter(c=>c.score_class===filterClass);

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
          <UsageMeterNav tenantId={tenant?.id}/>
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"#888",textDecoration:"none",padding:"5px 10px",border:"0.5px solid #ddd",borderRadius:6}}>⭐ Feedback</a>
          <button onClick={signOut} style={{...CS.btn,fontSize:12,color:"#888"}}>Sair</button>
        </div>
      </nav>

      <main style={CS.main}>
        {page==="admin"&&isAdmin&&<AdminPanel/>}
        {page==="settings"&&<SettingsPage/>}
        {page==="profile"&&<ProfilePage CS={CS}/>}
        {page==="import"&&<ImportPage CS={CS} handleCSV={handleCSV} addManual={addManual} loading={dataLoading}/>}

        {page==="dashboard"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div><h1 style={CS.h1}>Dashboard</h1><p style={{fontSize:13,color:"#888",margin:0}}>Clique numa empresa para ver detalhes e validar</p></div>
              <div style={{display:"flex",gap:8}}>
                <button style={CS.btn} onClick={enrichAll}>⚡ Enriquecer novas ({companies.filter(c=>c.status==="new").length})</button>
                <button style={{...CS.btn,color:"#aaa"}} onClick={loadCompanies}>↺</button>
              </div>
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
                      style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"16px 18px",cursor:"pointer",transition:"box-shadow 0.15s",position:"relative"}}
                      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"}
                      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>

                      {/* Score badge top right */}
                      {c.final_score!=null && (
                        <div style={{position:"absolute",top:14,right:14,textAlign:"center",background:cfg.bg,borderRadius:8,padding:"4px 10px"}}>
                          <div style={{fontSize:16,fontWeight:700,color:cfg.c,lineHeight:1}}>{c.final_score}</div>
                          <div style={{fontSize:9,color:cfg.c,opacity:0.8}}>Classe {c.score_class}</div>
                        </div>
                      )}

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

                      {/* Contactos */}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                        {c.email     && <span style={{fontSize:10,color:"#185FA5"}}>✉</span>}
                        {c.phone     && <span style={{fontSize:10,color:"#555"}}>📞</span>}
                        {c.instagram && <span style={{fontSize:10,color:"#E1306C"}}>📸</span>}
                        {c.whatsapp  && <span style={{fontSize:10,color:"#25D366"}}>💬</span>}
                        {c.linkedin  && <span style={{fontSize:10,color:"#0077B5"}}>in</span>}
                        {c.partnership_potential && (
                          <span style={{fontSize:10,fontWeight:500,color:c.partnership_potential==="alto"?"#3B6D11":c.partnership_potential==="baixo"?"#A32D2D":"#854F0B",marginLeft:"auto"}}>
                            {c.partnership_potential}
                          </span>
                        )}
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
            <p style={CS.sub}>Top {top20.length} oportunidades · clique para abrir detalhes completos</p>
            {top20.length===0?<div style={{...CS.card,padding:40,textAlign:"center",color:"#888",fontSize:13}}>Nenhuma empresa pontuada. Vá ao Dashboard e enriqueça as empresas.</div>
            :top20.map((c,i)=>{
              const sel=validations[c.id]||c.latest_validation;
              return(
                <div key={c.id} style={{...CS.card,padding:"16px 20px",marginBottom:10,cursor:"pointer"}} onClick={()=>setSelectedCompany(c)}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:"#f5f5f4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:500,color:"#888",flexShrink:0}}>{i+1}</div>
                      <div>
                        <p style={{fontWeight:500,fontSize:14,margin:0,color:"#185FA5"}}>{c.name}</p>
                        <p style={{fontSize:11,color:"#888",margin:0}}>{[c.city,c.category].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {sel&&<span style={{fontSize:11,color:RATINGS.find(r=>r.v===sel)?.c||"#888"}}>{RATINGS.find(r=>r.v===sel)?.l}</span>}
                      <span style={{fontSize:18,fontWeight:500}}>{c.final_score}</span>
                      <ClassBadge cls={c.score_class}/>
                      <span style={{fontSize:12,color:"#aaa"}}>→</span>
                    </div>
                  </div>
                  {c.executive_summary&&<p style={{fontSize:12,color:"#888",marginTop:8,marginBottom:0,lineHeight:1.5}}>{c.executive_summary}</p>}
                </div>
              );
            })}
          </div>
        )}

        {page==="validation"&&(
          <div>
            <h1 style={CS.h1}>Dashboard de Validação</h1>
            <p style={CS.sub}>Acurácia por classe · Meta: 70%+ nas Classe A</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:28}}>
              {[{l:"Avaliadas",v:Object.keys(validations).length},{l:"Excelentes",v:Object.values(validations).filter(v=>v==="excellent").length},{l:"Boas",v:Object.values(validations).filter(v=>v==="good").length},{l:"Ruins",v:Object.values(validations).filter(v=>v==="bad").length},{l:"Revisar",v:Object.values(validations).filter(v=>v==="review_later").length}].map(m=>(
                <div key={m.l} style={CS.metric}><div style={{fontSize:11,color:"#888",marginBottom:3}}>{m.l}</div><div style={{fontSize:22,fontWeight:500}}>{m.v}</div></div>
              ))}
            </div>
            <h2 style={{fontSize:14,fontWeight:500,marginBottom:14}}>Acurácia por classe</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
              {["A","B","C","D"].map(cls=>{
                const clsCos=companies.filter(c=>c.score_class===cls);const validated=clsCos.filter(c=>validations[c.id]).length;const approved=clsCos.filter(c=>["excellent","good"].includes(validations[c.id])).length;const pct=validated>0?Math.round(approved/validated*100):null;const ok=pct!==null&&pct>=70;
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
