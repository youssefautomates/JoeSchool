import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== SYNCING EXISTING COURSE STATS ===");
  
  const courseId = "course-1779185053453";

  // 1. Fetch modules
  const { data: modules, error: mError } = await supabase
    .from("course_modules")
    .select("id")
    .eq("course_id", courseId);

  if (mError) {
    console.error("Error fetching modules:", mError);
    return;
  }

  console.log(`Found ${modules?.length} modules for course ${courseId}`);
  if (!modules || modules.length === 0) {
    console.log("No modules found.");
    return;
  }

  const moduleIds = modules.map(m => m.id);

  // 2. Fetch lessons
  const { data: lessons, error: lError } = await supabase
    .from("course_lessons")
    .select("id, duration_seconds")
    .in("module_id", moduleIds);

  if (lError) {
    console.error("Error fetching lessons:", lError);
    return;
  }

  console.log(`Found ${lessons?.length} lessons in these modules.`);
  const computedLessonsCount = lessons.length;
  const totalSeconds = lessons.reduce((acc, l) => acc + (Number(l.duration_seconds) || 0), 0);
  const computedDurationHours = totalSeconds > 0 ? Number((totalSeconds / 3600).toFixed(1)) : 0;

  console.log(`Calculated stats: lessons_count = ${computedLessonsCount}, duration_hours = ${computedDurationHours} (total seconds = ${totalSeconds})`);

  // 3. Update course table
  const { data: updated, error: uError } = await supabase
    .from("courses")
    .update({
      lessons_count: computedLessonsCount,
      duration_hours: computedDurationHours
    })
    .eq("id", courseId)
    .select();

  if (uError) {
    console.error("Error updating course stats:", uError);
  } else {
    console.log("Course stats successfully updated in Supabase courses table:");
    console.log(JSON.stringify(updated, null, 2));
  }
}

run();
