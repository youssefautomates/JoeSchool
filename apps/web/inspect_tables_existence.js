const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase.rpc('get_tables_list'); // checking if there is a custom RPC, or use raw sql if possible
  
  // Since we cannot run raw sql via select direct on information_schema unless exposed, 
  // let's try querying standard tables to see which ones are accessible.
  const tables = ['profiles', 'orders', 'enrollments', 'products', 'coupons', 'lessons', 'sections', 'courses'];
  console.log("Checking table existence by querying limit 0...");
  for (const t of tables) {
    const { error: err } = await supabase.from(t).select('*').limit(0);
    if (err) {
      console.log(`Table '${t}': NOT ACCESSIBLE/DOES NOT EXIST. Error:`, err.message);
    } else {
      console.log(`Table '${t}': EXISTS and is accessible.`);
    }
  }
}

main();
