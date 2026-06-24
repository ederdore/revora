// netlify/functions/invite.js
// Convida utilizador via Supabase Auth Admin API
// SUPABASE_SERVICE_ROLE_KEY fica server-side — nunca exposta no bundle

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

  const supabaseUrl     = process.env.SUPABASE_URL;
  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Supabase service role não configurada" }) };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Convida via Supabase Auth — envia email automaticamente
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: tenantId,
        role,
        invited_by: invitedBy,
      },
      redirectTo: `${process.env.URL || "https://hubrevora.netlify.app"}/app/accept-invite`,
    });

    if (authError) {
      console.error("[invite] Auth error:", authError.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: authError.message }),
      };
    }

    // 2. Regista o convite na tabela invitations para controlo
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("invitations").insert({
      tenant_id:  tenantId,
      email:      email.trim().toLowerCase(),
      role,
      token:      authData.user?.id || null,
      invited_by: invitedBy,
      expires_at: expiresAt,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, email }),
    };

  } catch (err) {
    console.error("[invite] Unexpected error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
