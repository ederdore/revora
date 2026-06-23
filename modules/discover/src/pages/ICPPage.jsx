import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../AuthContext.jsx";

const OBJECTIVES = [
  { v:"distribuicao", l:"Distribuição",  icon:"📦", desc:"Quero que vendam os meus produtos nos seus espaços" },
  { v:"expansao",     l:"Expansão",      icon:"🗺",  desc:"Quero abrir em novas zonas geográficas" },
  { v:"influencia",   l:"Influência",    icon:"📣",  desc:"Quero parceiros que recomendem a minha marca" },
  { v:"whitelabel",   l:"White Label",   icon:"🏷",  desc:"Quero que produzam com a minha marca" },
];

const VOLUME_OPTIONS = [
  { v:"pequeno", l:"Pequeno", sub:"< 200€/mês" },
  { v:"medio",   l:"Médio",   sub:"200–500€/mês" },
  { v:"grande",  l:"Grande",  sub:"> 500€/mês" },
];

const SEGMENTS_PT = [
  "Ginásio / Health Club","Farmácia","Parafarmácia","Loja Produtos Naturais",
  "Nutricionista","Clínica Nutrição","Personal Trainer","Spa / Centro Bem-Estar","Distribuidor",
];

const SIGNAL_LABELS = {
  has_instagram:     "Instagram activo",
  has_email:         "Email disponível",
  has_whatsapp:      "WhatsApp",
  has_online_store:  "Loja online",
  multiple_locations:"Múltiplas unidades",
  "sports_nutrition":"Nutrição desportiva",
  fitness:           "Fitness / Ginásio",
  pharmacy:          "Farmácia / Para.",
  wellness:          "Wellness",
};

const PLAN_TIER_CFG = {
  included:   { l:"Incluído",   c:"#3B6D11", bg:"#EAF3DE" },
  pro:        { l:"Pro",        c:"#185FA5", bg:"#E6F1FB" },
  enterprise: { l:"Enterprise", c:"#534AB7", bg:"#EEEDFE" },
};

function ConfidenceBar({ pct, validations, threshold=20 }) {
  const color = pct >= 80 ? "#3B6D11" : pct >= 50 ? "#854F0B" : "#185FA5";
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
        <span style={{color:"#888"}}>Confiança do perfil</span>
        <span style={{fontWeight:600,color}}>{pct}%</span>
      </div>
      <div style={{height:6,borderRadius:6,background:"#f0f0f0",overflow:"hidden",marginBottom:4}}>
        <div style={{height:"100%",borderRadius:6,width:pct+"%",background:color,transition:"width 0.6s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#ccc"}}>
        <span>{validations} validações</span>
        <span>Meta: {threshold} validações para confiança alta</span>
      </div>
    </div>
  );
}

