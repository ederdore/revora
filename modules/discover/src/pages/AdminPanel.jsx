import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";

const s = {
  page: { padding: "32px 24px", maxWidth: 1100, margin: "0 auto" },
  h1: { fontSize: 20, fontWeight: 500, marginBottom: 6 },
  sub: { fontSize: 13, color: "#888", marginBottom: 28 },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 },
  metric: { background: "#f5f5f4", borderRadius: 8, padding: 16 },
  mLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  mVal: { fontSize: 22, fontWeight: 500 },
  card: { background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12 },
  th: { padding: "10px 16px", fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "0.5px solid #e5e5e5", textAlign: "left" },
  td: { padding: "11px 16px", fontSize: 13, borderBottom: "0.5px solid #e5e5e5", color: "#1a1a1a" },
  badge: (color, bg) => ({ background: bg, color, padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 500, display: "inline-block" }),
  section: { marginBottom: 32 },
  sTitle: { fontSize: 15, fontWeight: 500, marginBottom: 14 },
};

const PLAN_COLORS = {
  trial: { c: "#854F0B", bg: "#FAEEDA" },
  starter: { c: "#185FA5", bg: "#E6F1FB" },
  pro: { c: "#3B6D11", bg: "#EAF3DE" },
  enterprise: { c: "#534AB7", bg: "#EEEDFE" },
};

const MARKET_LABELS = { pt: "🇵🇹 Portugal", es: "🇪🇸 Espanha", br: "🇧🇷 Brasil" };

export default function AdminPanel() {
  const [tenants, setTenants] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ tenants: 0, companies: 0, validations: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("tenants");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);

    const [{ data: ts }, { data: evs }, { count: cc }, { count: vc }] = await Promise.all([
      supabase.from("tenants").select("*, tenant_users(count), companies(count)").order("created_at", { ascending: false }),
      supabase.from("events").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("disc_companies").select("*", { count: "exact", head: true }),
      supabase.from("disc_validations").select("*", { count: "exact", head: true }),
    ]);

    setTenants(ts || []);
    setEvents(evs || []);
    setStats({ tenants: ts?.length || 0, companies: cc || 0, validations: vc || 0, events: evs?.length || 0 });
    setLoading(false);
  }

  async function toggleTenant(id, active) {
    await supabase.from("tenants").update({ active: !active }).eq("id", id);
    loadAll();
  }

  function timeAgo(ts) {
    const d = new Date(ts);
    const diff = (Date.now() - d) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (diff < 86400) return Math.floor(diff / 3600) + "h";
    return Math.floor(diff / 86400) + "d";
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Painel Admin</h1>
      <p style={s.sub}>Visão global da plataforma Revora Discover.</p>

      {/* METRICS */}
      <div style={s.grid}>
        {[
          { l: "Clientes", v: stats.tenants },
          { l: "Empresas total", v: stats.companies },
          { l: "Validações", v: stats.validations },
          { l: "Eventos (50 rec.)", v: stats.events },
        ].map(m => (
          <div key={m.l} style={s.metric}>
            <div style={s.mLabel}>{m.l}</div>
            <div style={s.mVal}>{loading ? "—" : m.v}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "0.5px solid #e5e5e5" }}>
        {[{ k: "tenants", l: "Clientes" }, { k: "events", l: "Log de eventos" }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "10px 16px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.k ? 500 : 400,
            color: tab === t.k ? "#1a1a1a" : "#888",
            borderBottom: tab === t.k ? "2px solid #1a1a1a" : "2px solid transparent",
            marginBottom: -1,
          }}>{t.l}</button>
        ))}
      </div>

      {/* TENANTS TABLE */}
      {tab === "tenants" && (
        <div style={s.card}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>A carregar...</div>
          ) : tenants.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>Nenhum cliente ainda.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Cliente", "Mercado", "Plano", "Membros", "Empresas", "Criado", "Ativo", ""].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => {
                  const pc = PLAN_COLORS[t.plan] || PLAN_COLORS.trial;
                  return (
                    <tr key={t.id} style={{ background: i % 2 === 0 ? "transparent" : "#fafaf9" }}>
                      <td style={{ ...s.td, fontWeight: 500 }}>
                        {t.name}
                        <span style={{ display: "block", fontSize: 11, color: "#aaa", fontWeight: 400 }}>{t.slug}</span>
                      </td>
                      <td style={s.td}>{MARKET_LABELS[t.market] || t.market}</td>
                      <td style={s.td}>
                        <span style={s.badge(pc.c, pc.bg)}>{t.plan}</span>
                      </td>
                      <td style={s.td}>{t.tenant_users?.[0]?.count ?? 0}</td>
                      <td style={s.td}>{t.companies?.[0]?.count ?? 0}</td>
                      <td style={{ ...s.td, color: "#888" }}>{new Date(t.created_at).toLocaleDateString("pt-PT")}</td>
                      <td style={s.td}>
                        <span style={s.badge(t.active ? "#3B6D11" : "#A32D2D", t.active ? "#EAF3DE" : "#FCEBEB")}>
                          {t.active ? "ativo" : "inativo"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button onClick={() => toggleTenant(t.id, t.active)} style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11,
                          border: "0.5px solid #ddd", background: "#fff", cursor: "pointer",
                        }}>{t.active ? "Pausar" : "Ativar"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* EVENTS LOG */}
      {tab === "events" && (
        <div style={s.card}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>A carregar...</div>
          ) : events.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#888", fontSize: 13 }}>Sem eventos registados.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Evento", "Entidade", "Utilizador", "Há quanto tempo"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={ev.id} style={{ background: i % 2 === 0 ? "transparent" : "#fafaf9" }}>
                    <td style={{ ...s.td, fontWeight: 500 }}>
                      <code style={{ background: "#f5f5f4", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{ev.event_type}</code>
                    </td>
                    <td style={{ ...s.td, color: "#888" }}>
                      {ev.entity_type && <span>{ev.entity_type}</span>}
                      {ev.entity_id && <span style={{ fontSize: 10, display: "block", color: "#bbb" }}>{ev.entity_id.slice(0, 8)}...</span>}
                    </td>
                    <td style={{ ...s.td, color: "#888" }}>{ev.profiles?.full_name || "sistema"}</td>
                    <td style={{ ...s.td, color: "#aaa" }}>{timeAgo(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
