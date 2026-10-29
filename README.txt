# Natis Phone Ent — no-install static website

## Run it
- Open `index.html` directly in Chrome, Edge, Firefox, or another modern browser.
- No Node.js, npm, terminal, server, or build step is needed to view the storefront.
- Internet is needed for product images and WhatsApp links.

## Included
- Responsive storefront layout
- Search and brand filtering
- Product catalog copied from the existing Natis project catalog
- Browser-local shopping cart (stored on this device/browser)
- Checkout form that sends an order request to WhatsApp at +233 555 016 982

## Important limitations
This is the static/no-install edition. The cart is saved only in the current browser, not in Supabase. Checkout opens WhatsApp; it does not charge a customer or verify a payment. Admin editing, secure online payment, and server-side order storage need a hosted backend and configuration. Phone listings with confirmed model matches use GSMArena image URLs; these require an internet connection. Set a product's own image path to override its default image. Unmatched models keep the placeholder. Confirm prices and stock with the shop before accepting an order.

## Editing
Edit `index.html` in VS Code. The HTML, CSS, product data, and JavaScript are in that one file. Keep a backup before making changes.


## Add your own product images
1. Copy your phone photos into the `images` folder.
2. Open `index.html` in VS Code.
3. Use the Admin panel to set the product's image path to a relative path, e.g. `images/iphone-13.jpg`. A custom path overrides the default model image.
4. Save the file and refresh the browser.

Note: this static edition currently contains 71 catalog entries, including 3 laptops and the added Huawei and Nothing models.


ADMIN PANEL
1. Open your shop URL and add `/admin` to the end of the address to open the admin page.
2. Default passcode: NatisChangeMe2026
3. Change ADMIN_PASSCODE in index.html before sharing the file. This is only a client-side convenience lock, NOT secure authentication for a public website.
4. Add/edit/delete products, import/export products JSON, or reset to the original catalog.
5. Changes save in this browser only. Export products JSON regularly for backup. They do not sync to other devices or change a separately hosted copy automatically.
6. For a secure public admin panel, connect a real backend with authentication and a database.
