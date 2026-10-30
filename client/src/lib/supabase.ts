import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./catalog";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export type OrderCustomer = {
  name: string;
  phone: string;
  area: string;
  details: string;
};

export type OrderRecord = {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_area: string;
  extra_details: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  item_count: number;
  total: number;
  currency: string;
  status: "pending" | "contacted" | "completed" | "cancelled";
  created_at: string;
};

async function requireSupabase(): Promise<SupabaseClient> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

async function currentUser() {
  const client = await requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function hasSupabaseAdminSession(): Promise<boolean> {
  const user = await currentUser();
  return user?.app_metadata.role === "admin";
}

async function ensureCustomer() {
  const client = await requireSupabase();
  const existing = await currentUser();
  if (existing) return existing;
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not create a customer session.");
  return data.user;
}

export async function loadSupabaseCatalog(): Promise<Product[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("catalog_products").select("id, product");
  if (error) throw error;
  return (data ?? []).map((row) => row.product as Product);
}

export async function publishSupabaseCatalog(products: Product[]): Promise<void> {
  const client = await requireSupabase();
  const user = await currentUser();
  if (user?.app_metadata.role !== "admin") {
    throw new Error("An authenticated Supabase admin account is required to publish products.");
  }
  const rows = products.map((product) => ({ id: product.id, product, updated_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await client.from("catalog_products").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
}

export async function deleteSupabaseProduct(id: string): Promise<void> {
  const client = await requireSupabase();
  const user = await currentUser();
  if (user?.app_metadata.role !== "admin") {
    throw new Error("An authenticated Supabase admin account is required to delete products.");
  }
  const { error } = await client.from("catalog_products").delete().eq("id", id);
  if (error) throw error;
}

export async function createSupabaseOrder({
  customer,
  cart,
}: {
  customer: OrderCustomer;
  cart: Array<{ product: Product; quantity: number }>;
}): Promise<Pick<OrderRecord, "id" | "created_at">> {
  const client = await requireSupabase();
  const user = await ensureCustomer();
  const name = customer.name.trim();
  const phone = customer.phone.trim();
  const area = customer.area.trim();
  const details = customer.details.trim();
  if (!name || name.length > 120 || phone.length < 5 || phone.length > 40 || !area || area.length > 160 || details.length > 2000) {
    throw new Error("Check your name, phone number, delivery area, and order notes.");
  }
  const items = cart.map(({ product, quantity }) => {
    if (!product.id || !product.name.trim() || !Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(product.price) || product.price < 0) {
      throw new Error("The cart contains an invalid product or quantity.");
    }
    return { id: product.id, name: product.name, price: product.price, quantity };
  });
  if (!items.length) throw new Error("Your cart is empty.");
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

export async function signInSupabaseAdmin(email: string, password: string): Promise<void> {
  const client = await requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user?.app_metadata.role !== "admin") {
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) throw signOutError;
    throw new Error("This account is not assigned the Supabase admin role.");
  }
}

export async function signOutSupabase(): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function loadAdminOrders(): Promise<OrderRecord[]> {
  const client = await requireSupabase();
  const user = await currentUser();
  if (user?.app_metadata.role !== "admin") {
    throw new Error("An authenticated Supabase admin account is required to view orders.");
  }
  const { data, error } = await client
    .from("shop_orders")
    .select("id, customer_name, customer_phone, delivery_area, extra_details, items, item_count, total, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as OrderRecord[];
}

export async function updateSupabaseOrderStatus(
  orderId: string,
  status: OrderRecord["status"],
): Promise<void> {
  const client = await requireSupabase();
  const user = await currentUser();
  if (user?.app_metadata.role !== "admin") {
    throw new Error("An authenticated Supabase admin account is required to update orders.");
  }
  const { error } = await client.from("shop_orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}

export async function uploadSupabaseProductImage(file: File, productId: string): Promise<string> {
  const client = await requireSupabase();
  const user = await currentUser();
  if (user?.app_metadata.role !== "admin") {
    throw new Error("An authenticated Supabase admin account is required to upload product images.");
  }
  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[file.type];
  if (!extension) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");

  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `${safeProductId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await client.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return client.storage.from("product-images").getPublicUrl(data.path).data.publicUrl;
}
