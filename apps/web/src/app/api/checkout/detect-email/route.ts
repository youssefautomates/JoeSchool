import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const courseId = searchParams.get("courseId");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Paginated search loop to find the user in Supabase Auth by email
    let existingUser = null;
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error("[detect-email] Error listing users:", listError.message);
        break;
      }

      if (!data?.users || data.users.length === 0) {
        break;
      }

      const found = data.users.find(u => u.email?.toLowerCase().trim() === email);
      if (found) {
        existingUser = found;
        break;
      }

      if (data.users.length < perPage) {
        break;
      }
      page++;
    }

    if (!existingUser) {
      return NextResponse.json({ exists: false, ownsCourse: false, ownedCourseIds: [] });
    }

    // User exists - fetch all enrollments for this user
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("course_id")
      .or(`user_id.eq.${existingUser.id},user_email.eq.${email}`);

    const ownedCourseIds = enrollments ? enrollments.map(e => e.course_id) : [];

    let ownsCourse = false;
    let courseSlug: string | null = null;
    let firstLessonSlug: string | null = null;

    if (courseId) {
      ownsCourse = ownedCourseIds.includes(courseId);

      if (ownsCourse) {
        // Fetch course slug for redirect
        const { data: courseData } = await supabaseAdmin
          .from("courses")
          .select("slug")
          .eq("id", courseId)
          .maybeSingle();

        if (courseData?.slug) {
          courseSlug = courseData.slug;

          // Fetch first lesson slug
          const { data: sections } = await supabaseAdmin
            .from("course_sections")
            .select("id")
            .eq("course_id", courseId)
            .order("sort_order", { ascending: true })
            .limit(1);

          if (sections && sections.length > 0) {
            const { data: lessons } = await supabaseAdmin
              .from("course_lessons")
              .select("slug")
              .eq("section_id", sections[0].id)
              .order("sort_order", { ascending: true })
              .limit(1);

            if (lessons && lessons.length > 0) {
              firstLessonSlug = lessons[0].slug;
            }
          }
        }
      }
    }

    return NextResponse.json({
      exists: true,
      ownsCourse,
      ownedCourseIds,
      userId: existingUser.id,
      courseSlug,
      firstLessonSlug,
    });
  } catch (error: any) {
    console.error("[detect-email] Unexpected error:", error);
    // Never block checkout on detection failure
    return NextResponse.json({ exists: false, ownsCourse: false, ownedCourseIds: [] });
  }
}
