// netlify/functions/create-user.js
// Cria utilizador com senha temporária via Supabase Auth Admin

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email, password, role, tenantId, fullName, invitedBy;
  try {
    const body  = JSON.parse(event.body || "{}");
    email       = body.email;
    password    = body.password;
    role        = body.role       || "commercial";
    tenantId    = body.tenant_id;
    fullName    = body.full_name  || "";
    invitedBy   = body.invited_by;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!email || !password || !tenantId) {
    return { statusCode: 400, body: JSON.stringify({ error: "email, password e tenant_id obrigatórios" }) };
  }

  if (password.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres" }) };
  }

  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Env vars não configuradas" }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Cria utilizador no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:              email.trim().toLowerCase(),
      password,
      email_confirm:      true, // confirma email automaticamente
      user_metadata: {
        full_name:  fullName,
        tenant_id:  tenantId,
        role,
        must_change_password: true, // flag para forçar troca na primeira sessão
      },
    });

    if (authError) {
      console.error("[create-user] Auth error:", authError.message);
      return { statusCode: 400, body: JSON.stringify({ error: authError.message }) };
    }

    const userId = authData.user.id;
    console.log("[create-user] User criado:", userId, email);

    // 2. Cria perfil
    await supabase.from("profiles").upsert({
      id:        userId,
      full_name: fullName,
      email:     email.trim().toLowerCase(),
    }, { onConflict: "id" });

    // 3. Associa ao tenant
    const { error: tuError } = await supabase.from("tenant_users").insert({
      tenant_id: tenantId,
      user_id:   userId,
      role,
      invited_by: invitedBy,
    });

    if (tuError) console.error("[create-user] tenant_users error:", tuError.message);

    // 4. Regista na tabela invitations para controlo
    await supabase.from("invitations").insert({
      tenant_id:  tenantId,
      email:      email.trim().toLowerCase(),
      role,
      token:      userId,
      invited_by: invitedBy,
      accepted_at: new Date().toISOString(),
      expires_at:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }).catch(() => {}); // não falha se invitations der erro

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, email, user_id: userId }),
    };

  } catch (err) {
    console.error("[create-user] Erro inesperado:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || String(err) }),
    };
  }
};
