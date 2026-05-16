import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS for KV operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);/**
 * A Key-Value store implementation using the existing `products` table.
 * This ensures no database migrations are needed while providing a robust, deploy-safe storage.
 */

export async function getKV<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('description')
      .eq('slug', `kv-${key}`)
      .single();
      
    if (error || !data?.description) return null;
    return JSON.parse(data.description) as T;
  } catch (error) {
    console.error(`[KV Store] Error reading key ${key}:`, error);
    return null;
  }
}

export async function setKV<T>(key: string, value: T): Promise<boolean> {
  try {
    const stringValue = JSON.stringify(value);
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', `kv-${key}`)
      .single();
    
    if (existing) {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ description: stringValue })
        .eq('id', existing.id);
      if (error) {
        console.error(`[KV Store] Supabase UPDATE Error for ${key}:`, error);
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin
        .from('products')
        .insert({
          title: `System Data - ${key}`,
          slug: `kv-${key}`,
          short_description: 'System internal data. Do not delete.',
          description: stringValue,
          price: 0,
          status: 'مخفي',
          image_url: 'https://via.placeholder.com/150',
          is_featured: false,
          sales: 0,
          views: 0
        });
      if (error) {
        console.error(`[KV Store] Supabase INSERT Error for ${key}:`, error);
        throw error;
      }
    }
    console.log(`[KV Store] Successfully saved key ${key}`);
    return true;
  } catch (error) {
    console.error(`[KV Store] Final Catch Error writing key ${key}:`, error);
    return false;
  }
}
