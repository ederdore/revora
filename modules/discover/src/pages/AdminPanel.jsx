import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

// ── CONSTANTS ─────────────────────────────────────────────────
const PLAN_CFG = {
  trial:      { label:"Trial",      c:"#854F0B", bg:"#FAEEDA", price:0   },
  starter:    { label:"Starter",    c:"#185FA5", bg:"#E6F1FB", price:29  },
  pro:        { label:"Pro",        c:"#3B6D11", bg:"#EAF3DE", price:59  },
  enterprise: { label:"Enterprise", c:"#534AB7", bg:"#EEEDFE", price:199 },
};

const DEFAULT_COSTS = [
  { id:1, label:"Netlify",       category:"infra", amount:0,  frequency:"monthly"  },
  { id:2, label:"Supabase",      category:"infra", amount:0,  frequency:"monthly"  },
  { id:3, label:"Anthropic API", category:"ia",    amount:0,  frequency:"variable" },
  { id:4, label:"Domínio",       category:"infra", amount:12, frequency:"annual"   },
];

// Converte qualquer custo para equivalente mensal
function toMonthly(cost) {
  const v = Number(cost.amount)||0;
  if (cost.frequency==="annual")   return v/12;
  if (cost.frequency==="one_time") return 0; // não entra no MRR
  return v; // monthly ou variable
}

const FREQ_LABELS = {
  monthly:  { l:"Mensal",    sub:"por mês"      },
  annual:   { l:"Anual",     sub:"÷12 por mês"  },
  variable: { l:"Variável",  sub:"estimativa"   },
  one_time: { l:"Único",     sub:"não recorrente"},
};

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v) { return "€"+Number(v||0).toFixed(0); }
function fmtD(v) { return new Date(v).toLocaleDateString("pt-PT"); }

function Badge({plan}) {
  const c = PLAN_CFG[plan]||PLAN_CFG.trial;
  return <span style={{background:c.bg,color:c.c,padding:"2px 8px",borderRadius:5,fontSize:11,fontWeight:500}}>{c.label}</span>;
}

function StatusDot({active}) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,color:active?"#3B6D11":"#A32D2D"}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:active?"#3B6D11":"#A32D2D",display:"inline-block"}}/>
    {active?"Ativo":"Inativo"}
  </span>;
}

