const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const crypto = require('crypto');

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

function hashSHA256(text) {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

async function main() {
  console.log("Fetching Meta CAPI settings...");
  const { data } = await supabaseAdmin
    .from('products')
    .select('description')
    .eq('slug', 'kv-marketing_settings')
    .single();

  if (!data?.description) {
    console.error("No settings found!");
    return;
  }

  const settings = JSON.parse(data.description);
  console.log("Pixel ID:", settings.metaPixelId);
  console.log("CAPI Enabled:", settings.metaCapiEnabled);
  console.log("Test Code:", settings.metaCapiTestCode);

  if (!settings.metaCapiEnabled || !settings.metaCapiToken || !settings.metaPixelId) {
    console.error("CAPI Disabled or missing credentials!");
    return;
  }

  const txnId = "test_txn_" + Math.random().toString(36).substring(7);
  const eventId = `purchase_${txnId}`;

  const hashedEmail = hashSHA256("test_customer@joeschool.com");

  const capiEvent = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: "https://joeschool.com/checkout/success?id=" + txnId,
    user_data: {
      client_ip_address: "197.34.120.45",
      client_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      em: [hashedEmail]
    },
    custom_data: {
      currency: "EGP",
      value: 150.00,
      content_name: "كورس صناعة فيديوهات الأنيميشن بالذكاء الإصطناعي",
      content_type: "product",
      content_ids: ["course_test_123"]
    }
  };

  const payload = {
    data: [capiEvent]
  };

  if (settings.metaCapiTestCode) {
    payload.test_event_code = settings.metaCapiTestCode;
  }

  const metaUrl = `https://graph.facebook.com/v19.0/${settings.metaPixelId}/events?access_token=${settings.metaCapiToken}`;
  
  console.log("Dispatching CAPI test Purchase event to Meta Graph API...");
  console.log("Payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(metaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log("Response from Meta CAPI:", JSON.stringify(result, null, 2));
}

main();
