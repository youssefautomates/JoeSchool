import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const searchStr = "lesson-assets/";
  const index = url.indexOf(searchStr);
  if (index !== -1) {
    const rawPath = url.substring(index + searchStr.length);
    const cleanPath = rawPath.split("?")[0];
    return decodeURIComponent(cleanPath);
  }
  if (!url.startsWith("http")) {
    return url;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    const fileUrl = searchParams.get("url");

    if (!lessonId || !fileUrl) {
      return NextResponse.json({ error: "معاملات الطلب غير مكتملة" }, { status: 400 });
    }

    // 1. Get access token from cookie
    const cookieStore = req.cookies;
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "غير مصرح بالوصول - يجب تسجيل الدخول أولاً" }, { status: 401 });
    }

    // 2. Validate token and get user using Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "إعدادات خادم Supabase غير مكتملة" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: "جلسة عمل غير صالحة أو منتهية الصلاحية" }, { status: 401 });
    }

    // 3. Find the lesson to verify it exists and retrieve module_id
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("course_lessons")
      .select("id, module_id, attachments")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "المحاضرة المطلوبة غير موجودة" }, { status: 404 });
    }

    // 4. Verify enrollment
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from("course_modules")
      .select("course_id")
      .eq("id", lesson.module_id)
      .maybeSingle();

    if (moduleError || !moduleData) {
      return NextResponse.json({ error: "فشل تحديد الكورس الخاص بالمحاضرة" }, { status: 500 });
    }

    const courseId = moduleData.course_id;

    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollError || !enrollment || enrollment.status !== "active") {
      return NextResponse.json({ error: "يجب الاشتراك في هذا الكورس أولاً لتحميل المرفقات" }, { status: 403 });
    }

    // 5. Generate Signed URL for the file from lesson-assets
    const storagePath = getStoragePathFromUrl(fileUrl);
    if (storagePath) {
      const { data: signedData, error: signError } = await supabaseAdmin
        .storage
        .from("lesson-assets")
        .createSignedUrl(storagePath, 3600); // 1 hour download expiration

      if (signError || !signedData) {
        console.error("[ATTACHMENT SIGN ERROR]", signError);
        return NextResponse.json({ error: "فشل توليد رابط تحميل آمن للمرفق" }, { status: 500 });
      }
      
      // Redirect directly to the secure signed URL
      return NextResponse.redirect(signedData.signedUrl);
    } else {
      return NextResponse.redirect(fileUrl);
    }
  } catch (err: any) {
    console.error("[ATTACHMENT SIGN CRASH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
