# Natis Enterprise — VS Code project

This project keeps the existing React storefront, styling, product detail pages, cart, compare view, and catalog admin interface. Platform-specific runtime, login, and storage integrations and their debug assets have been removed from this distribution. Vite remains because it is the development/build tool for the existing React + TypeScript app, not a hosting or database service.

## Run locally

1. Install Node.js (LTS).
2. Extract the ZIP and open this folder in VS Code.
3. In the terminal run `corepack enable`, then `corepack prepare pnpm@10.18.0 --activate`, then `pnpm install`.
4. Run `pnpm dev` and open the local URL printed by Vite (normally `http://localhost:3000`).

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's public/publishable anon key. Never put a service-role key in frontend code.
3. Run `supabase/schema.sql` in Supabase SQL Editor.
4. Restart `pnpm dev`. The storefront will attempt to load catalog products from Supabase. The admin Publish button will write to the `catalog_products` table when Supabase is configured.

### Important security and completion notes

- The current admin screen is not yet protected by a finished sign-in flow. The SQL write policies require authenticated users with `app_metadata.role = 'admin'`, so writes will be denied until Supabase Auth and admin assignment are configured. Do not expose `/admin` publicly until this is completed.
- The initial storefront still has a local seeded catalog; an empty Supabase table falls back to it. Admin drafts are saved in the browser until published.
- This ZIP prepares the catalog data layer for Supabase; it does not yet migrate every possible feature into Supabase. Online payment, order persistence, secure admin login, image uploads/storage, and order notifications must be configured before production.
- External product image URLs need an internet connection. For reliable production use, confirm image rights and upload approved images to Supabase Storage or another host.
- Netlify can host the built frontend (`pnpm build`, publish `dist/public`). Vite is needed for local development/build, but the deployed site does not run Vite as a backend.
