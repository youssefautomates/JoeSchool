import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: courses, error } = await supabase.from("courses").select("*");
  console.log("Supabase Courses details:");
  if (courses) {
    courses.forEach(c => {
      console.log(`- ID: ${c.id}, Title: ${c.title}, Category: ${c.category}, Status: ${c.status}, is_free: ${c.is_free}, Price: ${c.price}`);
    });
  } else {
    console.log("No courses found or error:", error);
  }
}
run();
