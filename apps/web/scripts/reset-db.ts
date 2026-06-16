import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import * as path from "path";

// Load environment variables from .env.local
loadEnvConfig(path.resolve(process.cwd()));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function resetDb() {
  console.log("Starting database reset...");

  try {
    const dummyUuid = "00000000-0000-0000-0000-000000000000";

    console.log("Clearing 'orders' table...");
    const { error: ordersError } = await supabaseAdmin.from("orders").delete().neq("id", dummyUuid);
    if (ordersError) console.error("Error clearing orders:", ordersError.message);
    else console.log("Orders cleared successfully.");

    console.log("Clearing 'analytics_events' table...");
    const { error: analyticsError } = await supabaseAdmin.from("analytics_events").delete().neq("id", dummyUuid);
    if (analyticsError) console.error("Error clearing analytics:", analyticsError.message);
    else console.log("Analytics cleared successfully.");

    console.log("Database reset completed successfully!");
  } catch (error) {
    console.error("Fatal error during reset:", error);
  }
}

resetDb();
