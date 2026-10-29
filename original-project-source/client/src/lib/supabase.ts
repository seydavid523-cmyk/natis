import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./catalog";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

/** Products are stored as JSONB to preserve the existing catalog shape without redesigning it. */
export async function loadSupabaseCatalog(): Promise<Product[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("catalog_products").select("id, product");
  if (error) throw error;
  return (data ?? []).map((row) => row.product as Product);
}

export async function publishSupabaseCatalog(products: Product[]): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured. Copy .env.example to .env and add your Supabase URL and anon key.");
  const rows = products.map((product) => ({ id: product.id, product, updated_at: new Date().toISOString() }));
  // Upsert first so a failed save never clears the existing catalog.
  if (rows.length) {
    const { error } = await supabase.from("catalog_products").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  const { data: existing, error: readError } = await supabase.from("catalog_products").select("id");
  if (readError) throw readError;
  const wanted = new Set(products.map((product) => product.id));
  const staleIds = (existing ?? []).map((row) => row.id as string).filter((id) => !wanted.has(id));
  for (const id of staleIds) {
    const { error } = await supabase.from("catalog_products").delete().eq("id", id);
    if (error) throw error;
  }
}
