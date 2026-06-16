import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "معرف الطالب مفقود" }, { status: 400 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "معرف الكورس مفقود" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("enrollments")
      .delete()
      .eq("user_id", id)
      .eq("course_id", courseId);

    if (error) {
      return NextResponse.json({ error: `فشل إلغاء الصلاحية: ${error.message}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "تم إلغاء صلاحية الوصول للكورس بنجاح"
    });

  } catch (error: any) {
    console.error("[REVOKE_ERROR]:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}
