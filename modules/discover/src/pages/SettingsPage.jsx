import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext.jsx";
import { supabase } from "../supabaseClient.js";

const S = {
  page:  { padding:"0", maxWidth:720, margin:"0 auto" },
  card:  { background:"#fff", border:"0.5px solid #e5e5e5", borderRadius:12, padding:"22px 24px", marginBottom:16 },
  title: { fontSize:14, fontWeight:500, marginBottom:6 },
  sub:   { fontSize:12, color:"#aaa", marginBottom:16 },
  label: { fontSize:11, color:"#888", display:"block", marginBottom:5 },
  input: { width:"100%", padding:"8px 12px", borderRadius:8, border:"0.5px solid #ddd", fontSize:13, background:"#fff", color:"#1a1a1a" },
  textarea: { width:"100%", padding:"8px 12px", borderRadius:8, border:"0.5px solid #ddd", fontSize:13, background:"#fff", color:"#1a1a1a", minHeight:80, resize:"vertical", fontFamily:"inherit" },
  btn:   { padding:"8px 18px", borderRadius:8, border:"none", background:"#1a1a1a", color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer" },
  btnSm: { padding:"5px 12px", borderRadius:6, border:"0.5px solid #ddd", background:"#fff", fontSize:12, cursor:"pointer", color:"#1a1a1a" },
  btnDanger: { padding:"5px 12px", borderRadius:6, border:"0.5px solid #f0c0c0", background:"#fff", fontSize:12, cursor:"pointer", color:"#A32D2D" },
  row:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:"0.5px solid #f5f5f4" },
  grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  ok:    { fontSize:12, color:"#3B6D11", background:"#EAF3DE", padding:"8px 12px", borderRadius:8, marginBottom:14 },
  err:   { fontSize:12, color:"#A32D2D", background:"#FCEBEB", padding:"8px 12px", borderRadius:8, marginBottom:14 },
};

const ROLE_LABELS = { admin:"Admin", manager:"Gestor", commercial:"Comercial" };
const ROLE_COLORS = {
  admin:      { c:"#534AB7", bg:"#EEEDFE" },
  manager:    { c:"#185FA5", bg:"#E6F1FB" },
  commercial: { c:"#888",    bg:"#F1EFE8" },
};

const WEIGHT_FIELDS = [
  { key:"score_weight_fit",       label:"Fit ao nicho",            desc:"Aderência ao segmento de mercado (keywords)",   color:"#534AB7" },
  { key:"score_weight_authority", label:"Authority",               desc:"Autoridade percebida — H1, descrição, LinkedIn", color:"#185FA5" },
  { key:"score_weight_digital",   label:"Presença digital",        desc:"Redes sociais, website, meta tags",             color:"#1D9E75" },
  { key:"score_weight_contact",   label:"Facilidade de contacto",  desc:"Email, telefone, WhatsApp, página de contacto", color:"#E8A020" },
];

