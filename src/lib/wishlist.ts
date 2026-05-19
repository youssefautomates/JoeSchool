import { supabaseClient } from "./supabaseClient";
import { Product } from "./products";
import { LmsCourse } from "./coursesDb";

export interface WishlistItem {
  id?: string;
  user_id?: string;
  item_type: "course" | "digital_product" | "bundle";
  course_id?: string | null;
  product_id?: string | null;
  bundle_id?: string | null;
  created_at?: string;
  // Hydrated properties
  course?: LmsCourse;
  product?: Product;
  bundle?: any;
}

// Local Storage helpers for guest users
const LOCAL_WISHLIST_KEY = "youssef-automates-wishlist";

export function getLocalWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const val = localStorage.getItem(LOCAL_WISHLIST_KEY);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalWishlist(items: WishlistItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
  } catch (e) {}
}

// Check if item is in wishlist (local or database)
export async function isItemInWishlist(
  itemType: "course" | "digital_product" | "bundle",
  itemId: string,
  userId?: string | null
): Promise<boolean> {
  if (userId) {
    // Database check
    const query = supabaseClient
      .from("wishlist_items")
      .select("id")
      .eq("user_id", userId)
      .eq("item_type", itemType);
    
    if (itemType === "course") query.eq("course_id", itemId);
    else if (itemType === "digital_product") query.eq("product_id", itemId);
    else if (itemType === "bundle") query.eq("bundle_id", itemId);

    const { data, error } = await query;
    return !!(data && data.length > 0);
  } else {
    // Local check
    const items = getLocalWishlist();
    return items.some((item) => {
      if (item.item_type !== itemType) return false;
      if (itemType === "course") return item.course_id === itemId;
      if (itemType === "digital_product") return item.product_id === itemId;
      if (itemType === "bundle") return item.bundle_id === itemId;
      return false;
    });
  }
}

// Add item to wishlist (local or database)
export async function addToWishlist(
  itemType: "course" | "digital_product" | "bundle",
  itemId: string,
  userId?: string | null
): Promise<{ success: boolean; error: string | null }> {
  if (userId) {
    const payload: Partial<WishlistItem> = {
      user_id: userId,
      item_type: itemType,
      course_id: itemType === "course" ? itemId : null,
      product_id: itemType === "digital_product" ? itemId : null,
      bundle_id: itemType === "bundle" ? itemId : null,
    };
    
    const { error } = await supabaseClient
      .from("wishlist_items")
      .insert(payload);

    if (error) {
      if (error.code === "23505") { // Unique violation, ignore
        return { success: true, error: null };
      }
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } else {
    const items = getLocalWishlist();
    const alreadyExists = items.some((item) => {
      if (item.item_type !== itemType) return false;
      if (itemType === "course") return item.course_id === itemId;
      if (itemType === "digital_product") return item.product_id === itemId;
      if (itemType === "bundle") return item.bundle_id === itemId;
      return false;
    });

    if (!alreadyExists) {
      items.push({
        item_type: itemType,
        course_id: itemType === "course" ? itemId : null,
        product_id: itemType === "digital_product" ? itemId : null,
        bundle_id: itemType === "bundle" ? itemId : null,
      });
      saveLocalWishlist(items);
    }
    return { success: true, error: null };
  }
}

// Remove item from wishlist (local or database)
export async function removeFromWishlist(
  itemType: "course" | "digital_product" | "bundle",
  itemId: string,
  userId?: string | null
): Promise<{ success: boolean; error: string | null }> {
  if (userId) {
    const query = supabaseClient
      .from("wishlist_items")
      .delete()
      .eq("user_id", userId)
      .eq("item_type", itemType);

    if (itemType === "course") query.eq("course_id", itemId);
    else if (itemType === "digital_product") query.eq("product_id", itemId);
    else if (itemType === "bundle") query.eq("bundle_id", itemId);

    const { error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } else {
    let items = getLocalWishlist();
    items = items.filter((item) => {
      if (item.item_type !== itemType) return true;
      if (itemType === "course") return item.course_id !== itemId;
      if (itemType === "digital_product") return item.product_id !== itemId;
      if (itemType === "bundle") return item.bundle_id !== itemId;
      return true;
    });
    saveLocalWishlist(items);
    return { success: true, error: null };
  }
}

// Sync LocalStorage wishlist to Database on login
export async function syncWishlistOnLogin(userId: string): Promise<void> {
  const localItems = getLocalWishlist();
  if (localItems.length === 0) return;

  const payloads = localItems.map((item) => ({
    user_id: userId,
    item_type: item.item_type,
    course_id: item.course_id,
    product_id: item.product_id,
    bundle_id: item.bundle_id,
  }));

  for (const payload of payloads) {
    try {
      await supabaseClient
        .from("wishlist_items")
        .insert(payload);
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_WISHLIST_KEY);
  }
}

// Fetch unified hydrated wishlist items for dashboard
export async function fetchUserWishlist(userId: string): Promise<{ items: WishlistItem[]; error: string | null }> {
  try {
    const { data: wishlistData, error: wishlistError } = await supabaseClient
      .from("wishlist_items")
      .select("*")
      .eq("user_id", userId);

    if (wishlistError) return { items: [], error: wishlistError.message };
    if (!wishlistData || wishlistData.length === 0) return { items: [], error: null };

    const courseIds = wishlistData.filter(i => i.item_type === "course").map(i => i.course_id);
    const productIds = wishlistData.filter(i => i.item_type === "digital_product").map(i => i.product_id);
    const bundleIds = wishlistData.filter(i => i.item_type === "bundle").map(i => i.bundle_id);

    const [coursesRes, productsRes, bundlesRes] = await Promise.all([
      courseIds.length > 0
        ? supabaseClient.from("courses").select("*").in("id", courseIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length > 0
        ? supabaseClient.from("products").select("*").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      bundleIds.length > 0
        ? supabaseClient.from("bundles").select("*").in("id", bundleIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const coursesMap = new Map((coursesRes.data || []).map(c => [c.id, c]));
    const productsMap = new Map((productsRes.data || []).map(p => [p.id, p]));
    const bundlesMap = new Map((bundlesRes.data || []).map(b => [b.id, b]));

    const hydrated: WishlistItem[] = wishlistData.map((item) => {
      const h: WishlistItem = { ...item };
      if (item.item_type === "course") {
        h.course = coursesMap.get(item.course_id);
      } else if (item.item_type === "digital_product") {
        h.product = productsMap.get(item.product_id);
      } else if (item.item_type === "bundle") {
        h.bundle = bundlesMap.get(item.bundle_id);
      }
      return h;
    }).filter(h => h.course || h.product || h.bundle);

    return { items: hydrated, error: null };
  } catch (err: any) {
    return { items: [], error: err.message };
  }
}
