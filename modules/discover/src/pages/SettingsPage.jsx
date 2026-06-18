import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext.jsx";
import { supabase } from "../supabaseClient.js";

const s = {
  page: { padding: "32px 24px", maxWidth: 800, margin: "0 auto" },
  h1: { fontSize: 20, fontWeight: 500, marginBottom: 6 },
  sub: { fontSize: 13, color: "#888", marginBottom: 32 },
  section: { background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "24px", marginBottom: 20 },
  sTitle: { fontSize: 14, fontWeight: 500, marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: "#888", marginBottom: 5 },
  input: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, background: "#fff", color: "#1a1a1a", marginBottom: 14 },
  textarea: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, background: "#fff", color: "#1a1a1a", marginBottom: 14, minHeight: 80, resize: "vertical" },
  btn: { padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" },
  btnSm: { padding: "5px 12px", borderRadius: 6, border: "0.5px solid #ddd", background: "#fff", fontSize: 12, cursor: "pointer", color: "#1a1a1a" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid #f0f0f0" },
  badge: (c, bg) => ({ background: bg, color: c, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500 }),
  err: { fontSize: 12, color: "#A32D2D", background: "#FCEBEB", padding: "8px 12px", borderRadius: 8, marginBottom: 14 },
  ok: { fontSize: 12, color: "#3B6D11", background: "#EAF3DE", padding: "8px 12px", borderRadius: 8, marginBottom: 14 },
};

const ROLE_LABELS = { admin: "Admin", manager: "Gestor", commercial: "Comercial" };
const ROLE_COLORS = {
  admin: { c: "#534AB7", bg: "#EEEDFE" },
  manager: { c: "#185FA5", bg: "#E6F1FB" },
  commercial: { c: "#888", bg: "#F1EFE8" },
};

export default function SettingsPage() {
  const { tenant, role, user, logEvent } = useAuth();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("commercial");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [keywords, setKeywords] = useState("");
  const [aiContext, setAiContext] = useState("");
  const canManage = role === "admin" || role === "manager";

  useEffect(() => {
    if (tenant) {
      loadMembers();
      setContext(tenant.business_context || "");
      setKeywords((tenant.fit_keywords || []).join(", "));
      setAiContext(tenant.ai_prompt_context || "");
    }
  }, [tenant]);

  async function loadMembers() {
    const { data } = await supabase
      .from("tenant_users")
      .select("*, profiles(full_name)")
      .eq("tenant_id", tenant.id);
    setMembers(data || []);
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setLoading(true); setMsg(null);
    const { error } = await supabase.from("invitations").insert({
      tenant_id: tenant.id,
      email: inviteEmail.trim(),
      role: inviteRole,
      invited_by: user.id,
    });
    if (error) setMsg({ type: "err", text: "Erro: " + error.message });
    else {
      await logEvent("member.invited", "user", null, { email: inviteEmail, role: inviteRole });
      setMsg({ type: "ok", text: `Convite enviado para ${inviteEmail}` });
      setInviteEmail("");
    }
    setLoading(false);
  }

  async function saveConfig() {
    setLoading(true); setMsg(null);
    const kwArray = keywords.split(",").map(k => k.trim()).filter(Boolean);
    const { error } = await supabase.from("tenants").update({
      business_context: context,
      fit_keywords: kwArray,
      ai_prompt_context: aiContext,
    }).eq("id", tenant.id);
    if (error) setMsg({ type: "err", text: "Erro ao guardar." });
    else {
      await logEvent("config.updated", "tenant", tenant.id);
      setMsg({ type: "ok", text: "Configuração guardada!" });
    }
    setLoading(false);
  }

  async function removeMember(userId) {
    if (userId === user.id) return;
    await supabase.from("tenant_users").delete().eq("tenant_id", tenant.id).eq("user_id", userId);
    await logEvent("member.removed", "user", userId);
    loadMembers();
  }

  if (!tenant) return <div style={{ padding: 40, color: "#888", fontSize: 13 }}>A carregar configurações...</div>;

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Configurações</h1>
      <p style={s.sub}>Workspace: {tenant.name}</p>

      {msg && <div style={msg.type === "err" ? s.err : s.ok}>{msg.text}</div>}

      {/* CONTEXTO DO NEGÓCIO */}
      {canManage && (
        <div style={s.section}>
          <p style={s.sTitle}>Contexto comercial</p>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            Define o nicho e objectivo. A IA usa este contexto para calibrar a análise de cada empresa.
          </p>

          <label style={s.label}>Descrição do negócio</label>
          <textarea style={s.textarea} value={context} onChange={e => setContext(e.target.value)}
            placeholder="Ex: Marca portuguesa de suplementos premium à procura de parceiros de revenda em ginásios, farmácias e lojas naturais." />

          <label style={s.label}>Palavras-chave de fit (separadas por vírgula)</label>
          <input style={s.input} value={keywords} onChange={e => setKeywords(e.target.value)}
            placeholder="ginásio, farmácia, nutricionista, loja natureza, parafarmácia" />

          <label style={s.label}>Instrução extra para análise IA</label>
          <textarea style={s.textarea} value={aiContext} onChange={e => setAiContext(e.target.value)}
            placeholder="Ex: Avalia especialmente a capacidade de distribuição presencial e alinhamento com público fitness/wellness." />

          <button style={s.btn} onClick={saveConfig} disabled={loading}>
            {loading ? "A guardar..." : "Guardar configuração"}
          </button>
        </div>
      )}

      {/* MEMBROS */}
      <div style={s.section}>
        <p style={s.sTitle}>Membros da equipa</p>
        {members.map(m => {
          const rc = ROLE_COLORS[m.role] || ROLE_COLORS.commercial;
          return (
            <div key={m.id} style={s.row}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{m.profiles?.full_name || "Sem nome"}</p>
                <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>{m.user_id}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={s.badge(rc.c, rc.bg)}>{ROLE_LABELS[m.role]}</span>
                {role === "admin" && m.user_id !== user.id && (
                  <button style={{ ...s.btnSm, color: "#A32D2D", borderColor: "#f0c0c0" }}
                    onClick={() => removeMember(m.user_id)}>Remover</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONVIDAR */}
      {canManage && (
        <div style={s.section}>
          <p style={s.sTitle}>Convidar membro</p>
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...s.input, flex: 1, marginBottom: 0 }} type="email"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@empresa.com" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, background: "#fff", color: "#1a1a1a" }}>
              <option value="commercial">Comercial</option>
              <option value="manager">Gestor</option>
            </select>
            <button style={s.btn} onClick={sendInvite} disabled={loading}>Convidar</button>
          </div>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
            O convite expira em 7 dias. O utilizador receberá um email para criar a sua conta.
          </p>
        </div>
      )}

      {/* INFO DO PLANO */}
      <div style={s.section}>
        <p style={s.sTitle}>Plano atual</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 500, textTransform: "capitalize" }}>{tenant.plan}</span>
            <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {tenant.plan === "trial" ? "Período de avaliação gratuita." : `Ativo desde ${new Date(tenant.plan_started_at).toLocaleDateString("pt-PT")}.`}
            </p>
          </div>
          <button style={{ ...s.btn, background: "#f5f5f4", color: "#1a1a1a", border: "0.5px solid #ddd" }}>
            Gerir plano
          </button>
        </div>
      </div>
    </div>
  );
}
