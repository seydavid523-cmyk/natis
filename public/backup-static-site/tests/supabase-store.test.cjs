const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "supabase-store.js"), "utf8");

function createStore({ user = { id: "customer-1", app_metadata: { role: "admin" } }, catalog = [] } = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      signInAnonymously: async () => ({ data: { user }, error: null }),
      signInWithPassword: async () => ({ data: { user }, error: null }),
      signOut: async () => {
        calls.push({ operation: "signOut" });
        return { error: null };
      },
    },
    from(table) {
      const query = {
        select(columns) {
          calls.push({ operation: "select", table, columns });
          return this;
        },
        order(column, options) {
          calls.push({ operation: "order", table, column, options });
          return this;
        },
        upsert(rows, options) {
          calls.push({ operation: "upsert", table, rows, options });
          return this;
        },
        insert(row) {
          calls.push({ operation: "insert", table, row });
          return this;
        },
        delete() {
          calls.push({ operation: "delete", table });
          return this;
        },
        in(column, values) {
          calls.push({ operation: "in", table, column, values });
          return this;
        },
        eq(column, value) {
          calls.push({ operation: "eq", table, column, value });
          return this;
        },
        gt(column, value) {
          calls.push({ operation: "gt", table, column, value });
          return this;
        },
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: "order-1", created_at: "2026-10-30T00:00:00Z" }, error: null }),
        then(resolve, reject) {
          const data = table === "shop_products"
            ? catalog
            : table === "shop_orders"
              ? [{ id: "order-1" }]
              : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    storage: {
      from(bucket) {
        return {
          upload: async (filePath, file, options) => {
            calls.push({ operation: "upload", bucket, filePath, file, options });
            return { data: { path: filePath }, error: null };
          },
          getPublicUrl(filePath) {
            calls.push({ operation: "publicUrl", bucket, filePath });
            return { data: { publicUrl: `https://store.example/storage/${filePath}` } };
          },
        };
      },
    },
  };
  const window = {
    NATIS_SUPABASE_CONFIG: {
      url: "https://test-project.supabase.co",
      anonKey: "test-publishable-key",
    },
    supabase: { createClient: () => client },
  };
  vm.runInNewContext(source, {
    window,
    console,
    Date,
    crypto: { randomUUID: () => "image-id" },
  });
  return { store: window.NatisStore, calls };
}

test("loads published products from the public shop_products table", async () => {
  const product = { id: "phone-1", name: "Phone", brand: "Brand", price: 100, image: "", desc: "" };
  const { store, calls } = createStore({ catalog: [{ id: product.id, product }] });

  const loaded = await store.loadCatalog();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, product.id);
  assert.ok(calls.some((call) => call.operation === "select" && call.table === "shop_products"));
});

test("publishes and removes stale products only for an admin", async () => {
  const { store, calls } = createStore({ catalog: [{ id: "stale" }] });
  await store.saveCatalog([{ id: "new", name: "New phone" }]);

  assert.ok(calls.some((call) => call.operation === "upsert" && call.table === "shop_products"));
  assert.ok(calls.some((call) => call.operation === "delete" && call.table === "shop_products"));
  const unauthorized = createStore({ user: { id: "customer-1", app_metadata: {} } });
  await assert.rejects(unauthorized.store.saveCatalog([]), /authenticated admin/);
  assert.equal(unauthorized.calls.some((call) => call.operation === "upsert"), false);
});

test("uploads an accepted product image only for admins", async () => {
  const { store, calls } = createStore();
  const image = { type: "image/png", size: 1024 };

  assert.equal(await store.uploadProductImage(image, "phone/unsafe"), "https://store.example/storage/phone-unsafe/image-id.png");
  assert.ok(calls.some((call) =>
    call.operation === "upload" &&
    call.bucket === "product-images" &&
    call.options.upsert === false &&
    call.options.contentType === "image/png"
  ));
  await assert.rejects(store.uploadProductImage({ type: "image/svg+xml", size: 1024 }, "phone-1"), /JPEG, PNG, or WebP/);
  await assert.rejects(store.uploadProductImage({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }, "phone-1"), /5 MB/);

  const unauthorized = createStore({ user: { id: "customer-1", app_metadata: {} } });
  await assert.rejects(unauthorized.store.uploadProductImage(image, "phone-1"), /authenticated admin/);
  assert.equal(unauthorized.calls.some((call) => call.operation === "upload"), false);
});

test("creates pending GHS order requests from validated cart lines", async () => {
  const { store, calls } = createStore();
  const result = await store.createOrder({
    customer: { name: "Buyer", phone: "0240000000", area: "Accra", details: "" },
    cart: { phone: { id: "phone-1", name: "Phone", price: 125, qty: 2 } },
  });
  const order = calls.find((call) => call.operation === "insert" && call.table === "shop_orders").row;

  assert.equal(result.id, "order-1");
  assert.equal(order.status, "pending");
  assert.equal(order.currency, "GHS");
  assert.equal(order.item_count, 2);
  assert.equal(order.total, 250);
  await assert.rejects(store.createOrder({
    customer: { name: "Buyer", phone: "0240000000", area: "Accra", details: "" },
    cart: { phone: { id: "phone-1", name: "Phone", price: 125, qty: 0 } },
  }), /invalid product or quantity/);
});

test("rejects non-admin sign-ins and clears their auth session", async () => {
  const { store, calls } = createStore({ user: { id: "user-1", app_metadata: { role: "customer" } } });

  await assert.rejects(store.signInAdmin("buyer@example.com", "password"), /not assigned the admin role/);
  assert.ok(calls.some((call) => call.operation === "signOut"));
});
