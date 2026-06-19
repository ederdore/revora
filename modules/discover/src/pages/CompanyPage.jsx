import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../AuthContext.jsx";

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

function ScoreBar({label,value,color,weight}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
        <span style={{color:"#888"}}>{label}</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#ccc"}}>{Math.round(weight*100)}%</span>
          <span style={{fontWeight:600,color:"#1a1a1a",minWidth:24,textAlign:"right"}}>{Math.round(value||0)}</span>
        </div>
      </div>
      <div style={{height:6,borderRadius:6,background:"#f0f0f0",overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:6,width:(value||0)+"%",background:color,transition:"width 0.5s"}}/>
      </div>
    </div>
  );
}

export default function CompanyPage({companyId, onBack, onEnrich, enrichingId}) {
  const {user, tenant, logEvent} = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [validation, setValidation] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { loadCompany(); }, [companyId]);

  async function loadCompany() {
    setLoading(true);
    const { data } = await supabase
      .from("companies_full")
      .select("*")
      .eq("id", companyId)
      .single();
    if (data) {
      setCompany(data);
      setNote(data.commercial_note || "");
    }
    // Load latest validation
    const { data: val } = await supabase
      .from("disc_validations")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (val) setValidation(val.human_rating);

    // Load validation history
    const { data: hist } = await supabase
      .from("disc_validations")
      .select("*, profiles(full_name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setHistory(hist || []);
    setLoading(false);
  }

  async function saveNote() {
    setSavingNote(true);
    await supabase.from("disc_companies")
      .update({ commercial_note: note })
      .eq("id", companyId);
    setSavingNote(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function submitValidation(rating) {
    await supabase.from("disc_validations").insert({
      tenant_id: tenant.id,
      company_id: companyId,
      reviewer_id: user.id,
      ai_score: company.final_score,
      human_rating: rating,
    });
    await logEvent("validation.submitted", "company", companyId, { rating });
    setValidation(rating);
    loadCompany();
  }

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#888",fontSize:13}}>
      A carregar...
    </div>
  );
  if (!company) return null;

  const cfg = CLASS_CFG[company.score_class] || {bg:"#f5f5f4",c:"#888"};
  const isEnriching = enrichingId === companyId;
  const weights = {
    fit:       tenant?.score_weight_fit       || 0.35,
    authority: tenant?.score_weight_authority || 0.25,
    digital:   tenant?.score_weight_digital   || 0.20,
    contact:   tenant?.score_weight_contact   || 0.20,
  };

  const S = {
    card: {background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16},
    label: {fontSize:11,color:"#888",display:"block",marginBottom:4},
    input: {padding:"8px 12px",borderRadius:8,border:"0.5px solid #ddd",fontSize:13,background:"#fff",color:"#1a1a1a",width:"100%"},
    btn: {padding:"7px 16px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:13,color:"#1a1a1a"},
    btnPrimary: {padding:"7px 16px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500},
  };

  const tabs = [
    {k:"overview",l:"Visão Geral"},
    {k:"ai",l:"Análise IA"},
    {k:"commercial",l:"Análise Comercial"},
    {k:"history",l:"Histórico"},
  ];

  return (
    <div>
      {/* BACK + HEADER */}
      <div style={{marginBottom:20}}>
        <button onClick={onBack} style={{...S.btn,fontSize:12,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          ← Voltar
        </button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:500,margin:"0 0 4px"}}>{company.name}</h1>
            <p style={{fontSize:13,color:"#888",margin:0}}>
              {[company.city,company.state_region,company.country].filter(Boolean).join(" · ")}
              {company.category && <span> · {company.category}</span>}
            </p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            {company.final_score != null && (
              <div style={{textAlign:"center",background:cfg.bg,borderRadius:10,padding:"6px 14px"}}>
                <div style={{fontSize:24,fontWeight:700,color:cfg.c,lineHeight:1}}>{company.final_score}</div>
                <div style={{fontSize:10,color:cfg.c,opacity:0.7,marginTop:1}}>Classe {company.score_class}</div>
              </div>
            )}
            <button
              onClick={() => onEnrich(company)}
              disabled={isEnriching}
              style={{...S.btn,fontSize:12}}
              title="Reenriquecer empresa">
              {isEnriching ? "⏳ A analisar..." : "↺ Actualizar"}
            </button>
          </div>
        </div>
      </div>

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
          {/* Contactos */}
          <div style={S.card}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>Contactos</p>
            {company.website && (
              <div style={{marginBottom:8}}>
                <span style={S.label}>Website</span>
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:13,color:"#185FA5",textDecoration:"none",wordBreak:"break-all"}}>
                  {company.website}
                </a>
              </div>
            )}
            {company.email && (
              <div style={{marginBottom:8}}>
                <span style={S.label}>Email</span>
                <a href={`mailto:${company.email}`} style={{fontSize:13,color:"#1a1a1a",textDecoration:"none"}}>{company.email}</a>
              </div>
            )}
            {company.phone && (
              <div style={{marginBottom:8}}>
                <span style={S.label}>Telefone</span>
                <a href={`tel:${company.phone}`} style={{fontSize:13,color:"#1a1a1a",textDecoration:"none"}}>{company.phone}</a>
              </div>
            )}
            {company.whatsapp && (
              <div style={{marginBottom:8}}>
                <span style={S.label}>WhatsApp</span>
                <a href={`https://wa.me/${company.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:13,color:"#25D366",textDecoration:"none"}}>{company.whatsapp}</a>
              </div>
            )}
            {company.instagram && (
              <div style={{marginBottom:8}}>
                <span style={S.label}>Instagram</span>
                <span style={{fontSize:13,color:"#E1306C"}}>{company.instagram}</span>
              </div>
            )}
            {company.linkedin && (
              <div style={{marginBottom:8}}>
                <span style={S.label}>LinkedIn</span>
                <a href={`https://${company.linkedin}`} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:13,color:"#0077B5",textDecoration:"none"}}>{company.linkedin}</a>
              </div>
            )}
            {!company.email && !company.phone && !company.website && (
              <p style={{fontSize:12,color:"#ccc"}}>Sem dados de contacto — enriqueça a empresa</p>
            )}
          </div>

          {/* Score */}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>Score detalhado</p>
              {company.model_version && <span style={{fontSize:11,color:"#aaa"}}>v{company.model_version}</span>}
            </div>
            {company.final_score != null ? (
              <>
                <ScoreBar label="Fit ao nicho"          value={company.fit_score}       color="#534AB7" weight={weights.fit}/>
                <ScoreBar label="Authority"              value={company.authority_score} color="#185FA5" weight={weights.authority}/>
                <ScoreBar label="Presença digital"      value={company.digital_score}   color="#1D9E75" weight={weights.digital}/>
                <ScoreBar label="Facilidade de contacto" value={company.contact_score}  color="#E8A020" weight={weights.contact}/>
                <div style={{marginTop:12,paddingTop:12,borderTop:"0.5px solid #f0f0f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,color:"#888"}}>Score final</span>
                  <span style={{fontSize:18,fontWeight:700,color:cfg.c}}>{company.final_score} <span style={{fontSize:12,fontWeight:400}}>({company.score_class})</span></span>
                </div>
              </>
            ) : (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <p style={{fontSize:12,color:"#aaa",marginBottom:10}}>Empresa ainda não enriquecida</p>
                <button onClick={()=>onEnrich(company)} disabled={isEnriching} style={S.btnPrimary}>
                  {isEnriching?"A analisar...":"⚡ Enriquecer agora"}
                </button>
              </div>
            )}
          </div>

          {/* Sinais */}
          {(company.has_instagram||company.has_email||company.has_whatsapp||company.has_online_store||company.custom_signals) && (
            <div style={{...S.card,gridColumn:"1/-1"}}>
              <p style={{fontSize:13,fontWeight:500,marginBottom:12}}>Sinais detectados</p>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {company.has_instagram     && <span style={{fontSize:12,background:"#fce8f1",color:"#E1306C",padding:"4px 10px",borderRadius:6}}>📸 Instagram</span>}
                {company.has_facebook      && <span style={{fontSize:12,background:"#e7f0fd",color:"#1877F2",padding:"4px 10px",borderRadius:6}}>Facebook</span>}
                {company.has_linkedin      && <span style={{fontSize:12,background:"#e8f4ff",color:"#0077B5",padding:"4px 10px",borderRadius:6}}>LinkedIn</span>}
                {company.has_email         && <span style={{fontSize:12,background:"#e6f1fb",color:"#185FA5",padding:"4px 10px",borderRadius:6}}>✉ Email</span>}
                {company.has_phone         && <span style={{fontSize:12,background:"#f0f0f0",color:"#555",padding:"4px 10px",borderRadius:6}}>📞 Telefone</span>}
                {company.has_whatsapp      && <span style={{fontSize:12,background:"#e6faf0",color:"#25D366",padding:"4px 10px",borderRadius:6}}>💬 WhatsApp</span>}
                {company.has_online_store  && <span style={{fontSize:12,background:"#eaf3de",color:"#3B6D11",padding:"4px 10px",borderRadius:6}}>🛒 Loja Online</span>}
                {company.has_blog          && <span style={{fontSize:12,background:"#f5f5f4",color:"#888",padding:"4px 10px",borderRadius:6}}>Blog</span>}
                {company.multiple_locations && <span style={{fontSize:12,background:"#eeedfe",color:"#534AB7",padding:"4px 10px",borderRadius:6}}>📍 Múltiplas unidades</span>}
                {company.custom_signals?.fitness           && <span style={{fontSize:12,background:"#eeedfe",color:"#534AB7",padding:"4px 10px",borderRadius:6}}>🏋 Fitness</span>}
                {company.custom_signals?.pharmacy          && <span style={{fontSize:12,background:"#faeeda",color:"#854F0B",padding:"4px 10px",borderRadius:6}}>💊 Farmácia</span>}
                {company.custom_signals?.sports_nutrition  && <span style={{fontSize:12,background:"#eaf3de",color:"#3B6D11",padding:"4px 10px",borderRadius:6}}>🥗 Nutrição Desportiva</span>}
                {company.custom_signals?.wellness          && <span style={{fontSize:12,background:"#f0f0ff",color:"#534AB7",padding:"4px 10px",borderRadius:6}}>✨ Wellness</span>}
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
                    {company.confidence_score != null && (
                      <span style={{fontSize:11,color:"#aaa"}}>Confiança: {Math.round(company.confidence_score)}%</span>
                    )}
                    <span style={{
                      fontSize:12,fontWeight:500,padding:"3px 10px",borderRadius:6,
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
                      <span style={{color:"#3B6D11",flexShrink:0,marginTop:1}}>✓</span>
                      <p style={{fontSize:13,color:"#555",margin:0,lineHeight:1.5}}>{s}</p>
                    </div>
                  ))}
                </div>
                <div style={S.card}>
                  <p style={{fontSize:13,fontWeight:500,color:"#A32D2D",marginBottom:12}}>✗ Pontos fracos</p>
                  {company.weaknesses?.map(w => (
                    <div key={w} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                      <span style={{color:"#A32D2D",flexShrink:0,marginTop:1}}>✗</span>
                      <p style={{fontSize:13,color:"#555",margin:0,lineHeight:1.5}}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>

              {company.recommended_action && (
                <div style={{...S.card,background:"#E6F1FB",border:"0.5px solid #c5d8f0"}}>
                  <p style={{fontSize:12,fontWeight:500,color:"#185FA5",marginBottom:6}}>→ Acção recomendada</p>
                  <p style={{fontSize:14,color:"#185FA5",margin:0,lineHeight:1.6}}>{company.recommended_action}</p>
                </div>
              )}
            </>
          ) : (
            <div style={{...S.card,textAlign:"center",padding:"40px"}}>
              <div style={{fontSize:32,marginBottom:12}}>🤖</div>
              <p style={{fontSize:14,fontWeight:500,marginBottom:6}}>Análise IA não gerada</p>
              <p style={{fontSize:13,color:"#888",marginBottom:20}}>Enriqueça a empresa para gerar a análise automática</p>
              <button onClick={()=>onEnrich(company)} disabled={isEnriching} style={S.btnPrimary}>
                {isEnriching?"A analisar...":"⚡ Enriquecer agora"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ANÁLISE COMERCIAL ── */}
      {tab==="commercial" && (
        <div>
          <div style={S.card}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:6}}>Classificação comercial</p>
            <p style={{fontSize:12,color:"#aaa",marginBottom:14}}>A tua avaliação combina com o score IA para criar inteligência comercial</p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {RATINGS.map(r => (
                <button key={r.v} onClick={() => submitValidation(r.v)} style={{
                  padding:"8px 16px",borderRadius:8,fontSize:13,cursor:"pointer",
                  border: validation===r.v ? `2px solid ${r.c}` : "0.5px solid #ddd",
                  background: validation===r.v ? r.c+"18" : "#fff",
                  color: validation===r.v ? r.c : "#888",
                  fontWeight: validation===r.v ? 500 : 400,
                }}>{r.l}</button>
              ))}
            </div>
            {validation && (
              <div style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px"}}>
                <p style={{fontSize:12,color:"#888",margin:0}}>
                  Classificação actual: <strong style={{color:RATINGS.find(r=>r.v===validation)?.c}}>{RATINGS.find(r=>r.v===validation)?.l}</strong>
                  <span style={{marginLeft:8,color:"#ccc"}}>· {history.length} avaliação(ões) no histórico</span>
                </p>
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>Nota do comercial</p>
              <span style={{fontSize:11,color:"#aaa"}}>Visível só para a equipa</span>
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Escreve a tua análise: conheces esta empresa? Já foste visitá-la? Quem é o responsável? Qual o potencial real de parceria?"
              style={{width:"100%",minHeight:120,padding:"10px 14px",borderRadius:8,border:"0.5px solid #ddd",fontSize:13,lineHeight:1.6,resize:"vertical",fontFamily:"inherit",color:"#1a1a1a",background:"#fff",boxSizing:"border-box"}}
            />
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
              <button onClick={saveNote} disabled={savingNote} style={{
                ...S.btnPrimary,
                background: noteSaved ? "#3B6D11" : "#1a1a1a",
                transition:"background 0.2s",
              }}>
                {savingNote ? "A guardar..." : noteSaved ? "✓ Guardado" : "Guardar nota"}
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
          ) : (
            history.map(h => {
              const r = RATINGS.find(x => x.v === h.human_rating);
              return (
                <div key={h.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:500,color:r?.c||"#888"}}>{r?.l || h.human_rating}</span>
                    <span style={{fontSize:12,color:"#aaa",marginLeft:10}}>{h.profiles?.full_name || "—"}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    {h.ai_score != null && <span style={{fontSize:12,color:"#aaa"}}>Score IA: {h.ai_score}</span>}
                    <span style={{fontSize:11,color:"#ccc"}}>{new Date(h.created_at).toLocaleDateString("pt-PT")}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
