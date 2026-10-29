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
