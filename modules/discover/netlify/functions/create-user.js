// netlify/functions/create-user.js
// Cria utilizador via signUp normal (sem Admin API)
// Funciona no plano free do Supabase

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
  const anonKey        = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Env vars não configuradas" }) };
  }

  // Client admin para operações de DB
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Client anon para signup (funciona no free tier)
  const supabaseAnon = createClient(supabaseUrl, anonKey || serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Tenta primeiro via Admin API
    let userId = null;
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, tenant_id: tenantId, role },
    });

    if (!adminError && adminData?.user?.id) {
      userId = adminData.user.id;
      console.log("[create-user] Criado via Admin API:", userId);
    } else {
      console.log("[create-user] Admin API falhou, tentando signUp:", JSON.stringify(adminError));

      // 2. Fallback: signUp normal
      const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName, tenant_id: tenantId, role },
        },
      });

      if (signUpError) {
        console.error("[create-user] signUp error:", signUpError.message);
        return { statusCode: 400, body: JSON.stringify({ error: signUpError.message }) };
      }

      userId = signUpData?.user?.id;
      console.log("[create-user] Criado via signUp:", userId);
    }

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Não foi possível criar o utilizador" }) };
    }

    // 3. Cria perfil via admin client
    await supabaseAdmin.from("profiles").upsert({
      id:        userId,
      full_name: fullName,
      email:     email.trim().toLowerCase(),
    }, { onConflict: "id" });

    // 4. Associa ao tenant
    const { error: tuError } = await supabaseAdmin.from("tenant_users").insert({
      tenant_id:  tenantId,
      user_id:    userId,
      role,
      invited_by: invitedBy,
    });

    if (tuError) {
      console.error("[create-user] tenant_users error:", tuError.message);
      // Não falha — utilizador foi criado
    }

    // 5. Regista convite
    await supabaseAdmin.from("invitations").insert({
      tenant_id:   tenantId,
      email:       email.trim().toLowerCase(),
      role,
      token:       userId,
      invited_by:  invitedBy,
      accepted_at: new Date().toISOString(),
      expires_at:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    }).catch(() => {});

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
