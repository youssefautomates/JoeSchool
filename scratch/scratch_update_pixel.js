const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach(line => {
    if (!line || line.trim().startsWith("#")) return;
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/(^['"]|['"]$)/g, "");
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase URL or Service Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const MARKETING_KEY = "marketing_settings";
  
  // getKV
  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('id, description')
    .eq('slug', `kv-${MARKETING_KEY}`)
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    process.exit(1);
  }

  let current = {};
  if (existing && existing.description) {
    current = JSON.parse(existing.description);
  }
  console.log("Current settings in DB:", current);

  const newSettings = {
    ...current,
    metaPixelId: "26144977705179312",
    metaPixelEnabled: true,
    metaCapiToken: "EAAN1MsDqq5QBRiq3ni3EeNtFpDz3av1XvlBO9ZBDgqMpag6EkpBv8M7qyftupHFO7R4ZBdEaNmxZAx9DqXWAP7d1uPndE8z6JLC2Bnp062lU6qNvpNytnFIf15Hjrv7PuUlgbb2FR7mRDI73iEpYN3fzZBBxz1Ga7ZBWU4a7zdLJUwXkYuViMmtk5ATj09gZDZD",
    metaCapiEnabled: true
  };

  console.log("Updating settings to:", newSettings);
  const stringValue = JSON.stringify(newSettings);

  if (existing) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ description: stringValue })
      .eq('id', existing.id);
    if (updateError) {
      console.error("Update error:", updateError);
    } else {
      console.log("Update success!");
    }
  } else {
    const { error: insertError } = await supabase
      .from('products')
      .insert({
        slug: `kv-${MARKETING_KEY}`,
        title: `System Data - ${MARKETING_KEY}`,
        short_description: 'System internal data. Do not delete.',
        description: stringValue,
        price: 0,
        status: 'مخفي',
        image_url: 'https://via.placeholder.com/150',
        is_featured: false,
        sales: 0,
        views: 0
      });
    if (insertError) {
      console.error("Insert error:", insertError);
    } else {
      console.log("Insert success!");
    }
  }
}

main().catch(console.error);
