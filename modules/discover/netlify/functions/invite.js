// netlify/functions/invite.js
// CommonJS — compatível com Netlify Functions runtime

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email, role, tenantId, invitedBy;
  try {
    const body = JSON.parse(event.body || "{}");
    email      = body.email;
    role       = body.role       || "commercial";
    tenantId   = body.tenant_id;
    invitedBy  = body.invited_by;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!email || !tenantId) {
    return { statusCode: 400, body: JSON.stringify({ error: "email e tenant_id obrigatórios" }) };
  }

  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[invite] supabaseUrl:", supabaseUrl ? supabaseUrl : "MISSING");
  console.log("[invite] serviceRoleKey length:", serviceRoleKey ? serviceRoleKey.length : "MISSING");

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Env vars não configuradas" }) };
  }

  let supabase;
  try {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log("[invite] Supabase client criado OK");
  } catch (err) {
    console.error("[invite] Erro ao criar client:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro ao criar client: " + err.message }) };
  }

  try {
    console.log("[invite] A chamar inviteUserByEmail para:", email);

    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: tenantId, role, invited_by: invitedBy },
      redirectTo: "https://hubrevora.netlify.app/app/accept-invite",
    });

    console.log("[invite] authData:", JSON.stringify(authData));
    console.log("[invite] authError:", JSON.stringify(authError));

    if (authError) {
      const errMsg = authError.message || JSON.stringify(authError);
      console.error("[invite] Erro Auth:", errMsg);
      return { statusCode: 400, body: JSON.stringify({ error: errMsg }) };
    }

    // Regista na tabela invitations
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("invitations").insert({
      tenant_id:  tenantId,
      email:      email.trim().toLowerCase(),
      role,
      token:      authData?.user?.id || null,
      invited_by: invitedBy,
      expires_at: expiresAt,
    });

    console.log("[invite] Convite registado com sucesso");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, email }),
    };

  } catch (err) {
    console.error("[invite] Erro inesperado:", err.message, err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || String(err) }),
    };
  }
};
