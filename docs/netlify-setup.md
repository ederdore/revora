# Revora Platform — Configuração Netlify por módulo
#
# No painel do Netlify, para cada site:
#
# ── FEEDBACK ──────────────────────────────────────────────────
# Base directory:    modules/feedback
# Build command:     npm run build
# Publish directory: modules/feedback/dist
#
# Environment variables:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_APP_URL (URL do site após deploy)
#
# ── DISCOVER ──────────────────────────────────────────────────
# Base directory:    modules/discover
# Build command:     npm run build
# Publish directory: modules/discover/dist
#
# Environment variables:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_ANTHROPIC_API_KEY
#   VITE_ADMIN_EMAIL
#
# ── PULSE (fase 3) ────────────────────────────────────────────
# Base directory:    modules/pulse
# Build command:     npm run build
# Publish directory: modules/pulse/dist
#
# Environment variables:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_ANTHROPIC_API_KEY
#
# ── NOTA ──────────────────────────────────────────────────────
# Todos os módulos partilham o mesmo Supabase.
# VITE_SUPABASE_URL = https://cdfjncvqmwteejffwxnt.supabase.co
