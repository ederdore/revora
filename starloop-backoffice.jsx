import { useState } from "react";

// ─────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────
const C = {
  bg:        "#060608",
  surface:   "#0D0D12",
  card:      "#111118",
  border:    "#1A1A26",
  borderHi:  "#252535",
  accent:    "#00E5A0",
  accentDim: "rgba(0,229,160,0.08)",
  accentMid: "rgba(0,229,160,0.18)",
  purple:    "#8B5CF6",
  purpleDim: "rgba(139,92,246,0.12)",
  yellow:    "#F59E0B",
  red:       "#EF4444",
  redDim:    "rgba(239,68,68,0.10)",
  blue:      "#3B82F6",
  text:      "#EEEEF5",
  sub:       "#9090A8",
  muted:     "#45455A",
};

// ─────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────
const MOCK_TENANTS = [
  {
    id: "t1", name: "Salão Bella Vita", segment: "Salão de Beleza", avatar: "✂️",
    email: "bella@vita.com.br", phone: "11999990001", country: "🇧🇷",
    plan: "pro", status: "active",
    mrr: 197, clients: 248, reviews: 184, conversion: 74,
    createdAt: "2025-01-12", lastActive: "2025-05-27",
    coupon: "VOLTA15",
  },
  {
    id: "t2", name: "AutoPrime Veículos", segment: "Loja de Carros", avatar: "🚗",
    email: "contato@autoprime.it", phone: "39334567890", country: "🇮🇹",
    plan: "starter", status: "active",
    mrr: 97, clients: 91, reviews: 53, conversion: 58,
    createdAt: "2025-02-20", lastActive: "2025-05-26",
    coupon: "REVISAO100",
  },
  {
    id: "t3", name: "AquaWorld Lisboa", segment: "Loja de Aquários", avatar: "🐠",
    email: "geral@aquaworld.pt", phone: "351912345678", country: "🇵🇹",
    plan: "pro", status: "active",
    mrr: 197, clients: 63, reviews: 47, conversion: 75,
    createdAt: "2025-03-05", lastActive: "2025-05-25",
    coupon: "PEIXE10",
  },
  {
    id: "t4", name: "Barbearia do Zé", segment: "Barbearia", avatar: "💈",
    email: "ze@barbearia.com.br", phone: "21988887777", country: "🇧🇷",
    plan: "starter", status: "trial",
    mrr: 0, clients: 14, reviews: 9, conversion: 64,
    createdAt: "2025-05-20", lastActive: "2025-05-27",
    coupon: "CORTE5",
  },
  {
    id: "t5", name: "Clínica VetCare", segment: "Clínica Veterinária", avatar: "🐾",
    email: "vet@vetcare.com.br", phone: "11977776666", country: "🇧🇷",
    plan: "pro", status: "blocked",
    mrr: 197, clients: 120, reviews: 88, conversion: 73,
    createdAt: "2024-11-10", lastActive: "2025-04-01",
    coupon: "PET10",
  },
  {
    id: "t6", name: "Pizzeria Romano", segment: "Restaurante", avatar: "🍕",
    email: "romano@pizza.it", phone: "39345678901", country: "🇮🇹",
    plan: "starter", status: "active",
    mrr: 97, clients: 189, reviews: 141, conversion: 75,
    createdAt: "2025-01-30", lastActive: "2025-05-27",
    coupon: "PIZZA5",
  },
];

const PLAN_MAP = {
  starter: { label: "Starter", color: C.blue,   bg: "rgba(59,130,246,0.12)"  },
  pro:     { label: "Pro",     color: C.purple,  bg: C.purpleDim              },
};
const STATUS_MAP = {
  active:  { label: "Ativo",    color: C.accent, bg: C.accentDim },
  trial:   { label: "Trial",   color: C.yellow,  bg: "rgba(245,158,11,0.12)" },
  blocked: { label: "Bloqueado", color: C.red,   bg: C.redDim    },
};

// ─────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────
function Badge({ type, map }) {
  const s = map[type] || map.active;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px",
      borderRadius:20, fontSize:11, fontWeight:700, color:s.color, background:s.bg,
      border:`1px solid ${s.color}30`, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:s.color }} />
      {s.label}
    </span>
  );
}

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px",
      display:"flex", flexDirection:"column", gap:6, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:-10, right:-10, fontSize:48, opacity:0.06 }}>{icon}</div>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:900, color: color || C.text, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:C.sub }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:C.muted }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, color }) {
  return (
    <div style={{ width:"100%", height:4, background:C.border, borderRadius:4, overflow:"hidden" }}>
      <div style={{ width:`${Math.min((value/max)*100,100)}%`, height:"100%",
        background:color, borderRadius:4, transition:"width 0.6s ease" }} />
    </div>
  );
}

