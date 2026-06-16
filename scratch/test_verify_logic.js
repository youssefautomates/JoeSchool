const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const paymobSecretKey = env['PAYMOB_SECRET_KEY'];
const paymobApiKey = env['PAYMOB_API_KEY'];

const candidates = [
  { email: 'yoyoyaya2952005@gmail.com', payment_id: 'pi_live_1a6c9c413a0c4771aa3abe6310b7b20c', name: 'Yasmine Salah' },
  { email: 'israaroaa18@gmail.com', payment_id: 'pi_live_da75ff60068c46e9a112891ddc1f4e67', name: 'Es Raa' },
  { email: 'megajack990@gmail.com', payment_id: 'pi_live_af11f6a428cb4a739cd4a2f0c68cd792', name: 'Karim Essa' }
];

async function run() {
  // Get Auth Token for Classic API
  console.log("🔑 Authenticating with Paymob Classic API...");
  const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: paymobApiKey }),
  });
  if (!authRes.ok) {
    console.error("❌ Paymob Classic API auth failed:", authRes.status, await authRes.text());
    return;
  }
  const authData = await authRes.json();
  const authToken = authData.token;
  console.log("✅ Authenticated successfully. Token retrieved.\n");

  for (const c of candidates) {
    console.log(`\n======================================================`);
    console.log(`👤 Checking Order for: ${c.name} (${c.email})`);
    console.log(`🔑 Payment ID / Intention: ${c.payment_id}`);
    
    // 1. Try Intention API
    console.log(`\n--- [1] Checking via Intention API ---`);
    const intUrl = `https://accept.paymob.com/v1/intention/${c.payment_id}/`;
    try {
      const res = await fetch(intUrl, {
        method: "GET",
        headers: {
          "Authorization": `Token ${paymobSecretKey}`
        }
      });
      console.log(`Intention API Status: ${res.status}`);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log("Intention API JSON:", JSON.stringify({
          id: json.id,
          status: json.status,
          confirmed: json.confirmed,
          amount: json.amount,
          order_id: json.order_id,
          payment_methods: json.payment_methods
        }, null, 2));
      } catch (e) {
        console.log("Intention API Text response:", text);
      }
    } catch (err) {
      console.error("Intention API call error:", err.message);
    }

    // 2. Try Classic API (if we can resolve it using payment_id as numeric, which it isn't, but wait!)
    // What if the payment intention has an associated Paymob order?
    // Let's see if we can search for order or transaction on Paymob
  }
}

run().catch(err => console.error("Error:", err));
