# Revora Platform

Plataforma de ciclo comercial completo — um único repositório, um único Supabase, três módulos.

```
Discover → Pulse → Feedback
(encontra)  (converte)  (retém)
```

## Estrutura

```
revora-platform/
├── modules/
│   ├── feedback/          ← em produção · React + Vite · Supabase Auth
│   │   ├── src/
│   │   │   ├── pages/     ← Admin, Atendente, Avaliar, Cadastro, Login...
│   │   │   └── components/
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── discover/          ← MVP pronto · cliente: Aurifoods (PT)
│   │   ├── src/
│   │   │   ├── pages/     ← AuthPage, AdminPanel, SettingsPage
│   │   │   ├── App.jsx
│   │   │   └── AuthContext.jsx
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── pulse/             ← fase 3 · estrutura pronta
│       ├── src/
│       │   └── App.jsx    ← placeholder com roadmap
│       ├── package.json
│       └── vite.config.js
│
├── shared/
│   ├── schema/
│   │   └── schema_unified.sql   ← schema completo da plataforma
│   ├── types/
│   │   └── platform.js          ← constantes partilhadas (módulos, planos, roles...)
│   ├── hooks/
│   │   └── useEvents.js         ← audit logging partilhado
│   └── lib/
│       └── supabase.js          ← cliente Supabase partilhado
│
├── docs/
│   └── netlify-setup.md         ← guia de deploy por módulo
│
├── .gitignore
└── README.md
```

## Supabase

**Projecto:** `cdfjncvqmwteejffwxnt.supabase.co`
Partilhado por todos os módulos. Schema em `shared/schema/schema_unified.sql`.

### Tabelas por módulo

| Prefixo | Módulo | Descrição |
|---|---|---|
| — | Core | `tenants`, `tenant_users`, `events`, `billing_events`, `profiles` |
| — | Feedback | `businesses`, `clients`, `users`, `services`, `attendances`, `alerts` |
| `disc_` | Discover | `disc_companies`, `disc_scoring`, `disc_enrichment`, `disc_ai_analysis` |
| `pulse_` | Pulse | `pulse_leads`, `pulse_sequences`, `pulse_messages` |

## Setup por módulo

```bash
# Feedback
cd modules/feedback && npm install && npm run dev

# Discover
cd modules/discover && npm install && npm run dev

# Pulse
cd modules/pulse && npm install && npm run dev
```

Cada módulo precisa de um `.env.local` com:
```env
VITE_SUPABASE_URL=https://cdfjncvqmwteejffwxnt.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Ver `.env.example` em cada módulo para variáveis adicionais.

## Deploy Netlify

Cada módulo é um site independente no Netlify apontando para a sua subpasta.
Ver `docs/netlify-setup.md` para instruções completas.

## Módulos — estado actual

| Módulo | Estado | Próximo passo |
|---|---|---|
| Feedback | Em produção | Melhorias V2 (recorrência, health status) |
| Discover | MVP pronto | Lançar com Aurifoods PT |
| Pulse | Estrutura criada | Portar lógica do leadpulse_project.zip |

## Ciclo comercial

```
1. DISCOVER   → Encontra e qualifica potenciais parceiros/clientes B2B
                Score automático · Análise IA · Validação humana

2. PULSE      → Converte leads em reuniões com sequências automatizadas
                Email + WhatsApp + SMS · Agente IA · 3 modos de operação

3. FEEDBACK   → Retém clientes com NPS, alertas e jornada de retorno
                QR Code · Cupons · Clientes em risco · Reactivação
```

## Novos módulos previstos

| Módulo | Descrição |
|---|---|
| Intelligence | IA preditiva cross-módulo · churn · upsell |
| Referral | Programa de indicações · VIP |
| Analytics | Dashboard executivo · funil completo |
| Outreach | WhatsApp Business API oficial |
