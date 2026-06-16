const fs = require('fs');
const path = require('path');

// Read and parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found at:', envPath);
  process.exit(1);
}

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

if (!paymobSecretKey) {
  console.error('❌ PAYMOB_SECRET_KEY missing in .env.local');
  process.exit(1);
}

const intentions = [
  { email: 'yoyoyaya2952005@gmail.com', id: 'pi_live_1a6c9c413a0c4771aa3abe6310b7b20c', name: 'ياسمين صلاح' },
  { email: 'israaroaa18@gmail.com', id: 'pi_live_da75ff60068c46e9a112891ddc1f4e67', name: 'Es Raa' },
  { email: 'megajack990@gmail.com', id: 'pi_live_af11f6a428cb4a739cd4a2f0c68cd792', name: 'Karim Essa' }
];

async function checkIntentions() {
  for (const int of intentions) {
    console.log(`\n🔍 Checking intention for ${int.name} (${int.email}): ${int.id}...`);
    const url = `https://accept.paymob.com/v1/intention/${int.id}/`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${paymobSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch intention ${int.id}:`, response.status, await response.text());
      continue;
    }

    const data = await response.json();
    console.log(`Intention status: ${data.status}`);
    console.log(`Confirmed: ${data.confirmed}`);
    console.log(`Paid Amount: ${data.amount / 100} ${data.currency}`);
    if (data.payment_methods) {
      data.payment_methods.forEach(pm => {
        console.log(`  - Method: ${pm.integration_id} | Status: ${pm.status} | Confirmed: ${pm.confirmed}`);
      });
    }
    // Print full response summary
    console.log('Full JSON response excerpt (first level keys):', Object.keys(data));
    console.log('Intention detail:', JSON.stringify({
      id: data.id,
      status: data.status,
      confirmed: data.confirmed,
      amount: data.amount,
      payment_methods: data.payment_methods
    }, null, 2));
  }
}

checkIntentions().catch(err => console.error('Error:', err));
