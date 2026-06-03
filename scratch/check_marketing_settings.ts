import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Checking all KV keys in products table...");
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title")
    .ilike("slug", "kv-%");

  if (error) {
    console.error("Error fetching keys:", error);
    return;
  }

  console.log("Found KV records:", data);
}

main();
