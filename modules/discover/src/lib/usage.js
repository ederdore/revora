// usage.js — Controlo de limites e uso por tenant
// Integra com usage_transactions e plan_limits no Supabase

import { supabase } from "../supabaseClient.js";

// Custo Anthropic por token
const COST_PER_M_INPUT  = 3.00;   // $3.00 por 1M tokens input
const COST_PER_M_OUTPUT = 15.00;  // $15.00 por 1M tokens output

// Limites por plano (fallback se Supabase não responder)
export const PLAN_LIMITS = {
  trial:      { searches: 20,   margin: 0.60, label: "Trial"      },
  starter:    { searches: 200,  margin: 0.60, label: "Starter"    },
  pro:        { searches: 500,  margin: 0.60, label: "Pro"        },
  enterprise: { searches: 2000, margin: 0.60, label: "Enterprise" },
};

// Calcula limite real com margem de segurança
export function getAllowedSearches(plan, marginOverride) {
  const cfg = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  const margin = marginOverride ?? cfg.margin;
  return Math.floor(cfg.searches * margin);
}

// Verifica se tenant pode fazer pesquisa
export async function canSearch(tenantId) {
  const { data } = await supabase
    .from("tenant_usage_summary")
    .select("usage_status, cycle_searches, searches_allowed, usage_pct")
    .eq("tenant_id", tenantId)
    .single();
  return data || { usage_status: "ok", cycle_searches: 0, searches_allowed: 12, usage_pct: 0 };
}

// Regista uso de pesquisa
export async function logUsage(tenantId, type, companyId = null, tokensInput = 0, tokensOutput = 0) {
  await supabase.rpc("log_usage", {
    p_tenant_id:     tenantId,
    p_type:          type,
    p_company_id:    companyId,
    p_tokens_input:  tokensInput,
    p_tokens_output: tokensOutput,
  });
}

// Calcula custo Anthropic
export function calcAICost(tokensInput, tokensOutput) {
  return (tokensInput / 1_000_000 * COST_PER_M_INPUT)
       + (tokensOutput / 1_000_000 * COST_PER_M_OUTPUT);
}

// Busca sumário de uso do mês actual
export async function getUsageSummary(tenantId) {
  const { data } = await supabase
    .from("tenant_usage_summary")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();
  return data;
}

// Busca custos detalhados do mês
export async function getMonthlyCosts(tenantId) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("usage_transactions")
    .select("type, cost_usd, tokens_input, tokens_output, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", startOfMonth.toISOString())
    .order("created_at", { ascending: false });

  if (!data) return { google: 0, ai: 0, total: 0, transactions: [] };

  const google = data
    .filter(t => t.type === "google_maps" || t.type === "microlink")
    .length * 0.032; // $32 por 1000 = $0.032 por empresa

  const ai = data
    .filter(t => t.type === "ai_analysis")
    .reduce((sum, t) => sum + Number(t.cost_usd || 0), 0);

  return { google, ai, total: google + ai, transactions: data };
}
