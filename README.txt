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

The customer checkout stores the name, phone, delivery area, notes, items, count, and estimated total. Admins can view up to 200 recent orders and non-empty carts, and update order status. This remains an order-request workflow, not payment processing.

## Editing
Edit `index.html` in VS Code. The HTML, CSS, product data, and JavaScript are in that one file. Keep a backup before making changes.


## Add your own product images
1. Copy your phone photos into the `images` folder.
2. Open `index.html` in VS Code.
3. Use the Admin panel to set the product's image path to a relative path, e.g. `images/iphone-13.jpg`. A custom path overrides the default model image.
4. Save the file and refresh the browser.

Note: this static edition currently contains 71 catalog entries, including 3 laptops and the added Huawei and Nothing models.


ADMIN PANEL
1. Open your shop URL and add `/admin/` to the end of the address.
2. Sign in with the Supabase admin user's email and password.
3. View orders, customer details, requested products, item counts, and non-empty carts. Update order status from the order list.
4. Product edits, imports, and exports still save in this browser only; order and cart data are stored in Supabase.
