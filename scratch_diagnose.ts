import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== DIAGNOSING COURSES ===");
  const { data: courses, error: coursesErr } = await supabase
    .from("courses")
    .select("id, title, slug, status, lessons_count, duration_hours");

  if (coursesErr) {
    console.error("Error fetching courses:", coursesErr);
  } else {
    console.log(`Found ${courses?.length} courses in DB:`);
    console.log(JSON.stringify(courses, null, 2));
  }

  console.log("\n=== DIAGNOSING MODULES (SECTIONS) ===");
  const { data: modules, error: modulesErr } = await supabase
    .from("course_modules")
    .select("*");

  if (modulesErr) {
    console.error("Error fetching modules:", modulesErr);
  } else {
    console.log(`Found ${modules?.length} modules in DB:`);
    console.log(JSON.stringify(modules, null, 2));
  }

  console.log("\n=== DIAGNOSING LESSONS (LECTURES) ===");
  const { data: lessons, error: lessonsErr } = await supabase
    .from("course_lessons")
    .select("*");

  if (lessonsErr) {
    console.error("Error fetching lessons:", lessonsErr);
  } else {
    console.log(`Found ${lessons?.length} lessons in DB:`);
    console.log(JSON.stringify(lessons, null, 2));
  }
}

run();
