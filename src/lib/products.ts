/**
 * Products data layer with caching and optimized queries.
 * Uses a simple in-memory cache to prevent repeated Supabase calls
 * and statement timeouts.
 */

import { createClient } from "@supabase/supabase-js";

// ────────────────────────────────────────────────────────────────────────────
// Supabase client (singleton)
// ────────────────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  global: {
    headers: { "x-application-name": "youssef-automates-store" },
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  original_price: number | null;
  discount_pct: number | null;
  status: "نشط" | "مسودة" | "مخفي";
  is_featured: boolean;
  image_url: string;
  file_url: string | null;
  category: string | null;
  tags: string[] | null;
  sales: number;
  views: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields (stored in tags with prefixes)
  video_url?: string;
  gallery?: string[];
  file_type?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Simple client-side cache (keyed by query signature)
// ────────────────────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  ts: number;
}

const CACHE_TTL_MS = 30_000; // 30 s
const cache = new Map<string, CacheEntry<unknown>>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() });
}

export function invalidateProductsCache(): void {
  for (const key of cache.keys()) {
    if (key.startsWith("products:")) cache.delete(key);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Admin – fetch all products (paginated)
// ────────────────────────────────────────────────────────────────────────────
export async function fetchAdminProducts(opts: any = {}): Promise<{ products: any[]; total: number; error: string | null }> {
  try {
    console.log(`[DEBUG_ISOLATION] fetchAdminProducts start. Opts:`, opts);
    const start = Date.now();
    
    // SIMPLEST POSSIBLE QUERY
    const query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    console.log(`[DEBUG_ISOLATION] Executing simplest Supabase query...`);
    const { data, error } = await query;
    console.log(`[DEBUG_ISOLATION] Finished in ${Date.now() - start}ms. Error: ${error?.message || 'none'}. Rows: ${data?.length || 0}`);
    
    if (error) return { products: [], total: 0, error: error.message };

    return { products: data || [], total: data?.length || 0, error: null };
  } catch (err: unknown) {
    console.error(`[DEBUG_ISOLATION] caught error:`, err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { products: [], total: 0, error: msg };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Storefront – active products only
// ────────────────────────────────────────────────────────────────────────────
export async function fetchActiveProducts(opts: {
  limit?: number;
  featured?: boolean;
  force?: boolean;
} = {}): Promise<{ products: Product[]; error: string | null }> {
  const { limit = 50, featured, force = false } = opts;
  const cacheKey = `products:active:${limit}:${featured ?? "all"}`;

  if (!force) {
    const cached = getCache<Product[]>(cacheKey);
    if (cached) return { products: cached, error: null };
  }

  try {
    console.log(`[DEBUG] fetchActiveProducts start. Limit: ${limit}, Featured: ${featured}`);
    const start = Date.now();
    let query = supabase
      .from("products")
      .select(
        "id, title, slug, description, short_description, price, original_price, discount_pct, is_featured, image_url, file_url, category, tags, sales, created_at"
      )
      .eq("status", "نشط")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (featured !== undefined) {
      query = query.eq("is_featured", featured);
    }

    console.log(`[DEBUG] fetchActiveProducts executing query...`);
    const { data, error } = await query;
    console.log(`[DEBUG] fetchActiveProducts finished in ${Date.now() - start}ms. Error: ${error?.message || 'none'}. Rows: ${data?.length || 0}`);
    
    if (error) return { products: [], error: error.message };

    const products = (data as Product[]) || [];
    setCache(cacheKey, products);
    return { products, error: null };
  } catch (err: unknown) {
    console.error(`[DEBUG] fetchActiveProducts caught error:`, err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { products: [], error: msg };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Insert
// ────────────────────────────────────────────────────────────────────────────
export async function insertProduct(
  payload: Omit<Product, "id" | "created_at" | "updated_at" | "sales" | "views">
): Promise<{ product: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, sales: 0, views: 0 })
      .select()
      .single();

    if (error) return { product: null, error: error.message };
    invalidateProductsCache();
    return { product: data as Product, error: null };
  } catch (err: unknown) {
    return { product: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────────────────────
export async function updateProduct(
  id: string,
  payload: Partial<Omit<Product, "id" | "created_at">>
): Promise<{ product: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from("products")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return { product: null, error: error.message };
    invalidateProductsCache();
    return { product: data as Product, error: null };
  } catch (err: unknown) {
    return { product: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Delete
// ────────────────────────────────────────────────────────────────────────────
export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: error.message };
    invalidateProductsCache();
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Slug generator
// ────────────────────────────────────────────────────────────────────────────
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || `product-${Date.now()}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Discount calculator
// ────────────────────────────────────────────────────────────────────────────
export function calcDiscount(price: number, originalPrice: number | null): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
