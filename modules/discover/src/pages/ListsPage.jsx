import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../AuthContext.jsx";

const LEAD_TYPES = [
  { v:"lead",      l:"Lead",      c:"#888",    bg:"#f5f5f4", icon:"○" },
  { v:"prospect",  l:"Prospect",  c:"#185FA5", bg:"#E6F1FB", icon:"◎" },
  { v:"client",    l:"Cliente",   c:"#3B6D11", bg:"#EAF3DE", icon:"●" },
  { v:"partner",   l:"Parceiro",  c:"#534AB7", bg:"#EEEDFE", icon:"★" },
  { v:"inactive",  l:"Inactivo",  c:"#A32D2D", bg:"#FCEBEB", icon:"✕" },
];

const LEAD_STATUSES = [
  { v:"not_contacted", l:"Não contactado", c:"#888"    },
  { v:"contacted",     l:"Contactado",     c:"#185FA5" },
  { v:"negotiating",   l:"Em negociação",  c:"#854F0B" },
  { v:"closed",        l:"Fechado",        c:"#3B6D11" },
  { v:"lost",          l:"Perdido",        c:"#A32D2D" },
];

const CLASS_CFG = {
  A:{bg:"#EAF3DE",c:"#3B6D11"},
  B:{bg:"#E6F1FB",c:"#185FA5"},
  C:{bg:"#FAEEDA",c:"#854F0B"},
  D:{bg:"#FCEBEB",c:"#A32D2D"},
};

function TypeBadge({ type }) {
  const cfg = LEAD_TYPES.find(t=>t.v===type) || LEAD_TYPES[0];
  return <span style={{fontSize:11,background:cfg.bg,color:cfg.c,padding:"2px 8px",borderRadius:4,fontWeight:500}}>{cfg.icon} {cfg.l}</span>;
}

function StatusBadge({ status }) {
  const cfg = LEAD_STATUSES.find(s=>s.v===status) || LEAD_STATUSES[0];
  return <span style={{fontSize:11,color:cfg.c,fontWeight:500}}>{cfg.l}</span>;
}

// ── FILTER BUILDER ────────────────────────────────────────────
function FilterBuilder({ filters, onChange, companies }) {
  const cities = [...new Set(companies.filter(c=>c.city).map(c=>c.city))].sort();
  const cats   = [...new Set(companies.filter(c=>c.category).map(c=>c.category))].sort();

  function toggle(key, val) {
    const arr = filters[key] || [];
    const next = arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  }

  function setVal(key, val) {
    onChange({ ...filters, [key]: val || undefined });
  }

  const Chip = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{
      padding:"4px 10px", borderRadius:16, fontSize:11, cursor:"pointer",
      border:"0.5px solid", borderColor:active?"#1a1a1a":"#e5e5e5",
      background:active?"#1a1a1a":"#fff", color:active?"#fff":"#888",
      fontWeight:active?500:400,
    }}>{label}</button>
  );

  const S = { label:{fontSize:11,color:"#888",display:"block",marginBottom:5,marginTop:12} };

  return (
    <div>
      <label style={S.label}>Classe</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {["A","B","C","D"].map(c=>(
          <Chip key={c} label={`Classe ${c}`} active={(filters.class||[]).includes(c)} onClick={()=>toggle("class",c)}/>
        ))}
      </div>

      <label style={S.label}>Tipo de lead</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {LEAD_TYPES.map(t=>(
          <Chip key={t.v} label={t.l} active={(filters.lead_type||[]).includes(t.v)} onClick={()=>toggle("lead_type",t.v)}/>
        ))}
      </div>

      <label style={S.label}>Status comercial</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {LEAD_STATUSES.map(s=>(
          <Chip key={s.v} label={s.l} active={(filters.lead_status||[]).includes(s.v)} onClick={()=>toggle("lead_status",s.v)}/>
        ))}
      </div>

      <label style={S.label}>Cidade</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {cities.slice(0,12).map(c=>(
          <Chip key={c} label={c} active={(filters.city||[]).includes(c)} onClick={()=>toggle("city",c)}/>
        ))}
      </div>

      <label style={S.label}>Categoria</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {cats.map(c=>(
          <Chip key={c} label={c} active={(filters.category||[]).includes(c)} onClick={()=>toggle("category",c)}/>
        ))}
      </div>

      <label style={S.label}>Score mínimo</label>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <input type="range" min="0" max="100" step="5"
          value={filters.min_score||0}
          onChange={e=>setVal("min_score", Number(e.target.value)||undefined)}
          style={{flex:1}}/>
        <span style={{fontSize:13,fontWeight:500,minWidth:30}}>{filters.min_score||0}</span>
      </div>

      <label style={S.label}>Sinais digitais</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {[
          {k:"has_instagram",l:"Instagram"},
          {k:"has_email",    l:"Email"},
          {k:"has_whatsapp", l:"WhatsApp"},
          {k:"has_online_store",l:"Loja Online"},
        ].map(s=>(
          <Chip key={s.k} label={s.l} active={filters[s.k]===true} onClick={()=>onChange({...filters,[s.k]:filters[s.k]===true?undefined:true})}/>
        ))}
      </div>

      <label style={S.label}>Potencial IA</label>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {["alto","médio","baixo"].map(p=>(
          <Chip key={p} label={p} active={(filters.potential||[]).includes(p)} onClick={()=>toggle("potential",p)}/>
        ))}
      </div>
    </div>
  );
}

