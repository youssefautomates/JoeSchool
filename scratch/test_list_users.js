const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
console.log("Loading env from:", envPath);
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Supabase URL:", supabaseUrl);
  console.log("Service Role Key exists:", !!serviceRoleKey);

  console.log("\n1. Testing listUsers...");
  const t0 = Date.now();
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10 });
    console.log(`listUsers done in ${Date.now() - t0}ms. Result:`, { 
      error, 
      userCount: data?.users?.length 
    });
  } catch (err) {
    console.error("listUsers threw:", err);
  }

  console.log("\n2. Testing query completed orders...");
  const t1 = Date.now();
  try {
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', start.toISOString());
    console.log(`orders query done in ${Date.now() - t1}ms. Result:`, { 
      error, 
      ordersCount: data?.length 
    });
  } catch (err) {
    console.error("orders query threw:", err);
  }

  console.log("\n3. Testing query analytics events...");
  const t2 = Date.now();
  try {
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('session_id, event_name, metadata, created_at')
      .gte('created_at', start.toISOString());
    console.log(`analytics_events query done in ${Date.now() - t2}ms. Result:`, { 
      error, 
      eventsCount: data?.length 
    });
  } catch (err) {
    console.error("analytics_events query threw:", err);
  }
}

main();
