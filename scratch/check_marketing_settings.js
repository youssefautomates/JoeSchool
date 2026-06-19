const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');

// Load env
const envPath = 'e:\\Antigravity Projects\\YoussefAutomates\\apps\\web\\.env.local';
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
  console.log("Querying products table for key marketing_settings...");
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('description')
      .eq('slug', 'kv-marketing_settings')
      .single();
      
    if (error) {
      console.error("Error fetching kv-marketing_settings:", error);
    } else if (data?.description) {
      console.log("Marketing Settings:");
      console.log(JSON.stringify(JSON.parse(data.description), null, 2));
    } else {
      console.log("No marketing settings found.");
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

main();
