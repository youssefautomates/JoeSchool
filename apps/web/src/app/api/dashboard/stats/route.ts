import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkSessionIsValid } from "@/lib/coursesDb";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const cookieStore = req.cookies;
  const accessToken = cookieStore.get("sb-access-token")?.value;
  const deviceId = req.headers.get("x-device-id") || cookieStore.get("device_id")?.value || "unknown_device";

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const isSessionValid = await checkSessionIsValid(user.id, deviceId);
  if (!isSessionValid) {
    return NextResponse.json({ error: "Session invalid or revoked" }, { status: 403 });
  }

  try {
    // 1. Get total watch time dynamically from course_progress table
    const { data: progressSessions } = await supabaseAdmin
      .from("course_progress")
      .select("watched_seconds")
      .eq("user_id", user.id);

    const totalSeconds = progressSessions?.reduce((acc, curr) => acc + (curr.watched_seconds || 0), 0) || 0;
    const studyHours = (totalSeconds / 3600).toFixed(1);

    // 2. Get completed lessons count dynamically from user_course_progress table
    const { count: completedLessonsCount } = await supabaseAdmin
      .from("user_course_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // 3. Calculate dynamic learning streak from user_course_progress completions
    const { data: completions } = await supabaseAdmin
      .from("user_course_progress")
      .select("completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    let streak = 0;
    if (completions && completions.length > 0) {
      // Extract unique dates in YYYY-MM-DD format
      const dates = Array.from(new Set(completions.map(c => {
        if (!c.completed_at) return "";
        return c.completed_at.split("T")[0];
      }).filter(Boolean)));

      if (dates.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Active streak check (today or yesterday)
        if (dates.includes(todayStr) || dates.includes(yesterdayStr)) {
          streak = 1;
          const currentCheck = dates.includes(todayStr) ? new Date() : yesterday;
          
          while (true) {
            currentCheck.setDate(currentCheck.getDate() - 1);
            const checkStr = currentCheck.toISOString().split("T")[0];
            if (dates.includes(checkStr)) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
    }

    // Fallback base streak to 1 day if enrolled in courses and has 0 streak
    if (streak === 0) {
      const { data: enrolls } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id);
      if (enrolls && enrolls.length > 0) {
        streak = 1;
      }
    }

    // 4. Determine student educational level (Exactly 4 premium interactive levels)
    let level = "البرونزي (مستكشف مبتدئ) 🥉";
    const hoursNum = parseFloat(studyHours);
    if (hoursNum >= 40) {
      level = "البلاتيني (خبير صناعة المحتوى البصري) 💎";
    } else if (hoursNum >= 15) {
      level = "الذهبي (محترف متقدم) 🥇";
    } else if (hoursNum >= 5) {
      level = "الفضي (متعلم نشط) 🥈";
    }

    return NextResponse.json({
      studyHours: parseFloat(studyHours),
      completedLessons: completedLessonsCount || 0,
      streak,
      level
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
