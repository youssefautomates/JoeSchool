import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Force this route to be fully dynamic (never cached by Next.js browser cache)
export const dynamic = "force-dynamic";

export const CURRENT_REVIEW_SCHEMA_VERSION = 1;
export const MIN_SUPPORTED_REVIEW_SCHEMA_VERSION = 1;

export type ModerationAction =
  | "approved"
  | "hidden"
  | "archived"
  | "restored"
  | "edited"
  | "created";

export interface Review {
  id: string;
  productId: string;
  firstName: string;
  lastName: string;
  rating: number;
  text: string;
  avatarUrl?: string;
  gender?: string;
  isVerified: boolean;
  isHidden: boolean;
  createdAt: string;
  status?: "visible" | "hidden" | "pending" | "archived";
  isFeatured?: boolean;
  featuredPosition?: number;
  source?: "manual_admin" | "imported" | "customer_submitted";
  schemaVersion?: number;

  // Enterprise Associations
  sourceType?: "course" | "digital_product";
  sourceId?: string;
  archiveReason?: string;
  
  // Review Audit Trail
  editedAt?: string;
  editedBy?: string;
  moderationAction?: ModerationAction;
}

// Supabase Admin client to bypass RLS for moderation/admin actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// In-Memory Cache variables
let cachedReviews: Review[] | null = null;
let lastCacheFetch = 0;
const CACHE_TTL = 10000; // 10 seconds cache to optimize performance

// Normalization function to guarantee backward compatibility & schema versioning
function normalizeReview(r: any): Review {
  const isHidden = r.isHidden === true;
  const status = r.status || (isHidden ? "hidden" : "visible");
  const isFeatured = r.isFeatured === true;
  const featuredPosition = typeof r.featuredPosition === "number" ? r.featuredPosition : 999;
  const source = r.source || "manual_admin";
  const schemaVersion = r.schemaVersion || CURRENT_REVIEW_SCHEMA_VERSION;

  return {
    id: String(r.id),
    productId: r.productId || "",
    firstName: r.firstName || "",
    lastName: r.lastName || "",
    rating: typeof r.rating === "number" ? r.rating : 5,
    text: r.text || "",
    avatarUrl: r.avatarUrl || "",
    gender: r.gender,
    isVerified: r.isVerified !== false,
    isHidden: status === "hidden" || status === "archived", // Keep for legacy compat
    createdAt: r.createdAt || new Date().toISOString(),
    status,
    isFeatured,
    featuredPosition,
    source,
    schemaVersion,
    sourceType: r.sourceType || (r.productId ? "course" : undefined),
    sourceId: r.sourceId || r.productId || "",
    archiveReason: r.archiveReason,
    editedAt: r.editedAt,
    editedBy: r.editedBy,
    moderationAction: r.moderationAction
  };
}

// Helper to sanitize and validate input fields (HTML, unicode junk, spaces)
function sanitizeAndValidateReview(payload: any): { error?: string; text?: string; firstName?: string; lastName?: string } {
  let { text, firstName, lastName } = payload;
  
  const stripHtml = (str: string) => {
    if (!str) return "";
    return str.replace(/<\/?[^>]+(>|$)/g, "").trim();
  };

  const cleanUnicodeJunk = (str: string) => {
    if (!str) return "";
    return str.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "").trim();
  };

  if (firstName !== undefined) {
    firstName = cleanUnicodeJunk(stripHtml(firstName));
    if (!firstName) {
      return { error: "الاسم الأول لا يمكن أن يكون فارغاً أو يحتوي على مسافات فقط" };
    }
  }

  if (lastName !== undefined) {
    lastName = cleanUnicodeJunk(stripHtml(lastName));
  }

  if (text !== undefined) {
    text = cleanUnicodeJunk(stripHtml(text));
    if (!text) {
      return { error: "نص التقييم لا يمكن أن يكون فارغاً أو يحتوي على مسافات فقط" };
    }
  }

  return { text, firstName, lastName };
}

