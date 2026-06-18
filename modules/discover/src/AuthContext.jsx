import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

  async function loadUserContext(u) {
    if (!u) {
      setUser(null); setProfile(null);
      setTenant(null); setRole(null);
      setLoading(false); return;
    }

    setUser(u);
    setIsAdmin(u.email === ADMIN_EMAIL);

    // Perfil
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", u.id).single();
    setProfile(prof);

    // Tenant — query directa sem RLS helpers
    console.log("[Revora] loading tenant for:", u.id);

    const { data: membership, error: memberErr } = await supabase
      .from("tenant_users")
      .select("role, tenant_id")
      .eq("user_id", u.id)
      .single();

    console.log("[Revora] membership:", membership, "err:", memberErr?.message);

    if (membership?.tenant_id) {
      setRole(membership.role);

      const { data: tenantData, error: tenantErr } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", membership.tenant_id)
        .single();

      console.log("[Revora] tenant:", tenantData, "err:", tenantErr?.message);

      if (tenantData) setTenant(tenantData);
    }

    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserContext(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { loadUserContext(session?.user ?? null); }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  }

  async function signUp(email, password, fullName) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function logEvent(eventType, entityType, entityId, payload = {}) {
    if (!tenant?.id) return;
    await supabase.from("events").insert({
      tenant_id: tenant.id,
      user_id: user?.id,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      payload,
    });
  }

  return (
    <AuthContext.Provider value={{
      user, profile, tenant, role,
      loading, isAdmin,
      signIn, signUp, signOut, logEvent
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
