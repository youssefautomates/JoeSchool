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

const paymobApiKey = env['PAYMOB_API_KEY'];
const cardIntegrationId = env['PAYMOB_CARD_INTEGRATION_ID'] || '5659709';
const walletIntegrationId = env['PAYMOB_WALLET_INTEGRATION_ID'] || '5659699';

async function run() {
  console.log("🔑 Authenticating with Paymob...");
  const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: paymobApiKey }),
  });
  if (!authRes.ok) {
    console.error("❌ Auth failed:", authRes.status, await authRes.text());
    return;
  }
  const authData = await authRes.json();
  const authToken = authData.token;
  console.log("✅ Authenticated successfully.\n");

  const integrations = [cardIntegrationId, walletIntegrationId];

  for (const id of integrations) {
    console.log(`\n🔍 Fetching integration ${id} from Paymob Acceptance API...`);
    // Note: in Paymob, some endpoints are /api/acceptance/payment_keys or similar. 
    // Let's try querying integration details.
    const url = `https://accept.paymob.com/api/acceptance/integrations/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      }
    });

    console.log(`Integration ${id} Response Status:`, response.status);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      console.log(`Integration ${id} Data:`, JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(`Raw Response:`, text.slice(0, 1000));
    }
  }
}

run().catch(err => console.error(err));
