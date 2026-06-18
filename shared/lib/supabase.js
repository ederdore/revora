// shared/lib/supabase.js
// Cliente Supabase partilhado por todos os módulos Revora
// Cada módulo importa deste ficheiro ou usa a sua própria cópia local
// apontando para as mesmas variáveis de ambiente

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "[Revora] Supabase não configurado. " +
    "Crie um ficheiro .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
export default supabase;