export default function SettingsPage() {
  const { tenant, role, user, logEvent, impersonating } = useAuth();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("commercial");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const canManage = role === "admin" || role === "manager";

  // Context fields
  const [context, setContext]   = useState("");
  const [keywords, setKeywords] = useState("");
  const [aiCtx, setAiCtx]       = useState("");

  // Scoring weights
  const [weights, setWeights] = useState({
    score_weight_fit:       0.35,
    score_weight_authority: 0.25,
    score_weight_digital:   0.20,
    score_weight_contact:   0.20,
  });
  const totalWeight = Object.values(weights).reduce((a,b) => a + Number(b), 0);
  const weightsValid = Math.abs(totalWeight - 1) < 0.01;

  useEffect(() => {
    const tid = tenant?.id || impersonating?.tenant?.id;
    if (tid) {
      loadMembers();
      setContext(tenant.business_context || "");
      setKeywords((tenant.fit_keywords || []).join(", "));
      setAiCtx(tenant.ai_prompt_context || "");
      setWeights({
        score_weight_fit:       tenant.score_weight_fit       || 0.35,
        score_weight_authority: tenant.score_weight_authority || 0.25,
        score_weight_digital:   tenant.score_weight_digital   || 0.20,
        score_weight_contact:   tenant.score_weight_contact   || 0.20,
      });
    }
  }, [tenant]);

  async function loadMembers() {
    const tid = tenant?.id || impersonating?.tenant?.id;
    if (!tid) return;
    const { data, error } = await supabase
      .from("tenant_users")
      .select("*, profiles(id, full_name, email, avatar_url)")
      .eq("tenant_id", tid)
      .order("created_at", { ascending: true });
    if (error) console.error("[loadMembers]", error.message);
    setMembers(data || []);
  }

  async function saveConfig() {
    if (!weightsValid) { setMsg({ type:"err", text:"Os pesos têm de somar 100%." }); return; }
    setLoading(true); setMsg(null);
    const kwArray = keywords.split(",").map(k => k.trim()).filter(Boolean);
    const { error } = await supabase.from("tenants").update({
      business_context:    context,
      fit_keywords:        kwArray,
      ai_prompt_context:   aiCtx,
      score_weight_fit:       Number(weights.score_weight_fit),
      score_weight_authority: Number(weights.score_weight_authority),
      score_weight_digital:   Number(weights.score_weight_digital),
      score_weight_contact:   Number(weights.score_weight_contact),
    }).eq("id", tenant.id);
    if (error) setMsg({ type:"err", text:"Erro ao guardar." });
    else { await logEvent("config.updated", "tenant", tenant.id); setMsg({ type:"ok", text:"Configuração guardada! Novos enriquecimentos usarão os pesos actualizados." }); }
    setLoading(false);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setLoading(true); setMsg(null);
    const { error } = await supabase.from("invitations").insert({
      tenant_id:  tenant.id,
      email:      inviteEmail.trim(),
      role:       inviteRole,
      invited_by: user.id,
    });
    if (error) setMsg({ type:"err", text:"Erro: " + error.message });
    else {
      await logEvent("member.invited", "user", null, { email:inviteEmail, role:inviteRole });
      setMsg({ type:"ok", text:`Convite enviado para ${inviteEmail}` });
      setInviteEmail("");
    }
    setLoading(false);
  }

  async function removeMember(userId) {
    if (userId === user.id) return;
    await supabase.from("tenant_users").delete().eq("tenant_id", tenant.id).eq("user_id", userId);
    await logEvent("member.removed", "user", userId);
    loadMembers();
  }

  function setWeight(key, val) {
    const v = Math.min(1, Math.max(0, Number(val) / 100));
    setWeights(w => ({ ...w, [key]: v }));
  }

  if (!tenant) return <div style={{ padding:40, color:"#aaa", fontSize:13 }}>A carregar...</div>;

  return (
    <div style={S.page}>
      <h1 style={{ fontSize:20, fontWeight:500, marginBottom:4 }}>Configurações</h1>
      <p style={{ fontSize:13, color:"#888", marginBottom:24 }}>Workspace: <strong>{tenant.name}</strong></p>

      {msg && <div style={msg.type==="err" ? S.err : S.ok}>{msg.text}</div>}

      {/* CONTEXTO COMERCIAL */}
      {canManage && (
        <div style={S.card}>
          <p style={S.title}>Contexto comercial</p>
          <p style={S.sub}>A IA usa este contexto para calibrar cada análise de empresa.</p>

          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Descrição do negócio</label>
            <textarea style={S.textarea} value={context} onChange={e => setContext(e.target.value)}
              placeholder="Ex: Marca portuguesa de suplementos premium à procura de parceiros de revenda em ginásios, farmácias e lojas naturais."/>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={S.label}>Palavras-chave de fit (separadas por vírgula)</label>
            <input style={S.input} value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="ginásio, farmácia, nutricionista, loja natureza, parafarmácia, wellness"/>
            <p style={{ fontSize:11, color:"#aaa", marginTop:4 }}>
              Cada keyword que aparecer no site da empresa adiciona pontos ao Fit Score.
            </p>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Instrução extra para a IA</label>
            <textarea style={{ ...S.textarea, minHeight:60 }} value={aiCtx} onChange={e => setAiCtx(e.target.value)}
              placeholder="Ex: Avalia especialmente a capacidade de distribuição presencial e alinhamento com público fitness/wellness."/>
          </div>
        </div>
      )}

      {/* PESOS DE SCORING */}
      {canManage && (
        <div style={S.card}>
          <p style={S.title}>Pesos de scoring</p>
          <p style={S.sub}>Define o que mais importa para o teu ICP. Total tem de somar 100%.</p>

          {WEIGHT_FIELDS.map(f => (
            <div key={f.key} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:500, color:"#1a1a1a" }}>{f.label}</span>
                  <p style={{ fontSize:11, color:"#aaa", margin:"2px 0 0" }}>{f.desc}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                  <input
                    type="number" min="0" max="100" step="5"
                    value={Math.round(Number(weights[f.key]) * 100)}
                    onChange={e => setWeight(f.key, e.target.value)}
                    style={{ ...S.input, width:64, textAlign:"center", padding:"6px 8px" }}
                  />
                  <span style={{ fontSize:12, color:"#aaa" }}>%</span>
                </div>
              </div>
              <div style={{ height:6, borderRadius:6, background:"#f0f0f0", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:6, width:(Number(weights[f.key])*100)+"%", background:f.color, transition:"width 0.3s" }}/>
              </div>
            </div>
          ))}

          {/* Total indicator */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:8, background:weightsValid?"#EAF3DE":"#FCEBEB" }}>
            <span style={{ fontSize:13, fontWeight:500, color:weightsValid?"#3B6D11":"#A32D2D" }}>
              Total: {Math.round(totalWeight * 100)}%
            </span>
            <span style={{ fontSize:12, color:weightsValid?"#3B6D11":"#A32D2D" }}>
              {weightsValid ? "✓ Correcto" : `Faltam ${Math.round((1-totalWeight)*100)}% para 100%`}
            </span>
          </div>

          <div style={{ marginTop:16 }}>
            <button style={{ ...S.btn, opacity:(!weightsValid||loading)?0.5:1 }} onClick={saveConfig} disabled={!weightsValid||loading}>
              {loading ? "A guardar..." : "Guardar configuração"}
            </button>
          </div>
        </div>
      )}

      {/* MEMBROS */}
      <div style={S.card}>
        <p style={{ ...S.title, marginBottom:14 }}>Membros da equipa</p>
        {members.length === 0 && (
          <p style={{ fontSize:13, color:"#aaa", padding:"10px 0" }}>Sem membros ainda.</p>
        )}
        {members.map(m => {
          const rc   = ROLE_COLORS[m.role] || ROLE_COLORS.commercial;
          const name = m.profiles?.full_name || m.profiles?.email || "Sem nome";
          const email = m.profiles?.email || m.user_id?.slice(0,8) + "...";
          const isCurrentUser = m.user_id === user?.id;
          return (
            <div key={m.id} style={S.row}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"#f0f0f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, color:"#888", flexShrink:0 }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:500, margin:0 }}>
                    {name} {isCurrentUser && <span style={{ fontSize:10, color:"#aaa" }}>(tu)</span>}
                  </p>
                  <p style={{ fontSize:11, color:"#aaa", margin:0 }}>{email}</p>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ background:rc.bg, color:rc.c, padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:500 }}>
                  {ROLE_LABELS[m.role] || m.role}
                </span>
                {(role === "admin" || role === "manager") && !isCurrentUser && (
                  <button style={S.btnDanger} onClick={() => removeMember(m.user_id)}>Remover</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONVIDAR */}
      {canManage && (
        <div style={S.card}>
          <p style={{ ...S.title, marginBottom:14 }}>Convidar membro</p>
          <div style={{ display:"flex", gap:10 }}>
            <input style={{ ...S.input, flex:1 }} type="email"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@empresa.com"/>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              style={{ ...S.input, width:130 }}>
              <option value="commercial">Comercial</option>
              <option value="manager">Gestor</option>
            </select>
            <button style={S.btn} onClick={sendInvite} disabled={loading}>Convidar</button>
          </div>
          <p style={{ fontSize:11, color:"#aaa", marginTop:8 }}>
            O convite expira em 7 dias.
          </p>
        </div>
      )}

      {/* PLANO */}
      <div style={S.card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ ...S.title, marginBottom:2 }}>Plano actual</p>
            <p style={{ fontSize:18, fontWeight:600, margin:0, textTransform:"capitalize" }}>{tenant.plan}</p>
            <p style={{ fontSize:12, color:"#aaa", marginTop:4 }}>
              {tenant.plan === "trial" ? "Período de avaliação gratuita." : "Plano activo."}
            </p>
          </div>
          {tenant.plan === "trial" && (
            <button style={{ ...S.btn, background:"#534AB7" }}>Upgrade</button>
          )}
        </div>
      </div>
    </div>
  );
}
