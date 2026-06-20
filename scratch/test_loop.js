const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
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
  let allUsers = [];
  let page = 1;
  const perPage = 1000;
  console.log("Starting users retrieval loop...");
  while (true) {
    console.log(`Querying page ${page}...`);
    const t0 = Date.now();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    console.log(`Page ${page} took ${Date.now() - t0}ms.`);
    if (error) {
      console.error(`Error on page ${page}:`, error);
      break;
    }
    if (!data?.users || data.users.length === 0) {
      console.log(`Page ${page} returned no users. Breaking.`);
      break;
    }
    allUsers.push(...data.users);
    console.log(`Page ${page} returned ${data.users.length} users. Total so far: ${allUsers.length}`);
    if (data.users.length < perPage) {
      console.log(`Page ${page} returned less than perPage (${data.users.length} < ${perPage}). Breaking.`);
      break;
    }
    page++;
    
    // Safety check to prevent infinite loop during testing if database has anomaly
    if (page > 50) {
      console.warn("Safety limit of 50 pages reached! Breaking loop.");
      break;
    }
  }
  console.log("Loop finished. Total users retrieved:", allUsers.length);
}

main();
