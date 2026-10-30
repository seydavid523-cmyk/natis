(() => {
  const config = window.NATIS_SUPABASE_CONFIG || {};
  const isConfigured = Boolean(
    window.supabase?.createClient &&
      config.url &&
      config.anonKey &&
      !config.url.includes("YOUR-PROJECT") &&
      !config.anonKey.includes("YOUR_SUPABASE"),
  );
  const client = isConfigured
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

  async function currentUser() {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") throw error;
    return data.user || null;
  }

  async function ensureCustomer() {
    if (!client) return null;
    const existing = await currentUser();
    if (existing) return existing;
    const { data, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    return data.user;
  }

  async function loadCart() {
    if (!client) return null;
    const user = await ensureCustomer();
    const { data, error } = await client
      .from("shop_carts")
      .select("items")
      .eq("customer_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return Object.fromEntries((data?.items || []).map((item) => [item.id, item]));
  }

  async function loadCatalog() {
    if (!client) return null;
    const { data, error } = await client
      .from("shop_products")
      .select("id, product")
      .order("id", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => row.product).filter((product) => product && product.id);
  }

  async function saveCatalog(products) {
    if (!client) throw new Error("Supabase is not configured.");
    const user = await currentUser();
    if (user?.app_metadata?.role !== "admin") {
      throw new Error("An authenticated admin account is required to publish products.");
    }

    const rows = products.map((product) => ({
      id: String(product.id),
      product,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      const { error } = await client
        .from("shop_products")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    const { data: existing, error: readError } = await client
      .from("shop_products")
      .select("id");
    if (readError) throw readError;

    const wanted = new Set(rows.map((row) => row.id));
    const staleIds = (existing || [])
      .map((row) => row.id)
      .filter((id) => !wanted.has(id));
    if (staleIds.length) {
      const { error } = await client
        .from("shop_products")
        .delete()
        .in("id", staleIds);
      if (error) throw error;
    }
  }

  async function uploadProductImage(file, productId) {
    if (!client) throw new Error("Supabase is not configured.");
    const user = await currentUser();
    if (user?.app_metadata?.role !== "admin") {
      throw new Error("An authenticated admin account is required to upload product images.");
    }
    const extensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensions[file?.type];
    if (!extension) throw new Error("Choose a JPEG, PNG, or WebP image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

    const safeProductId = String(productId).replace(/[^a-zA-Z0-9_-]/g, "-");
    const path = `${safeProductId}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await client.storage
      .from("product-images")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;

    const { data: publicUrl } = client.storage
      .from("product-images")
      .getPublicUrl(data.path);
    return publicUrl.publicUrl;
  }

  async function saveCart(cart) {
    if (!client) return;
    const user = await ensureCustomer();
    const items = Object.values(cart);
    const { error } = await client.from("shop_carts").upsert(
      {
        customer_id: user.id,
        items,
        item_count: items.reduce((count, item) => count + Number(item.qty || 0), 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id" },
    );
    if (error) throw error;
  }

  async function createOrder({ customer, cart }) {
    if (!client) throw new Error("Supabase is not configured.");
    const user = await ensureCustomer();
    const items = Object.values(cart || {}).map((item) => {
      const quantity = Number(item.qty);
      const price = Number(item.price);
      const id = String(item.id || "").trim();
      const name = String(item.name || "").trim();
      if (!id || !name || !Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) {
        throw new Error("The cart contains an invalid product or quantity.");
      }
      return { id, name, price, quantity };
    });
    if (!items.length) throw new Error("Your cart is empty.");
    const name = String(customer.name || "").trim();
    const phone = String(customer.phone || "").trim();
    const area = String(customer.area || "").trim();
    const details = String(customer.details || "").trim();
    if (name.length < 1 || name.length > 120 || phone.length < 5 || phone.length > 40 || area.length < 1 || area.length > 160 || details.length > 2000) {
      throw new Error("Check your name, phone number, delivery area, and order notes.");
    }
    const { data, error } = await client
      .from("shop_orders")
      .insert({
        customer_id: user.id,
        customer_name: name,
        customer_phone: phone,
        delivery_area: area,
        extra_details: details,
        items,
        item_count: items.reduce((count, item) => count + item.quantity, 0),
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        currency: "GHS",
        status: "pending",
      })
      .select("id, created_at")
      .single();
    if (error) throw error;
    return data;
  }

  async function signInAdmin(email, password) {
    if (!client) throw new Error("Supabase is not configured.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user?.app_metadata?.role !== "admin") {
      await client.auth.signOut();
      throw new Error("This account is not assigned the admin role.");
    }
    return data.user;
  }

  async function adminOrders() {
    if (!client) throw new Error("Supabase is not configured.");
    const { data, error } = await client
      .from("shop_orders")
      .select("id, customer_name, customer_phone, delivery_area, extra_details, items, item_count, total, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  }

  async function adminCarts() {
    if (!client) throw new Error("Supabase is not configured.");
    const { data, error } = await client
      .from("shop_carts")
      .select("customer_id, items, item_count, updated_at")
      .gt("item_count", 0)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  }

  async function updateOrderStatus(orderId, status) {
    if (!client) throw new Error("Supabase is not configured.");
    const { error } = await client.from("shop_orders").update({ status }).eq("id", orderId);
    if (error) throw error;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  window.NatisStore = {
    adminCarts,
    adminOrders,
    createOrder,
    currentUser,
    isConfigured,
    loadCatalog,
    loadCart,
    saveCatalog,
    saveCart,
    signInAdmin,
    signOut,
    uploadProductImage,
    updateOrderStatus,
  };
})();