// ── APPLY FILTERS ─────────────────────────────────────────────
export function applyFilters(companies, filters, search="") {
  return companies.filter(c=>{
    if(search){
      const s=search.toLowerCase();
      if(!(c.name||"").toLowerCase().includes(s)&&
         !(c.city||"").toLowerCase().includes(s)&&
         !(c.category||"").toLowerCase().includes(s)&&
         !(c.email||"").toLowerCase().includes(s)&&
         !(c.products_sold||"").toLowerCase().includes(s)) return false;
    }
    if(filters.class?.length){
      const cls=c.combined_class||c.score_class;
      if(!filters.class.includes(cls)) return false;
    }
    if(filters.lead_type?.length && !filters.lead_type.includes(c.lead_type||"lead")) return false;
    if(filters.lead_status?.length && !filters.lead_status.includes(c.lead_status||"not_contacted")) return false;
    if(filters.city?.length && !filters.city.includes(c.city)) return false;
    if(filters.category?.length && !filters.category.includes(c.category)) return false;
    if(filters.min_score && (c.combined_score||c.final_score||0)<filters.min_score) return false;
    if(filters.has_instagram===true && !c.has_instagram) return false;
    if(filters.has_email===true && !c.has_email) return false;
    if(filters.has_whatsapp===true && !c.has_whatsapp) return false;
    if(filters.has_online_store===true && !c.has_online_store) return false;
    if(filters.potential?.length && !filters.potential.includes(c.partnership_potential)) return false;
    return true;
  });
}

