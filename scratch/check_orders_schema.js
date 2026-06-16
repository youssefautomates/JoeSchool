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
    console.log("Connected successfully!");

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    console.log("Columns in 'orders' table:");
    res.rows.forEach(r => {
      console.log(`- ${r.column_name}: ${r.data_type}`);
    });

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await client.end();
  }
}

main();
