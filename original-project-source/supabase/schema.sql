-- Natis Enterprise catalog table. Run this in Supabase SQL Editor.
create table if not exists public.catalog_products (
  id text primary key,
  product jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.catalog_products enable row level security;

-- Visitors can read the catalog. The app filters hidden/not-for-publication products.
drop policy if exists "Public can read catalog" on public.catalog_products;
create policy "Public can read catalog" on public.catalog_products
  for select to anon, authenticated using (true);

-- Only signed-in users explicitly marked as admins in app_metadata can write.
drop policy if exists "Admins can insert catalog" on public.catalog_products;
create policy "Admins can insert catalog" on public.catalog_products
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update catalog" on public.catalog_products;
create policy "Admins can update catalog" on public.catalog_products
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete catalog" on public.catalog_products;
create policy "Admins can delete catalog" on public.catalog_products
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.shop_carts (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  item_count integer not null default 0 check (item_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.shop_carts enable row level security;
revoke all on public.shop_carts from anon, public;
grant select, insert, update, delete on public.shop_carts to authenticated;

drop policy if exists "Customers manage own carts" on public.shop_carts;
create policy "Customers manage own carts" on public.shop_carts
  for all to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

drop policy if exists "Admins read all carts" on public.shop_carts;
create policy "Admins read all carts" on public.shop_carts
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins delete carts" on public.shop_carts;
create policy "Admins delete carts" on public.shop_carts
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null check (length(trim(customer_name)) between 1 and 120),
  customer_phone text not null check (length(trim(customer_phone)) between 5 and 40),
  delivery_area text not null check (length(trim(delivery_area)) between 1 and 160),
  extra_details text not null default '',
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  item_count integer not null check (item_count > 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency text not null default 'GHS',
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.shop_orders enable row level security;
revoke all on public.shop_orders from anon, public;
grant select, insert, update on public.shop_orders to authenticated;

create index if not exists shop_orders_created_at_idx on public.shop_orders(created_at desc);
create index if not exists shop_carts_updated_at_idx on public.shop_carts(updated_at desc);

drop policy if exists "Customers create own orders" on public.shop_orders;
create policy "Customers create own orders" on public.shop_orders
  for insert to authenticated
  with check (customer_id = auth.uid() and status = 'pending');

drop policy if exists "Customers and admins read orders" on public.shop_orders;
create policy "Customers and admins read orders" on public.shop_orders
  for select to authenticated
  using (
    customer_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins update orders" on public.shop_orders;
create policy "Admins update orders" on public.shop_orders
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
