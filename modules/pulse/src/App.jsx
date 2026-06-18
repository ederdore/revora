// Revora Pulse — Módulo 3
// Prospeção inteligente com sequências automatizadas
//
// Stack de referência (leadpulse_project.zip):
//   - leadpulse-app.jsx        → app completa (10 páginas)
//   - leadpulse-agent.jsx      → agente IA autónomo (manual/supervised/auto)
//   - leadpulse-ai-engine.jsx  → análise de respostas (6 sinais)
//   - leadpulse-webhooks.jsx   → multicanal (email, WhatsApp, SMS)
//   - leadpulse-onboarding.jsx → onboarding com Stripe
//   - leadpulse_scraper.py     → pipeline Outscraper + Hunter.io
//
// Tabelas Supabase (já no schema_unified.sql):
//   pulse_leads, pulse_sequences, pulse_messages
//
// TODO: portar lógica do leadpulse_project.zip para React + Supabase

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f5f4",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, sans-serif",
    }}>
      <div style={{
        background: "#fff",
        border: "0.5px solid #e5e5e5",
        borderRadius: 16,
        padding: "40px 48px",
        textAlign: "center",
        maxWidth: 400,
      }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚡</div>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 8px" }}>
          Revora Pulse
        </h1>
        <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px", lineHeight: 1.6 }}>
          Prospeção inteligente com sequências automatizadas.
          Em desenvolvimento — fase 3 da plataforma Revora.
        </p>
        <div style={{
          fontSize: 12,
          color: "#aaa",
          background: "#f5f5f4",
          borderRadius: 8,
          padding: "10px 14px",
          textAlign: "left",
          lineHeight: 1.8,
        }}>
          <strong style={{ color: "#888" }}>Funcionalidades previstas:</strong><br />
          · Importação e scoring de leads<br />
          · Pixel de rastreamento de visitas<br />
          · Sequências email + WhatsApp + SMS<br />
          · Agente IA (manual / supervised / auto)<br />
          · Análise de respostas com 6 sinais<br />
          · Marcação de reuniões via Calendly
        </div>
      </div>
    </div>
  );
}
