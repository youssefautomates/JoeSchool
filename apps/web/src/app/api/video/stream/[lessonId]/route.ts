import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkSessionIsValid } from "@/lib/coursesDb";

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
  const deviceId = req.headers.get("x-device-id") || "unknown_device";

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

  // Check session validity
  const isSessionValid = await checkSessionIsValid(user.id, deviceId);
  if (!isSessionValid) {
    return NextResponse.json({ error: "جلسة العمل ملغاة بسبب الدخول المتعدد أو إيقاف الحساب" }, { status: 403 });
  }

  try {
    // 3. Find the lesson to get module_id and video details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("course_lessons")
      .select("id, module_id, video_url, video_id, playback_url, thumbnail_url, is_preview")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: "المحاضرة المطلوبة غير موجودة" }, { status: 404 });
    }

    // If there is no video URL or video_id, just return empty
    if (!lesson.video_url && !lesson.video_id) {
      return NextResponse.json({ url: "" });
    }

    // 4. Helper to generate response based on video type
    const generateVideoResponse = async (isAuthorized: boolean) => {
      if (!isAuthorized) {
        return NextResponse.json({ error: "يجب الاشتراك في هذا الكورس أولاً لمشاهدة الفيديو" }, { status: 403 });
      }

      // If it is a Bunny Stream video
      if (lesson.video_id) {
        const { generateSignedHlsUrl, generateSignedEmbedUrl } = await import("@/lib/bunny");
        try {
          const signedHlsUrl = generateSignedHlsUrl(lesson.video_id, 120); // 2 hours expiry
          const signedEmbedUrl = generateSignedEmbedUrl(lesson.video_id, 120);
          return NextResponse.json({
            isBunny: true,
            url: signedHlsUrl,
            embedUrl: signedEmbedUrl,
            videoId: lesson.video_id,
            thumbnailUrl: lesson.thumbnail_url || ""
          });
        } catch (bunnyErr: any) {
          console.error("Failed to generate signed Bunny URLs:", bunnyErr);
          return NextResponse.json({ error: "فشل توليد روابط البث المؤمنة" }, { status: 500 });
        }
      }

      // Legacy Supabase Video path
      const storagePath = getStoragePathFromUrl(lesson.video_url);
      if (storagePath) {
        const { data: signedData, error: signError } = await supabaseAdmin
          .storage
          .from("course-videos")
          .createSignedUrl(storagePath, 300); // 5 minutes

        if (signError || !signedData) {
          return NextResponse.json({ error: "فشل توليد رابط تشغيل الفيديو" }, { status: 500 });
        }
        return NextResponse.json({ isBunny: false, url: signedData.signedUrl });
      } else {
        return NextResponse.json({ isBunny: false, url: lesson.video_url });
      }
    };

    // 5. If it's a preview lesson, anyone logged in can watch it
    if (lesson.is_preview) {
      return generateVideoResponse(true);
    }

    // 6. Get course_id by checking course_modules
    const { data: moduleData, error: moduleError } = await supabaseAdmin
      .from("course_modules")
      .select("course_id")
      .eq("id", lesson.module_id)
      .maybeSingle();

    if (moduleError || !moduleData) {
      return NextResponse.json({ error: "فشل تحديد الكورس الخاص بالمحاضرة" }, { status: 500 });
    }

    const courseId = moduleData.course_id;

    // 7. Check enrollment for this user and course
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    const isEnrolled = enrollment && enrollment.status === "active";
    return generateVideoResponse(!!isEnrolled);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