// ── LISTS PAGE ────────────────────────────────────────────────
export default function ListsPage({ companies, onSelectCompany }) {
  const { tenant, user } = useAuth();
  const [lists,      setLists]      = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editList,   setEditList]   = useState(null);
  const [loading,    setLoading]    = useState(true);

  // Create/Edit state
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [filters, setFilters] = useState({});
  const [useAsICP,setUseAsICP]= useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(()=>{ if(tenant)loadLists(); },[tenant]);

  async function loadLists() {
    setLoading(true);
    const { data } = await supabase.from("disc_lists")
      .select("*").eq("tenant_id",tenant.id).order("created_at",{ascending:false});
    setLists(data||[]);
    setLoading(false);
  }

  async function saveList() {
    if(!name.trim())return;
    setSaving(true);
    const filtered = applyFilters(companies, filters);
    const data = {
      tenant_id:     tenant.id,
      name:          name.trim(),
      description:   desc,
      filters,
      company_count: filtered.length,
      use_as_icp:    useAsICP,
      created_by:    user.id,
    };
    if(editList?.id) {
      await supabase.from("disc_lists").update(data).eq("id",editList.id);
    } else {
      await supabase.from("disc_lists").insert(data);
    }
    setSaving(false);
    setShowCreate(false); setEditList(null);
    setName(""); setDesc(""); setFilters({}); setUseAsICP(false);
    loadLists();
  }

  async function deleteList(id) {
    if(!confirm("Apagar esta lista?"))return;
    await supabase.from("disc_lists").delete().eq("id",id);
    if(activeList?.id===id) setActiveList(null);
    loadLists();
  }

  function openEdit(list) {
    setEditList(list);
    setName(list.name);
    setDesc(list.description||"");
    setFilters(list.filters||{});
    setUseAsICP(list.use_as_icp||false);
    setShowCreate(true);
  }

  const previewCount = applyFilters(companies, filters).length;
  const activeCompanies = activeList ? applyFilters(companies, activeList.filters||{}) : [];

  const S = {
    card:  {background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px",marginBottom:16},
    btn:   {padding:"7px 14px",borderRadius:8,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:13,color:"#1a1a1a"},
    btnP:  {padding:"7px 14px",borderRadius:8,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:500},
    input: {width:"100%",padding:"8px 12px",borderRadius:8,border:"0.5px solid #ddd",fontSize:13,background:"#fff",color:"#1a1a1a"},
    label: {fontSize:11,color:"#888",display:"block",marginBottom:5},
    th:    {padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:0.4,borderBottom:"0.5px solid #e5e5e5"},
    td:    {padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid #e5e5e5",color:"#1a1a1a"},
  };

  // Create/Edit mode
  if(showCreate) return (
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>{setShowCreate(false);setEditList(null);}} style={S.btn}>← Voltar</button>
        <h1 style={{fontSize:20,fontWeight:500,margin:0}}>{editList?"Editar lista":"Nova lista segmentada"}</h1>
      </div>

      <div style={S.card}>
        <div style={{marginBottom:12}}>
          <label style={S.label}>Nome da lista *</label>
          <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Classe A Lisboa com Instagram"/>
        </div>
        <div>
          <label style={S.label}>Descrição (opcional)</label>
          <input style={S.input} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: Top leads para prospecção imediata"/>
        </div>
      </div>

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:500,margin:0}}>Filtros</p>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"#888"}}>Empresas que correspondem:</span>
            <span style={{fontSize:16,fontWeight:700,color:"#1a1a1a"}}>{previewCount}</span>
          </div>
        </div>
        <FilterBuilder filters={filters} onChange={setFilters} companies={companies}/>

        {Object.keys(filters).length>0&&(
          <button onClick={()=>setFilters({})} style={{...S.btn,fontSize:11,color:"#A32D2D",marginTop:12}}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      <div style={S.card}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <input type="checkbox" id="useICP" checked={useAsICP} onChange={e=>setUseAsICP(e.target.checked)}
            style={{width:16,height:16,cursor:"pointer"}}/>
          <label htmlFor="useICP" style={{cursor:"pointer"}}>
            <span style={{fontSize:13,fontWeight:500}}>Usar como base ICP para prospeção</span>
            <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>Quando activar Google Maps, esta lista serve de referência para encontrar empresas similares</p>
          </label>
        </div>
      </div>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <button style={S.btn} onClick={()=>{setShowCreate(false);setEditList(null);}}>Cancelar</button>
        <button style={S.btnP} onClick={saveList} disabled={saving||!name.trim()}>
          {saving?"A guardar...":editList?"Actualizar lista":"Criar lista"}
        </button>
      </div>
    </div>
  );

  // List detail view
  if(activeList) return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setActiveList(null)} style={S.btn}>← Listas</button>
        <div style={{flex:1}}>
          <h1 style={{fontSize:20,fontWeight:500,margin:"0 0 2px"}}>{activeList.name}</h1>
          <p style={{fontSize:12,color:"#888",margin:0}}>
            {activeCompanies.length} empresas · {activeList.description||""}
            {activeList.use_as_icp&&<span style={{marginLeft:8,fontSize:11,background:"#EEEDFE",color:"#534AB7",padding:"1px 6px",borderRadius:3}}>★ Base ICP</span>}
          </p>
        </div>
        <button onClick={()=>openEdit(activeList)} style={S.btn}>✏ Editar</button>
      </div>

      {activeCompanies.length===0?(
        <div style={{...S.card,textAlign:"center",padding:40}}>
          <p style={{fontSize:14,color:"#888"}}>Nenhuma empresa corresponde aos filtros desta lista.</p>
        </div>
      ):(
        <div style={{...S.card,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr>{["Empresa","Cidade","Categoria","Tipo","Status","Score","Classe",""].map(h=>(
                <th key={h} style={S.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {activeCompanies.map((c,i)=>{
                const displayScore=c.combined_score??c.final_score;
                const displayClass=c.combined_class??c.score_class;
                const cfg=CLASS_CFG[displayClass]||{bg:"#f5f5f4",c:"#888"};
                return(
                  <tr key={c.id} style={{background:i%2===0?"transparent":"#fafaf9",cursor:"pointer"}} onClick={()=>onSelectCompany(c.id)}>
                    <td style={{...S.td,fontWeight:500,color:"#185FA5"}}>{c.name}</td>
                    <td style={{...S.td,color:"#888"}}>{c.city||"—"}</td>
                    <td style={{...S.td,color:"#888"}}>{c.category||"—"}</td>
                    <td style={S.td}><TypeBadge type={c.lead_type}/></td>
                    <td style={S.td}><StatusBadge status={c.lead_status}/></td>
                    <td style={{...S.td,fontWeight:600,color:cfg.c}}>{displayScore??"-"}</td>
                    <td style={S.td}>{displayClass&&<span style={{background:cfg.bg,color:cfg.c,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:500}}>Classe {displayClass}</span>}</td>
                    <td style={{...S.td,color:"#aaa"}}>→</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Lists overview
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:500,marginBottom:4}}>Listas segmentadas</h1>
          <p style={{fontSize:13,color:"#888",margin:0}}>Cria listas com filtros combinados para organizar e priorizar leads</p>
        </div>
        <button onClick={()=>setShowCreate(true)} style={S.btnP}>+ Nova lista</button>
      </div>

      {/* QUICK STATS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Total empresas", v:companies.length},
          {l:"Clientes",       v:companies.filter(c=>c.lead_type==="client").length},
          {l:"Prospects",      v:companies.filter(c=>c.lead_type==="prospect").length},
          {l:"Não contactados",v:companies.filter(c=>!c.lead_status||c.lead_status==="not_contacted").length},
        ].map(m=>(
          <div key={m.l} style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:11,color:"#888",marginBottom:3}}>{m.l}</div>
            <div style={{fontSize:22,fontWeight:600}}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* LISTS */}
      {loading?(
        <div style={{...S.card,textAlign:"center",padding:40,color:"#888",fontSize:13}}>A carregar...</div>
      ):lists.length===0?(
        <div style={{...S.card,textAlign:"center",padding:48}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <p style={{fontSize:15,fontWeight:500,marginBottom:6}}>Sem listas criadas</p>
          <p style={{fontSize:13,color:"#888",marginBottom:20}}>Cria listas segmentadas para organizar os teus leads por classe, cidade, tipo ou qualquer combinação de filtros</p>
          <button onClick={()=>setShowCreate(true)} style={S.btnP}>+ Criar primeira lista</button>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {lists.map(list=>{
            const count=applyFilters(companies,list.filters||{}).length;
            const hasICP=list.use_as_icp;
            return(
              <div key={list.id} style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"18px 20px",cursor:"pointer",transition:"box-shadow 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)"}
                onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
                onClick={()=>setActiveList(list)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:14,fontWeight:500,margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{list.name}</p>
                    {list.description&&<p style={{fontSize:11,color:"#aaa",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{list.description}</p>}
                  </div>
                  {hasICP&&<span style={{fontSize:10,background:"#EEEDFE",color:"#534AB7",padding:"2px 6px",borderRadius:3,marginLeft:8,flexShrink:0}}>★ ICP</span>}
                </div>

                {/* Filter summary */}
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
                  {(list.filters?.class||[]).map(c=>(
                    <span key={c} style={{fontSize:10,background:CLASS_CFG[c]?.bg,color:CLASS_CFG[c]?.c,padding:"1px 6px",borderRadius:3}}>Classe {c}</span>
                  ))}
                  {(list.filters?.city||[]).map(c=>(
                    <span key={c} style={{fontSize:10,background:"#E6F1FB",color:"#185FA5",padding:"1px 6px",borderRadius:3}}>📍{c}</span>
                  ))}
                  {(list.filters?.lead_type||[]).map(t=>{
                    const cfg=LEAD_TYPES.find(x=>x.v===t);
                    return <span key={t} style={{fontSize:10,background:cfg?.bg,color:cfg?.c,padding:"1px 6px",borderRadius:3}}>{cfg?.l}</span>;
                  })}
                  {list.filters?.min_score>0&&<span style={{fontSize:10,background:"#f5f5f4",color:"#888",padding:"1px 6px",borderRadius:3}}>Score ≥{list.filters.min_score}</span>}
                  {list.filters?.has_instagram&&<span style={{fontSize:10,background:"#fce8f1",color:"#E1306C",padding:"1px 6px",borderRadius:3}}>📸</span>}
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:22,fontWeight:700}}>{count}</span>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={e=>{e.stopPropagation();openEdit(list);}} style={{...S.btn,fontSize:11,padding:"3px 8px"}}>✏</button>
                    <button onClick={e=>{e.stopPropagation();deleteList(list.id);}} style={{...S.btn,fontSize:11,padding:"3px 8px",color:"#A32D2D",borderColor:"#f0c0c0"}}>✕</button>
                  </div>
                </div>
                <div style={{fontSize:10,color:"#ccc",marginTop:4}}>empresas · criada {new Date(list.created_at).toLocaleDateString("pt-PT")}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { LEAD_TYPES, LEAD_STATUSES };
