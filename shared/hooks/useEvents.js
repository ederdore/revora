// shared/hooks/useEvents.js
// Hook de audit logging partilhado por todos os módulos
// Cada módulo passa o seu nome como 'module' para filtrar no painel admin

import { useCallback } from "react";
import { supabase } from "../lib/supabase.js";

export function useEvents(tenantId, userId, module) {
  const log = useCallback(async (eventType, entityType, entityId, payload = {}) => {
    if (!tenantId) return;
    try {
      await supabase.from("events").insert({
        tenant_id:   tenantId,
        user_id:     userId || null,
        module:      module, // 'feedback' | 'discover' | 'pulse' | 'platform'
        event_type:  eventType,
        entity_type: entityType || null,
        entity_id:   entityId || null,
        payload,
      });
    } catch (err) {
      console.warn("[Revora Events] Falha ao registar evento:", err.message);
    }
  }, [tenantId, userId, module]);

  return { log };
}
