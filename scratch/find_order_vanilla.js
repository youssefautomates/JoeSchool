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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing in .env.local');
  process.exit(1);
}

async function fetchOrders() {
  console.log('🔍 Querying Supabase Rest API for orders...');
  
  // We'll fetch the recent orders first
  const url = `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('❌ Failed to fetch orders:', response.status, await response.text());
    return;
  }

  const orders = await response.json();
  console.log(`📋 Fetched ${orders.length} orders total.`);

  // Let's filter or list them
  console.log('\n--- ALL ORDERS ---');
  orders.forEach(order => {
    console.log(`ID: ${order.id} | Email: ${order.customer_email} | Amount (EGP): ${order.charged_amount_egp || order.total || order.amount} | Status: ${order.status} | Payment Status: ${order.payment_status} | Payment ID: ${order.payment_id} | Created: ${order.created_at}`);
  });

  // Let's find orders with value around 464 EGP or similar
  console.log('\n--- SEARCHING FOR ~464 EGP ORDERS ---');
  const targetOrders = orders.filter(order => {
    const amount = Number(order.charged_amount_egp || order.total || order.amount);
    return Math.abs(amount - 464) < 10;
  });

  if (targetOrders.length === 0) {
    console.log('❌ No orders matching ~464 EGP found.');
  } else {
    targetOrders.forEach(order => {
      console.log('Found matching order:');
      console.log(JSON.stringify(order, null, 2));
    });
  }
}

fetchOrders().catch(err => console.error('Error:', err));
