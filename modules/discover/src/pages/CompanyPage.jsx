import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../AuthContext.jsx";
// hybridScore utils used inline for reliability

const CLASS_CFG = {
  A:{bg:"#EAF3DE",c:"#3B6D11"},
  B:{bg:"#E6F1FB",c:"#185FA5"},
  C:{bg:"#FAEEDA",c:"#854F0B"},
  D:{bg:"#FCEBEB",c:"#A32D2D"},
};
const RATINGS = [
  {v:"excellent",l:"⭐ Excelente",  c:"#854F0B", score:100},
  {v:"good",     l:"👍 Boa",        c:"#3B6D11", score:75 },
  {v:"neutral",  l:"➖ Neutro",     c:"#888",    score:50 },
  {v:"bad",      l:"👎 Não faz sentido", c:"#A32D2D", score:20},
  {v:"review_later",l:"🕐 Revisar",c:"#185FA5", score:50 },
];

function ScoreBar({label, value, color, weight}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
        <span style={{color:"#888"}}>{label}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {weight!=null&&<span style={{fontSize:10,color:"#ccc"}}>{Math.round(weight*100)}%</span>}
          <span style={{fontWeight:600,color:"#1a1a1a",minWidth:24,textAlign:"right"}}>{Math.round(value||0)}</span>
        </div>
      </div>
      <div style={{height:5,borderRadius:5,background:"#f0f0f0",overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:5,width:(value||0)+"%",background:color,transition:"width 0.5s"}}/>
      </div>
    </div>
  );
}

function ScorePill({label, value, color, bg, size="normal"}) {
  const isLarge = size === "large";
  return (
    <div style={{textAlign:"center",background:bg||color+"15",borderRadius:10,padding:isLarge?"8px 16px":"5px 12px"}}>
      <div style={{fontSize:isLarge?26:18,fontWeight:700,color,lineHeight:1}}>{value??"-"}</div>
      <div style={{fontSize:isLarge?10:9,color,opacity:0.75,marginTop:2}}>{label}</div>
    </div>
  );
}

