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

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const { email, password, firstName, lastName, courseId } = await req.json();

    if (!email || !password || !firstName || !lastName || !courseId) {
      return NextResponse.json({ error: "يرجى ملء جميع الحقول المطلوبة" }, { status: 400 });
    }

    // 1. Create the user in Supabase Auth using Admin Auth API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        name: `${firstName} ${lastName}`.trim()
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "فشل إنشاء حساب الطالب" }, { status: 500 });
    }

    // 2. Enroll the student in the selected course
    const { error: enrollError } = await supabaseAdmin.from("enrollments").insert({
      user_id: userId,
      course_id: courseId,
      user_name: `${firstName} ${lastName}`.trim(),
      user_email: email,
      status: "active"
    });

    if (enrollError) {
      // Cleanup created auth user if enrollment failed to maintain consistency
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: `فشل تسجيل الطالب في الكورس: ${enrollError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "تم إنشاء حساب الطالب وتسجيله في الكورس بنجاح",
      student: {
        id: userId,
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        course_id: courseId
      }
    });

  } catch (error: any) {
    console.error("[STUDENT_CREATE_ERROR]:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}