async function fetchAndCacheReviews(): Promise<Review[]> {
  try {
    const now = Date.now();
    if (cachedReviews && now - lastCacheFetch < CACHE_TTL) {
      return cachedReviews;
    }

    const { data, error } = await supabaseAdmin
      .from("product_reviews")
      .select("*");
    
    if (error) {
      console.error("Error fetching product_reviews from Supabase:", error.message);
      // Fallback empty state instead of crashing in case table is not created yet
      return [];
    }

    const allReviews = data || [];
    
    // Normalize and filter out invalid/seeded ones
    const normalized = allReviews
      .filter(r => {
        if (!r || !r.id) return false;
        const idStr = String(r.id);
        return !idStr.startsWith("seed-") && !idStr.startsWith("seeded-");
      })
      .map(normalizeReview);

    cachedReviews = normalized;
    lastCacheFetch = now;
    return normalized;
  } catch (err) {
    console.error("fetchAndCacheReviews Exception:", err);
    return [];
  }
}

function invalidateCache() {
  cachedReviews = null;
  lastCacheFetch = 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    
    const reviews = await fetchAndCacheReviews();
    
    const headers = {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    };
    
    if (productId) {
      // Public fetch: filter by productId, only show visible reviews
      const productReviews = reviews.filter(r => r.productId === productId && r.status === "visible");
      
      // Sort: Featured first, then by position, then newest first
      productReviews.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        if (a.isFeatured && b.isFeatured) {
          return (a.featuredPosition || 999) - (b.featuredPosition || 999);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return NextResponse.json(productReviews, { headers });
    }
    
    // Admin fetch: sort newest first
    const adminReviews = [...reviews];
    adminReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json(adminReviews, { headers });
  } catch (err: any) {
    console.error("[Reviews API] GET Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    
    // Integrity Validation
    const validation = sanitizeAndValidateReview(payload);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const adminEmail = process.env.ADMIN_EMAIL || "admin@joeschool.com";
    
    const newReview = normalizeReview({
      ...payload,
      firstName: validation.firstName,
      lastName: validation.lastName,
      text: validation.text,
      id,
      createdAt,
      schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
      editedAt: createdAt,
      editedBy: adminEmail,
      moderationAction: "created"
    });
    
    const { error: insertError } = await supabaseAdmin
      .from("product_reviews")
      .insert([newReview]);

    if (insertError) {
      console.error("Error inserting review into Supabase:", insertError.message);
      return NextResponse.json({ error: "فشل حفظ التقييم في قاعدة البيانات" }, { status: 500 });
    }
    
    invalidateCache();
    return NextResponse.json({ success: true, review: newReview });
  } catch (err: any) {
    console.error("[Reviews API] POST Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const adminEmail = process.env.ADMIN_EMAIL || "admin@joeschool.com";
    
    // Check if bulk action
    if (payload.ids && Array.isArray(payload.ids)) {
      const { ids, action, params } = payload;
      
      if (ids.length > 500) {
        return NextResponse.json({ error: "الحد الأقصى للعمليات الجماعية هو 500 تقييم" }, { status: 400 });
      }
      
      const now = new Date().toISOString();
      let updatePayload: any = {
        "schemaVersion": CURRENT_REVIEW_SCHEMA_VERSION,
        "editedAt": now,
        "editedBy": adminEmail,
      };

      if (action === "approve") {
        updatePayload.status = "visible";
        updatePayload.isHidden = false;
        updatePayload.moderationAction = "approved";
      } else if (action === "hide") {
        updatePayload.status = "hidden";
        updatePayload.isHidden = true;
        updatePayload.moderationAction = "hidden";
      } else if (action === "mark_featured") {
        updatePayload.isFeatured = true;
        if (params?.featuredPosition !== undefined) {
          updatePayload.featuredPosition = Number(params.featuredPosition);
        }
      } else if (action === "unfeature") {
        updatePayload.isFeatured = false;
      } else if (action === "status" && params?.status) {
        updatePayload.status = params.status;
        updatePayload.isHidden = params.status === "hidden" || params.status === "archived";
        
        if (params.status === "visible") updatePayload.moderationAction = "approved";
        else if (params.status === "hidden") updatePayload.moderationAction = "hidden";
        else if (params.status === "archived") {
          updatePayload.moderationAction = "archived";
          if (params?.archiveReason) updatePayload.archiveReason = params.archiveReason;
        } else if (params.status === "pending") {
          updatePayload.moderationAction = "restored";
        }
      } else if (action === "delete") {
        updatePayload.status = "archived";
        updatePayload.isHidden = true;
        updatePayload.moderationAction = "archived";
        if (params?.archiveReason) {
          updatePayload.archiveReason = params.archiveReason;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("product_reviews")
        .update(updatePayload)
        .in("id", ids);

      if (updateError) {
        console.error("Error bulk updating reviews:", updateError.message);
        return NextResponse.json({ error: "فشل تنفيذ العملية الجماعية في قاعدة البيانات" }, { status: 500 });
      }

      invalidateCache();
      return NextResponse.json({ success: true, updatedCount: ids.length });
    }
    
    // Single update
    const updatedReview = payload;
    
    // Integrity Validation
    const validation = sanitizeAndValidateReview(updatedReview);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const oldReviews = await fetchAndCacheReviews();
    const existing = oldReviews.find(r => String(r.id) === String(updatedReview.id));
    
    if (!existing) {
      return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
    }

    const cleanedUpdate = {
      ...updatedReview,
      firstName: validation.firstName !== undefined ? validation.firstName : updatedReview.firstName,
      lastName: validation.lastName !== undefined ? validation.lastName : updatedReview.lastName,
      text: validation.text !== undefined ? validation.text : updatedReview.text,
    };
    
    const oldStatus = existing.status;
    let singleAction: ModerationAction = "edited";
    if (cleanedUpdate.status !== undefined) {
      if (cleanedUpdate.status === "visible") singleAction = "approved";
      else if (cleanedUpdate.status === "hidden") singleAction = "hidden";
      else if (cleanedUpdate.status === "archived") singleAction = "archived";
      else if (cleanedUpdate.status === "pending") {
        if (oldStatus === "archived") {
          singleAction = "restored";
        } else {
          singleAction = "edited";
        }
      }
    }
    
    const merged = normalizeReview({
      ...existing,
      ...cleanedUpdate,
      schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
      editedAt: new Date().toISOString(),
      editedBy: adminEmail,
      moderationAction: cleanedUpdate.moderationAction || singleAction
    });
    
    const { error: updateError } = await supabaseAdmin
      .from("product_reviews")
      .update(merged)
      .eq("id", merged.id);

    if (updateError) {
      console.error("Error updating review:", updateError.message);
      return NextResponse.json({ error: "فشل تحديث التقييم في قاعدة البيانات" }, { status: 500 });
    }

    invalidateCache();
    return NextResponse.json({ success: true, review: merged });
  } catch (err: any) {
    console.error("[Reviews API] PUT Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const archiveReason = url.searchParams.get("archiveReason") || undefined;
    if (!id) return NextResponse.json({ error: "ID مطلوب" }, { status: 400 });

    const oldReviews = await fetchAndCacheReviews();
    const existing = oldReviews.find(r => String(r.id) === String(id));
    
    if (!existing) {
      return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
    }
    
    if (existing.status === "archived") {
      // Permanent delete if already archived
      const { error: deleteError } = await supabaseAdmin
        .from("product_reviews")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Error permanently deleting review:", deleteError.message);
        return NextResponse.json({ error: "فشل حذف التقييم نهائياً" }, { status: 500 });
      }
    } else {
      // Soft delete: set status to archived
      const adminEmail = process.env.ADMIN_EMAIL || "admin@joeschool.com";
      const merged = normalizeReview({
        ...existing,
        status: "archived",
        isHidden: true,
        archiveReason,
        schemaVersion: CURRENT_REVIEW_SCHEMA_VERSION,
        editedAt: new Date().toISOString(),
        editedBy: adminEmail,
        moderationAction: "archived"
      });
      
      const { error: updateError } = await supabaseAdmin
        .from("product_reviews")
        .update(merged)
        .eq("id", id);

      if (updateError) {
        console.error("Error soft deleting review:", updateError.message);
        return NextResponse.json({ error: "فشل أرشفة التقييم في قاعدة البيانات" }, { status: 500 });
      }
    }
    
    invalidateCache();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Reviews API] DELETE Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
