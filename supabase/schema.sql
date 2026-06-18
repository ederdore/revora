-- =============================================
-- STARLOOP — Schema Supabase
-- Cole isso no SQL Editor do Supabase
-- =============================================

-- 1. EMPRESAS
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text,
  google_link text not null,
  coupon_code text default 'VOLTA10',
  coupon_discount text default '10%',
  coupon_expiry text default '30 dias',
  avatar text default '⭐',
  item_label text default 'Serviço / Produto',
  items text[] default array['Visita', 'Compra', 'Serviço'],
  created_at timestamp with time zone default now()
);

-- 2. CLIENTES
create table clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  item text,
  status text default 'aguardando', -- aguardando | msg_enviada | avaliado | low_rating
  stars integer,
  coupon_sent boolean default false,
  visit_date date default current_date,
  visit_time text,
  created_at timestamp with time zone default now()
);

-- 3. ÍNDICES
create index on clients(business_id);
create index on clients(visit_date);
create index on clients(status);

-- 4. ROW LEVEL SECURITY (básico para MVP)
alter table businesses enable row level security;
alter table clients enable row level security;

-- Permite leitura/escrita livre para MVP (sem auth ainda)
create policy "public_access_businesses" on businesses for all using (true) with check (true);
create policy "public_access_clients" on clients for all using (true) with check (true);

-- 5. DADOS DE EXEMPLO
insert into businesses (name, segment, google_link, coupon_code, coupon_discount, coupon_expiry, avatar, item_label, items)
values (
  'Salão Bella Vita',
  'Salão de Beleza',
  'https://g.page/r/bella-vita/review',
  'VOLTA15',
  '15%',
  '30 dias',
  '✂️',
  'Serviço realizado',
  array['Corte', 'Escova', 'Coloração', 'Barba', 'Manicure', 'Pedicure']
);
