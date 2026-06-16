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

// Helper to verify admin access token
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === "authenticated";
}

/**
 * GET: Fetch detailed profile, course enrollments, digital products/orders, 
 * certificate list, and progress logs for a single student.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const { id } = await params;

    // 1. Get user auth data from Supabase Auth admin SDK
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || "الطالب غير موجود" }, { status: 404 });
    }
    const authUser = authData.user;

    // 2. Fetch profile from profiles table (if it exists)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // 3. Fetch user status / suspension details
    let { data: userStatus } = await supabaseAdmin
      .from("user_status")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();

    if (!userStatus) {
      // Default fallback
      userStatus = {
        user_id: id,
        is_suspended: false,
        suspension_reason: "",
        max_devices: 3
      };
    }

    // 4. Fetch course enrollments
    const { data: enrollments } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("user_id", id);

    // 5. Fetch certificates granted
    const { data: certificates } = await supabaseAdmin
      .from("certificates")
      .select("*")
      .eq("user_id", id);

    // 6. Fetch orders/commerce history (digital products or course checkout entries)
    const userEmail = authUser.email || profile?.email || "";
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("*")
      .or(`customer_id.eq.${id},customer_email.eq.${userEmail}`)
      .order("created_at", { ascending: false });

    // 7. Fetch user lesson completions and video watched seconds
    const { data: userProgress } = await supabaseAdmin
      .from("user_course_progress")
      .select("lesson_id")
      .eq("user_id", id);

    const { data: courseProgress } = await supabaseAdmin
      .from("course_progress")
      .select("*")
      .eq("user_id", id);

    // 8. Fetch all courses with modules and lessons so CRM can show progress checklist
    const { data: allCourses } = await supabaseAdmin
      .from("courses")
      .select("*");

    const coursesWithCurriculum = [];
    if (allCourses) {
      for (const course of allCourses) {
        // Only fetch curriculum for enrolled courses to save bandwidth, or all courses to allow mapping?
        // Let's do it for all courses so admin can view curriculum to enroll/configure
        const { data: modules } = await supabaseAdmin
          .from("course_modules")
          .select("*")
          .eq("course_id", course.id)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });
        
        const populatedModules = [];
        if (modules) {
          for (const mod of modules) {
            const { data: lessons } = await supabaseAdmin
              .from("course_lessons")
              .select("*")
              .eq("module_id", mod.id)
              .order("sort_order", { ascending: true })
              .order("id", { ascending: true });
            
            populatedModules.push({
              ...mod,
              lessons: lessons || []
            });
          }
        }
        
        coursesWithCurriculum.push({
          ...course,
          modules: populatedModules
        });
      }
    }

    // 8.5. Fetch all digital products for commerce controls
    const { data: allProducts } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("title", { ascending: true });

    // 9. Fetch active sessions for device tracking
    const { data: activeSessions } = await supabaseAdmin
      .from("active_sessions")
      .select("*")
      .eq("user_id", id)
      .order("last_activity", { ascending: false });

    // 10. Fetch admin action logs for audit trail
    const { data: actionLogs } = await supabaseAdmin
      .from("admin_action_logs")
      .select("*")
      .eq("student_id", id)
      .order("created_at", { ascending: false });

    // 11. Compile timeline elements
    // IP masking helper
    function maskIp(ip: string | undefined | null) {
      if (!ip) return "Unknown";
      if (ip.includes(".")) {
        const parts = ip.split(".");
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.xxx.xxx`;
        }
        return ip.replace(/\d+$/, "xxx");
      }
      if (ip.includes(":")) {
        const parts = ip.split(":");
        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}:xxx:xxx::xxx`;
        }
        return "xxxx::xxxx";
      }
      return ip;
    }

    // Last watched video
    let lastWatchedVideo = null;
    if (courseProgress && courseProgress.length > 0) {
      const sortedProgress = [...courseProgress].sort((a, b) => {
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });
      const latestProgress = sortedProgress[0];
      if (latestProgress) {
        let lessonTitle = "درس غير معروف";
        let found = false;
        for (const course of coursesWithCurriculum) {
          for (const mod of course.modules) {
            for (const les of mod.lessons) {
              if (les.id === latestProgress.lesson_id) {
                lessonTitle = les.title;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          if (found) break;
        }

        lastWatchedVideo = {
          lesson_id: latestProgress.lesson_id,
          title: lessonTitle,
          watched_seconds: latestProgress.watched_seconds,
          completed: latestProgress.completed,
          updated_at: latestProgress.updated_at
        };
      }
    }

    // Last purchase
    const lastPurchase = orders && orders.length > 0 ? {
      product_title: orders[0].product_title,
      amount: orders[0].amount,
      currency: orders[0].currency,
      payment_method: orders[0].payment_method,
      created_at: orders[0].created_at
    } : null;

    // Last session
    const lastSession = activeSessions && activeSessions.length > 0 ? {
      device: activeSessions[0].device_name || activeSessions[0].user_agent || "Device",
      masked_ip: maskIp(activeSessions[0].ip_address),
      last_active: activeSessions[0].last_activity
    } : null;

    // Last coupon used
    const latestOrderWithCoupon = (orders || []).find(o => o.coupon_code && o.coupon_code.trim() !== "");
    const lastCouponUsed = latestOrderWithCoupon ? {
      code: latestOrderWithCoupon.coupon_code,
      date: latestOrderWithCoupon.created_at || latestOrderWithCoupon.completed_at
    } : null;

    return NextResponse.json({
      success: true,
      student: {
        id: id,
        email: authUser.email,
        phone: authUser.phone || profile?.phone || "",
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        user_metadata: authUser.user_metadata,
        profile: profile || null,
        status: userStatus,
        enrollments: enrollments || [],
        certificates: certificates || [],
        orders: orders || [],
        completedLessons: (userProgress || []).map(p => p.lesson_id),
        courseProgress: courseProgress || [],
        activeSessions: activeSessions || [],
        adminActionLogs: actionLogs || [],
        timeline: {
          lastSignIn: authUser.last_sign_in_at || null,
          lastWatchedVideo,
          lastPurchase,
          lastSession,
          lastCouponUsed
        }
      },
      allCourses: coursesWithCurriculum,
      allProducts: allProducts || []
    });

  } catch (error: any) {
    console.error("[GET_STUDENT_CRM_ERROR]:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}

/**
 * PUT: Update user profile, password, or security status
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { 
      name, 
      email, 
      phone, 
      max_devices, 
      is_suspended, 
      suspension_reason, 
      action 
    } = body;

    // Handle security/password actions
    if (action === "send_reset") {
      // 1. Generate recovery reset password link
      const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`
        }
      });

      if (recoveryError) {
        return NextResponse.json({ error: recoveryError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: email || "",
        action_type: "SEND_PASSWORD_RESET",
        details: "Generated and sent password reset link to student.",
        created_at: new Date().toISOString()
      });

      // Also trigger automatic reset password email delivery if possible
      try {
        await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`
        });
      } catch (err) {
        console.warn("Could not automatically deliver reset email:", err);
      }

      return NextResponse.json({
        success: true,
        message: "تم توليد رابط إعادة تعيين كلمة المرور بنجاح وإرساله للبريد الإلكتروني",
        resetLink: recoveryData.properties?.action_link || ""
      });
    }

    if (action === "temp_password") {
      // Generate secure random temporary password
      const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
      let tempPassword = "YA-";
      for (let i = 0; i < 8; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Get current user metadata to merge
      const { data: authUserObj } = await supabaseAdmin.auth.admin.getUserById(id);
      const currentMeta = authUserObj?.user?.user_metadata || {};

      // Update auth user password and metadata
      const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: tempPassword,
        user_metadata: {
          ...currentMeta,
          requires_password_change: true,
          temporary_password_created_at: new Date().toISOString()
        }
      });

      if (pwdError) {
        return NextResponse.json({ error: pwdError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: email || authUserObj?.user?.email || "",
        action_type: "GENERATE_TEMP_PASSWORD",
        details: "Generated one-time temporary password for student.",
        created_at: new Date().toISOString()
      });

      // Invalidate all active sessions to log student out immediately
      await supabaseAdmin
        .from("active_sessions")
        .update({ is_active: false })
        .eq("user_id", id);

      return NextResponse.json({
        success: true,
        message: "تم تغيير كلمة المرور وتوليد كلمة مرور مؤقتة بنجاح",
        tempPassword
      });
    }

    if (action === "set_custom_password") {
      const { customPassword } = body;
      if (!customPassword || customPassword.length < 6) {
        return NextResponse.json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" }, { status: 400 });
      }

      const { data: authUserObj } = await supabaseAdmin.auth.admin.getUserById(id);

      const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: customPassword
      });

      if (pwdError) {
        return NextResponse.json({ error: pwdError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: email || authUserObj?.user?.email || "",
        action_type: "SET_CUSTOM_PASSWORD",
        details: "Admin manually updated the student's password.",
        created_at: new Date().toISOString()
      });

      // Invalidate active sessions to log user out immediately
      await supabaseAdmin
        .from("active_sessions")
        .update({ is_active: false })
        .eq("user_id", id);

      return NextResponse.json({
        success: true,
        message: "تم تغيير كلمة المرور للمشترك بنجاح"
      });
    }

    // Standard profile update
    const firstName = name.split(" ")[0] || "";
    const lastName = name.split(" ").slice(1).join(" ") || "";

    // Get current user metadata to merge
    const { data: authUserObj } = await supabaseAdmin.auth.admin.getUserById(id);
    const currentMeta = authUserObj?.user?.user_metadata || {};

    // 1. Update Auth user profile metadata
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: email,
      phone: phone || undefined,
      user_metadata: {
        ...currentMeta,
        first_name: firstName,
        last_name: lastName,
        full_name: name,
        name: name
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Update profiles table
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id,
        email,
        phone: phone || "",
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    // 3. Update enrollments and certificates student details
    await supabaseAdmin
      .from("enrollments")
      .update({ user_name: name, user_email: email })
      .eq("user_id", id);

    await supabaseAdmin
      .from("certificates")
      .update({ student_name: name })
      .eq("user_id", id);

    // 4. Update user_status table for suspension and devices
    const { data: existingStatus } = await supabaseAdmin
      .from("user_status")
      .select("user_id")
      .eq("user_id", id)
      .maybeSingle();

    if (existingStatus) {
      await supabaseAdmin
        .from("user_status")
        .update({
          is_suspended: !!is_suspended,
          suspension_reason: suspension_reason || "",
          max_devices: Number(max_devices) || 3,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", id);
    } else {
      await supabaseAdmin
        .from("user_status")
        .insert({
          user_id: id,
          is_suspended: !!is_suspended,
          suspension_reason: suspension_reason || "",
          max_devices: Number(max_devices) || 3
        });
    }

    // Invalidate sessions if user is suspended
    if (is_suspended) {
      await supabaseAdmin
        .from("active_sessions")
        .update({ is_active: false })
        .eq("user_id", id);
    }

    // Log admin action for profile updates
    await supabaseAdmin.from("admin_action_logs").insert({
      admin_email: "admin@joeschool.com",
      student_id: id,
      student_email: email || "",
      action_type: "UPDATE_PROFILE",
      details: `Updated student profile. Name: ${name}, Phone: ${phone}, Max Devices: ${max_devices}, Suspended: ${!!is_suspended}${is_suspended ? ` (Reason: ${suspension_reason})` : ""}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث بيانات الطالب وحالة الحساب بنجاح"
    });

  } catch (error: any) {
    console.error("[PUT_STUDENT_CRM_ERROR]:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}

/**
 * PATCH: Manage course enrollments, digital products, lesson completed status, 
 * or certificate issue/revocation.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { 
      action, 
      courseId, 
      courseTitle,
      lessonId, 
      completed, 
      studentName, 
      studentEmail, 
      certificateBgUrl,
      productId,
      productTitle,
      amount
    } = body;

    // Fetch student email if not provided
    let studentEmailVal = studentEmail;
    if (!studentEmailVal) {
      const { data: authUserObj } = await supabaseAdmin.auth.admin.getUserById(id);
      studentEmailVal = authUserObj?.user?.email || "";
    }

    // A. ENROLL IN COURSE
    if (action === "enroll") {
      if (!courseId) {
        return NextResponse.json({ error: "معرف الكورس مطلوب" }, { status: 400 });
      }

      // Check if already enrolled
      const { data: existing } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("user_id", id)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "الطالب مسجل بالفعل في هذا الكورس" }, { status: 400 });
      }

      // Insert enrollment
      const { error: enrollError } = await supabaseAdmin
        .from("enrollments")
        .insert({
          user_id: id,
          course_id: courseId,
          user_name: studentName || "طالب جو سكول",
          user_email: studentEmailVal || "",
          status: "active"
        });

      if (enrollError) {
        return NextResponse.json({ error: enrollError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "ENROLL_COURSE",
        details: `Enrolled student in course: ${courseTitle || courseId}.`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم تسجيل الطالب في الكورس بنجاح" });
    }

    // B. DISENROLL FROM COURSE
    if (action === "disenroll") {
      if (!courseId) {
        return NextResponse.json({ error: "معرف الكورس مطلوب" }, { status: 400 });
      }

      // Delete enrollment
      const { error: disenrollError } = await supabaseAdmin
        .from("enrollments")
        .delete()
        .eq("user_id", id)
        .eq("course_id", courseId);

      if (disenrollError) {
        return NextResponse.json({ error: disenrollError.message }, { status: 400 });
      }

      // Remove course-specific watch progress logs
      await supabaseAdmin
        .from("course_progress")
        .delete()
        .eq("user_id", id)
        .eq("course_id", courseId);

      // Clean up lesson completed checkmarks.
      // First find modules in this course to get modules IDs
      const { data: mods } = await supabaseAdmin
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);
      
      if (mods && mods.length > 0) {
        const modIds = mods.map(m => m.id);
        const { data: lessons } = await supabaseAdmin
          .from("course_lessons")
          .select("id")
          .in("module_id", modIds);
        
        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          await supabaseAdmin
            .from("user_course_progress")
            .delete()
            .eq("user_id", id)
            .in("lesson_id", lessonIds);
        }
      }

      // Revoke certificate if exists
      await supabaseAdmin
        .from("certificates")
        .delete()
        .eq("user_id", id)
        .eq("course_id", courseId);

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "DISENROLL_COURSE",
        details: `Disenrolled student from course: ${courseId}.`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم إلغاء تسجيل الطالب وحذف تقدمه بنجاح" });
    }

    // C. TOGGLE LESSON COMPLETE CHECKBOX
    if (action === "toggle_lesson") {
      if (!lessonId || !courseId) {
        return NextResponse.json({ error: "الدرس والكورس مطلوبان" }, { status: 400 });
      }

      if (completed) {
        // Complete lesson
        await supabaseAdmin
          .from("user_course_progress")
          .upsert({ user_id: id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });

        await supabaseAdmin
          .from("course_progress")
          .upsert({
            user_id: id,
            course_id: courseId,
            lesson_id: lessonId,
            completed: true,
            watched_seconds: 60, // dummy duration
            last_position: 60,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,lesson_id" });
      } else {
        // Incomplete lesson
        await supabaseAdmin
          .from("user_course_progress")
          .delete()
          .eq("user_id", id)
          .eq("lesson_id", lessonId);

        await supabaseAdmin
          .from("course_progress")
          .delete()
          .eq("user_id", id)
          .eq("lesson_id", lessonId);
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "TOGGLE_LESSON",
        details: `${completed ? "Marked complete" : "Marked incomplete"} lesson ${lessonId} in course ${courseId}.`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم تحديث حالة اكتمال الدرس بنجاح" });
    }

    // D. RESET ALL PROGRESS FOR A COURSE
    if (action === "reset_progress") {
      if (!courseId) {
        return NextResponse.json({ error: "معرف الكورس مطلوب" }, { status: 400 });
      }

      // Delete course watch logs
      await supabaseAdmin
        .from("course_progress")
        .delete()
        .eq("user_id", id)
        .eq("course_id", courseId);

      // Clean up lesson checkmarks
      const { data: mods } = await supabaseAdmin
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId);
      
      if (mods && mods.length > 0) {
        const modIds = mods.map(m => m.id);
        const { data: lessons } = await supabaseAdmin
          .from("course_lessons")
          .select("id")
          .in("module_id", modIds);
        
        if (lessons && lessons.length > 0) {
          const lessonIds = lessons.map(l => l.id);
          await supabaseAdmin
            .from("user_course_progress")
            .delete()
            .eq("user_id", id)
            .in("lesson_id", lessonIds);
        }
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "RESET_PROGRESS",
        details: `Reset all lesson progress for course: ${courseId}.`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم تصفير وإعادة تعيين تقدم الطالب بنجاح" });
    }

    // E. GRANT CERTIFICATE
    if (action === "grant_certificate") {
      if (!courseId || !courseTitle) {
        return NextResponse.json({ error: "معرف الكورس وعنوانه مطلوبان" }, { status: 400 });
      }

      const verificationId = `YA-CERT-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

      const { error: certError } = await supabaseAdmin
        .from("certificates")
        .insert({
          user_id: id,
          course_id: courseId,
          issued_at: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          verification_id: verificationId,
          student_name: studentName || "طالب جو سكول",
          course_name: courseTitle,
          certificate_bg_url: certificateBgUrl || ""
        });

      if (certError) {
        return NextResponse.json({ error: certError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "GRANT_CERTIFICATE",
        details: `Issued completion certificate for course: ${courseTitle || courseId}. Verification ID: ${verificationId}`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم إصدار الشهادة للطالب بنجاح" });
    }

    // F. REVOKE CERTIFICATE
    if (action === "revoke_certificate") {
      if (!courseId) {
        return NextResponse.json({ error: "معرف الكورس مطلوب" }, { status: 400 });
      }

      const { error: certError } = await supabaseAdmin
        .from("certificates")
        .delete()
        .eq("user_id", id)
        .eq("course_id", courseId);

      if (certError) {
        return NextResponse.json({ error: certError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "REVOKE_CERTIFICATE",
        details: `Revoked completion certificate for course: ${courseId}.`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم سحب وإلغاء الشهادة بنجاح" });
    }

    // G. GRANT DIGITAL PRODUCT OR ORDER HISTORY ACCESS
    if (action === "grant_product") {
      if (!productId || !productTitle) {
        return NextResponse.json({ error: "معرف المنتج وعنوانه مطلوبان" }, { status: 400 });
      }

      // Generate a mock order record to simulate purchase access
      const orderId = `man-${Math.random().toString(36).substring(2, 11)}`;
      const { error: ordError } = await supabaseAdmin
        .from("orders")
        .insert({
          id: orderId,
          customer_id: id,
          customer_email: studentEmailVal || "",
          customer_name: studentName || "عميل جو سكول",
          product_id: productId,
          product_title: productTitle,
          amount: Number(amount) || 0,
          currency: "EGP",
          status: "completed",
          payment_provider: "admin_grant",
          payment_method: "Admin Manual Grant",
          country: "EG",
          timezone: "UTC",
          ip_address: "127.0.0.1",
          device_type: "Desktop",
          browser: "Admin Console",
          os: "Unknown",
          language: "ar"
        });

      if (ordError) {
        return NextResponse.json({ error: ordError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "GRANT_PRODUCT",
        details: `Manually granted digital product: ${productTitle || productId}. Order ID: ${orderId}`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم منح صلاحية الوصول للمنتج الرقمي بنجاح" });
    }

    // H. REVOKE PRODUCT ACCESS
    if (action === "revoke_product") {
      if (!productId) {
        return NextResponse.json({ error: "معرف المنتج مطلوب" }, { status: 400 });
      }

      // Delete manual grants or orders matching product_id and student email or customer_id
      const { error: ordError } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("product_id", productId)
        .or(`customer_id.eq.${id},customer_email.eq.${studentEmailVal}`);

      if (ordError) {
        return NextResponse.json({ error: ordError.message }, { status: 400 });
      }

      // Log admin action
      await supabaseAdmin.from("admin_action_logs").insert({
        admin_email: "admin@joeschool.com",
        student_id: id,
        student_email: studentEmailVal || "",
        action_type: "REVOKE_PRODUCT",
        details: `Revoked manual grant/access to digital product: ${productId}.`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({ success: true, message: "تم سحب صلاحية الوصول للمنتج الرقمي بنجاح" });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });

  } catch (error: any) {
    console.error("[PATCH_STUDENT_CRM_ERROR]:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي في الخادم" }, { status: 500 });
  }
}
