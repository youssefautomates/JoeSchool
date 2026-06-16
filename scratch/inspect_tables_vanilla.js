const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found');
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

// Load pg from apps/web/node_modules/pg
let pg;
try {
  pg = require('../apps/web/node_modules/pg');
} catch (e) {
  try {
    pg = require('pg');
  } catch (e2) {
    console.error('❌ Failed to load pg driver from local node_modules');
    process.exit(1);
  }
}

// Connection string
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected to Postgres database successfully.");

    // 1. List all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("📋 Public Tables in database:\n", tables.join(', '));

    // 2. Check if any table seems like a log or audit table
    const logTables = tables.filter(t => t.includes('log') || t.includes('audit') || t.includes('history') || t.includes('event') || t.includes('webhook') || t.includes('analytics'));
    console.log("\n🔎 Potential logging/audit tables:", logTables);

    for (const table of logTables) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      console.log(`  - Table "${table}" has ${countRes.rows[0].count} rows.`);
    }

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await client.end();
  }
}

main().catch(err => console.error('Error:', err));
