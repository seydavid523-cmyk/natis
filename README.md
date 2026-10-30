# Natis Phone Ent

The repository root is the single React + TypeScript storefront built with Vite. The original static website is preserved in [`backup-static-site/`](./backup-static-site/); Vite's application root is `client/`, so that backup is not included in the deployed site.

## Run and verify locally

1. Install Node.js 22 or newer and pnpm 10.
2. Run `pnpm install`.
3. Copy `.env.example` to `.env` and set the Supabase public project URL and publishable/anon key.
4. Run `pnpm dev` to open the storefront.
5. Run `pnpm check` and `pnpm build` before deployment.

Never put a Supabase service-role key in the browser app, a `VITE_` variable, or Netlify's frontend environment.

## Supabase

The app reads and publishes JSONB product records through `public.catalog_products`, the existing React catalog table. A read-only check of the configured public API found that `catalog_products` exists and currently returns no public rows; `shop_products` returned 404. The app therefore keeps its bundled catalog as the customer-facing fallback and does not copy, delete, or migrate database records.

The storefront order handoff writes a pending request to `shop_orders` before opening WhatsApp. It uses Supabase anonymous authentication for customer requests; the existing policies must allow that workflow. Admin sign-in uses Supabase email/password and requires `app_metadata.role = 'admin'`. Product publishing, deletion, order viewing/status updates, and image uploads are performed only after this role check and remain subject to the existing Row Level Security and Storage policies.

**No database schema or policy changes are applied by this project.** The checked-in `supabase/schema.sql` contains setup statements for both product tables, orders, carts, and Storage, including policy changes. Do not run that file against a live project as a blind migration. Confirm the live schema/policies first and obtain approval before making any database changes. Orders and image uploads will report Supabase errors until their required existing tables, bucket, and policies are available.

Order requests are not payments: no payment is collected, claimed, or verified. Customers receive a saved order reference and can continue to WhatsApp at +233 555 016982 to confirm stock, price, delivery, and payment with the shop.

## Netlify

The repository includes one deployment configuration in [`netlify.toml`](./netlify.toml):

- Build command: `pnpm build` (uses the checked-in `pnpm-lock.yaml`)
- Publish directory: `dist/public` (the output configured by `vite.config.ts`)
- Node.js: 22
- SPA fallback: unknown routes, including `/admin`, `/cart`, and `/checkout`, resolve to the Vite app's `index.html`.

In Netlify, connect this repository and deploy from the repository root. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables if Supabase is configured, then trigger a new deploy. These are public client credentials; never add a service-role key.

The original static HTML implementation, its config, admin page, and tests are retained in `backup-static-site/` for recovery and reference.
