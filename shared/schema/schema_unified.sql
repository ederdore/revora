-- ============================================================
-- REVORA PLATFORM — Schema Unificado
-- Migração segura: preserva businesses e clients existentes
--
-- INSTRUÇÕES:
-- 1. Execute no Supabase SQL Editor do projecto existente
-- 2. As tabelas businesses e clients NÃO são alteradas
-- 3. Apenas adiciona novas tabelas e colunas
-- ============================================================

-- ── EXTENSÕES ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- CORE MULTI-TENANT
-- Partilhado por todos os módulos
-- ============================================================

-- Tenants = clientes da plataforma Revora
-- Cada business do Feedback será ligado a um tenant
create table if not exists tenants (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,
  market              text default 'br' check (market in ('pt','es','br')),
  -- módulos activos (controla o que cada cliente vê)
  module_feedback     boolean default false,
  module_discover     boolean default false,
  module_pulse        boolean default false,
  -- plano e billing
  plan                text default 'trial' check (plan in ('trial','starter','pro','enterprise')),
  plan_started_at     timestamptz,
  plan_expires_at     timestamptz,
  stripe_customer_id  text,
  stripe_subscription_id text,
  -- contexto para o engine de scoring (Discover)
  business_context    text,
  fit_keywords        text[],
  ai_prompt_context   text,
  -- meta
  active              boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Membros por tenant com roles
create table if not exists tenant_users (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'commercial'
              check (role in ('admin','manager','commercial')),
  invited_by  uuid references auth.users(id),
  accepted_at timestamptz,
  created_at  timestamptz default now(),
  unique(tenant_id, user_id)
);

-- Convites por email
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role        text not null default 'commercial'
              check (role in ('manager','commercial')),
  token       text unique not null default encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at  timestamptz default (now() + interval '7 days'),
  created_at  timestamptz default now()
);

-- Perfis de utilizador
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Log de eventos (audit trail partilhado por todos os módulos)
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants(id) on delete cascade,
  user_id      uuid references auth.users(id),
  module       text check (module in ('feedback','discover','pulse','platform')),
  event_type   text not null,
  entity_type  text,
  entity_id    uuid,
  payload      jsonb default '{}',
  created_at   timestamptz default now()
);

-- Billing events (placeholder Stripe)
create table if not exists billing_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  event_type      text not null,
  stripe_event_id text unique,
  payload         jsonb default '{}',
  created_at      timestamptz default now()
);

-- ============================================================
-- MÓDULO FEEDBACK
-- Expande as tabelas existentes sem as recriar
-- ============================================================

-- Liga businesses ao sistema multi-tenant
-- (businesses existentes ficam com tenant_id NULL até serem migrados)
alter table businesses
  add column if not exists tenant_id uuid references tenants(id),
  add column if not exists plan text default 'trial'
    check (plan in ('trial','starter','pro')),
  add column if not exists status text default 'trial'
    check (status in ('trial','active','blocked')),
  add column if not exists updated_at timestamptz default now();