function Avatar({ name, emoji, size = 38 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:10, flexShrink:0,
      background:`linear-gradient(135deg,${C.purple}44,${C.accent}44)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.45, border:`1px solid ${C.borderHi}` }}>
      {emoji || name?.charAt(0)}
    </div>
  );
}

// ─────────────────────────────────────────────
// TENANT DETAIL DRAWER
// ─────────────────────────────────────────────
function TenantDrawer({ tenant, onClose, onUpdate }) {
  const [t, setT] = useState({ ...tenant });
  const [tab, setTab] = useState("overview");

  const save = () => { onUpdate(t); onClose(); };

  const Field = ({ label, value, onChange, type = "text" }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase",
        letterSpacing:0.8, display:"block", marginBottom:5 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:`1.5px solid ${C.border}`,
          background:C.surface, color:C.text, fontSize:13, outline:"none",
          boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = C.accent}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex" }}>
      <div onClick={onClose} style={{ flex:1, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)" }} />
      <div style={{ width:420, background:C.surface, borderLeft:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", overflowY:"auto",
        animation:"slideIn 0.25s ease" }}>

        {/* Drawer header */}
        <div style={{ padding:"20px 22px 0", display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", borderBottom:`1px solid ${C.border}`, paddingBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Avatar name={t.name} emoji={t.avatar} size={44} />
            <div>
              <div style={{ fontWeight:800, fontSize:16, color:C.text }}>{t.name}</div>
              <div style={{ fontSize:12, color:C.sub }}>{t.country} {t.segment}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted,
            fontSize:20, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        {/* Status + plan controls */}
        <div style={{ padding:"16px 22px", display:"flex", gap:10, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Status</div>
            <select value={t.status} onChange={e => setT({...t, status:e.target.value})}
              style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1.5px solid ${C.border}`,
                background:C.surface, color:C.text, fontSize:12, fontWeight:700, cursor:"pointer",
                outline:"none", fontFamily:"inherit" }}>
              <option value="active">✅ Ativo</option>
              <option value="trial">⏳ Trial</option>
              <option value="blocked">🚫 Bloqueado</option>
            </select>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Plano</div>
            <select value={t.plan} onChange={e => setT({...t, plan:e.target.value})}
              style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1.5px solid ${C.border}`,
                background:C.surface, color:C.text, fontSize:12, fontWeight:700, cursor:"pointer",
                outline:"none", fontFamily:"inherit" }}>
              <option value="trial">🆓 Trial</option>
              <option value="starter">🔵 Starter</option>
              <option value="pro">🟣 Pro</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, padding:"0 22px" }}>
          {["overview", "config", "activity"].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              padding:"12px 14px", border:"none", background:"none", cursor:"pointer",
              fontSize:12, fontWeight:700, textTransform:"capitalize",
              color: tab===tb ? C.accent : C.muted,
              borderBottom: tab===tb ? `2px solid ${C.accent}` : "2px solid transparent",
              marginBottom:-1,
            }}>
              {tb === "overview" ? "Visão Geral" : tb === "config" ? "Configurações" : "Atividade"}
            </button>
          ))}
        </div>

        <div style={{ padding:"20px 22px", flex:1 }}>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { icon:"👥", label:"Clientes",   value:t.clients,    color:C.text },
                  { icon:"⭐", label:"Avaliações", value:t.reviews,    color:C.yellow },
                  { icon:"📈", label:"Conversão",  value:`${t.conversion}%`, color:C.accent },
                  { icon:"💰", label:"MRR",        value: t.mrr ? `R$${t.mrr}` : "–", color:C.purple },
                ].map(k => (
                  <div key={k.label} style={{ background:C.card, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:k.color }}>{k.value}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{k.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10,
                padding:"14px 16px", marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.sub, marginBottom:12 }}>Informações</div>
                {[
                  { l:"Email",       v: t.email },
                  { l:"Telefone",    v: t.phone },
                  { l:"País",        v: t.country },
                  { l:"Desde",       v: t.createdAt },
                  { l:"Último acesso", v: t.lastActive },
                ].map(i => (
                  <div key={i.l} style={{ display:"flex", justifyContent:"space-between",
                    padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:12, color:C.muted }}>{i.l}</span>
                    <span style={{ fontSize:12, color:C.text, fontWeight:600 }}>{i.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFIG TAB */}
          {tab === "config" && (
            <div>
              <Field label="Nome da empresa" value={t.name} onChange={v => setT({...t,name:v})} />
              <Field label="Segmento" value={t.segment} onChange={v => setT({...t,segment:v})} />
              <Field label="Email" value={t.email} onChange={v => setT({...t,email:v})} type="email" />
              <Field label="Telefone" value={t.phone} onChange={v => setT({...t,phone:v})} type="tel" />
              <Field label="Código do cupom" value={t.coupon} onChange={v => setT({...t,coupon:v})} />
            </div>
          )}

          {/* ACTIVITY TAB */}
          {tab === "activity" && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.sub, marginBottom:12 }}>Histórico de eventos</div>
              {[
                { date:"27/05/2025 14:32", event:"Cliente cadastrado", detail:"João Silva — Corte" },
                { date:"27/05/2025 13:10", event:"Avaliação recebida", detail:"⭐⭐⭐⭐⭐ — Ana Paula" },
                { date:"26/05/2025 18:44", event:"Nota baixa ⚠️",     detail:"⭐⭐ — Marcos Lima" },
                { date:"26/05/2025 11:20", event:"Cupom resgatado",    detail:"VOLTA15 — Carla Mendes" },
                { date:"25/05/2025 09:05", event:"Avaliação recebida", detail:"⭐⭐⭐⭐⭐ — Pedro Alves" },
              ].map((ev, i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"10px 0",
                  borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:C.accent,
                    marginTop:5, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{ev.event}</div>
                    <div style={{ fontSize:11, color:C.sub }}>{ev.detail}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{ev.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding:"16px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10 }}>
          {t.status !== "blocked" ? (
            <button onClick={() => setT({...t,status:"blocked"})}
              style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${C.red}44`,
                background:C.redDim, color:C.red, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              🚫 Bloquear
            </button>
          ) : (
            <button onClick={() => setT({...t,status:"active"})}
              style={{ flex:1, padding:"10px", borderRadius:9, border:`1px solid ${C.accent}44`,
                background:C.accentDim, color:C.accent, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              ✅ Reativar
            </button>
          )}
          <button onClick={save}
            style={{ flex:2, padding:"10px", borderRadius:9, border:"none",
              background:`linear-gradient(135deg,${C.accent},#00B37E)`,
              color:"#060608", fontSize:13, fontWeight:800, cursor:"pointer" }}>
            ✓ Salvar alterações
          </button>
        </div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN — BACK-OFFICE
// ─────────────────────────────────────────────
export default function BackOffice() {
  const [tenants, setTenants] = useState(MOCK_TENANTS);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [activeSection, setActiveSection] = useState("tenants");

  const updateTenant = (updated) => {
    setTenants(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.segment.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPlan = filterPlan === "all" || t.plan === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const totalMRR = tenants.filter(t => t.status === "active").reduce((s, t) => s + t.mrr, 0);
  const active = tenants.filter(t => t.status === "active").length;
  const trial = tenants.filter(t => t.status === "trial").length;
  const blocked = tenants.filter(t => t.status === "blocked").length;
  const totalReviews = tenants.reduce((s, t) => s + t.reviews, 0);

  const NAV = [
    { key:"tenants",   icon:"🏢", label:"Clientes" },
    { key:"metrics",   icon:"📊", label:"Métricas" },
    { key:"billing",   icon:"💰", label:"Faturamento" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text,
      fontFamily:"'DM Sans', system-ui", display:"flex", flexDirection:"column" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap" rel="stylesheet" />

      {/* TOP NAV */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`,
        padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between",
        height:52, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:`linear-gradient(135deg,${C.accent},#00B37E)`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⭐</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:16, letterSpacing:-0.5 }}>StarLoop</span>
          <span style={{ fontSize:10, background:C.purpleDim, color:C.purple, padding:"2px 8px",
            borderRadius:20, fontWeight:700, border:`1px solid ${C.purple}33` }}>Admin</span>
        </div>

        <div style={{ display:"flex", gap:4 }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => setActiveSection(n.key)} style={{
              padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:700, transition:"all 0.15s",
              background: activeSection===n.key ? C.border : "transparent",
              color: activeSection===n.key ? C.text : C.muted,
            }}>{n.icon} {n.label}</button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:"50%",
            background:`linear-gradient(135deg,${C.purple},${C.accent})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:12, fontWeight:800 }}>A</div>
          <span style={{ fontSize:12, color:C.sub }}>Admin</span>
        </div>
      </div>

      <div style={{ flex:1, padding:"24px", maxWidth:1100, margin:"0 auto", width:"100%" }}>

        {/* ══ TENANTS SECTION ══ */}
        {activeSection === "tenants" && (
          <>
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
              <KpiCard icon="🏢" label="Total Clientes" value={tenants.length} color={C.text} />
              <KpiCard icon="✅" label="Ativos" value={active} color={C.accent}
                sub={`${trial} em trial · ${blocked} bloqueados`} />
              <KpiCard icon="💰" label="MRR" value={`R$${totalMRR.toLocaleString()}`} color={C.purple} />
              <KpiCard icon="⭐" label="Avaliações geradas" value={totalReviews.toLocaleString()} color={C.yellow} />
            </div>

            {/* Filters */}
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200, position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
                  fontSize:13, color:C.muted }}>🔍</span>
                <input placeholder="Buscar por nome, email, segmento..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px 9px 34px", borderRadius:9,
                    border:`1.5px solid ${C.border}`, background:C.card, color:C.text,
                    fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {[
                { label:"Status", value:filterStatus, onChange:setFilterStatus,
                  options:[{v:"all",l:"Todos status"},{v:"active",l:"✅ Ativo"},{v:"trial",l:"⏳ Trial"},{v:"blocked",l:"🚫 Bloqueado"}] },
                { label:"Plano", value:filterPlan, onChange:setFilterPlan,
                  options:[{v:"all",l:"Todos planos"},{v:"starter",l:"🔵 Starter"},{v:"pro",l:"🟣 Pro"}] },
              ].map(f => (
                <select key={f.label} value={f.value} onChange={e => f.onChange(e.target.value)}
                  style={{ padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`,
                    background:C.card, color:C.text, fontSize:12, fontWeight:600,
                    cursor:"pointer", outline:"none", fontFamily:"inherit" }}>
                  {f.options.map(o => <option key={o.v} value={o.v} style={{ background:C.card }}>{o.l}</option>)}
                </select>
              ))}

              <button style={{ padding:"9px 16px", borderRadius:9, border:"none",
                background:`linear-gradient(135deg,${C.accent},#00B37E)`,
                color:"#060608", fontSize:12, fontWeight:800, cursor:"pointer" }}>
                + Novo Cliente
              </button>
            </div>

            {/* Table */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
              {/* Table header */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 80px",
                padding:"10px 18px", borderBottom:`1px solid ${C.border}`,
                fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>
                <span>Empresa</span>
                <span>Plano</span>
                <span>Status</span>
                <span>Clientes</span>
                <span>MRR</span>
                <span>Ação</span>
              </div>

              {filtered.map((t, i) => (
                <div key={t.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 80px",
                  padding:"12px 18px", borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : "none",
                  alignItems:"center", transition:"background 0.15s", cursor:"pointer",
                  background:"transparent" }}
                  onMouseOver={e => e.currentTarget.style.background = C.surface}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setSelected(t)}>

                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <Avatar name={t.name} emoji={t.avatar} size={34} />
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{t.name}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{t.country} {t.email}</div>
                    </div>
                  </div>

                  <Badge type={t.plan} map={PLAN_MAP} />
                  <Badge type={t.status} map={STATUS_MAP} />

                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{t.clients}</div>
                    <MiniBar value={t.reviews} max={t.clients} color={C.accent} />
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{t.conversion}% conv.</div>
                  </div>

                  <div style={{ fontSize:14, fontWeight:800,
                    color: t.mrr > 0 ? C.accent : C.muted }}>
                    {t.mrr > 0 ? `R$${t.mrr}` : "–"}
                  </div>

                  <button onClick={e => { e.stopPropagation(); setSelected(t); }}
                    style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${C.borderHi}`,
                      background:"transparent", color:C.sub, fontSize:11, fontWeight:700,
                      cursor:"pointer", transition:"all 0.15s" }}
                    onMouseOver={e => { e.target.style.borderColor=C.accent; e.target.style.color=C.accent; }}
                    onMouseOut={e => { e.target.style.borderColor=C.borderHi; e.target.style.color=C.sub; }}>
                    Ver →
                  </button>
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ padding:"40px", textAlign:"center", color:C.muted, fontSize:13 }}>
                  Nenhum resultado encontrado
                </div>
              )}
            </div>

            <div style={{ fontSize:11, color:C.muted, marginTop:10, textAlign:"right" }}>
              {filtered.length} de {tenants.length} clientes
            </div>
          </>
        )}

        {/* ══ METRICS SECTION ══ */}
        {activeSection === "metrics" && (
          <>
            <h2 style={{ margin:"0 0 20px", fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:900 }}>Métricas</h2>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
              {[
                { icon:"🇧🇷", label:"Brasil", clients: tenants.filter(t=>t.country==="🇧🇷").length, mrr: tenants.filter(t=>t.country==="🇧🇷").reduce((s,t)=>s+t.mrr,0) },
                { icon:"🇵🇹", label:"Portugal", clients: tenants.filter(t=>t.country==="🇵🇹").length, mrr: tenants.filter(t=>t.country==="🇵🇹").reduce((s,t)=>s+t.mrr,0) },
                { icon:"🇮🇹", label:"Itália", clients: tenants.filter(t=>t.country==="🇮🇹").length, mrr: tenants.filter(t=>t.country==="🇮🇹").reduce((s,t)=>s+t.mrr,0) },
              ].map(m => (
                <div key={m.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>{m.icon}</div>
                  <div style={{ fontSize:24, fontWeight:900, color:C.accent }}>{m.clients}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{m.label} · R${m.mrr}/mês</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {/* Plan distribution */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Distribuição por Plano</div>
                {[
                  { plan:"pro", count: tenants.filter(t=>t.plan==="pro").length },
                  { plan:"starter", count: tenants.filter(t=>t.plan==="starter").length },
                  { plan:"trial", count: tenants.filter(t=>t.status==="trial").length },
                ].map(p => (
                  <div key={p.plan} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.sub, textTransform:"capitalize" }}>{p.plan}</span>
                      <span style={{ fontSize:12, fontWeight:700 }}>{p.count}</span>
                    </div>
                    <MiniBar value={p.count} max={tenants.length}
                      color={p.plan==="pro"?C.purple:p.plan==="starter"?C.blue:C.yellow} />
                  </div>
                ))}
              </div>

              {/* Reviews by segment */}
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Avaliações por Cliente</div>
                {tenants.sort((a,b)=>b.reviews-a.reviews).slice(0,5).map(t => (
                  <div key={t.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:C.sub }}>{t.avatar} {t.name.split(" ")[0]}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.yellow }}>⭐{t.reviews}</span>
                    </div>
                    <MiniBar value={t.reviews} max={250} color={C.yellow} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ BILLING SECTION ══ */}
        {activeSection === "billing" && (
          <>
            <h2 style={{ margin:"0 0 20px", fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:900 }}>Faturamento</h2>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
              <KpiCard icon="💰" label="MRR Atual" value={`R$${totalMRR}`} color={C.accent}
                sub={`${active} clientes ativos`} />
              <KpiCard icon="📅" label="ARR Estimado" value={`R$${totalMRR*12}`} color={C.purple} />
              <KpiCard icon="🎯" label="Ticket Médio" value={active ? `R$${Math.round(totalMRR/active)}` : "–"} color={C.yellow} />
            </div>

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}`,
                fontSize:13, fontWeight:700 }}>Clientes Ativos — Receita</div>
              {tenants.filter(t => t.status === "active").map((t, i, arr) => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"12px 18px", borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : "none" }}>
                  <Avatar name={t.name} emoji={t.avatar} size={34} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{t.name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{t.country} · {t.email}</div>
                  </div>
                  <Badge type={t.plan} map={PLAN_MAP} />
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:15, fontWeight:800, color:C.accent }}>R${t.mrr}/mês</div>
                    <div style={{ fontSize:10, color:C.muted }}>desde {t.createdAt}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* DRAWER */}
      {selected && (
        <TenantDrawer
          tenant={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateTenant}
        />
      )}
    </div>
  );
}
