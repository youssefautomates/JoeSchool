import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkSessionIsValid } from "@/lib/coursesDb";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.id;

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
    const body = await req.json();
    const { course_id, watch_time_seconds, is_completed } = body;

    if (!course_id) {
      return NextResponse.json({ error: "course_id is required" }, { status: 400 });
    }

    // 1. Log video watch session if watch_time > 0
    if (watch_time_seconds && watch_time_seconds > 0) {
      await supabaseAdmin.from("video_watch_sessions").insert({
        user_id: user.id,
        lesson_id: lessonId,
        seconds_watched: watch_time_seconds
      });
    }

    // 2. Handle completion status
    if (is_completed) {
      await supabaseAdmin.from("lesson_completions").upsert({
        user_id: user.id,
        lesson_id: lessonId,
        course_id: course_id,
        watch_time_seconds: watch_time_seconds || 0,
        completed_at: new Date().toISOString()
      }, { onConflict: "user_id, lesson_id" });

      // Also ensure backward compatibility with user_course_progress
      const { data: existingProgress } = await supabaseAdmin
        .from("user_course_progress")
        .select("completed_lessons")
        .eq("user_id", user.id)
        .eq("course_id", course_id)
        .maybeSingle();

      const currentCompleted = existingProgress?.completed_lessons || [];
      if (!currentCompleted.includes(lessonId)) {
        currentCompleted.push(lessonId);
        await supabaseAdmin.from("user_course_progress").upsert({
          user_id: user.id,
          course_id: course_id,
          completed_lessons: currentCompleted,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id, course_id" });
      }
    }

    // 3. Update learning streak
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    const { data: streakData } = await supabaseAdmin
      .from("student_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let newCurrentStreak = 1;
    let newLongestStreak = 1;

    if (streakData) {
      const lastActivityDate = streakData.last_activity_date;
      
      if (lastActivityDate === today) {
        // Already active today, no change
        newCurrentStreak = streakData.current_streak;
        newLongestStreak = streakData.longest_streak;
      } else {
        const lastDate = new Date(lastActivityDate);
        const currentDate = new Date(today);
        const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Continued streak
          newCurrentStreak = streakData.current_streak + 1;
        } else {
          // Streak broken
          newCurrentStreak = 1;
        }

        newLongestStreak = Math.max(streakData.longest_streak, newCurrentStreak);
      }
    }

    await supabaseAdmin.from("student_streaks").upsert({
      user_id: user.id,
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_activity_date: today
    });

    return NextResponse.json({ success: true, streak: newCurrentStreak });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
