import { supabase } from "./supabase";

/**
 * A Key-Value store implementation using the existing `products` table.
 * This ensures no database migrations are needed while providing a robust, deploy-safe storage.
 */

export async function getKV<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
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
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('slug', `kv-${key}`)
      .single();
    
    if (existing) {
      const { error } = await supabase
        .from('products')
        .update({ description: stringValue })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
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
      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error(`[KV Store] Error writing key ${key}:`, error);
    return false;
  }
}