export default function CompanyPage({companyId, onBack, onEnrich, enrichingId}) {
  const {user, tenant, logEvent} = useAuth();
  const [company, setCompany]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("overview");

  // Commercial analysis state
  const [note, setNote]         = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved]   = useState(false);
  const [validation, setValidation] = useState(null);
  const [humanScore, setHumanScore] = useState(null);
  const [combinedScore, setCombinedScore] = useState(null);
  const [combinedClass, setCombinedClass] = useState(null);

  // ICP signals
  const [icpSignals, setIcpSignals]         = useState([]);   // all available signals
  const [markedSignals, setMarkedSignals]   = useState([]);   // marked for this company
  const [savingSignal, setSavingSignal]     = useState(null);

  // History
  const [history, setHistory] = useState([]);

  useEffect(() => { loadAll(); }, [companyId]);

  async function loadAll() {
    setLoading(true);
    const [{ data: co }, { data: val }, { data: hist }, { data: sigs }, { data: marked }] = await Promise.all([
      supabase.from("companies_full").select("*").eq("id", companyId).single(),
      supabase.from("disc_validations").select("*").eq("company_id", companyId).order("created_at", {ascending:false}).limit(1).maybeSingle(),
      supabase.from("disc_validations").select("*, profiles(full_name)").eq("company_id", companyId).order("created_at", {ascending:false}),
      supabase.from("icp_signals").select("*").eq("tenant_id", tenant?.id).eq("active", true).order("position"),
      supabase.from("company_icp_signals").select("*").eq("company_id", companyId),
    ]);
    if (co) {
      setCompany(co);
      setNote(co.commercial_note || "");
      setHumanScore(co.human_score_value);
      setCombinedScore(co.combined_score);
      setCombinedClass(co.combined_class);
    }
    if (val) setValidation(val.human_rating);
    setHistory(hist || []);
    setIcpSignals(sigs || []);
    setMarkedSignals(marked || []);
    setLoading(false);
  }

  async function saveNote() {
    setSavingNote(true);
    await supabase.from("disc_companies").update({ commercial_note: note }).eq("id", companyId);
    setSavingNote(false); setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function submitValidation(rating) {
    // Calcula score humano baseado no rating + sinais ICP marcados
    const ratingBase = { excellent:100, good:75, neutral:50, bad:20, review_later:50 }[rating] || 50;
    let adjustment = 0;
    let totalWeight = 0;
    markedSignals.forEach(ms => {
      const sig = icpSignals.find(s => s.id === ms.signal_id);
      if (!sig) return;
      const w = Number(sig.weight || 1);
      totalWeight += w;
      if (sig.signal_type === "positive") adjustment += w * 10;
      if (sig.signal_type === "negative") adjustment -= w * 10;
    });
    const normalized = totalWeight > 0 ? adjustment / totalWeight : 0;
    const newHumanScore = Math.min(100, Math.max(0, Math.round(ratingBase + normalized)));

    // Calcula score combinado
    const wIA    = Number(tenant?.weight_ia    || 0.70);
    const wHuman = Number(tenant?.weight_human || 0.30);
    const phase  = tenant?.scoring_phase || 1;
    const aiScore = company.final_score || 0;
    const combined = phase === 1
      ? aiScore
      : Math.min(100, Math.max(0, Math.round(aiScore * wIA + newHumanScore * wHuman)));
    const combinedCls = combined >= 80 ? "A" : combined >= 60 ? "B" : combined >= 40 ? "C" : "D";

    // 1. Guarda validação
    const { error: e1 } = await supabase.from("disc_validations").insert({
      tenant_id: tenant.id, company_id: companyId,
      reviewer_id: user.id, ai_score: aiScore, human_rating: rating,
    });
    if (e1) { console.error("disc_validations error:", e1); return; }

    // 2. Guarda score humano
    const { error: e2 } = await supabase.from("company_human_score").upsert({
      tenant_id: tenant.id, company_id: companyId,
      reviewer_id: user.id, score: newHumanScore,
    }, { onConflict: "company_id" });
    if (e2) console.error("company_human_score error:", e2);

    // 3. Actualiza disc_scoring com score combinado
    const { error: e3 } = await supabase.from("disc_scoring")
      .update({ human_score: newHumanScore, combined_score: combined, combined_class: combinedCls, scoring_phase: phase })
      .eq("company_id", companyId);
    if (e3) console.error("disc_scoring update error:", e3);

    // Actualiza estado local imediatamente
    setValidation(rating);
    setHumanScore(newHumanScore);
    setCombinedScore(combined);
    setCombinedClass(combinedCls);

    await logEvent("validation.submitted", "company", companyId, { rating, human_score: newHumanScore, combined });
    loadAll();
  }

  async function toggleSignal(signal) {
    const isMarked = markedSignals.some(m => m.signal_id === signal.id);
    setSavingSignal(signal.id);
    if (isMarked) {
      await supabase.from("company_icp_signals")
        .delete()
        .eq("company_id", companyId)
        .eq("signal_id", signal.id);
    } else {
      await supabase.from("company_icp_signals").insert({
        tenant_id: tenant.id, company_id: companyId,
        signal_id: signal.id, marked_by: user.id,
      });
    }
    setSavingSignal(null);
    // Reload marked signals
    const { data } = await supabase.from("company_icp_signals").select("*").eq("company_id", companyId);
    setMarkedSignals(data || []);
  }

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#888",fontSize:13}}>
      A carregar...
    </div>
  );
  if (!company) return null;

  const aiCfg = CLASS_CFG[company.score_class] || {bg:"#f5f5f4",c:"#888"};
  const comCfg = CLASS_CFG[combinedClass || company.score_class] || aiCfg;
  const isEnriching = enrichingId === companyId;
  const phase = tenant?.scoring_phase || 1;
  const positiveSignals = icpSignals.filter(s => s.signal_type === "positive");
  const negativeSignals = icpSignals.filter(s => s.signal_type === "negative");
  const weights = {
    fit:       tenant?.score_weight_fit       || 0.35,
    authority: tenant?.score_weight_authority || 0.25,
    digital:   tenant?.score_weight_digital   || 0.20,
    contact:   tenant?.score_weight_contact   || 0.20,
  };

  const S = {
    card: {background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16},
    btn:  {padding:"7px 16px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:13,color:"#1a1a1a"},
    btnP: {padding:"7px 16px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500},
    label:{fontSize:11,color:"#888",display:"block",marginBottom:4},
  };

  const tabs = [
    {k:"overview",    l:"Visão Geral"},
    {k:"ai",          l:"Análise IA"},
    {k:"commercial",  l:"Análise Comercial"},
    {k:"history",     l:"Histórico"},
  ];

  return (
    <div>
      {/* BACK */}
      <button onClick={onBack} style={{...S.btn,fontSize:12,marginBottom:16,display:"inline-flex",alignItems:"center",gap:6}}>
        ← Voltar
      </button>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:20}}>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{fontSize:20,fontWeight:500,margin:"0 0 4px",lineHeight:1.3}}>{company.name}</h1>
          <p style={{fontSize:13,color:"#888",margin:0}}>
            {[company.city,company.state_region,company.country].filter(Boolean).join(" · ")}
            {company.category && <> · {company.category}</>}
          </p>
        </div>

        {/* SCORE TRIPLO */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          {company.final_score != null && (
            <>
              <ScorePill label="Score IA"    value={company.final_score} color={aiCfg.c}  bg={aiCfg.bg}/>
              {humanScore != null && (
                <>
                  <span style={{fontSize:18,color:"#ddd",fontWeight:300}}>+</span>
                  <ScorePill label="Humano"     value={humanScore}         color="#534AB7"  bg="#EEEDFE"/>
                  <span style={{fontSize:18,color:"#ddd",fontWeight:300}}>=</span>
                  <ScorePill label="Final"      value={combinedScore ?? company.final_score} color={comCfg.c} bg={comCfg.bg} size="large"/>
                </>
              )}
              {humanScore == null && (
                <ScorePill label={`Classe ${company.score_class}`} value={company.final_score} color={aiCfg.c} bg={aiCfg.bg} size="large"/>
              )}
            </>
          )}
          <button onClick={() => onEnrich(company)} disabled={isEnriching} style={{...S.btn,fontSize:12}} title="Reenriquecer">
            {isEnriching ? "⏳" : "↺"}
          </button>
        </div>
      </div>

      {/* Phase indicator */}
      {phase > 1 && (
        <div style={{background:"#EEEDFE",borderRadius:8,padding:"6px 14px",marginBottom:16,display:"inline-flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:11,color:"#534AB7",fontWeight:500}}>
            Fase {phase} — Score {phase===2?"híbrido (IA + Humano)":"aprendido automaticamente"}
          </span>
        </div>
      )}

      {/* TABS */}
      <div style={{display:"flex",gap:0,borderBottom:"0.5px solid #e5e5e5",marginBottom:20}}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding:"10px 16px",background:"none",border:"none",cursor:"pointer",
            fontSize:13,fontWeight:tab===t.k?500:400,
            color:tab===t.k?"#1a1a1a":"#888",
            borderBottom:tab===t.k?"2px solid #1a1a1a":"2px solid transparent",
            marginBottom:-1,
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── VISÃO GERAL ── */}
      {tab==="overview" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={S.card}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Contactos</p>
            {[
              {l:"Website",  v:company.website,   href:company.website,    color:"#185FA5"},
              {l:"Email",    v:company.email,     href:`mailto:${company.email}`, color:"#1a1a1a"},
              {l:"Telefone", v:company.phone,     href:`tel:${company.phone}`,    color:"#1a1a1a"},
              {l:"WhatsApp", v:company.whatsapp,  href:`https://wa.me/${(company.whatsapp||"").replace(/\D/g,"")}`, color:"#25D366"},
              {l:"Instagram",v:company.instagram, href:null, color:"#E1306C"},
              {l:"LinkedIn", v:company.linkedin,  href:company.linkedin?`https://${company.linkedin}`:null, color:"#0077B5"},
            ].filter(f => f.v).map(f => (
              <div key={f.l} style={{marginBottom:8}}>
                <span style={S.label}>{f.l}</span>
                {f.href
                  ? <a href={f.href} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:f.color,textDecoration:"none",wordBreak:"break-all"}}>{f.v}</a>
                  : <span style={{fontSize:13,color:f.color}}>{f.v}</span>}
              </div>
            ))}
            {!company.website && !company.email && !company.phone && (
              <p style={{fontSize:12,color:"#ccc"}}>Sem dados — enriqueça a empresa</p>
            )}
          </div>

          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>Score detalhado</p>
              {company.model_version && <span style={{fontSize:11,color:"#aaa"}}>v{company.model_version}</span>}
            </div>
            {company.final_score != null ? (
              <>
                <ScoreBar label="Fit ao nicho"           value={company.fit_score}       color="#534AB7" weight={weights.fit}/>
                <ScoreBar label="Authority"               value={company.authority_score} color="#185FA5" weight={weights.authority}/>
                <ScoreBar label="Presença digital"       value={company.digital_score}   color="#1D9E75" weight={weights.digital}/>
                <ScoreBar label="Facilidade de contacto" value={company.contact_score}   color="#E8A020" weight={weights.contact}/>
                <div style={{marginTop:12,paddingTop:12,borderTop:"0.5px solid #f0f0f0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:12,color:"#888"}}>Score IA</span>
                    <span style={{fontSize:16,fontWeight:700,color:aiCfg.c}}>{company.final_score}</span>
                  </div>
                  {humanScore != null && (
                    <>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:12,color:"#888"}}>Score Humano</span>
                        <span style={{fontSize:16,fontWeight:700,color:"#534AB7"}}>{humanScore}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:comCfg.bg,borderRadius:8}}>
                        <span style={{fontSize:12,color:comCfg.c,fontWeight:500}}>Score Final (Fase {phase})</span>
                        <span style={{fontSize:18,fontWeight:700,color:comCfg.c}}>{combinedScore} <span style={{fontSize:12,fontWeight:400}}>({combinedClass})</span></span>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <p style={{fontSize:12,color:"#aaa",marginBottom:10}}>Empresa ainda não enriquecida</p>
                <button onClick={() => onEnrich(company)} disabled={isEnriching} style={S.btnP}>
                  {isEnriching?"A analisar...":"⚡ Enriquecer agora"}
                </button>
              </div>
            )}
          </div>

          {/* Sinais detectados */}
          {(company.has_instagram||company.has_email||company.has_whatsapp||company.has_online_store) && (
            <div style={{...S.card,gridColumn:"1/-1"}}>
              <p style={{fontSize:13,fontWeight:500,marginBottom:12}}>Sinais detectados automaticamente</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {company.has_instagram      && <span style={{fontSize:12,background:"#fce8f1",color:"#E1306C",padding:"4px 10px",borderRadius:6}}>📸 Instagram</span>}
                {company.has_facebook       && <span style={{fontSize:12,background:"#e7f0fd",color:"#1877F2",padding:"4px 10px",borderRadius:6}}>Facebook</span>}
                {company.has_linkedin       && <span style={{fontSize:12,background:"#e8f4ff",color:"#0077B5",padding:"4px 10px",borderRadius:6}}>LinkedIn</span>}
                {company.has_email          && <span style={{fontSize:12,background:"#e6f1fb",color:"#185FA5",padding:"4px 10px",borderRadius:6}}>✉ Email</span>}
                {company.has_whatsapp       && <span style={{fontSize:12,background:"#e6faf0",color:"#25D366",padding:"4px 10px",borderRadius:6}}>💬 WhatsApp</span>}
                {company.has_online_store   && <span style={{fontSize:12,background:"#eaf3de",color:"#3B6D11",padding:"4px 10px",borderRadius:6}}>🛒 Loja Online</span>}
                {company.multiple_locations && <span style={{fontSize:12,background:"#eeedfe",color:"#534AB7",padding:"4px 10px",borderRadius:6}}>📍 Múltiplas unidades</span>}
                {company.custom_signals?.fitness          && <span style={{fontSize:12,background:"#eeedfe",color:"#534AB7",padding:"4px 10px",borderRadius:6}}>🏋 Fitness</span>}
                {company.custom_signals?.pharmacy         && <span style={{fontSize:12,background:"#faeeda",color:"#854F0B",padding:"4px 10px",borderRadius:6}}>💊 Farmácia</span>}
                {company.custom_signals?.sports_nutrition && <span style={{fontSize:12,background:"#eaf3de",color:"#3B6D11",padding:"4px 10px",borderRadius:6}}>🥗 Nutrição Desportiva</span>}
                {company.custom_signals?.wellness         && <span style={{fontSize:12,background:"#f0f0ff",color:"#534AB7",padding:"4px 10px",borderRadius:6}}>✨ Wellness</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANÁLISE IA ── */}
      {tab==="ai" && (
        <div>
          {company.executive_summary ? (
            <>
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <p style={{fontSize:13,fontWeight:500,margin:0}}>Resumo executivo</p>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {company.confidence_score!=null && <span style={{fontSize:11,color:"#aaa"}}>Confiança: {Math.round(company.confidence_score)}%</span>}
                    <span style={{fontSize:12,fontWeight:500,padding:"3px 10px",borderRadius:6,
                      color:company.partnership_potential==="alto"?"#3B6D11":company.partnership_potential==="baixo"?"#A32D2D":"#854F0B",
                      background:company.partnership_potential==="alto"?"#EAF3DE":company.partnership_potential==="baixo"?"#FCEBEB":"#FAEEDA",
                    }}>Potencial {company.partnership_potential}</span>
                  </div>
                </div>
                <p style={{fontSize:14,color:"#333",lineHeight:1.7,margin:0}}>{company.executive_summary}</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div style={S.card}>
                  <p style={{fontSize:13,fontWeight:500,color:"#3B6D11",marginBottom:12}}>✓ Pontos fortes</p>
                  {company.strengths?.map(s => (
                    <div key={s} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                      <span style={{color:"#3B6D11",flexShrink:0}}>✓</span>
                      <p style={{fontSize:13,color:"#555",margin:0,lineHeight:1.5}}>{s}</p>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <p style={{fontSize:13,fontWeight:500,color:"#A32D2D",marginBottom:12}}>✗ Pontos fracos</p>
                  {company.weaknesses?.map(w => (
                    <div key={w} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                      <span style={{color:"#A32D2D",flexShrink:0}}>✗</span>
                      <p style={{fontSize:13,color:"#555",margin:0,lineHeight:1.5}}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>
              {company.recommended_action && (
                <div style={{...S.card,background:"#E6F1FB",border:"0.5px solid #c5d8f0"}}>
                  <p style={{fontSize:12,fontWeight:500,color:"#185FA5",marginBottom:6}}>→ Acção recomendada pela IA</p>
                  <p style={{fontSize:14,color:"#185FA5",margin:0,lineHeight:1.6}}>{company.recommended_action}</p>
                </div>
              )}
            </>
          ) : (
            <div style={{...S.card,textAlign:"center",padding:"40px"}}>
              <div style={{fontSize:32,marginBottom:12}}>🤖</div>
              <p style={{fontSize:14,fontWeight:500,marginBottom:6}}>Análise IA não gerada</p>
              <p style={{fontSize:13,color:"#888",marginBottom:20}}>Enriqueça a empresa para gerar análise automática</p>
              <button onClick={() => onEnrich(company)} disabled={isEnriching} style={S.btnP}>
                {isEnriching?"A analisar...":"⚡ Enriquecer agora"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ANÁLISE COMERCIAL ── */}
      {tab==="commercial" && (
        <div>
          {/* Score humano preview */}
          {humanScore != null && (
            <div style={{...S.card,background:"#f9f9f8",display:"flex",alignItems:"center",gap:20}}>
              <ScorePill label="Score IA"  value={company.final_score} color={aiCfg.c}  bg={aiCfg.bg}/>
              <span style={{fontSize:20,color:"#ddd"}}>+</span>
              <ScorePill label="Humano"    value={humanScore}           color="#534AB7"  bg="#EEEDFE"/>
              <span style={{fontSize:20,color:"#ddd"}}>=</span>
              <ScorePill label="Final"     value={combinedScore}        color={comCfg.c} bg={comCfg.bg} size="large"/>
              <div style={{marginLeft:"auto",fontSize:11,color:"#aaa",textAlign:"right"}}>
                <div>Fase {phase}</div>
                <div>IA {Math.round((tenant?.weight_ia||0.7)*100)}% · Humano {Math.round((tenant?.weight_human||0.3)*100)}%</div>
              </div>
            </div>
          )}

          {/* Classificação */}
          <div style={S.card}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:6}}>Classificação comercial</p>
            <p style={{fontSize:12,color:"#aaa",marginBottom:14}}>A tua avaliação pondera o score final com base na fase actual</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {RATINGS.map(r => (
                <button key={r.v} onClick={() => submitValidation(r.v)} style={{
                  padding:"8px 16px",borderRadius:8,fontSize:13,cursor:"pointer",
                  border: validation===r.v ? `2px solid ${r.c}` : "0.5px solid #ddd",
                  background: validation===r.v ? r.c+"15" : "#fff",
                  color: validation===r.v ? r.c : "#888",
                  fontWeight: validation===r.v ? 500 : 400,
                }}>{r.l}</button>
              ))}
            </div>
          </div>

          {/* ICP Signals */}
          {icpSignals.length > 0 && (
            <div style={S.card}>
              <p style={{fontSize:13,fontWeight:500,marginBottom:6}}>Marcações ICP</p>
              <p style={{fontSize:12,color:"#aaa",marginBottom:16}}>Selecciona o que aplica a esta empresa — influencia o score humano</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <p style={{fontSize:11,fontWeight:500,color:"#3B6D11",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Positivos</p>
                  {positiveSignals.map(sig => {
                    const isMarked = markedSignals.some(m => m.signal_id === sig.id);
                    const isSaving = savingSignal === sig.id;
                    return (
                      <button key={sig.id} onClick={() => toggleSignal(sig)} disabled={isSaving}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",borderRadius:7,marginBottom:5,cursor:"pointer",border:"0.5px solid",
                          borderColor: isMarked ? "#3B6D11" : "#e5e5e5",
                          background:  isMarked ? "#EAF3DE" : "#fff",
                          color:       isMarked ? "#3B6D11" : "#888",
                          fontSize:12,textAlign:"left",fontWeight:isMarked?500:400,
                        }}>
                        <span style={{flexShrink:0}}>{isMarked ? "✓" : "○"}</span>
                        <span style={{flex:1}}>{sig.label}</span>
                        <span style={{fontSize:10,color:isMarked?"#3B6D11":"#ccc",flexShrink:0}}>×{sig.weight}</span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <p style={{fontSize:11,fontWeight:500,color:"#A32D2D",marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Negativos</p>
                  {negativeSignals.map(sig => {
                    const isMarked = markedSignals.some(m => m.signal_id === sig.id);
                    const isSaving = savingSignal === sig.id;
                    return (
                      <button key={sig.id} onClick={() => toggleSignal(sig)} disabled={isSaving}
                        style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",borderRadius:7,marginBottom:5,cursor:"pointer",border:"0.5px solid",
                          borderColor: isMarked ? "#A32D2D" : "#e5e5e5",
                          background:  isMarked ? "#FCEBEB" : "#fff",
                          color:       isMarked ? "#A32D2D" : "#888",
                          fontSize:12,textAlign:"left",fontWeight:isMarked?500:400,
                        }}>
                        <span style={{flexShrink:0}}>{isMarked ? "✗" : "○"}</span>
                        <span style={{flex:1}}>{sig.label}</span>
                        <span style={{fontSize:10,color:isMarked?"#A32D2D":"#ccc",flexShrink:0}}>×{sig.weight}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Nota comercial */}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>Nota do comercial</p>
              <span style={{fontSize:11,color:"#aaa"}}>Visível só para a equipa</span>
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Escreve a tua análise: conheces esta empresa? Já foste visitá-la? Quem é o responsável? Qual o potencial real de parceria?"
              style={{width:"100%",minHeight:120,padding:"10px 14px",borderRadius:8,border:"0.5px solid #ddd",fontSize:13,lineHeight:1.6,resize:"vertical",fontFamily:"inherit",color:"#1a1a1a",background:"#fff",boxSizing:"border-box"}}/>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button onClick={saveNote} disabled={savingNote} style={{...S.btnP,background:noteSaved?"#3B6D11":"#1a1a1a",transition:"background 0.2s"}}>
                {savingNote?"A guardar...":noteSaved?"✓ Guardado":"Guardar nota"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab==="history" && (
        <div style={S.card}>
          <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Histórico de avaliações</p>
          {history.length === 0 ? (
            <p style={{fontSize:13,color:"#aaa"}}>Nenhuma avaliação ainda.</p>
          ) : history.map(h => {
            const r = RATINGS.find(x => x.v === h.human_rating);
            return (
              <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                <div>
                  <span style={{fontSize:13,fontWeight:500,color:r?.c||"#888"}}>{r?.l||h.human_rating}</span>
                  <span style={{fontSize:12,color:"#aaa",marginLeft:10}}>{h.profiles?.full_name||"—"}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {h.ai_score!=null && <span style={{fontSize:12,color:"#aaa"}}>Score IA: {h.ai_score}</span>}
                  <span style={{fontSize:11,color:"#ccc"}}>{new Date(h.created_at).toLocaleDateString("pt-PT")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
