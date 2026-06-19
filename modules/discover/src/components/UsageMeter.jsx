import { useState, useEffect } from "react";
import { getUsageSummary } from "../lib/usage.js";

export function UsageMeterNav({ tenantId }) {
  const [usage, setUsage] = useState(null);
  useEffect(()=>{if(tenantId)getUsageSummary(tenantId).then(setUsage);},[tenantId]);
  if(!usage)return null;
  const pct=Number(usage.usage_pct||0);
  const color=usage.usage_status==="blocked"?"#A32D2D":usage.usage_status==="warning"?"#854F0B":"#3B6D11";
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"#f5f5f4",borderRadius:6}}>
      <div style={{width:56,height:4,borderRadius:4,background:"#e5e5e5",overflow:"hidden"}}>
        <div style={{height:"100%",width:Math.min(100,pct)+"%",background:color,borderRadius:4,transition:"width 0.3s"}}/>
      </div>
      <span style={{fontSize:11,color,fontWeight:500,whiteSpace:"nowrap"}}>
        {usage.cycle_searches||0}/{usage.searches_allowed||0}
        {usage.usage_status==="blocked"&&" 🔒"}
        {usage.usage_status==="warning"&&" ⚠"}
      </span>
    </div>
  );
}

export function UsageMeterFull({ tenantId }) {
  const [usage, setUsage] = useState(null);
  useEffect(()=>{if(tenantId)getUsageSummary(tenantId).then(setUsage);},[tenantId]);
  if(!usage)return(
    <div style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px"}}>
      <p style={{fontSize:13,color:"#aaa",margin:0}}>A carregar uso...</p>
    </div>
  );
  const pct=Number(usage.usage_pct||0);
  const isBlocked=usage.usage_status==="blocked";
  const isWarning=usage.usage_status==="warning";
  const color=isBlocked?"#A32D2D":isWarning?"#854F0B":"#3B6D11";
  const bgColor=isBlocked?"#FCEBEB":isWarning?"#FAEEDA":"#EAF3DE";
  const resetDate=usage.cycle_resets_at?new Date(usage.cycle_resets_at).toLocaleDateString("pt-PT",{day:"numeric",month:"long"}):"—";
  return(
    <div style={{background:"#fff",border:"0.5px solid #e5e5e5",borderRadius:12,padding:"20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <p style={{fontSize:13,fontWeight:500,margin:0}}>Uso do ciclo actual</p>
        <span style={{fontSize:11,color:"#aaa"}}>Renova {resetDate}</span>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
          <span style={{color:"#888"}}>Pesquisas utilizadas</span>
          <span style={{fontWeight:500,color}}>{usage.cycle_searches||0} / {usage.searches_allowed||0}</span>
        </div>
        <div style={{height:8,borderRadius:8,background:"#f0f0f0",overflow:"hidden"}}>
          <div style={{height:"100%",width:Math.min(100,pct)+"%",background:color,borderRadius:8,transition:"width 0.5s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#ccc",marginTop:4}}>
          <span>0</span>
          <span>limite do plano: {usage.searches_limit||"—"}</span>
          <span>{usage.searches_allowed||0}</span>
        </div>
      </div>
      {(isBlocked||isWarning)&&(
        <div style={{background:bgColor,borderRadius:8,padding:"10px 14px",marginBottom:14}}>
          <p style={{fontSize:12,color,fontWeight:500,margin:"0 0 3px"}}>{isBlocked?"🔒 Limite atingido":"⚠ A aproximar do limite"}</p>
          <p style={{fontSize:11,color,margin:0}}>
            {isBlocked
              ?`Pesquisas suspensas. Upload CSV continua disponível. Renova em ${resetDate} ou faça upgrade.`
              :`Restam ${(usage.searches_allowed||0)-(usage.cycle_searches||0)} pesquisas. Considere upgrade para continuar sem interrupção.`}
          </p>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Pesquisas",v:usage.cycle_searches||0,icon:"🗺"},
          {l:"Análise IA",v:usage.cycle_ai_calls||0,icon:"🤖"},
          {l:"Custo mês",v:"$"+Number(usage.cycle_cost_usd||0).toFixed(3),icon:"💰"},
        ].map(m=>(
          <div key={m.l} style={{background:"#f9f9f8",borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:16,marginBottom:3}}>{m.icon}</div>
            <div style={{fontSize:14,fontWeight:500}}>{m.v}</div>
            <div style={{fontSize:10,color:"#aaa"}}>{m.l}</div>
          </div>
        ))}
      </div>
      <p style={{fontSize:11,color:"#aaa",margin:0,textAlign:"center"}}>📂 Upload CSV sempre disponível · sem limite</p>
    </div>
  );
}
