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

async function run() {
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
  console.log("✅ Authenticated successfully.\n");

  // Endpoint to fetch transactions
  // Paymob docs: GET https://accept.paymob.com/api/acceptance/transactions
  console.log("🔍 Fetching recent transactions from Paymob...");
  
  // Let's try to fetch transactions
  const txUrl = "https://accept.paymob.com/api/acceptance/transactions";
  const response = await fetch(txUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "Content-Type": "application/json"
    }
  });

  console.log("Fetch transactions status:", response.status);
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log("Transactions data keys:", Object.keys(data));
    
    let results = data.results || data;
    if (Array.isArray(results)) {
      console.log(`📋 Found ${results.length} transactions in list.`);
      
      // Save raw transactions to scratch
      fs.writeFileSync(path.resolve(__dirname, 'paymob_transactions_raw.json'), JSON.stringify(results, null, 2));
      console.log(`💾 Saved transactions to scratch/paymob_transactions_raw.json`);

      // Let's filter for transactions around 464 EGP (46400 cents)
      const matches = results.filter(tx => {
        const amt = tx.amount_cents / 100;
        return Math.abs(amt - 464) < 10;
      });

      console.log(`\n🔎 Found ${matches.length} transactions matching ~464 EGP:`);
      matches.forEach((tx, idx) => {
        console.log(`\n[Match #${idx+1}]`);
        console.log(`  - Transaction ID: ${tx.id}`);
        console.log(`  - Paymob Order ID: ${tx.order ? (tx.order.id || tx.order) : 'N/A'}`);
        console.log(`  - Created At: ${tx.created_at}`);
        console.log(`  - Success: ${tx.success}`);
        console.log(`  - Pending: ${tx.pending}`);
        console.log(`  - Amount: ${tx.amount_cents / 100} ${tx.currency}`);
        console.log(`  - Payment Method: ${tx.source_data?.sub_type || tx.source_data?.type || 'N/A'}`);
        console.log(`  - Customer Email: ${tx.billing_data?.email || tx.shipping_data?.email || 'N/A'}`);
        console.log(`  - Customer Phone: ${tx.billing_data?.phone_number || 'N/A'}`);
        console.log(`  - Customer Name: ${tx.billing_data?.first_name} ${tx.billing_data?.last_name}`);
        console.log(`  - Merchant Order ID: ${tx.order ? tx.order.merchant_order_id : 'N/A'}`);
      });
    } else {
      console.log("Response is not an array:", text.slice(0, 1000));
    }
  } catch (e) {
    console.error("Failed to parse transactions JSON:", e);
    console.log("Raw Response:", text.slice(0, 1000));
  }
}

run().catch(err => console.error("Error:", err));
