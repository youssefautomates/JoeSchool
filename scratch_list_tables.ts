import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc("get_tables");
  
  if (error) {
    console.log("RPC get_tables failed. Trying query...");
    const { data: tableQuery, error: qErr } = await supabase
      .from("pg_catalog.pg_tables")
      .select("tablename")
      .eq("schemaname", "public");
    
    if (qErr) {
      console.error("Failed to fetch tables:", qErr.message);
    } else {
      console.log("Tables in database:", tableQuery.map(t => t.tablename));
    }
  } else {
    console.log("Tables in database:", data);
  }
}

run();
