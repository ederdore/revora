<<<<<<< HEAD
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
=======
# ⭐ StarLoop — Setup Completo

## Stack
- **Frontend:** React + Vite
- **Banco:** Supabase (PostgreSQL)
- **Deploy:** Vercel
- **Código:** GitHub

---

## 1. GitHub — criar repositório

```bash
# No terminal do VS Code:
cd starloop
git init
git add .
git commit -m "feat: StarLoop MVP v0.1"
```

Acesse github.com → New Repository → nome: `starloop`

```bash
git remote add origin https://github.com/SEU_USER/starloop.git
git branch -M main
git push -u origin main
```

---

## 2. Supabase — banco de dados

1. Acesse **supabase.com** → New Project
2. Dê um nome: `starloop` → crie senha forte → região: **South America (São Paulo)**
3. Aguarde criar (~2 min)
4. Vá em **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → Run
5. Vá em **Settings > API** e copie:
   - `Project URL`
   - `anon public key`

---

## 3. Variáveis de ambiente

Crie um arquivo `.env` na raiz (não commitar):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

## 4. Rodar local

```bash
npm install
npm run dev
```

Acesse: http://localhost:5173

- `/` → Página inicial com os 2 links
- `/admin` → Painel do dono
- `/atendente` → Tela do funcionário

---

## 5. Vercel — deploy

1. Acesse **vercel.com** → Add New Project
2. Importe o repositório do GitHub
3. Em **Environment Variables** adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

Pronto! URL gerada automaticamente tipo `starloop-xxx.vercel.app`

---

## Links úteis para validação

| Rota | Quem usa |
|---|---|
| `/` | Página inicial |
| `/admin` | Dono do negócio |
| `/atendente` | Funcionário na recepção |

---

## Próximos passos (pós-validação)

- [ ] Integração Telegram Bot API
- [ ] Auth por negócio (login)
- [ ] Cobrança recorrente (Asaas)
- [ ] Suporte a múltiplas empresas
- [ ] Idiomas: PT-BR, PT-PT, IT

## cod 
9RwqJxV6cNPQdCWi
c3,88t!j3-AZKyu
>>>>>>> 853097a2daeaaff596308f4d331f600ad9db6c33
