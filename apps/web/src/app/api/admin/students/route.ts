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
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { email, password, firstName, lastName, courseId } = await req.json();

    if (!email || !password || !firstName || !lastName || !courseId) {
      return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 });
    }

    let userId = "";

    // 1. Create the user in Supabase Auth using Admin Auth API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        name: `${firstName} ${lastName}`.trim(),
        clear_password: password
      }
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        // Find existing user
        const { data: pageData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingUser = pageData?.users?.find(u => u.email === email);
        if (existingUser) {
          userId = existingUser.id;
          // Update password and store clear_password in metadata
          const existingMeta = existingUser.user_metadata || {};
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
            user_metadata: {
              ...existingMeta,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              name: `${firstName} ${lastName}`.trim(),
              clear_password: password
            }
          });
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    } else {
      userId = authData.user?.id || "";
    }

    if (!userId) {
      return NextResponse.json({ error: "Failed to create student account" }, { status: 500 });
    }

    // Check if already enrolled to avoid duplicates
    const { data: existingEnroll } = await supabaseAdmin.from("enrollments").select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();

    if (existingEnroll) {
      return NextResponse.json({
        success: true,
        message: "Student is already enrolled in this course. Account data has been updated.",
        student: {
          id: userId,
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          course_id: courseId
        }
      });
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
      return NextResponse.json({ error: `Failed to enroll student in course: ${enrollError.message}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Student account created and enrolled in course successfully",
      student: {
        id: userId,
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        course_id: courseId
      }
    });

  } catch (error: any) {
    console.error("[STUDENT_CREATE_ERROR]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { action, userIds, courseId } = body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields: action, userIds" }, { status: 400 });
    }

    // ── BULK DISENROLL: remove selected students from a specific course ──
    if (action === "bulk_disenroll") {
      if (!courseId) {
        return NextResponse.json({ error: "courseId is required for bulk_disenroll" }, { status: 400 });
      }

      const errors: string[] = [];
      let successCount = 0;

      for (const userId of userIds) {
        try {
          // Delete enrollment row
          await supabaseAdmin.from("enrollments").delete().eq("user_id", userId).eq("course_id", courseId);
          // Delete lesson progress for this course
          await supabaseAdmin.from("lesson_progress").delete().eq("user_id", userId).eq("course_id", courseId);
          // Delete watch time for this course
          await supabaseAdmin.from("watch_time").delete().eq("user_id", userId).eq("course_id", courseId);
          successCount++;
        } catch (err: any) {
          errors.push(`Failed for user ${userId}: ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully disenrolled ${successCount} student(s) from the course.`,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // ── BULK DELETE: permanently remove selected student accounts ──
    if (action === "bulk_delete") {
      const errors: string[] = [];
      let successCount = 0;

      for (const userId of userIds) {
        try {
          // Delete all related data first
          await supabaseAdmin.from("enrollments").delete().eq("user_id", userId);
          await supabaseAdmin.from("lesson_progress").delete().eq("user_id", userId);
          await supabaseAdmin.from("watch_time").delete().eq("user_id", userId);
          await supabaseAdmin.from("certificates").delete().eq("user_id", userId);
          await supabaseAdmin.from("orders").delete().eq("customer_email",
            // Get email from auth first
            (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email || ""
          );
          await supabaseAdmin.from("active_sessions").delete().eq("user_id", userId);
          await supabaseAdmin.from("profiles").delete().eq("id", userId);

          // Finally delete the auth user
          const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (deleteErr) {
            errors.push(`Auth delete failed for ${userId}: ${deleteErr.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(`Failed for user ${userId}: ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${successCount} student account(s).`,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return NextResponse.json({ error: `Unknown bulk action: ${action}` }, { status: 400 });

  } catch (error: any) {
    console.error("[STUDENTS_BULK_ERROR]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
