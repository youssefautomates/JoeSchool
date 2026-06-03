import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== PRODUCTS SCHEMA ===");
  const { data: pData, error: pErr } = await supabase.from("products").select("*").limit(1);
  if (pErr) console.error("Products error:", pErr);
  else console.log("Products columns:", pData.length > 0 ? Object.keys(pData[0]) : "No data");

  console.log("\n=== COURSES SCHEMA ===");
  const { data: cData, error: cErr } = await supabase.from("courses").select("*").limit(1);
  if (cErr) console.error("Courses error:", cErr);
  else console.log("Courses columns:", cData.length > 0 ? Object.keys(cData[0]) : "No data");

  console.log("\n=== ORDERS SCHEMA ===");
  const { data: oData, error: oErr } = await supabase.from("orders").select("*").limit(1);
  if (oErr) console.error("Orders error:", oErr);
  else console.log("Orders columns:", oData.length > 0 ? Object.keys(oData[0]) : "No data");
}

run();
