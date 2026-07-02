import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkSessionIsValid } from "@/lib/coursesDb";
import { generateSignedEmbedUrl } from "@/lib/bunny";

export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.lessonId;

  // 1. Initialize Supabase service client to bypass RLS and read lesson properties
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response("إعدادات خادم Supabase غير مكتملة", { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 2. Find the lesson details first to check if it's marked as preview
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("course_lessons")
      .select("id, module_id, video_id, video_url, is_preview")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError || !lesson) {
      return new Response("المحاضرة المطلوبة غير موجودة", { status: 404 });
    }

    let isAuthorized = false;

    // 3. Check authorization. Preview lessons do not require authentication or enrollment.
    if (lesson.is_preview) {
      isAuthorized = true;
    } else {
      // Get access token from cookie
      const cookieStore = req.cookies;
      const accessToken = cookieStore.get("sb-access-token")?.value;
      // Get deviceId from cookie or headers
      const deviceId = req.headers.get("x-device-id") || cookieStore.get("device_id")?.value || "unknown_device";

      if (!accessToken) {
        return new Response("غير مصرح بالوصول - يجب تسجيل الدخول أولاً", { status: 401 });
      }

      // Validate token and get user using Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

      if (authError || !user) {
        return new Response("جلسة عمل غير صالحة أو منتهية الصلاحية", { status: 401 });
      }

      // Check session validity (also checks suspension)
      const isSessionValid = await checkSessionIsValid(user.id, deviceId);
      if (!isSessionValid) {
        return new Response("جلسة العمل ملغاة بسبب الدخول المتعدد أو إيقاف الحساب", { status: 403 });
      }

      // Get course_id by checking course_modules
      const { data: moduleData, error: moduleError } = await supabaseAdmin
        .from("course_modules")
        .select("course_id")
        .eq("id", lesson.module_id)
        .maybeSingle();

      if (!moduleError && moduleData) {
        const { data: enrollment } = await supabaseAdmin
          .from("enrollments")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("course_id", moduleData.course_id)
          .maybeSingle();

        if (enrollment && enrollment.status === "active") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response("يجب الاشتراك في هذا الكورس أولاً لمشاهدة الفيديو", { status: 403 });
    }

    if (!lesson.video_id) {
      // If it doesn't have a Bunny video_id but has a raw video_url, redirect directly to it
      if (lesson.video_url) {
        return NextResponse.redirect(lesson.video_url);
      }
      // Return a proper HTML page so the iframe displays a friendly error
      const errorHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>فيديو المحاضرة</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    min-height: 100vh;
    background: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cairo', 'Segoe UI', sans-serif;
    color: #fff;
  }
  .container {
    text-align: center;
    padding: 2rem;
  }
  .icon {
    width: 80px;
    height: 80px;
    background: rgba(29, 78, 216,0.1);
    border: 2px solid rgba(29, 78, 216,0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    font-size: 2rem;
  }
  h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.75rem; }
  p { font-size: 0.875rem; color: #71717a; line-height: 1.6; max-width: 300px; margin: 0 auto; }
  .badge {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.35rem 1rem;
    background: rgba(29, 78, 216,0.1);
    border: 1px solid rgba(29, 78, 216,0.3);
    border-radius: 999px;
    font-size: 0.75rem;
    color: #1D4ED8;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="icon">🎬</div>
    <h2>الفيديو قيد الإعداد</h2>
    <p>لم يتم رفع فيديو لهذه المحاضرة بعد. يرجى المتابعة وسيكون الفيديو متاحاً قريباً.</p>
    <span class="badge">سيتم إضافة الفيديو قريباً</span>
  </div>
</body>
</html>`;
      return new Response(errorHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 4. Generate secure signed Bunny embed URL
    const signedEmbedUrl = generateSignedEmbedUrl(lesson.video_id, 120); // 2 hours expiry

    // Parse incoming query params (e.g. time=X) and append to signed Bunny embed url
    const reqUrl = new URL(req.url);
    const incomingParams = reqUrl.searchParams.toString();
    const finalEmbedUrl = incomingParams 
      ? `${signedEmbedUrl}${signedEmbedUrl.includes("?") ? "&" : "?"}${incomingParams}`
      : signedEmbedUrl;

    // Redirect the iframe to the secure signed embed URL
    const responseHeaders = new Headers();
    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    responseHeaders.set("Pragma", "no-cache");

    return NextResponse.redirect(finalEmbedUrl, {
      headers: responseHeaders
    });

  } catch (err: any) {
    return new Response(`Embed generation error: ${err.message}`, { status: 500 });
  }
}