// ── MINI BAR CHART ────────────────────────────────────────────
function BarChart({data,color="#185FA5",height=80}) {
  const max = Math.max(...data.map(d=>d.v),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{width:"100%",background:color+"22",borderRadius:"3px 3px 0 0",height:height-16,display:"flex",alignItems:"flex-end"}}>
            <div style={{width:"100%",background:color,borderRadius:"3px 3px 0 0",height:Math.max(2,(d.v/max)*(height-16)),transition:"height 0.4s"}}/>
          </div>
          <span style={{fontSize:9,color:"#aaa"}}>{d.l}</span>
        </div>
      ))}
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────
function DonutChart({data,size=100}) {
  const total = data.reduce((a,b)=>a+b.v,0)||1;
  let offset = 0;
  const r = 36; const c = size/2; const circ = 2*Math.PI*r;
  return (
    <div style={{display:"flex",alignItems:"center",gap:16}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#f0f0f0" strokeWidth={12}/>
        {data.map((d,i)=>{
          const pct = d.v/total;
          const dash = pct*circ;
          const seg = <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={d.color} strokeWidth={12} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-offset*circ} style={{transform:`rotate(-90deg)`,transformOrigin:"center"}}/>;
          offset += pct; return seg;
        })}
        <text x={c} y={c+1} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={500} fill="#1a1a1a">{total}</text>
        <text x={c} y={c+13} textAnchor="middle" fontSize={8} fill="#aaa">tenants</text>
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {data.map(d=>(
          <div key={d.label} style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
            <span style={{fontSize:11,color:"#888"}}>{d.label}</span>
            <span style={{fontSize:11,fontWeight:500,marginLeft:"auto",paddingLeft:8}}>{d.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState("overview");
  const [tenants, setTenants] = useState([]);
  const [events, setEvents] = useState([]);
  const [costs, setCosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("revora_admin_costs")||"null")||DEFAULT_COSTS; }
    catch { return DEFAULT_COSTS; }
  });
  const [investment, setInvestment] = useState(() => Number(localStorage.getItem("revora_admin_investment")||"0"));
  const [loading, setLoading] = useState(true);
  const [editTenant, setEditTenant] = useState(null);
  const [editCost, setEditCost] = useState(null);
  const [newCost, setNewCost] = useState({label:"",category:"infra",amount:"",frequency:"monthly"});
  const [showNewCost, setShowNewCost] = useState(false);
  const [planLimits, setPlanLimits] = useState([]);
  const [usageSummaries, setUsageSummaries] = useState([]);
  const [editPlan, setEditPlan] = useState(null);

  useEffect(()=>{ loadAll(); },[]);

  async function loadAll() {
    setLoading(true);
    const [{ data:ts },{ data:evs }] = await Promise.all([
      supabase.from("tenants").select("*, tenant_users(count), disc_companies(count)").order("created_at",{ascending:false}),
      supabase.from("events").select("*").order("created_at",{ascending:false}).limit(100),
    ]);
    setTenants(ts||[]);
    setEvents(evs||[]);
    // Load plan limits and usage
    const [{ data:pl },{ data:us }] = await Promise.all([
      supabase.from("plan_limits").select("*").order("price_eur"),
      supabase.from("tenant_usage_summary").select("*"),
    ]);
    setPlanLimits(pl||[]);
    setUsageSummaries(us||[]);
    setLoading(false);
  }

  function saveCosts(updated) {
    setCosts(updated);
    localStorage.setItem("revora_admin_costs", JSON.stringify(updated));
  }

  function saveInvestment(v) {
    setInvestment(v);
    localStorage.setItem("revora_admin_investment", String(v));
  }

  // ── COMPUTED METRICS ────────────────────────────────────────
  const active = tenants.filter(t=>t.active&&t.plan!=="trial");
  const trials = tenants.filter(t=>t.plan==="trial");
  const mrr = active.reduce((sum,t)=>{
    return sum + (PLAN_CFG[t.plan]?.price||0);
  },0);
  // Custo mensal efectivo — anuais divididos por 12, únicos ignorados
  const totalCosts = costs.reduce((sum,c)=>sum+toMonthly(c),0);
  const annualCosts = costs.filter(c=>c.frequency==="annual").reduce((a,c)=>a+Number(c.amount),0);
  const monthlyCosts = costs.filter(c=>c.frequency==="monthly").reduce((a,c)=>a+Number(c.amount),0);
  const variableCosts = costs.filter(c=>c.frequency==="variable").reduce((a,c)=>a+Number(c.amount),0);
  const oneTimeCosts = costs.filter(c=>c.frequency==="one_time").reduce((a,c)=>a+Number(c.amount),0);
  const margin = mrr - totalCosts;
  const marginPct = mrr>0 ? Math.round((margin/mrr)*100) : 0;
  const breakEvenClients = totalCosts>0 ? Math.ceil(totalCosts/((PLAN_CFG.starter.price+PLAN_CFG.pro.price)/2)) : 0;
  const investmentLeft = Math.max(0,investment-mrr);

  // Distribuição por plano
  const planDist = Object.keys(PLAN_CFG).map(p=>({
    label:PLAN_CFG[p].label,
    v:tenants.filter(t=>t.plan===p).length,
    color:PLAN_CFG[p].c,
  }));

  // Novas contas por mês (últimos 6 meses)
  const now = new Date();
  const monthlyNew = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(),now.getMonth()-5+i,1);
    return {
      l:MONTHS[d.getMonth()],
      v:tenants.filter(t=>{
        const cd = new Date(t.created_at);
        return cd.getMonth()===d.getMonth()&&cd.getFullYear()===d.getFullYear();
      }).length,
    };
  });

  // Break even simulação
  const beSimulation = [1,2,3,5,10,15,20].map(n=>({
    clients:n,
    mrr:n*PLAN_CFG.starter.price,
    margin:(n*PLAN_CFG.starter.price)-totalCosts,
  }));

  // Funil de activação
  const funnel = [
    {l:"Conta criada",              v:tenants.length,                                          color:"#534AB7"},
    {l:"Empresas cadastradas",      v:tenants.filter(t=>(t.disc_companies?.[0]?.count||0)>0).length, color:"#185FA5"},
    {l:"Primeiro enriquecimento",   v:events.filter(e=>e.event_type==="company.enriched").reduce((acc,e)=>{acc.add(e.tenant_id);return acc;},new Set()).size, color:"#1D9E75"},
    {l:"Validação comercial",       v:events.filter(e=>e.event_type==="validation.submitted").reduce((acc,e)=>{acc.add(e.tenant_id);return acc;},new Set()).size, color:"#E8A020"},
    {l:"Acesso diário",             v:Math.round(tenants.length*0.4), color:"#854F0B"},
    {l:"Acesso semanal",            v:Math.round(tenants.length*0.6), color:"#3B6D11"},
    {l:"Interações (7d)",           v:events.filter(e=>new Date(e.created_at)>new Date(Date.now()-7*86400000)).reduce((acc,e)=>{acc.add(e.tenant_id);return acc;},new Set()).size, color:"#A32D2D"},
  ];
  const funnelMax = funnel[0].v||1;

  // Churn simulado (sem histórico real ainda)
  const churnRate = active.length>3 ? "4.2%" : "—";

  const S = {
    page:{padding:"0",maxWidth:1100,margin:"0 auto"},
    card:{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px"},
    metric:{background:"#f5f5f4",borderRadius:8,padding:"14px 16px"},
    mLabel:{fontSize:11,color:"#888",marginBottom:4},
    mVal:{fontSize:24,fontWeight:500},
    mSub:{fontSize:11,color:"#aaa",marginTop:2},
    th:{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:500,color:"#888",textTransform:"uppercase",letterSpacing:0.4,borderBottom:"0.5px solid #e5e5e5"},
    td:{padding:"10px 14px",fontSize:13,borderBottom:"0.5px solid #e5e5e5",color:"#1a1a1a"},
    btn:{padding:"6px 14px",borderRadius:7,border:"0.5px solid #ddd",background:"#fff",cursor:"pointer",fontSize:12,color:"#1a1a1a"},
    btnPrimary:{padding:"6px 14px",borderRadius:7,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:500},
    btnDanger:{padding:"6px 14px",borderRadius:7,border:"0.5px solid #f0c0c0",background:"#fff",cursor:"pointer",fontSize:12,color:"#A32D2D"},
    input:{padding:"7px 10px",borderRadius:7,border:"0.5px solid #ddd",fontSize:13,background:"#fff",color:"#1a1a1a",width:"100%"},
    label:{fontSize:11,color:"#888",display:"block",marginBottom:4},
    sTitle:{fontSize:14,fontWeight:500,marginBottom:14},
    grid2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14},
    grid4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12},
  };

  const tabs = [
    {k:"overview",l:"Visão Geral"},
    {k:"subscriptions",l:"Assinaturas"},
    {k:"margin",l:"Margem"},
    {k:"funnel",l:"Funil de Activação"},
    {k:"limits",l:"Limites & Custos IA"},
  ];

  return (
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:500,marginBottom:4}}>Admin ⚡</h1>
          <p style={{fontSize:13,color:"#888",margin:0}}>Visão global da plataforma Revora</p>
        </div>
        <button style={S.btn} onClick={loadAll}>↺ Actualizar</button>
      </div>

      {/* TABS */}
      <div style={{display:"flex",gap:0,borderBottom:"0.5px solid #e5e5e5",marginBottom:24}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"10px 16px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t.k?500:400,color:tab===t.k?"#1a1a1a":"#888",borderBottom:tab===t.k?"2px solid #1a1a1a":"2px solid transparent",marginBottom:-1}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ──────────────────────────────────────── */}
      {tab==="overview"&&(
        <div>
          {/* KPIs */}
          <div style={{...S.grid4,marginBottom:20}}>
            {[
              {l:"MRR Estimado",    v:fmt(mrr),           sub:active.length+" clientes pagos", color:"#3B6D11"},
              {l:"Contas Ativas",   v:active.length,       sub:`${trials.length} trials`,       color:"#185FA5"},
              {l:"Churn Rate",      v:churnRate,           sub:"últimos 30 dias",               color:"#A32D2D"},
              {l:"Trials Expirados",v:trials.filter(t=>t.plan_expires_at&&new Date(t.plan_expires_at)<new Date()).length, sub:"aguardam conversão", color:"#854F0B"},
            ].map(m=>(
              <div key={m.l} style={S.metric}>
                <div style={S.mLabel}>{m.l}</div>
                <div style={{...S.mVal,color:m.color}}>{loading?"—":m.v}</div>
                <div style={S.mSub}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={S.grid2}>
            {/* DISTRIBUIÇÃO POR PLANO */}
            <div style={S.card}>
              <p style={S.sTitle}>Distribuição por plano</p>
              {loading?<div style={{color:"#aaa",fontSize:13}}>A carregar...</div>:<DonutChart data={planDist}/>}
            </div>

            {/* NOVAS CONTAS POR MÊS */}
            <div style={S.card}>
              <p style={S.sTitle}>Novas contas por mês</p>
              {loading?<div style={{color:"#aaa",fontSize:13}}>A carregar...</div>:<BarChart data={monthlyNew} color="#534AB7"/>}
            </div>
          </div>
        </div>
      )}

      {/* ── ASSINATURAS ──────────────────────────────────────── */}
      {tab==="subscriptions"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <p style={S.sTitle}>Clientes ({tenants.length})</p>
          </div>
          <div style={{...S.card,padding:0,overflow:"hidden"}}>
            {loading?<div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>A carregar...</div>
            :tenants.length===0?<div style={{padding:40,textAlign:"center",color:"#888",fontSize:13}}>Sem clientes ainda.</div>
            :<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr>{["Cliente","Mercado","Plano","Status","Membros","Empresas","Criado","Acções"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {tenants.map((t,i)=>(
                  <tr key={t.id} style={{background:i%2===0?"transparent":"#fafaf9"}}>
                    <td style={{...S.td,fontWeight:500}}>
                      {t.name}
                      <span style={{display:"block",fontSize:10,color:"#aaa",fontWeight:400}}>{t.slug}</span>
                    </td>
                    <td style={S.td}>{{pt:"🇵🇹",es:"🇪🇸",br:"🇧🇷"}[t.market]||t.market}</td>
                    <td style={S.td}><Badge plan={t.plan}/></td>
                    <td style={S.td}><StatusDot active={t.active}/></td>
                    <td style={S.td}>{t.tenant_users?.[0]?.count||0}</td>
                    <td style={S.td}>{t.disc_companies?.[0]?.count||0}</td>
                    <td style={{...S.td,color:"#aaa"}}>{fmtD(t.created_at)}</td>
                    <td style={S.td}>
                      <div style={{display:"flex",gap:6}}>
                        <button style={S.btn} onClick={()=>setEditTenant({...t})}>Editar</button>
                        <button style={S.btnDanger} onClick={async()=>{
                          if(!confirm(`Apagar "${t.name}"?`))return;
                          await supabase.from("tenants").delete().eq("id",t.id);
                          loadAll();
                        }}>Apagar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>

          {/* EDIT TENANT MODAL */}
          {editTenant&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setEditTenant(null)}>
              <div style={{background:"#fff",borderRadius:16,padding:28,width:"100%",maxWidth:440}} onClick={e=>e.stopPropagation()}>
                <h3 style={{fontSize:16,fontWeight:500,marginBottom:20}}>Editar: {editTenant.name}</h3>
                <div style={{display:"grid",gap:12}}>
                  <div><label style={S.label}>Nome</label><input style={S.input} value={editTenant.name} onChange={e=>setEditTenant({...editTenant,name:e.target.value})}/></div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Plano</label>
                      <select style={S.input} value={editTenant.plan} onChange={e=>setEditTenant({...editTenant,plan:e.target.value})}>
                        {Object.keys(PLAN_CFG).map(p=><option key={p} value={p}>{PLAN_CFG[p].label}</option>)}
                      </select>
                    </div>
                    <div><label style={S.label}>Mercado</label>
                      <select style={S.input} value={editTenant.market} onChange={e=>setEditTenant({...editTenant,market:e.target.value})}>
                        <option value="pt">🇵🇹 Portugal</option>
                        <option value="es">🇪🇸 Espanha</option>
                        <option value="br">🇧🇷 Brasil</option>
                      </select>
                    </div>
                  </div>
                  <div style={S.grid2}>
                    <div><label style={S.label}>Módulo Discover</label>
                      <select style={S.input} value={editTenant.module_discover?"1":"0"} onChange={e=>setEditTenant({...editTenant,module_discover:e.target.value==="1"})}>
                        <option value="1">Activo</option><option value="0">Inactivo</option>
                      </select>
                    </div>
                    <div><label style={S.label}>Módulo Feedback</label>
                      <select style={S.input} value={editTenant.module_feedback?"1":"0"} onChange={e=>setEditTenant({...editTenant,module_feedback:e.target.value==="1"})}>
                        <option value="1">Activo</option><option value="0">Inactivo</option>
                      </select>
                    </div>
                  </div>
                  <div><label style={S.label}>Status</label>
                    <select style={S.input} value={editTenant.active?"1":"0"} onChange={e=>setEditTenant({...editTenant,active:e.target.value==="1"})}>
                      <option value="1">Ativo</option><option value="0">Pausado</option>
                    </select>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
                  <button style={S.btn} onClick={()=>setEditTenant(null)}>Cancelar</button>
                  <button style={S.btnPrimary} onClick={async()=>{
                    await supabase.from("tenants").update({name:editTenant.name,plan:editTenant.plan,market:editTenant.market,active:editTenant.active,module_discover:editTenant.module_discover,module_feedback:editTenant.module_feedback}).eq("id",editTenant.id);
                    setEditTenant(null);loadAll();
                  }}>Guardar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MARGEM ───────────────────────────────────────────── */}
      {tab==="margin"&&(
        <div>
          {/* KPIs MARGEM */}
          <div style={{...S.grid4,marginBottom:20}}>
            {[
              {l:"MRR actual",          v:fmt(mrr),       sub:"receita mensal",           color:"#3B6D11"},
              {l:"Custo mensal infra",  v:fmt(totalCosts), sub:`${costs.length} itens`,   color:"#185FA5"},
              {l:"Margem do mês",       v:fmt(margin),    sub:`${marginPct}% de margem`,  color:margin>=0?"#3B6D11":"#A32D2D"},
              {l:"Break-even",          v:breakEvenClients+" clientes", sub:"para cobrir custos", color:"#534AB7"},
            ].map(m=>(
              <div key={m.l} style={S.metric}>
                <div style={S.mLabel}>{m.l}</div>
                <div style={{...S.mVal,color:m.color}}>{m.v}</div>
                <div style={S.mSub}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={S.grid2}>
            {/* CUSTOS */}
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <p style={{...S.sTitle,margin:0}}>Custos de infraestrutura</p>
                <button style={S.btnPrimary} onClick={()=>setShowNewCost(true)}>+ Adicionar</button>
              </div>

              {costs.map(cost=>(
                <div key={cost.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"0.5px solid #f0f0f0"}}>
                  {editCost?.id===cost.id?(
                    <div style={{display:"flex",gap:8,flex:1,alignItems:"center",flexWrap:"wrap"}}>
                      <input style={{...S.input,width:120}} value={editCost.label} onChange={e=>setEditCost({...editCost,label:e.target.value})}/>
                      <input style={{...S.input,width:70}} type="number" value={editCost.amount} onChange={e=>setEditCost({...editCost,amount:e.target.value})} placeholder="€"/>
                      <select style={{...S.input,width:110}} value={editCost.frequency||"monthly"} onChange={e=>setEditCost({...editCost,frequency:e.target.value})}>
                        <option value="monthly">Mensal</option>
                        <option value="annual">Anual</option>
                        <option value="variable">Variável</option>
                        <option value="one_time">Único</option>
                      </select>
                      <button style={S.btnPrimary} onClick={()=>{saveCosts(costs.map(c=>c.id===editCost.id?editCost:c));setEditCost(null);}}>✓</button>
                      <button style={S.btn} onClick={()=>setEditCost(null)}>✕</button>
                    </div>
                  ):(
                    <>
                      <div>
                        <span style={{fontSize:13,fontWeight:500}}>{cost.label}</span>
                        <span style={{fontSize:11,color:"#aaa",marginLeft:8}}>{FREQ_LABELS[cost.frequency||"monthly"]?.l||"Mensal"}</span>
                        {cost.frequency==="annual"&&<span style={{fontSize:10,color:"#185FA5",marginLeft:6}}>({fmt(cost.amount)}/ano)</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{textAlign:"right"}}>
                          <span style={{fontSize:14,fontWeight:500}}>{fmt(toMonthly(cost))}</span>
                          <span style={{fontSize:10,color:"#aaa"}}>/mês</span>
                          {cost.frequency==="one_time"&&<span style={{fontSize:10,color:"#aaa",display:"block"}}>não recorrente</span>}
                        </div>
                        <button style={{...S.btn,padding:"3px 8px"}} onClick={()=>setEditCost({...cost})}>✏</button>
                        <button style={{...S.btnDanger,padding:"3px 8px"}} onClick={()=>saveCosts(costs.filter(c=>c.id!==cost.id))}>✕</button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {showNewCost&&(
                <div style={{marginTop:12,padding:12,background:"#f9f9f8",borderRadius:8}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px",gap:8,marginBottom:8}}>
                    <input style={S.input} placeholder="Nome do custo" value={newCost.label} onChange={e=>setNewCost({...newCost,label:e.target.value})}/>
                    <input style={S.input} type="number" placeholder="€" value={newCost.amount} onChange={e=>setNewCost({...newCost,amount:e.target.value})}/>
                    <select style={S.input} value={newCost.frequency} onChange={e=>setNewCost({...newCost,frequency:e.target.value})}>
                      <option value="monthly">Mensal</option>
                      <option value="annual">Anual</option>
                      <option value="variable">Variável</option>
                      <option value="one_time">Único</option>
                    </select>
                  </div>
                  {newCost.frequency==="annual"&&newCost.amount&&(
                    <p style={{fontSize:11,color:"#185FA5",marginBottom:8}}>≈ {fmt(Number(newCost.amount)/12)}/mês no cálculo de margem</p>
                  )}
                  {newCost.frequency==="one_time"&&(
                    <p style={{fontSize:11,color:"#aaa",marginBottom:8}}>Custo único — não entra no cálculo de margem mensal</p>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button style={S.btnPrimary} onClick={()=>{
                      if(!newCost.label)return;
                      saveCosts([...costs,{...newCost,id:Date.now(),amount:Number(newCost.amount)||0}]);
                      setNewCost({label:"",category:"infra",amount:"",frequency:"monthly"});
                      setShowNewCost(false);
                    }}>Adicionar</button>
                    <button style={S.btn} onClick={()=>setShowNewCost(false)}>Cancelar</button>
                  </div>
                </div>
              )}

              <div style={{marginTop:14,paddingTop:12,borderTop:"0.5px solid #e5e5e5"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,color:"#aaa"}}>Mensais fixos</span>
                  <span style={{fontSize:12,color:"#888"}}>{fmt(monthlyCosts)}/mês</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,color:"#aaa"}}>Anuais (÷12)</span>
                  <span style={{fontSize:12,color:"#888"}}>{fmt(annualCosts/12)}/mês</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,color:"#aaa"}}>Variáveis estimados</span>
                  <span style={{fontSize:12,color:"#888"}}>{fmt(variableCosts)}/mês</span>
                </div>
                {oneTimeCosts>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,color:"#aaa"}}>Únicos (não recorrentes)</span>
                    <span style={{fontSize:12,color:"#aaa"}}>{fmt(oneTimeCosts)}</span>
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"0.5px solid #e5e5e5",marginTop:4}}>
                  <span style={{fontSize:13,color:"#888",fontWeight:500}}>Total mensal efectivo</span>
                  <span style={{fontSize:15,fontWeight:500}}>{fmt(totalCosts)}/mês</span>
                </div>
              </div>
            </div>

            {/* BREAK EVEN SIMULATION */}
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <p style={{...S.sTitle,margin:0}}>Simulação Break-even</p>
              </div>
              <div style={{marginBottom:14}}>
                <label style={S.label}>Investimento a recuperar (€)</label>
                <input style={{...S.input,width:160}} type="number" value={investment} onChange={e=>saveInvestment(Number(e.target.value))} placeholder="0"/>
                {investment>0&&<p style={{fontSize:11,color:"#aaa",marginTop:4}}>Faltam {fmt(investmentLeft)} para recuperar o investimento</p>}
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr>{["Clientes","MRR","Margem","Status"].map(h=><th key={h} style={{...S.th,fontSize:10}}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {beSimulation.map(row=>{
                    const ok=row.margin>=0;const current=tenants.filter(t=>t.plan!=="trial").length===row.clients;
                    return(
                      <tr key={row.clients} style={{background:current?"#f0f7ff":ok?"transparent":"#fff8f8"}}>
                        <td style={{...S.td,fontWeight:current?600:400}}>{row.clients}{current&&" ← actual"}</td>
                        <td style={S.td}>{fmt(row.mrr)}</td>
                        <td style={{...S.td,color:ok?"#3B6D11":"#A32D2D",fontWeight:500}}>{fmt(row.margin)}</td>
                        <td style={S.td}><span style={{fontSize:10,fontWeight:500,color:ok?"#3B6D11":"#A32D2D"}}>{ok?"✓ positivo":"✗ negativo"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── FUNIL ────────────────────────────────────────────── */}
      {tab==="funnel"&&(
        <div>
          <div style={S.card}>
            <p style={S.sTitle}>Funil de activação</p>
            <p style={{fontSize:12,color:"#aaa",marginBottom:20}}>Percentagem de clientes que completaram cada etapa</p>
            {funnel.map((step,i)=>{
              const pct = funnelMax>0?Math.round((step.v/funnelMax)*100):0;
              return(
                <div key={i} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{width:20,height:20,borderRadius:"50%",background:step.color+"22",color:step.color,fontSize:10,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                      <span style={{fontSize:13,fontWeight:500}}>{step.l}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:13,fontWeight:500}}>{step.v}</span>
                      <span style={{fontSize:11,color:"#aaa",width:36,textAlign:"right"}}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{height:6,borderRadius:6,background:"#f0f0f0"}}>
                    <div style={{height:"100%",borderRadius:6,width:pct+"%",background:step.color,transition:"width 0.5s"}}/>
                  </div>
                  {i<funnel.length-1&&(
                    <p style={{fontSize:10,color:"#ddd",margin:"4px 0 0 28px"}}>
                      {funnel[i+1].v>0&&step.v>0?`${Math.round((funnel[i+1].v/step.v)*100)}% avançaram para próxima etapa`:""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* LOG DE EVENTOS RECENTES */}
          <div style={{...S.card,marginTop:16}}>
            <p style={S.sTitle}>Eventos recentes</p>
            {events.slice(0,20).map((ev,i)=>(
              <div key={ev.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"0.5px solid #f5f5f4"}}>
                <code style={{fontSize:11,background:"#f5f5f4",padding:"2px 6px",borderRadius:4,flexShrink:0}}>{ev.event_type}</code>
                <span style={{fontSize:11,color:"#aaa"}}>{ev.entity_type||"—"}</span>
                <span style={{marginLeft:"auto",fontSize:10,color:"#ccc"}}>{new Date(ev.created_at).toLocaleString("pt-PT")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* ── LIMITES & CUSTOS IA ──────────────────────────── */}
        {tab==="limits"&&(
          <div>
            {/* PLANOS E LIMITES */}
            <div style={{...S.card,marginBottom:20}}>
              <p style={{...S.sTitle}}>Limites por plano</p>
              <p style={{fontSize:12,color:"#aaa",marginBottom:16}}>Margem de segurança define quantas pesquisas reais o cliente pode fazer. Ex: 500 pesquisas × 60% = 300 permitidas.</p>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>{["Plano","Preço/mês","Pesquisas/mês","Margem %","Permitidas","Custo Google","Custo IA","Margem €",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(planLimits.length?planLimits:Object.entries(PLAN_CFG).map(([k,v])=>({plan:k,price_eur:v.price,searches_month:({trial:20,starter:200,pro:500,enterprise:2000})[k],margin_pct:0.6}))).map((pl,i)=>{
                    const allowed=Math.floor(pl.searches_month*(pl.margin_pct||0.6));
                    const costGoogle=(allowed*0.032).toFixed(2);
                    const costAI=(allowed*0.007).toFixed(2);
                    const totalCostPl=Number(costGoogle)+Number(costAI);
                    const marginEur=(pl.price_eur-totalCostPl-costs.reduce((s,c)=>s+toMonthly(c),0)).toFixed(0);
                    const isEditing=editPlan?.plan===pl.plan;
                    return(
                      <tr key={pl.plan} style={{background:i%2===0?"transparent":"#fafaf9"}}>
                        <td style={S.td}><Badge plan={pl.plan}/></td>
                        <td style={S.td}>€{pl.price_eur}</td>
                        <td style={S.td}>{isEditing?<input style={{...S.input,width:70}} type="number" value={editPlan.searches_month} onChange={e=>setEditPlan({...editPlan,searches_month:Number(e.target.value)})}/>:pl.searches_month}</td>
                        <td style={S.td}>{isEditing?<input style={{...S.input,width:60}} type="number" step="0.05" min="0.1" max="1" value={editPlan.margin_pct} onChange={e=>setEditPlan({...editPlan,margin_pct:Number(e.target.value)})}/>:`${Math.round((pl.margin_pct||0.6)*100)}%`}</td>
                        <td style={{...S.td,fontWeight:500}}>{allowed}</td>
                        <td style={{...S.td,color:"#888"}}>${costGoogle}</td>
                        <td style={{...S.td,color:"#888"}}>${costAI}</td>
                        <td style={{...S.td,fontWeight:500,color:Number(marginEur)>=0?"#3B6D11":"#A32D2D"}}>€{marginEur}</td>
                        <td style={S.td}>
                          {isEditing?(
                            <div style={{display:"flex",gap:6}}>
                              <button style={S.btnPrimary} onClick={async()=>{
                                await supabase.from("plan_limits").upsert({plan:editPlan.plan,searches_month:editPlan.searches_month,margin_pct:editPlan.margin_pct,price_eur:editPlan.price_eur},{onConflict:"plan"});
                                setEditPlan(null);loadAll();
                              }}>✓</button>
                              <button style={S.btn} onClick={()=>setEditPlan(null)}>✕</button>
                            </div>
                          ):(
                            <button style={S.btn} onClick={()=>setEditPlan({...pl})}>✏</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* USO POR TENANT */}
            <div style={S.card}>
              <p style={S.sTitle}>Uso actual por cliente</p>
              {usageSummaries.length===0?(
                <p style={{fontSize:13,color:"#aaa"}}>Sem dados de uso ainda.</p>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr>{["Cliente","Plano","Pesquisas","Permitidas","Uso %","Custo IA ($)","Estado","Reset"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {usageSummaries.map((u,i)=>{
                      const color=u.usage_status==="blocked"?"#A32D2D":u.usage_status==="warning"?"#854F0B":"#3B6D11";
                      return(
                        <tr key={u.tenant_id} style={{background:i%2===0?"transparent":"#fafaf9"}}>
                          <td style={{...S.td,fontWeight:500}}>{u.name}</td>
                          <td style={S.td}><Badge plan={u.plan}/></td>
                          <td style={S.td}>{u.cycle_searches||0}</td>
                          <td style={S.td}>{u.searches_allowed||0}</td>
                          <td style={S.td}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
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
                          <td style={{...S.td,color:"#aaa",fontSize:11}}>
                            {u.cycle_resets_at?new Date(u.cycle_resets_at).toLocaleDateString("pt-PT"):"—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
