import { supabaseClient } from "./supabaseClient";
import { Product } from "./products";
import { LmsCourse } from "./coursesDb";

export interface Bundle {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  price: number;
  original_price: number;
  price_egp?: number;
  original_price_egp?: number;
  price_usd?: number;
  original_price_usd?: number;
  image_url?: string;
  banner_url?: string;
  is_featured: boolean;
  status: "draft" | "published" | "hidden";
  created_at?: string;
  updated_at?: string;
}

export interface BundleItem {
  id?: string;
  bundle_id: string;
  item_type: "course" | "digital_product";
  course_id?: string | null;
  product_id?: string | null;
  sort_order?: number;
  created_at?: string;
  
  // Hydrated
  course?: LmsCourse;
  product?: Product;
}

export interface HydratedBundle extends Bundle {
  items: BundleItem[];
  discount_pct?: number;
}

// Fetch active published bundles
export async function fetchActiveBundles(): Promise<{ bundles: HydratedBundle[]; error: string | null }> {
  try {
    const { data: bundlesData, error: bundlesError } = await supabaseClient
      .from("bundles")
      .select("*")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (bundlesError) return { bundles: [], error: bundlesError.message };
    if (!bundlesData || bundlesData.length === 0) return { bundles: [], error: null };

    const hydrated: HydratedBundle[] = [];

    for (const bundle of bundlesData) {
      const { items, error: itemsError } = await fetchBundleItems(bundle.id);
      if (!itemsError) {
        const originalPriceSum = items.reduce((acc, it) => {
          const itemPrice = it.item_type === "course" 
            ? (it.course?.original_price || it.course?.price || 0)
            : (it.product?.original_price || it.product?.price || 0);
          return acc + Number(itemPrice);
        }, 0);

        const discount_pct = originalPriceSum > 0 
          ? Math.round(((originalPriceSum - bundle.price) / originalPriceSum) * 100) 
          : 0;

        hydrated.push({
          ...bundle,
          items,
          original_price: bundle.original_price || originalPriceSum,
          discount_pct: discount_pct > 0 ? discount_pct : 0
        });
      }
    }

    return { bundles: hydrated, error: null };
  } catch (err: any) {
    return { bundles: [], error: err.message };
  }
}

// Fetch single bundle by slug
export async function fetchBundleBySlug(slug: string): Promise<{ bundle: HydratedBundle | null; error: string | null }> {
  try {
    const { data: bundleData, error: bundleError } = await supabaseClient
      .from("bundles")
      .select("*")
      .eq("slug", slug)
      .single();

    if (bundleError) return { bundle: null, error: bundleError.message };
    if (!bundleData) return { bundle: null, error: "Bundle not found" };

    const { items, error: itemsError } = await fetchBundleItems(bundleData.id);
    if (itemsError) return { bundle: null, error: itemsError };

    const originalPriceSum = items.reduce((acc, it) => {
      const itemPrice = it.item_type === "course" 
        ? (it.course?.original_price || it.course?.price || 0)
        : (it.product?.original_price || it.product?.price || 0);
      return acc + Number(itemPrice);
    }, 0);

    const discount_pct = originalPriceSum > 0 
      ? Math.round(((originalPriceSum - bundleData.price) / originalPriceSum) * 100) 
      : 0;

    const hydrated: HydratedBundle = {
      ...bundleData,
      items,
      original_price: bundleData.original_price || originalPriceSum,
      discount_pct: discount_pct > 0 ? discount_pct : 0
    };

    return { bundle: hydrated, error: null };
  } catch (err: any) {
    return { bundle: null, error: err.message };
  }
}

// Fetch items for a bundle
export async function fetchBundleItems(bundleId: string): Promise<{ items: BundleItem[]; error: string | null }> {
  try {
    const { data: itemsData, error: itemsError } = await supabaseClient
      .from("bundle_items")
      .select("*")
      .eq("bundle_id", bundleId)
      .order("sort_order", { ascending: true });

    if (itemsError) return { items: [], error: itemsError.message };
    if (!itemsData || itemsData.length === 0) return { items: [], error: null };

    const courseIds = itemsData.filter(i => i.item_type === "course").map(i => i.course_id);
    const productIds = itemsData.filter(i => i.item_type === "digital_product").map(i => i.product_id);

    const [coursesRes, productsRes] = await Promise.all([
      courseIds.length > 0
        ? supabaseClient.from("courses").select("*").in("id", courseIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length > 0
        ? supabaseClient.from("products").select("*").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const coursesMap = new Map((coursesRes.data || []).map(c => [c.id, c]));
    const productsMap = new Map((productsRes.data || []).map(p => [p.id, p]));

    const hydrated: BundleItem[] = itemsData.map((item) => {
      const h: BundleItem = { ...item };
      if (item.item_type === "course") {
        h.course = coursesMap.get(item.course_id);
      } else if (item.item_type === "digital_product") {
        h.product = productsMap.get(item.product_id);
      }
      return h;
    }).filter(h => h.course || h.product);

    return { items: hydrated, error: null };
  } catch (err: any) {
    return { items: [], error: err.message };
  }
}

// Create a bundle (Admin)
export async function insertBundle(
  bundle: Omit<Bundle, "created_at" | "updated_at">,
  items: Omit<BundleItem, "id" | "bundle_id" | "created_at">[]
): Promise<{ bundle: Bundle | null; error: string | null }> {
  try {
    const { data: bundleData, error: bundleError } = await supabaseClient
      .from("bundles")
      .insert({ ...bundle })
      .select()
      .single();

    if (bundleError) return { bundle: null, error: bundleError.message };

    if (items.length > 0) {
      const itemsPayload = items.map((item, index) => ({
        bundle_id: bundleData.id,
        item_type: item.item_type,
        course_id: item.course_id || null,
        product_id: item.product_id || null,
        sort_order: item.sort_order ?? index,
      }));

      const { error: itemsError } = await supabaseClient
        .from("bundle_items")
        .insert(itemsPayload);

      if (itemsError) {
        return { bundle: bundleData, error: `Bundle created but items failed: ${itemsError.message}` };
      }
    }

    return { bundle: bundleData, error: null };
  } catch (err: any) {
    return { bundle: null, error: err.message };
  }
}

// Update bundle (Admin)
export async function updateBundle(
  id: string,
  bundle: Partial<Omit<Bundle, "id" | "created_at" | "updated_at">>,
  items?: Omit<BundleItem, "id" | "bundle_id" | "created_at">[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error: bundleError } = await supabaseClient
      .from("bundles")
      .update({ ...bundle, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (bundleError) return { success: false, error: bundleError.message };

    if (items !== undefined) {
      const { error: deleteError } = await supabaseClient
        .from("bundle_items")
        .delete()
        .eq("bundle_id", id);

      if (deleteError) return { success: false, error: `Failed to delete old bundle items: ${deleteError.message}` };

      if (items.length > 0) {
        const itemsPayload = items.map((item, index) => ({
          bundle_id: id,
          item_type: item.item_type,
          course_id: item.course_id || null,
          product_id: item.product_id || null,
          sort_order: item.sort_order ?? index,
        }));

        const { error: insertError } = await supabaseClient
          .from("bundle_items")
          .insert(itemsPayload);

        if (insertError) return { success: false, error: `Bundle updated but items failed: ${insertError.message}` };
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Delete bundle
export async function deleteBundle(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseClient
      .from("bundles")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
