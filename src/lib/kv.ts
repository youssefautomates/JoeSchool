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
    const slug = `kv-${key}`;
    console.log(`[KV Store] Setting key: ${key}, slug: ${slug}`);

    // Check if exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError) {
      console.error(`[KV Store] Fetch error for ${key}:`, fetchError);
    }

    if (existing) {
      console.log(`[KV Store] Updating existing record for ${key} (ID: ${existing.id})`);
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ 
          description: stringValue,
          title: `System Data - ${key}`, // Keep title updated
          status: 'مخفي'
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error(`[KV Store] Update error for ${key}:`, updateError);
        return false;
      }
    } else {
      console.log(`[KV Store] Inserting new record for ${key}`);
      const { error: insertError } = await supabaseAdmin
        .from('products')
        .insert({
          slug: slug,
          title: `System Data - ${key}`,
          short_description: 'System internal data. Do not delete.',
          description: stringValue,
          price: 0,
          status: 'مخفي',
          image_url: 'https://via.placeholder.com/150',
          is_featured: false,
          sales: 0,
          views: 0
        });

      if (insertError) {
        console.error(`[KV Store] Insert error for ${key}:`, insertError);
        return false;
      }
    }

    console.log(`[KV Store] Successfully persisted key: ${key}`);
    return true;
  } catch (error) {
    console.error(`[KV Store] Critical exception for key ${key}:`, error);
    return false;
  }
}

