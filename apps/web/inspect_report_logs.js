const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '.env.local');
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
  console.log("Querying report_logs table...");
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('report_logs')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error("Error fetching report_logs:", error);
    } else {
      console.log("report_logs:", JSON.stringify(logs, null, 2));
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

main();
