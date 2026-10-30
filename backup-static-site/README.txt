# Natis Phone Ent — no-install static website

## Run it
- Open `index.html` directly in Chrome, Edge, Firefox, or another modern browser.
- No Node.js, npm, terminal, server, or build step is needed to view the storefront.
- Internet is needed for product images and WhatsApp links.

## Included
- Responsive storefront layout
- Search and brand filtering
- Product catalog copied from the existing Natis project catalog
- Customer cart snapshots stored in Supabase when configured
- Checkout requests stored in Supabase before opening WhatsApp at +233 555 016 982

## Important limitations
This is the static/no-build edition. Supabase must be configured before checkout requests or customer carts are recorded. Checkout stores a pending order, then opens WhatsApp for confirmation; it does not charge a customer or verify payment. Customer details and carts are protected by Supabase row-level security. Phone listings with confirmed model matches use GSMArena image URLs and require an internet connection. Custom product image paths override the model image. Confirm prices and stock with the shop before accepting an order.

## Configure Supabase
1. Create a Supabase project.
2. In the Supabase SQL Editor, run `original-project-source/supabase/schema.sql`.
3. In Authentication settings, enable anonymous sign-ins and email/password sign-ins.
4. Open `supabase-config.js` and set `url` and `anonKey` from the project's API settings. The publishable/anon key is intended for browser use; never put a service-role key in this file.
5. Create an admin user in Supabase Authentication. In the SQL Editor, replace the example email and run `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb where email = 'admin@example.com';`. The admin panel at `/admin/` accepts only users with this role.
6. Host the site over HTTP/HTTPS and add its URL to Supabase Auth's allowed site/redirect URLs. Direct `file://` use cannot reliably complete Supabase authentication.
7. Re-run `original-project-source/supabase/schema.sql` to create the shared product table, restricted image bucket, and current row-level security policies.

The customer checkout stores the name, phone, delivery area, notes, items, count, and estimated total. Admins can view up to 200 recent orders and non-empty carts, and update order status. This remains an order-request workflow, not payment processing. Paystack is not connected; orders remain pending and no payment credentials or card data are collected.

Products load from Supabase when the `shop_products` table contains published rows, with the built-in catalog used if it is empty or unavailable. Admin product changes publish to Supabase. Uploaded product photos are stored in the public `product-images` bucket; only authenticated admins can upload, replace, or delete files. Only JPEG, PNG, and WebP files up to 5 MB are accepted.

## Editing
Edit `index.html` in VS Code. The HTML, CSS, product data, and JavaScript are in that one file. Keep a backup before making changes.


## Add your own product images
1. Sign in to the Admin panel with the Supabase admin account.
2. Open a product form and choose a JPEG, PNG, or WebP image up to 5 MB. Supabase Storage uploads it and the resulting public URL is saved with the product.
3. Or set a product image path/URL manually. A custom image overrides the default model image.

Note: this static edition currently contains 71 catalog entries, including 3 laptops and the added Huawei and Nothing models.


ADMIN PANEL
1. Open your shop URL and add `/admin/` to the end of the address.
2. Sign in with the Supabase admin user's email and password.
3. View orders, customer details, requested products, item counts, and non-empty carts. Update order status from the order list.
4. Product edits publish to Supabase; exports and imports are performed in the browser. Order and cart data are stored in Supabase.
