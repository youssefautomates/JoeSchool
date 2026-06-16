const fs = require('fs');
const path = require('path');
let pg;
try {
  pg = require('../apps/web/node_modules/pg');
} catch (e) {
  try {
    pg = require('pg');
  } catch (e2) {
    console.error('❌ Failed to load pg driver');
    process.exit(1);
  }
}

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected to Postgres database.");

    // 1. Inspect analytics_events schema
    const schemaRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'analytics_events'
    `);
    console.log("\n📋 Schema of 'analytics_events':");
    schemaRes.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // 2. Query analytics_events around June 12-13
    console.log("\n🔎 Querying analytics_events from 2026-06-12 00:00:00 to 2026-06-14 00:00:00 UTC...");
    const eventsRes = await client.query(`
      SELECT id, event_name, created_at, metadata
      FROM analytics_events
      WHERE created_at >= '2026-06-12 00:00:00+00' AND created_at <= '2026-06-14 00:00:00+00'
      ORDER BY created_at ASC
    `);

    const targetEmails = [
      'yoyoyaya2952005@gmail.com',
      'israaroaa18@gmail.com',
      'megajack990@gmail.com'
    ];

    console.log(`📋 Found ${eventsRes.rows.length} events total in this timeframe. Filtering for relevant ones...`);
    let matchCount = 0;
    eventsRes.rows.forEach(row => {
      const metaStr = JSON.stringify(row.metadata || {}).toLowerCase();
      const isTargetEmail = targetEmails.some(email => metaStr.includes(email.toLowerCase()));
      const isCheckout = row.event_name.includes('checkout') || row.event_name.includes('purchase') || row.event_name.includes('payment');
      
      if (isTargetEmail || isCheckout) {
        matchCount++;
        console.log(`[Event #${matchCount}] ID: ${row.id} | Name: ${row.event_name} | Created: ${row.created_at}`);
        console.log(`Metadata:`, JSON.stringify(row.metadata, null, 2));
      }
    });

    // 3. Query details of our three candidate orders
    console.log("\n🔎 Querying details of target orders...");
    const ordersRes = await client.query(`
      SELECT id, customer_name, customer_email, amount, status, payment_id, created_at
      FROM orders
      WHERE customer_email IN (
        'yoyoyaya2952005@gmail.com',
        'israaroaa18@gmail.com',
        'megajack990@gmail.com'
      )
    `);

    ordersRes.rows.forEach(order => {
      console.log(`\nOrder: ${order.customer_name} (${order.customer_email})`);
      console.log(`  - ID: ${order.id}`);
      console.log(`  - Status: ${order.status}`);
      console.log(`  - Amount: ${order.amount} EGP`);
      console.log(`  - Payment ID: ${order.payment_id}`);
      console.log(`  - Created At: ${order.created_at}`);
      console.log(`  - Updated At: ${order.updated_at}`);
    });

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await client.end();
  }
}

main().catch(err => console.error('Error:', err));
