import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: courses, error: cErr } = await supabase.from("courses").select("*");
  console.log("ANON COURSES READ:", { count: courses?.length, error: cErr });
  const { data: products, error: pErr } = await supabase.from("products").select("*");
  console.log("ANON PRODUCTS READ:", { count: products?.length, error: pErr });
}
run();
