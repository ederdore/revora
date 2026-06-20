import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);
  const [tenant, setTenant]               = useState(null);
  const [role, setRole]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [isAdmin, setIsAdmin]             = useState(false);
  // Root admin can "enter" a tenant to help clients
  const [impersonating, setImpersonating] = useState(null); // { tenant, enteredAt }

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

  async function loadUserContext(u) {
    if (!u) {
      setUser(null); setProfile(null);
      setTenant(null); setRole(null);
      setImpersonating(null);
      setLoading(false); return;
    }

    setUser(u);
    const rootAdmin = u.email === ADMIN_EMAIL;
    setIsAdmin(rootAdmin);

    // Load profile
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", u.id).maybeSingle();
    setProfile(prof);

    // Root admin: no tenant by default — goes straight to admin panel
    if (rootAdmin) {
      setTenant(null);
      setRole("root");
      setLoading(false);
      return;
    }

    // Regular user: load their tenant
    const { data: membership } = await supabase
      .from("tenant_users")
      .select("role, tenant_id")
      .eq("user_id", u.id)
      .single();

    if (membership?.tenant_id) {
      setRole(membership.role);
      const { data: tenantData } = await supabase
        .from("tenants").select("*").eq("id", membership.tenant_id).single();
      if (tenantData) setTenant(tenantData);
    }

    setLoading(false);
  }

  // Root admin enters a client tenant (with audit log)
  async function enterTenant(tenantData) {
    if (!isAdmin) return;
    const enteredAt = new Date().toISOString();
    setImpersonating({ tenant: tenantData, enteredAt });
    setTenant(tenantData);
    setRole("admin"); // root has full access inside tenant

    // Log the access
    await supabase.from("events").insert({
      tenant_id:   tenantData.id,
      user_id:     user.id,
      module:      "platform",
      event_type:  "root.entered_tenant",
      entity_type: "tenant",
      entity_id:   tenantData.id,
      payload:     { admin_email: user.email, entered_at: enteredAt },
    });
  }

  // Root admin exits client tenant back to admin panel
  async function exitTenant() {
    if (!isAdmin || !impersonating) return;

    // Log the exit
    await supabase.from("events").insert({
      tenant_id:   impersonating.tenant.id,
      user_id:     user.id,
      module:      "platform",
      event_type:  "root.exited_tenant",
      entity_type: "tenant",
      entity_id:   impersonating.tenant.id,
      payload:     {
        admin_email: user.email,
        entered_at:  impersonating.enteredAt,
        exited_at:   new Date().toISOString(),
      },
    });

    setImpersonating(null);
    setTenant(null);
    setRole("root");
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
      tenant_id:   tenant.id,
      user_id:     user?.id,
      module:      "discover",
      event_type:  eventType,
      entity_type: entityType,
      entity_id:   entityId,
      payload: {
        ...payload,
        // Mark if action was done by root admin
        ...(impersonating ? { _root_access: true, _admin_email: user.email } : {}),
      },
    });
  }

  // Effective tenant: impersonating overrides everything
  const effectiveTenant = tenant;

  return (
    <AuthContext.Provider value={{
      user, profile,
      tenant: effectiveTenant,
      role, loading, isAdmin,
      impersonating,
      signIn, signUp, signOut, logEvent,
      enterTenant, exitTenant,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
