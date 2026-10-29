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
    const items = Object.values(cart).map((item) => ({
      id: String(item.id),
      name: String(item.name),
      price: Math.max(0, Number(item.price) || 0),
      quantity: Math.max(1, Number(item.qty) || 1),
    }));
    const { data, error } = await client
      .from("shop_orders")
      .insert({
        customer_id: user.id,
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        delivery_area: customer.area.trim(),
        extra_details: customer.details.trim(),
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
    loadCart,
    saveCart,
    signInAdmin,
    signOut,
    updateOrderStatus,
  };
})();
