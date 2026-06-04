import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkSessionIsValid, logUserActivity } from "@/lib/coursesDb";

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

  // 1. Authenticate user from cookie
  const cookieStore = req.cookies;
  const accessToken = cookieStore.get("sb-access-token")?.value;
  const deviceId = req.headers.get("x-device-id") || "unknown_device";

  if (!accessToken) {
    return new Response("Unauthorized - Please login first", { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response("Internal Server Error - Config incomplete", { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return new Response("Invalid or expired session", { status: 401 });
  }

  // 2. Security Check - Device Session Validity
  const isSessionValid = await checkSessionIsValid(user.id, deviceId);
  if (!isSessionValid) {
    return new Response("Session terminated or account suspended due to active active limits", { status: 403 });
  }

  try {
    // 3. Find the lesson details
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("course_lessons")
      .select("id, module_id, video_url, is_preview")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonError || !lesson || !lesson.video_url) {
      return new Response("Lesson or video not found", { status: 404 });
    }

    // 4. Check enrollment if not preview
    if (!lesson.is_preview) {
      const { data: moduleData, error: moduleError } = await supabaseAdmin
        .from("course_modules")
        .select("course_id")
        .eq("id", lesson.module_id)
        .maybeSingle();

      if (moduleError || !moduleData) {
        return new Response("Failed to fetch course details", { status: 500 });
      }

      const { data: enrollment, error: enrollError } = await supabaseAdmin
        .from("enrollments")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("course_id", moduleData.course_id)
        .maybeSingle();

      if (enrollError || !enrollment || enrollment.status !== "active") {
        return new Response("Forbidden - Active course enrollment required", { status: 403 });
      }
    }

    const storagePath = getStoragePathFromUrl(lesson.video_url);
    if (!storagePath) {
      // Fallback redirect if external YouTube/Vimeo is used
      return NextResponse.redirect(lesson.video_url);
    }

    // 5. Proxy Chunked Streaming Request to Supabase Storage
    const storageUrl = `${supabaseUrl}/storage/v1/object/authenticated/course-videos/${storagePath}`;
    const rangeHeader = req.headers.get("range");

    const storageHeaders = new Headers();
    storageHeaders.set("Authorization", `Bearer ${supabaseServiceKey}`);
    if (rangeHeader) {
      storageHeaders.set("range", rangeHeader);
    }

    const storageResponse = await fetch(storageUrl, {
      headers: storageHeaders,
    });

    if (!storageResponse.ok && storageResponse.status !== 206) {
      return new Response("Failed to fetch video stream source", { status: storageResponse.status });
    }

    // 6. Build the streaming response forwarding byte headers
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", storageResponse.headers.get("Content-Type") || "video/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");
    
    const contentRange = storageResponse.headers.get("Content-Range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const contentLength = storageResponse.headers.get("Content-Length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    responseHeaders.set("Pragma", "no-cache");

    // Track activity on initial playback request
    if (!rangeHeader || rangeHeader.startsWith("bytes=0-")) {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      const ua = req.headers.get("user-agent") || "unknown";
      await logUserActivity(user.id, "STREAM_VIDEO_STARTED", ip, ua, deviceId);
    }

    return new Response(storageResponse.body, {
      status: storageResponse.status,
      headers: responseHeaders,
    });

  } catch (err: any) {
    return new Response(`Streaming proxy error: ${err.message}`, { status: 500 });
  }
}
