import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { supabase } from "../supabaseClient.js";

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f4" },
  card: { background: "#fff", borderRadius: 16, border: "0.5px solid #e5e5e5", padding: "40px 40px 36px", width: "100%", maxWidth: 400 },
  logo: { fontSize: 15, fontWeight: 600, marginBottom: 32, display: "block" },
  h1: { fontSize: 20, fontWeight: 500, marginBottom: 6 },
  sub: { fontSize: 13, color: "#888", marginBottom: 28 },
  label: { display: "block", fontSize: 12, color: "#888", marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 14, background: "#fff", color: "#1a1a1a", marginBottom: 14 },
  btn: { width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 4 },
  err: { fontSize: 12, color: "#A32D2D", background: "#FCEBEB", padding: "8px 12px", borderRadius: 8, marginBottom: 14 },
  link: { fontSize: 13, color: "#888", textAlign: "center", marginTop: 20, cursor: "pointer" },
  linkSpan: { color: "#1a1a1a", fontWeight: 500, textDecoration: "underline" },
};

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const err = await signIn(email, password);
    if (err) setError(err.message);
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    if (!tenantName.trim()) { setError("Informe o nome da empresa."); setLoading(false); return; }

    // Regista utilizador
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

    const user = signUpData?.user;
    if (!user) { setError("Erro ao criar conta. Tente novamente."); setLoading(false); return; }

    // Cria tenant e associa utilizador
    const slug = tenantName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);
    const { data: t, error: tErr } = await supabase.from("tenants").insert({
      name: tenantName.trim(),
      slug,
      market: "pt",
      plan: "trial",
      module_discover: true,
      score_weight_fit: 0.35,
      score_weight_authority: 0.25,
      score_weight_digital: 0.20,
      score_weight_contact: 0.20,
      weight_ia: 0.70,
      weight_human: 0.30,
      scoring_phase: 1,
      phase2_threshold: 10,
      phase3_threshold: 50,
    }).select().single();

    if (tErr || !t) { setError("Conta criada mas erro ao configurar workspace: " + (tErr?.message||"")); setLoading(false); return; }

    // Liga utilizador ao tenant como admin
    await supabase.from("tenant_users").insert({ tenant_id: t.id, user_id: user.id, role: "admin" });

    // Cria perfil
    await supabase.from("profiles").upsert({ id: user.id, full_name: name }, { onConflict: "id" });

    // Log
    await supabase.from("events").insert({ tenant_id: t.id, user_id: user.id, event_type: "tenant.created", entity_type: "tenant", entity_id: t.id, module: "platform" });

    // Insere sinais ICP predefinidos para o novo tenant
    const defaultSignals = [
      {label:"Conhecemos a empresa presencialmente", signal_type:"positive", weight:1.5, position:1},
      {label:"Contacto estabelecido com decisor",    signal_type:"positive", weight:2.0, position:2},
      {label:"Interesse declarado em parceria",      signal_type:"positive", weight:2.5, position:3},
      {label:"Já vende produtos similares",          signal_type:"positive", weight:1.5, position:4},
      {label:"Volume potencial: grande (>500€/mês)", signal_type:"positive", weight:2.0, position:5},
      {label:"Volume potencial: médio (200-500€/mês)",signal_type:"positive",weight:1.0, position:6},
      {label:"Volume potencial: pequeno (<200€/mês)",signal_type:"positive", weight:0.5, position:7},
      {label:"Localização estratégica",              signal_type:"positive", weight:1.0, position:8},
      {label:"Decisor acessível e receptivo",        signal_type:"positive", weight:1.5, position:9},
      {label:"Concorrência directa instalada",       signal_type:"negative", weight:1.5, position:10},
      {label:"Sem capacidade financeira aparente",   signal_type:"negative", weight:1.0, position:11},
      {label:"Gestão desinteressada",                signal_type:"negative", weight:2.0, position:12},
      {label:"Localização pouco estratégica",        signal_type:"negative", weight:0.5, position:13},
    ];
    await supabase.from("icp_signals").insert(defaultSignals.map(s => ({ ...s, tenant_id: t.id })));

    setSuccess("Conta criada com sucesso! A entrar...");
    // Auto-login após registo (confirmação de email desactivada)
    await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    if (err) setError(err.message);
    else setSuccess("Email de recuperação enviado!");
    setLoading(false);
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <span style={s.logo}>Revora Discover</span>

        {mode === "login" && (
          <>
            <h1 style={s.h1}>Entrar</h1>
            <p style={s.sub}>Aceda à sua conta para continuar.</p>
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={{ ...s.err, color: "#3B6D11", background: "#EAF3DE" }}>{success}</div>}
            <form onSubmit={handleLogin}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.com" required />
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              <button style={s.btn} type="submit" disabled={loading}>{loading ? "A entrar..." : "Entrar"}</button>
            </form>
            <p style={s.link} onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}>
              Esqueceu a password? <span style={s.linkSpan}>Recuperar</span>
            </p>
            <p style={s.link} onClick={() => { setMode("register"); setError(""); setSuccess(""); }}>
              Sem conta? <span style={s.linkSpan}>Criar conta</span>
            </p>
          </>
        )}

        {mode === "register" && (
          <>
            <h1 style={s.h1}>Criar conta</h1>
            <p style={s.sub}>Começa o teu trial gratuito.</p>
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={{ ...s.err, color: "#3B6D11", background: "#EAF3DE" }}>{success}</div>}
            <form onSubmit={handleRegister}>
              <label style={s.label}>Nome completo</label>
              <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" required />
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.com" required />
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caracteres" minLength={8} required />
              <label style={s.label}>Nome da empresa</label>
              <input style={s.input} value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Ex: Aurifoods" required />
              <button style={s.btn} type="submit" disabled={loading}>{loading ? "A criar..." : "Criar conta"}</button>
            </form>
            <p style={s.link} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>
              Já tem conta? <span style={s.linkSpan}>Entrar</span>
            </p>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h1 style={s.h1}>Recuperar password</h1>
            <p style={s.sub}>Enviamos um link para o seu email.</p>
            {error && <div style={s.err}>{error}</div>}
            {success && <div style={{ ...s.err, color: "#3B6D11", background: "#EAF3DE" }}>{success}</div>}
            <form onSubmit={handleForgot}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.com" required />
              <button style={s.btn} type="submit" disabled={loading}>{loading ? "A enviar..." : "Enviar link"}</button>
            </form>
            <p style={s.link} onClick={() => { setMode("login"); setError(""); setSuccess(""); }}>
              Voltar ao login
            </p>
          </>
        )}
      </div>
    </div>
  );
}
