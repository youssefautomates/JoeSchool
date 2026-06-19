import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("=== Analytics Reset Verification ===");

  // 1. Get Reset Date from KV Settings
  const { data: kvData } = await supabase
    .from("products")
    .select("description")
    .eq("slug", "kv-marketing_settings")
    .single();

  let settings: any = {};
  if (kvData?.description) {
    try { settings = JSON.parse(kvData.description); } catch(e){}
  }
  const resetDateStr = settings.analyticsResetDate || new Date().toISOString();
  console.log(`1. Current Reset Date: ${resetDateStr}`);
  console.log(`   Current Mode: ${settings.analyticsMode || "lifetime"}`);

  const resetDate = new Date(resetDateStr);

  // 4 & 5. Orders Count
  const { data: allOrders } = await supabase.from("orders").select("id, created_at, status");
  const validOrders = allOrders?.filter(o => o.status === "completed") || [];
  const totalOrdersCount = validOrders.length;
  const resetOrdersCount = validOrders.filter(o => new Date(o.created_at) >= resetDate).length;
  
  console.log(`4. Total Orders (Lifetime): ${totalOrdersCount}`);
  console.log(`5. Orders (Since Reset): ${resetOrdersCount}`);

  // 6 & 7. Revenue
  const { data: allPayments } = await supabase.from("payments").select("id, created_at, amount_cents, status");
  const validPayments = allPayments?.filter(p => p.status === "succeeded" || p.status === "completed") || [];
  const totalRevenue = validPayments.reduce((acc, p) => acc + (p.amount_cents || 0), 0) / 100;
  const resetRevenue = validPayments
    .filter(p => new Date(p.created_at) >= resetDate)
    .reduce((acc, p) => acc + (p.amount_cents || 0), 0) / 100;

  console.log(`6. Total Revenue (Lifetime): ${totalRevenue} EGP`);
  console.log(`7. Revenue (Since Reset): ${resetRevenue} EGP`);

}

main().catch(console.error);
