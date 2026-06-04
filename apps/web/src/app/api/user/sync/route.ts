import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

/**
 * POST /api/user/sync
 * 
 * Synchronizes anonymous purchases and enrollments with the authenticated user's ID.
 * When a user buys a course before creating an account, their order and enrollment
 * are stored with a temporary ID (usr-student-...) and their email.
 * This route updates those records to use their actual Supabase Auth UUID.
 */
export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
    }

    console.log(`[SYNC] Syncing records for user: ${email} (${userId})`);

    // 1. Sync Enrollments
    const { data: enrollments, error: enrollErr } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_email", email)
      .neq("user_id", userId);

    if (!enrollErr && enrollments && enrollments.length > 0) {
      console.log(`[SYNC] Found ${enrollments.length} orphaned enrollments. Syncing...`);
      const ids = enrollments.map(e => e.id);
      await supabaseAdmin
        .from("enrollments")
        .update({ user_id: userId })
        .in("id", ids);
    }

    // 2. Sync Orders
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("customer_email", email)
      .neq("customer_id", userId);

    if (!ordersErr && orders && orders.length > 0) {
      console.log(`[SYNC] Found ${orders.length} orphaned orders. Syncing...`);
      const ids = orders.map(o => o.id);
      await supabaseAdmin
        .from("orders")
        .update({ customer_id: userId })
        .in("id", ids);
    }

    return NextResponse.json({ success: true, syncedEnrollments: enrollments?.length || 0, syncedOrders: orders?.length || 0 });
  } catch (error: any) {
    console.error("[SYNC] Error syncing user records:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
