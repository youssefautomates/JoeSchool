import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try selecting from coupons
    const { data: coupons, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Coupons Admin API GET] Error fetching coupons:", error);
      // If table doesn't exist, we can return an empty array or handle gracefully
      if (error.code === "42P01") {
        return NextResponse.json({ coupons: [], tableMissing: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ coupons });
  } catch (err: any) {
    console.error("[Coupons Admin API GET] Exception:", err);
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
    const { code, discount_percent, max_uses, expiry_date, applies_to_type, applies_to_id } = payload;

    if (!code || !discount_percent) {
      return NextResponse.json({ error: "يرجى تعبئة الحقول الأساسية" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .insert([{
        code: cleanCode,
        discount_percent: Number(discount_percent),
        max_uses: Number(max_uses || 100),
        used_count: 0,
        expiry_date: expiry_date || null,
        applies_to_type: applies_to_type || "all",
        applies_to_id: applies_to_id || null
      }])
      .select()
      .single();

    if (error) {
      console.error("[Coupons Admin API POST] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, coupon: data });
  } catch (err: any) {
    console.error("[Coupons Admin API POST] Exception:", err);
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
    if (!id) {
      return NextResponse.json({ error: "معرف الكوبون مطلوب" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Coupons Admin API DELETE] Delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Coupons Admin API DELETE] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
