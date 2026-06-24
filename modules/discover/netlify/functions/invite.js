// netlify/functions/invite.js
// Convida utilizador via Supabase Auth Admin API

import { createClient } from "@supabase/supabase-js";

export async function handler(event) {
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

  console.log("[invite] supabaseUrl:", supabaseUrl ? "OK" : "MISSING");
  console.log("[invite] serviceRoleKey:", serviceRoleKey ? "OK" : "MISSING");
  console.log("[invite] email:", email, "tenantId:", tenantId);

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas" }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: tenantId, role, invited_by: invitedBy },
      redirectTo: `${process.env.URL || "https://hubrevora.netlify.app"}/app/accept-invite`,
    });

    console.log("[invite] authData:", JSON.stringify(authData));
    console.log("[invite] authError:", JSON.stringify(authError));

    if (authError) {
      const errMsg = authError.message
        || authError.msg
        || authError.error_description
        || JSON.stringify(authError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errMsg }),
      };
    }

    // Regista na tabela invitations
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: dbError } = await supabase.from("invitations").insert({
      tenant_id:  tenantId,
      email:      email.trim().toLowerCase(),
      role,
      token:      authData?.user?.id || null,
      invited_by: invitedBy,
      expires_at: expiresAt,
    });

    if (dbError) console.error("[invite] DB error:", dbError.message);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, email }),
    };

  } catch (err) {
    console.error("[invite] Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || String(err) }),
    };
  }
}
