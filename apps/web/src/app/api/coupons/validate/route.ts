import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim().toUpperCase();
    const itemId = url.searchParams.get("itemId"); // The course ID or product ID being purchased

    if (!code) {
      return NextResponse.json({ error: "كود الخصم مطلوب" }, { status: 400 });
    }

    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("[Coupon Validation API] Fetch error:", error);
      return NextResponse.json({ error: "حدث خطأ أثناء التحقق من الكوبون" }, { status: 500 });
    }

    if (!coupon) {
      return NextResponse.json({ error: "كود الخصم هذا غير موجود أو غير صالح" }, { status: 404 });
    }

    // Check expiration
    if (coupon.expiry_date) {
      const expiry = new Date(coupon.expiry_date);
      if (expiry < new Date()) {
        return NextResponse.json({ error: "عذراً، كود الخصم هذا قد انتهت صلاحيته" }, { status: 400 });
      }
    }

    // Check usage limits
    if (coupon.used_count >= coupon.max_uses) {
      return NextResponse.json({ error: "عذراً، وصل كود الخصم هذا إلى الحد الأقصى للاستخدام" }, { status: 400 });
    }

    // Check item restriction
    if (coupon.applies_to_type !== "all") {
      if (!itemId) {
        return NextResponse.json({ error: "غير مصرح بتطبيق الكوبون على هذا البند" }, { status: 400 });
      }

      // Check if applies_to_id matches the purchased item ID
      // Some courses are referenced by "course-id", check both raw and with prefix
      const isMatch = coupon.applies_to_id === itemId || 
                      `course-${coupon.applies_to_id}` === itemId ||
                      itemId.replace("course-", "") === coupon.applies_to_id;

      if (!isMatch) {
        return NextResponse.json({ error: "كود الخصم هذا غير مخصص لهذا المنتج أو الكورس المحدد" }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      applies_to_type: coupon.applies_to_type
    });
  } catch (err: any) {
    console.error("[Coupon Validation API] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