-- Tabela de utilizadores do Feedback (já existia em produção via auth)
-- Adicionamos só se não existir
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique references auth.users(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  role        text default 'owner' check (role in ('owner','attendant')),
  name        text,
  email       text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Serviços com recorrência (V2 Feedback)
create table if not exists services (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid references businesses(id) on delete cascade,
  name                  text not null,
  recorrencia_esperada  integer default 30,
  active                boolean default true,
  created_at            timestamptz default now()
);

-- Atendimentos (V2 Feedback)
create table if not exists attendances (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid references businesses(id) on delete cascade,
  client_id            uuid references clients(id) on delete cascade,
  service_id           uuid references services(id),
  visit_date           date default current_date,
  expected_return_date date,
  notes                text,
  created_at           timestamptz default now()
);

-- Pesquisas de satisfação
create table if not exists surveys (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  type        text default 'nps' check (type in ('nps','csat','ces')),
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Respostas às pesquisas
create table if not exists survey_responses (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid references surveys(id) on delete cascade,
  client_id   uuid references clients(id) on delete cascade,
  score       integer,
  comment     text,
  created_at  timestamptz default now()
);

-- Alertas automáticos
create table if not exists alerts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  client_id   uuid references clients(id),
  type        text check (type in ('low_rating','at_risk','churned','return_due')),
  message     text,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- ============================================================
-- MÓDULO DISCOVER
-- Qualificação e scoring de leads B2B
-- ============================================================

create table if not exists disc_companies (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text not null,
  website      text,
  category     text,
  subcategory  text,
  city         text,
  state_region text,
  country      text default 'Portugal',
  source_url   text,
  source_type  text default 'csv' check (source_type in ('csv','manual','scrape','api')),
  status       text default 'new'
    check (status in ('new','enriching','enriched','scored','reviewed','outreach','disqualified')),
  imported_by  uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table if not exists disc_enrichment (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  company_id         uuid not null references disc_companies(id) on delete cascade,
  website_title      text,
  meta_description   text,
  h1_main            text,
  visible_content    text,
  email              text,
  phone              text,
  instagram          text,
  linkedin           text,
  facebook           text,
  whatsapp           text,
  contact_page_url   text,
  enrichment_status  text default 'pending'
    check (enrichment_status in ('pending','processing','done','failed')),
  enriched_at        timestamptz default now(),
  unique(company_id)
);

create table if not exists disc_scoring (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  company_id      uuid not null references disc_companies(id) on delete cascade,
  fit_score       numeric(5,2) default 0,
  digital_score   numeric(5,2) default 0,
  contact_score   numeric(5,2) default 0,
  authority_score numeric(5,2) default 0,
  final_score     numeric(5,2) default 0,
  score_class     text check (score_class in ('A','B','C','D')),
  model_version   integer default 1,
  scored_at       timestamptz default now(),
  unique(company_id)
);

create table if not exists disc_ai_analysis (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenants(id) on delete cascade,
  company_id           uuid not null references disc_companies(id) on delete cascade,
  executive_summary    text,
  strengths            text[],
  weaknesses           text[],
  partnership_potential text check (partnership_potential in ('alto','médio','baixo')),
  recommended_action   text,
  confidence_score     numeric(5,2),
  analyzed_at          timestamptz default now(),
  unique(company_id)
);

create table if not exists disc_signals (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  company_id              uuid not null references disc_companies(id) on delete cascade,
  has_instagram           boolean default false,
  has_facebook            boolean default false,
  has_linkedin            boolean default false,
  has_email               boolean default false,
  has_phone               boolean default false,
  has_whatsapp            boolean default false,
  has_online_store        boolean default false,
  has_blog                boolean default false,
  multiple_locations      boolean default false,
  custom_signals          jsonb default '{}',
  detected_at             timestamptz default now(),
  unique(company_id)
);

create table if not exists disc_validations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  company_id    uuid not null references disc_companies(id) on delete cascade,
  reviewer_id   uuid not null references auth.users(id),
  ai_score      numeric(5,2),
  human_rating  text not null
    check (human_rating in ('excellent','good','neutral','bad','review_later')),
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists disc_outreach (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  company_id   uuid not null references disc_companies(id) on delete cascade,
  created_by   uuid references auth.users(id),
  channel      text check (channel in ('email','whatsapp','phone','linkedin','visit','other')),
  message      text,
  sent_at      timestamptz,
  response     text,
  outcome      text check (outcome in ('interested','not_interested','no_response','scheduled','closed')),
  created_at   timestamptz default now()
);

-- View agregada do Discover
create or replace view disc_companies_full as
select
  c.*,
  cs.final_score, cs.score_class,
  cs.fit_score, cs.digital_score, cs.contact_score, cs.authority_score,
  cs.model_version,
  ce.email, ce.phone, ce.instagram, ce.linkedin, ce.whatsapp,
  ce.enrichment_status,
  ca.executive_summary, ca.partnership_potential,
  ca.recommended_action, ca.confidence_score,
  sig.has_instagram, sig.has_email, sig.has_whatsapp,
  sig.has_online_store, sig.custom_signals,
  (select human_rating from disc_validations dv
   where dv.company_id = c.id
   order by dv.created_at desc limit 1) as latest_validation,
  (select count(*) from disc_validations dv
   where dv.company_id = c.id) as validation_count
from disc_companies c
left join disc_scoring cs on cs.company_id = c.id
left join disc_enrichment ce on ce.company_id = c.id
left join disc_ai_analysis ca on ca.company_id = c.id
left join disc_signals sig on sig.company_id = c.id;

-- ============================================================
-- MÓDULO PULSE (placeholder — fase 3)
-- Tabelas criadas vazias para reservar o espaço no schema
-- ============================================================

create table if not exists pulse_leads (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  name           text not null,
  email          text,
  phone          text,
  website        text,
  city           text,
  market         text check (market in ('pt','es','br')),
  sector         text,
  segment        text,
  quality_score  integer default 50,
  google_rating  numeric(3,1),
  intent_score   integer default 0,
  status         text default 'cold' check (status in ('cold','warm','hot','optout','converted')),
  source         text,
  opt_out        boolean default false,
  opt_out_at     timestamptz,
  created_at     timestamptz default now()
);

create table if not exists pulse_sequences (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  lead_id        uuid not null references pulse_leads(id) on delete cascade,
  status         text default 'active' check (status in ('active','paused','completed','cancelled')),
  current_step   integer default 0,
  last_signal    text,
  meeting_booked boolean default false,
  meeting_at     timestamptz,
  created_at     timestamptz default now()
);

create table if not exists pulse_messages (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  lead_id     uuid not null references pulse_leads(id) on delete cascade,
  sequence_id uuid references pulse_sequences(id),
  direction   text check (direction in ('outbound','inbound')),
  channel     text check (channel in ('email','whatsapp','sms')),
  content     text,
  signal      text check (signal in ('positive','question','objection','delay','negative','optout')),
  sent_at     timestamptz default now()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

create index if not exists idx_tenant_users_user     on tenant_users(user_id);
create index if not exists idx_tenant_users_tenant   on tenant_users(tenant_id);
create index if not exists idx_events_tenant         on events(tenant_id, created_at desc);
create index if not exists idx_events_module         on events(module, event_type);
create index if not exists idx_disc_companies_tenant on disc_companies(tenant_id);
create index if not exists idx_disc_companies_status on disc_companies(tenant_id, status);
create index if not exists idx_disc_scoring_score    on disc_scoring(tenant_id, final_score desc);
create index if not exists idx_pulse_leads_tenant    on pulse_leads(tenant_id, status);
create index if not exists idx_businesses_tenant     on businesses(tenant_id);
create index if not exists idx_clients_business      on clients(business_id);
create index if not exists idx_alerts_business       on alerts(business_id, read);

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_tenants_updated_at on tenants;
create trigger trg_tenants_updated_at
  before update on tenants
  for each row execute function set_updated_at();

drop trigger if exists trg_disc_companies_updated_at on disc_companies;
create trigger trg_disc_companies_updated_at
  before update on disc_companies
  for each row execute function set_updated_at();

drop trigger if exists trg_businesses_updated_at on businesses;
create trigger trg_businesses_updated_at
  before update on businesses
  for each row execute function set_updated_at();

drop trigger if exists trg_new_user_profile on auth.users;
create trigger trg_new_user_profile
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

alter table tenants          enable row level security;
alter table tenant_users     enable row level security;
alter table invitations      enable row level security;
alter table profiles         enable row level security;
alter table events           enable row level security;
alter table billing_events   enable row level security;
alter table disc_companies   enable row level security;
alter table disc_enrichment  enable row level security;
alter table disc_scoring     enable row level security;
alter table disc_ai_analysis enable row level security;
alter table disc_signals     enable row level security;
alter table disc_validations enable row level security;
alter table disc_outreach    enable row level security;
alter table pulse_leads      enable row level security;
alter table pulse_sequences  enable row level security;
alter table pulse_messages   enable row level security;

-- Helper: tenant do utilizador actual
create or replace function my_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from tenant_users
  where user_id = auth.uid() limit 1;
$$;

-- Helper: role do utilizador actual
create or replace function my_role()
returns text language sql stable security definer as $$
  select role from tenant_users
  where user_id = auth.uid()
  and tenant_id = my_tenant_id() limit 1;
$$;

-- Profiles: cada um vê o próprio
drop policy if exists "profiles_own" on profiles;
create policy "profiles_own" on profiles
  for all using (id = auth.uid());

-- Tenant users: vê membros do mesmo tenant
drop policy if exists "tenant_users_read" on tenant_users;
create policy "tenant_users_read" on tenant_users
  for select using (tenant_id = my_tenant_id());

-- Discover: acesso isolado por tenant
drop policy if exists "disc_companies_tenant" on disc_companies;
create policy "disc_companies_tenant" on disc_companies
  for all using (tenant_id = my_tenant_id());

drop policy if exists "disc_enrichment_tenant" on disc_enrichment;
create policy "disc_enrichment_tenant" on disc_enrichment
  for all using (tenant_id = my_tenant_id());

drop policy if exists "disc_scoring_tenant" on disc_scoring;
create policy "disc_scoring_tenant" on disc_scoring
  for all using (tenant_id = my_tenant_id());

drop policy if exists "disc_ai_analysis_tenant" on disc_ai_analysis;
create policy "disc_ai_analysis_tenant" on disc_ai_analysis
  for all using (tenant_id = my_tenant_id());

drop policy if exists "disc_signals_tenant" on disc_signals;
create policy "disc_signals_tenant" on disc_signals
  for all using (tenant_id = my_tenant_id());

drop policy if exists "disc_validations_tenant" on disc_validations;
create policy "disc_validations_tenant" on disc_validations
  for all using (tenant_id = my_tenant_id());

drop policy if exists "disc_outreach_tenant" on disc_outreach;
create policy "disc_outreach_tenant" on disc_outreach
  for all using (tenant_id = my_tenant_id());

-- Pulse
drop policy if exists "pulse_leads_tenant" on pulse_leads;
create policy "pulse_leads_tenant" on pulse_leads
  for all using (tenant_id = my_tenant_id());

drop policy if exists "pulse_sequences_tenant" on pulse_sequences;
create policy "pulse_sequences_tenant" on pulse_sequences
  for all using (tenant_id = my_tenant_id());

drop policy if exists "pulse_messages_tenant" on pulse_messages;
create policy "pulse_messages_tenant" on pulse_messages
  for all using (tenant_id = my_tenant_id());

-- Eventos
drop policy if exists "events_tenant" on events;
create policy "events_tenant" on events
  for all using (tenant_id = my_tenant_id());

-- Feedback: mantém as policies existentes para não quebrar produção
-- businesses e clients já têm "public_access" — não alteramos

-- ============================================================
-- TENANT INICIAL — Aurifoods (Discover)
-- Descomenta após executar o schema
-- ============================================================
/*
insert into tenants (
  name, slug, market,
  module_discover, plan,
  business_context, fit_keywords, ai_prompt_context
) values (
  'Aurifoods', 'aurifoods', 'pt',
  true, 'trial',
  'Marca portuguesa de suplementos e nutrição funcional (colágenos, proteínas, cafés funcionais). Objectivo: encontrar parceiros de revenda em Portugal — ginásios, farmácias, lojas naturais, nutricionistas, clínicas de bem-estar.',
  ARRAY['ginásio','health club','farmácia','parafarmácia','loja natureza','nutricionista','clínica nutrição','personal trainer','wellness','suplementos','sports nutrition'],
  'Analisa o potencial desta empresa como parceiro de revenda para uma marca premium de suplementos portugueses. Avalia alinhamento com público fitness/wellness e capacidade de distribuição presencial.'
);
*/
