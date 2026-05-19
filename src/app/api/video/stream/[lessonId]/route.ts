import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Helper to extract storage path from Supabase storage URL or return the string if it's already a path
function getStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const searchStr = "course-videos/";
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.lessonId;

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

  // Initialize service client to bypass RLS and perform admin checks
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Authenticate user with their access token
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: "جلسة عمل غير صالحة أو منتهية الصلاحية" }, { status: 401 });
  }

  try {
    // 3. Find the lesson to get module_id and video_url
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("course_lessons")
      .select("id, module_id, video_url, is_preview")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "المحاضرة المطلوبة غير موجودة" }, { status: 404 });
    }

    // If there is no video url, just return empty
    if (!lesson.video_url) {
      return NextResponse.json({ url: "" });
    }

    // 4. If it's a preview lesson, anyone logged in can watch it
    if (lesson.is_preview) {
      const storagePath = getStoragePathFromUrl(lesson.video_url);
      if (storagePath) {
        const { data: signedData, error: signError } = await supabaseAdmin
          .storage
          .from("course-videos")
          .createSignedUrl(storagePath, 300); // 5 minutes

        if (signError || !signedData) {
          return NextResponse.json({ error: "فشل توليد رابط تشغيل الفيديو" }, { status: 500 });
        }
        return NextResponse.json({ url: signedData.signedUrl });
      } else {
        return NextResponse.json({ url: lesson.video_url });
      }
    }

    // 5. Get course_id by checking course_modules
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from("course_modules")
      .select("course_id")
      .eq("id", lesson.module_id)
      .maybeSingle();

    if (moduleError || !moduleData) {
      return NextResponse.json({ error: "فشل تحديد الكورس الخاص بالمحاضرة" }, { status: 500 });
    }

    const courseId = moduleData.course_id;

    // 6. Check enrollment for this user and course
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (enrollError || !enrollment || enrollment.status !== "active") {
      return NextResponse.json({ error: "يجب الاشتراك في هذا الكورس أولاً لمشاهدة الفيديو" }, { status: 403 });
    }

    // 7. Generate Signed URL for the video
    const storagePath = getStoragePathFromUrl(lesson.video_url);
    if (storagePath) {
      const { data: signedData, error: signError } = await supabaseAdmin
        .storage
        .from("course-videos")
        .createSignedUrl(storagePath, 300); // 5 minutes

      if (signError || !signedData) {
        return NextResponse.json({ error: "فشل توليد رابط تشغيل الفيديو الآمن" }, { status: 500 });
      }
      return NextResponse.json({ url: signedData.signedUrl });
    } else {
      return NextResponse.json({ url: lesson.video_url });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
