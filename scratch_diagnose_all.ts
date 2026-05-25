import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== COUNT DIAGNOSTICS ===");

  const tables = ["products", "courses", "orders", "enrollments", "analytics_events"];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
    } else {
      console.log(`${table}: ${count} records`);
    }
  }

  console.log("\n=== PRODUCTS IN DB ===");
  const { data: prods } = await supabase.from("products").select("id, title, price, sales, status");
  console.log(JSON.stringify(prods, null, 2));

  console.log("\n=== COURSES IN DB ===");
  const { data: crs } = await supabase.from("courses").select("id, title, price, status");
  console.log(JSON.stringify(crs, null, 2));
}

run();
