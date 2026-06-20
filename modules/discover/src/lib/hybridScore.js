// hybridScore.js — Motor de score híbrido IA + Humano
// Fase 1: só IA (< phase2_threshold validações)
// Fase 2: IA + Humano ponderados (>= phase2_threshold)
// Fase 3: auto-ajuste de pesos (>= phase3_threshold)

import { supabase } from "../supabaseClient.js";

// Calcula score humano baseado nas marcações ICP
export function calcHumanScore(humanRating, icpSignals, allSignals) {
  // Base pelo rating do comercial
  const ratingBase = {
    excellent:   100,
    good:         75,
    neutral:      50,
    bad:          20,
    review_later: 50,
  }[humanRating] || 50;

  if (!icpSignals?.length || !allSignals?.length) return ratingBase;

  // Ajuste pelos sinais ICP marcados
  let adjustment = 0;
  let totalWeight = 0;

  icpSignals.forEach(sig => {
    const signal = allSignals.find(s => s.id === sig.signal_id);
    if (!signal) return;
    const w = Number(signal.weight || 1);
    totalWeight += w;
    if (signal.signal_type === "positive") adjustment += w * 10;
    if (signal.signal_type === "negative") adjustment -= w * 10;
  });

  const normalized = totalWeight > 0 ? adjustment / totalWeight : 0;
  return Math.min(100, Math.max(0, Math.round(ratingBase + normalized)));
}

// Calcula score combinado baseado na fase actual
export function calcCombinedScore(aiScore, humanScore, tenant) {
  const phase = tenant?.scoring_phase || 1;
  const wIA    = Number(tenant?.weight_ia    || 0.70);
  const wHuman = Number(tenant?.weight_human || 0.30);

  if (phase === 1 || humanScore == null) {
    // Fase 1: só IA
    return { combined: aiScore, phase: 1 };
  }

  // Fase 2+: ponderado
  const combined = Math.round(aiScore * wIA + humanScore * wHuman);
  return { combined: Math.min(100, Math.max(0, combined)), phase };
}

export function scoreToClass(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

// Guarda score humano e recalcula combinado
export async function saveHumanScore(tenantId, companyId, humanScore, aiScore, tenant) {
  // Guarda score humano
  await supabase.from("company_human_score").upsert({
    tenant_id:   tenantId,
    company_id:  companyId,
    score:       humanScore,
  }, { onConflict: "company_id" });

  // Recalcula combinado
  const { combined, phase } = calcCombinedScore(aiScore, humanScore, tenant);
  const combinedClass = scoreToClass(combined);

  await supabase.from("disc_scoring").update({
    human_score:    humanScore,
    combined_score: combined,
    combined_class: combinedClass,
    scoring_phase:  phase,
  }).eq("company_id", companyId);

  return { humanScore, combined, combinedClass, phase };
}

// Verifica se deve avançar de fase
export async function checkPhaseProgression(tenantId, tenant) {
  const { count } = await supabase
    .from("disc_validations")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const currentPhase = tenant?.scoring_phase || 1;
  const phase2 = tenant?.phase2_threshold || 10;
  const phase3 = tenant?.phase3_threshold || 50;

  let newPhase = currentPhase;
  if (count >= phase3 && currentPhase < 3) newPhase = 3;
  else if (count >= phase2 && currentPhase < 2) newPhase = 2;

  if (newPhase !== currentPhase) {
    await supabase.from("tenants")
      .update({ scoring_phase: newPhase })
      .eq("id", tenantId);
    return { advanced: true, from: currentPhase, to: newPhase, validations: count };
  }

  return { advanced: false, phase: currentPhase, validations: count };
}

// ICP Learning — detecta padrões nas empresas aprovadas
export async function analyzeICPPatterns(tenantId) {
  const { data: approved } = await supabase
    .from("disc_validations")
    .select("company_id, human_rating")
    .eq("tenant_id", tenantId)
    .in("human_rating", ["excellent", "good"]);

  if (!approved?.length) return null;

  const companyIds = approved.map(a => a.company_id);

  const { data: signals } = await supabase
    .from("disc_signals")
    .select("*")
    .in("company_id", companyIds);

  if (!signals?.length) return null;

  // Conta frequência de cada sinal nas aprovadas
  const total = signals.length;
  const patterns = {
    has_instagram:    signals.filter(s => s.has_instagram).length / total,
    has_email:        signals.filter(s => s.has_email).length / total,
    has_whatsapp:     signals.filter(s => s.has_whatsapp).length / total,
    has_online_store: signals.filter(s => s.has_online_store).length / total,
    multiple_locations: signals.filter(s => s.multiple_locations).length / total,
  };

  // Sinais que aparecem em >70% das aprovadas são ICP signals
  const strongSignals = Object.entries(patterns)
    .filter(([, v]) => v >= 0.7)
    .map(([k]) => k);

  return { patterns, strongSignals, totalApproved: total };
}