// ── WIZARD DE CRIAÇÃO ─────────────────────────────────────────
function ICPWizard({ onSave, onCancel, tenant, existing }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name:        existing?.name        || "",
    description: existing?.description || "",
    objective:   existing?.objective   || "",
    segments:    existing?.segments    || [],
    locations:   existing?.locations   || [],
    volume_min:  existing?.volume_min  || "medio",
    prompt:      existing?.prompt      || "",
    fit_keywords:      existing?.fit_keywords      || [],
    competitor_brands: existing?.competitor_brands || [],
    weight_fit:        existing?.weight_fit        || 0.35,
    weight_authority: existing?.weight_authority || 0.25,
    weight_digital:   existing?.weight_digital   || 0.20,
    weight_contact:   existing?.weight_contact   || 0.20,
  });
  const [saving, setSaving] = useState(false);
  const [keywordInput, setKeywordInput] = useState((existing?.fit_keywords||[]).join(", "));
  const [competitorInput, setCompetitorInput] = useState((existing?.competitor_brands||[]).join(", "));

  const totalWeight = Number(form.weight_fit)+Number(form.weight_authority)+Number(form.weight_digital)+Number(form.weight_contact);
  const weightsOk = Math.abs(totalWeight-1)<0.01;

  // Auto-generate prompt from form
  function generatePrompt() {
    const obj = OBJECTIVES.find(o=>o.v===form.objective);
    const segs = form.segments.join(", ")||"espaços de saúde e bem-estar";
    const vols = VOLUME_OPTIONS.find(v=>v.v===form.volume_min);
    const locs = form.locations.length>0?form.locations.join(", "):"Portugal";
    return `Somos ${tenant?.business_context||"uma marca de produtos de saúde"}. Objectivo: ${obj?.desc||form.objective}.\n\nParceiro ideal: ${segs} em ${locs}, com capacidade de volume ${vols?.sub||"médio"}.\n\nValorizamos: presença digital activa, Instagram com audiência local, abertura a novas marcas premium.\n\nAvalia o potencial desta empresa para o nosso objectivo de ${obj?.l||"parceria"}.`;
  }

  function setW(key, val) {
    const v = Math.min(1, Math.max(0, Number(val)/100));
    setForm(f=>({...f,[key]:v}));
  }

  async function handleSave() {
    if(!form.name||!form.objective){return;}
    setSaving(true);
    const keywords = keywordInput.split(",").map(k=>k.trim()).filter(Boolean);
    const data = {
      tenant_id:        tenant.id,
      name:             form.name,
      description:      form.description,
      objective:        form.objective,
      segments:         form.segments,
      locations:        form.locations,
      volume_min:       form.volume_min,
      prompt:           form.prompt || generatePrompt(),
      fit_keywords:     keywords,
      competitor_brands: competitorInput.split(",").map(k=>k.trim()).filter(Boolean),
      weight_fit:        Number(form.weight_fit),
      weight_authority: Number(form.weight_authority),
      weight_digital:   Number(form.weight_digital),
      weight_contact:   Number(form.weight_contact),
      is_default:       !existing,
      plan_tier:        "included",
    };
    if(existing?.id) {
      await supabase.from("disc_icp_profiles").update(data).eq("id",existing.id);
    } else {
      await supabase.from("disc_icp_profiles").insert(data);
    }
    setSaving(false);
    onSave();
  }

  const S = {
    card:  {background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"24px"},
    input: {width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #ddd",fontSize:13,background:"#fff",color:"#1a1a1a"},
    label: {fontSize:11,color:"#888",display:"block",marginBottom:5},
    btn:   {padding:"8px 18px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:13,color:"#1a1a1a"},
    btnP:  {padding:"8px 18px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500},
  };

  const steps = ["Objectivo","Segmentos","Pesos","Prompt","Revisão"];

  return (
    <div style={{maxWidth:620,margin:"0 auto"}}>
      {/* STEPS */}
      <div style={{display:"flex",gap:0,marginBottom:24,borderBottom:"0.5px solid #e5e5e5"}}>
        {steps.map((s,i)=>(
          <button key={s} onClick={()=>i<step-1&&setStep(i+1)} style={{flex:1,padding:"10px 4px",background:"none",border:"none",cursor:i<step-1?"pointer":"default",fontSize:12,color:step===i+1?"#1a1a1a":"#aaa",fontWeight:step===i+1?500:400,borderBottom:step===i+1?"2px solid #1a1a1a":"2px solid transparent"}}>
            <span style={{display:"block",width:20,height:20,borderRadius:"50%",background:step>i+1?"#1a1a1a":step===i+1?"#1a1a1a":"#f0f0f0",color:step>=i+1?"#fff":"#aaa",fontSize:11,fontWeight:600,margin:"0 auto 4px",display:"flex",alignItems:"center",justifyContent:"center"}}>{step>i+1?"✓":i+1}</span>
            {s}
          </button>
        ))}
      </div>

      {/* STEP 1: OBJECTIVO */}
      {step===1&&(
        <div style={S.card}>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:6}}>Qual é o teu objectivo?</h2>
          <p style={{fontSize:13,color:"#888",marginBottom:20}}>Define o que procuras nesta lista de empresas</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {OBJECTIVES.map(o=>(
              <button key={o.v} onClick={()=>setForm(f=>({...f,objective:o.v}))} style={{padding:"16px",borderRadius:10,border:"0.5px solid",borderColor:form.objective===o.v?"#1a1a1a":"#e5e5e5",background:form.objective===o.v?"#1a1a1a":"#fff",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:22,marginBottom:6}}>{o.icon}</div>
                <div style={{fontSize:13,fontWeight:500,color:form.objective===o.v?"#fff":"#1a1a1a",marginBottom:3}}>{o.l}</div>
                <div style={{fontSize:11,color:form.objective===o.v?"rgba(255,255,255,0.6)":"#aaa"}}>{o.desc}</div>
              </button>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <label style={S.label}>Nome deste perfil ICP *</label>
            <input style={S.input} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Distribuição Farmácias Lisboa"/>
          </div>
          <div>
            <label style={S.label}>Descrição (opcional)</label>
            <input style={S.input} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Foco em farmácias com área de parafarmácia activa"/>
          </div>
        </div>
      )}

      {/* STEP 2: SEGMENTOS + LOCALIZAÇÃO + VOLUME */}
      {step===2&&(
        <div style={S.card}>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:6}}>Que tipo de empresas procuras?</h2>
          <p style={{fontSize:13,color:"#888",marginBottom:20}}>Define segmento, localização e volume esperado</p>

          <div style={{marginBottom:20}}>
            <label style={S.label}>Segmentos de mercado</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {SEGMENTS_PT.map(s=>{
                const sel=form.segments.includes(s);
                return(
                  <button key={s} onClick={()=>setForm(f=>({...f,segments:sel?f.segments.filter(x=>x!==s):[...f.segments,s]}))}
                    style={{padding:"5px 12px",borderRadius:20,fontSize:12,cursor:"pointer",border:"0.5px solid",borderColor:sel?"#1a1a1a":"#ddd",background:sel?"#1a1a1a":"#fff",color:sel?"#fff":"#888"}}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={S.label}>Localizações prioritárias</label>
            <input style={S.input} placeholder="Ex: Lisboa, Porto, Braga (separadas por vírgula)"
              defaultValue={form.locations.join(", ")}
              onBlur={e=>setForm(f=>({...f,locations:e.target.value.split(",").map(l=>l.trim()).filter(Boolean)}))}/>
          </div>

          <div>
            <label style={S.label}>Volume mínimo esperado por parceiro</label>
            <div style={{display:"flex",gap:10}}>
              {VOLUME_OPTIONS.map(v=>(
                <button key={v.v} onClick={()=>setForm(f=>({...f,volume_min:v.v}))}
                  style={{flex:1,padding:"12px",borderRadius:10,border:"0.5px solid",borderColor:form.volume_min===v.v?"#1a1a1a":"#ddd",background:form.volume_min===v.v?"#1a1a1a":"#fff",cursor:"pointer"}}>
                  <div style={{fontSize:13,fontWeight:500,color:form.volume_min===v.v?"#fff":"#1a1a1a"}}>{v.l}</div>
                  <div style={{fontSize:11,color:form.volume_min===v.v?"rgba(255,255,255,0.6)":"#aaa"}}>{v.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PESOS */}
      {step===3&&(
        <div style={S.card}>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:6}}>O que mais importa para este ICP?</h2>
          <p style={{fontSize:13,color:"#888",marginBottom:20}}>Ajusta os pesos de scoring — total tem de somar 100%</p>
          {[
            {k:"weight_fit",      l:"Fit ao nicho",           desc:"Aderência ao segmento e keywords",   color:"#534AB7"},
            {k:"weight_authority",l:"Authority",               desc:"Credibilidade e autoridade online",  color:"#185FA5"},
            {k:"weight_digital",  l:"Presença digital",       desc:"Redes sociais, website, meta tags",  color:"#1D9E75"},
            {k:"weight_contact",  l:"Facilidade de contacto", desc:"Email, telefone, WhatsApp",          color:"#E8A020"},
          ].map(f=>(
            <div key={f.k} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div>
                  <span style={{fontSize:13,fontWeight:500}}>{f.l}</span>
                  <p style={{fontSize:11,color:"#aaa",margin:0}}>{f.desc}</p>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="number" min="0" max="100" step="5"
                    value={Math.round(Number(form[f.k])*100)}
                    onChange={e=>setW(f.k,e.target.value)}
                    style={{width:56,padding:"5px 8px",borderRadius:6,border:"0.5px solid #ddd",fontSize:12,textAlign:"center"}}/>
                  <span style={{fontSize:11,color:"#aaa"}}>%</span>
                </div>
              </div>
              <div style={{height:5,borderRadius:5,background:"#f0f0f0",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:5,width:(Number(form[f.k])*100)+"%",background:f.color,transition:"width 0.3s"}}/>
              </div>
            </div>
          ))}
          <div style={{padding:"10px 14px",borderRadius:8,background:weightsOk?"#EAF3DE":"#FCEBEB",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:500,color:weightsOk?"#3B6D11":"#A32D2D"}}>Total: {Math.round(totalWeight*100)}%</span>
            <span style={{fontSize:12,color:weightsOk?"#3B6D11":"#A32D2D"}}>{weightsOk?"✓ Correcto":`Faltam ${Math.round((1-totalWeight)*100)}%`}</span>
          </div>

          <div style={{marginTop:16}}>
            <label style={S.label}>Keywords de fit (separadas por vírgula)</label>
            <textarea style={{...S.input,minHeight:60,resize:"vertical"}} value={keywordInput}
              onChange={e=>setKeywordInput(e.target.value)}
              placeholder="ginásio, farmácia, nutricionista, wellness, colágeno..."/>
            <p style={{fontSize:11,color:"#aaa",marginTop:4}}>Cada keyword encontrada no site adiciona pontos ao Fit Score</p>
          </div>

          <div style={{marginTop:16}}>
            <label style={S.label}>Marcas concorrentes a detectar nos sites</label>
            <textarea style={{...S.input,minHeight:60,resize:"vertical"}} value={competitorInput}
              onChange={e=>setCompetitorInput(e.target.value)}
              placeholder="AllNutrition, Prozis, Myprotein, Gold Standard, HSN..."/>
            <p style={{fontSize:11,color:"#aaa",marginTop:4}}>Quando o crawler detecta estas marcas no site, sobe o score — empresa já vende neste nicho</p>
          </div>
        </div>
      )}

      {/* STEP 4: PROMPT */}
      {step===4&&(
        <div style={S.card}>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:6}}>Instrução para a IA</h2>
          <p style={{fontSize:13,color:"#888",marginBottom:16}}>A IA usa este texto para personalizar cada análise de empresa</p>
          <button onClick={()=>setForm(f=>({...f,prompt:generatePrompt()}))}
            style={{...S.btn,marginBottom:12,fontSize:12,color:"#534AB7",borderColor:"#534AB7"}}>
            ✨ Gerar automaticamente com base nas escolhas anteriores
          </button>
          <textarea value={form.prompt} onChange={e=>setForm(f=>({...f,prompt:e.target.value}))}
            placeholder="Descreve o que procuras nos parceiros, o teu produto, público-alvo e critérios de avaliação..."
            style={{...S.input,minHeight:180,resize:"vertical",lineHeight:1.6}}/>
          <div style={{background:"#f9f9f8",borderRadius:8,padding:"10px 14px",marginTop:12}}>
            <p style={{fontSize:11,color:"#888",margin:0}}>
              💡 Dica: quanto mais específico for o prompt, mais precisa será a análise. Inclui o preço do produto, o público-alvo e o volume mínimo esperado.
            </p>
          </div>
        </div>
      )}

      {/* STEP 5: REVISÃO */}
      {step===5&&(
        <div style={S.card}>
          <h2 style={{fontSize:16,fontWeight:500,marginBottom:6}}>Resumo do ICP</h2>
          <p style={{fontSize:13,color:"#888",marginBottom:20}}>Confirma antes de guardar</p>
          {[
            {l:"Nome",        v:form.name},
            {l:"Objectivo",   v:OBJECTIVES.find(o=>o.v===form.objective)?.l||form.objective},
            {l:"Segmentos",   v:form.segments.join(", ")||"Todos"},
            {l:"Localizações",v:form.locations.join(", ")||"Portugal"},
            {l:"Volume min",  v:VOLUME_OPTIONS.find(v=>v.v===form.volume_min)?.l+" ("+VOLUME_OPTIONS.find(v=>v.v===form.volume_min)?.sub+")"},
            {l:"Pesos",        v:`Fit ${Math.round(form.weight_fit*100)}% · Auth ${Math.round(form.weight_authority*100)}% · Digital ${Math.round(form.weight_digital*100)}% · Contacto ${Math.round(form.weight_contact*100)}%`},
            {l:"Concorrentes", v:competitorInput||"Nenhum definido"},
          ].map(f=>(
            <div key={f.l} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:"0.5px solid #f5f5f4"}}>
              <span style={{fontSize:12,color:"#aaa",width:100,flexShrink:0}}>{f.l}</span>
              <span style={{fontSize:13,fontWeight:500}}>{f.v}</span>
            </div>
          ))}
          {form.prompt&&(
            <div style={{marginTop:12,padding:"10px 14px",background:"#f9f9f8",borderRadius:8}}>
              <p style={{fontSize:11,color:"#aaa",marginBottom:4}}>Prompt IA</p>
              <p style={{fontSize:12,color:"#555",margin:0,lineHeight:1.6}}>{form.prompt.substring(0,200)}...</p>
            </div>
          )}
        </div>
      )}

      {/* NAVIGATION */}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
        <button style={S.btn} onClick={step===1?onCancel:()=>setStep(s=>s-1)}>
          {step===1?"Cancelar":"← Anterior"}
        </button>
        {step<5?(
          <button style={S.btnP} onClick={()=>setStep(s=>s+1)} disabled={step===1&&(!form.name||!form.objective)||step===3&&!weightsOk}>
            Seguinte →
          </button>
        ):(
          <button style={S.btnP} onClick={handleSave} disabled={saving}>
            {saving?"A guardar...":existing?"Actualizar ICP":"Criar ICP"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── ICP PAGE ──────────────────────────────────────────────────
export default function ICPPage({ companies, validations, onSelectCompany }) {
  const { tenant: authTenant, impersonating } = useAuth();
  const tenant = authTenant || impersonating?.tenant || null;
  const [profiles,    setProfiles]    = useState([]);
  const [learned,     setLearned]     = useState({});
  const [activeICP,   setActiveICP]   = useState(null);
  const [showWizard,  setShowWizard]  = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(()=>{ if(tenant)loadProfiles(); },[tenant]);

  async function loadProfiles() {
    setLoading(true);
    const { data } = await supabase.from("disc_icp_profiles")
      .select("*").eq("tenant_id",tenant.id).eq("is_active",true).order("is_default",{ascending:false});
    setProfiles(data||[]);
    if(data?.length>0&&!activeICP) setActiveICP(data[0].id);

    // Calcula sinais aprendidos por ICP
    const learnedMap = {};
    for(const p of data||[]) {
      const approved = companies.filter(c=>{
        const v = validations[c.id]||c.latest_validation;
        return ["excellent","good"].includes(v);
      });
      if(approved.length>=3) {
        const total = approved.length;
        learnedMap[p.id] = {
          total,
          signals: Object.entries(SIGNAL_LABELS).map(([key,label])=>{
            const count = approved.filter(c=>{
              if(key.startsWith("has_")) return c[key];
              return c.custom_signals?.[key];
            }).length;
            return { key, label, count, pct:Math.round(count/total*100), strong:count/total>=0.7 };
          }).sort((a,b)=>b.pct-a.pct),
          confidence: Math.min(100, Math.round((total/20)*100)),
        };
      }
    }
    setLearned(learnedMap);
    setLoading(false);
  }

  async function deleteProfile(id) {
    if(!confirm("Apagar este ICP?"))return;
    await supabase.from("disc_icp_profiles").update({active:false}).eq("id",id);
    loadProfiles();
  }

  if(!tenant) return <div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>A carregar workspace...</div>;
  if(loading) return <div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>A carregar perfis ICP...</div>;

  if(showWizard||editProfile) return (
    <div>
      <h1 style={{fontSize:20,fontWeight:500,marginBottom:4}}>{editProfile?"Editar ICP":"Criar novo ICP"}</h1>
      <p style={{fontSize:13,color:"#888",marginBottom:24}}>Define o perfil de cliente ideal para este objectivo</p>
      <ICPWizard
        tenant={tenant}
        existing={editProfile}
        onSave={()=>{ setShowWizard(false); setEditProfile(null); loadProfiles(); }}
        onCancel={()=>{ setShowWizard(false); setEditProfile(null); }}
      />
    </div>
  );

  const active = profiles.find(p=>p.id===activeICP);
  const learnedActive = learned[activeICP];

  // Companies scored for active ICP (use main score for now)
  const scored = companies.filter(c=>c.final_score!=null)
    .sort((a,b)=>(b.combined_score??b.final_score??0)-(a.combined_score??a.final_score??0));

  const S = {
    card: {background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16},
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:500,marginBottom:4}}>Perfis ICP</h1>
          <p style={{fontSize:13,color:"#888",margin:0}}>A tua análise está a convergir para estes perfis de cliente ideal</p>
        </div>
        <button onClick={()=>setShowWizard(true)}
          style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500}}>
          + Novo ICP
        </button>
      </div>

      {/* ICP SELECTOR */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        {profiles.map(p=>{
          const obj=OBJECTIVES.find(o=>o.v===p.objective);
          const tc=PLAN_TIER_CFG[p.plan_tier]||PLAN_TIER_CFG.included;
          const isActive=activeICP===p.id;
          return(
            <button key={p.id} onClick={()=>setActiveICP(p.id)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,border:"0.5px solid",borderColor:isActive?"#1a1a1a":"#e5e5e5",background:isActive?"#1a1a1a":"#fff",cursor:"pointer",transition:"all 0.15s"}}>
              <span style={{fontSize:18}}>{obj?.icon||"🎯"}</span>
              <div style={{textAlign:"left"}}>
                <p style={{fontSize:13,fontWeight:500,margin:0,color:isActive?"#fff":"#1a1a1a"}}>{p.name}</p>
                <p style={{fontSize:10,margin:0,color:isActive?"rgba(255,255,255,0.5)":"#aaa"}}>{obj?.l} · {p.is_default?"Padrão":"Adicional"}</p>
              </div>
              {p.plan_tier!=="included"&&(
                <span style={{fontSize:10,background:tc.bg,color:tc.c,padding:"1px 6px",borderRadius:3,fontWeight:500}}>{tc.l}</span>
              )}
            </button>
          );
        })}
        {profiles.length===0&&(
          <div style={{...S.card,flex:1,textAlign:"center",padding:40}}>
            <p style={{fontSize:14,fontWeight:500,marginBottom:6}}>Sem perfis ICP criados</p>
            <p style={{fontSize:13,color:"#888",marginBottom:16}}>Cria o teu primeiro perfil para começar a classificar empresas</p>
            <button onClick={()=>setShowWizard(true)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13}}>
              + Criar ICP
            </button>
          </div>
        )}
      </div>

      {active&&(
        <div>
          {/* ICP HEADER */}
          <div style={{...S.card,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:24}}>{OBJECTIVES.find(o=>o.v===active.objective)?.icon||"🎯"}</span>
                <div>
                  <h2 style={{fontSize:16,fontWeight:500,margin:0}}>{active.name}</h2>
                  <p style={{fontSize:12,color:"#888",margin:0}}>{active.description||OBJECTIVES.find(o=>o.v===active.objective)?.desc}</p>
                </div>
              </div>
              {/* Segmentos e localizações */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {active.segments?.map(s=>(
                  <span key={s} style={{fontSize:11,background:"#f5f5f4",color:"#888",padding:"2px 8px",borderRadius:4}}>{s}</span>
                ))}
                {active.locations?.map(l=>(
                  <span key={l} style={{fontSize:11,background:"#E6F1FB",color:"#185FA5",padding:"2px 8px",borderRadius:4}}>📍{l}</span>
                ))}
                {active.competitor_brands?.length>0&&(
                  <div style={{width:"100%",marginTop:8,padding:"8px 12px",background:"#f5f0ff",borderRadius:8}}>
                    <p style={{fontSize:11,color:"#534AB7",fontWeight:500,margin:"0 0 4px"}}>🏪 Concorrentes a detectar</p>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {active.competitor_brands.map(b=>(
                        <span key={b} style={{fontSize:11,background:"#EEEDFE",color:"#534AB7",padding:"2px 8px",borderRadius:4}}>{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Pesos */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[
                  {l:"Fit",    v:active.weight_fit,       color:"#534AB7"},
                  {l:"Auth",   v:active.weight_authority,  color:"#185FA5"},
                  {l:"Digital",v:active.weight_digital,    color:"#1D9E75"},
                  {l:"Contacto",v:active.weight_contact,   color:"#E8A020"},
                ].map(w=>(
                  <div key={w.l} style={{background:"#f9f9f8",borderRadius:6,padding:"6px 10px"}}>
                    <div style={{fontSize:10,color:"#aaa",marginBottom:3}}>{w.l}</div>
                    <div style={{fontSize:13,fontWeight:600,color:w.color}}>{Math.round(Number(w.v)*100)}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              <button onClick={()=>setEditProfile(active)} style={{padding:"5px 12px",borderRadius:6,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:12}}>✏ Editar</button>
              {!active.is_default&&<button onClick={()=>deleteProfile(active.id)} style={{padding:"5px 12px",borderRadius:6,border:"0.5px solid #f0c0c0",background:"#fff",cursor:"pointer",fontSize:12,color:"#A32D2D"}}>Apagar</button>}
            </div>
          </div>

          {/* CONFIANÇA DO PERFIL */}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <p style={{fontSize:13,fontWeight:500,margin:0}}>Confiança do perfil ICP</p>
              <span style={{fontSize:11,color:"#aaa"}}>
                {Object.values(validations).filter(v=>["excellent","good"].includes(v)).length} empresas aprovadas
              </span>
            </div>
            <ConfidenceBar
              pct={learnedActive?.confidence||0}
              validations={learnedActive?.total||0}
              threshold={20}
            />
            {!learnedActive&&(
              <p style={{fontSize:12,color:"#aaa",marginTop:10,textAlign:"center"}}>
                Valida pelo menos 3 empresas como "Boa" ou "Excelente" para começar a aprender o perfil
              </p>
            )}
          </div>

          {/* ICP LEARNING */}
          {learnedActive&&(
            <div style={S.card}>
              <p style={{fontSize:13,fontWeight:500,marginBottom:6}}>🧠 O que as empresas aprovadas têm em comum</p>
              <p style={{fontSize:12,color:"#aaa",marginBottom:16}}>
                Baseado em {learnedActive.total} empresas aprovadas · ★ = presente em 70%+
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {learnedActive.signals.filter(s=>s.count>0).map(s=>(
                  <div key={s.key} style={{marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <span style={{color:s.strong?"#1a1a1a":"#888",fontWeight:s.strong?500:400}}>
                        {s.strong&&"★ "}{s.label}
                      </span>
                      <span style={{color:s.strong?"#3B6D11":"#aaa",fontWeight:s.strong?500:400}}>{s.pct}%</span>
                    </div>
                    <div style={{height:4,borderRadius:4,background:"#f0f0f0",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,width:s.pct+"%",background:s.strong?"#3B6D11":"#ddd",transition:"width 0.5s"}}/>
                    </div>
                  </div>
                ))}
              </div>
              {learnedActive.signals.some(s=>s.strong)&&(
                <div style={{marginTop:14,padding:"10px 14px",background:"#EAF3DE",borderRadius:8}}>
                  <p style={{fontSize:12,color:"#3B6D11",margin:0,fontWeight:500}}>
                    ICP detectado: empresas com {learnedActive.signals.filter(s=>s.strong).map(s=>s.label).join(", ")} têm maior probabilidade de conversão
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TOP EMPRESAS PARA ESTE ICP */}
          <div style={S.card}>
            <p style={{fontSize:13,fontWeight:500,marginBottom:14}}>
              Top empresas para "{active.name}"
            </p>
            {scored.length===0?(
              <p style={{fontSize:13,color:"#aaa"}}>Sem empresas pontuadas ainda. Vai ao Dashboard e enriquece as empresas.</p>
            ):scored.slice(0,10).map((c,i)=>{
              const val=validations[c.id]||c.latest_validation;
              const displayScore=c.combined_score??c.final_score;
              const displayClass=c.combined_class??c.score_class;
              const CLASS_CFG={A:{bg:"#EAF3DE",c:"#3B6D11"},B:{bg:"#E6F1FB",c:"#185FA5"},C:{bg:"#FAEEDA",c:"#854F0B"},D:{bg:"#FCEBEB",c:"#A32D2D"}};
              const cfg=CLASS_CFG[displayClass]||{bg:"#f5f5f4",c:"#888"};
              const RATINGS=[{v:"excellent",l:"⭐ Excelente",c:"#854F0B"},{v:"good",l:"👍 Boa",c:"#3B6D11"},{v:"neutral",l:"➖ Neutro",c:"#888"},{v:"bad",l:"👎 Não faz sentido",c:"#A32D2D"},{v:"review_later",l:"🕐 Revisar",c:"#185FA5"}];
              const r=RATINGS.find(x=>x.v===val);
              return(
                <div key={c.id} onClick={()=>onSelectCompany(c.id)}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"0.5px solid #f5f5f4",cursor:"pointer"}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#aaa",width:20,flexShrink:0}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:500,margin:"0 0 2px",color:"#185FA5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</p>
                    <p style={{fontSize:11,color:"#aaa",margin:0}}>{[c.city,c.category].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    {r&&<span style={{fontSize:11,color:r.c,fontWeight:500}}>{r.l}</span>}
                    {c.has_instagram&&<span style={{fontSize:10}}>📸</span>}
                    {c.has_email&&<span style={{fontSize:10}}>✉</span>}
                    <div style={{textAlign:"center",background:cfg.bg,borderRadius:6,padding:"3px 10px"}}>
                      <span style={{fontSize:14,fontWeight:700,color:cfg.c}}>{displayScore}</span>
                      <span style={{fontSize:9,color:cfg.c,marginLeft:3}}>({displayClass})</span>
                    </div>
                    <span style={{color:"#ccc",fontSize:12}}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
