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

    // Query enrollments for the two emails
    // We join with auth.users or profiles if needed, but let's query enrollments directly
    console.log("\n🔎 Querying enrollments...");
    const enrollRes = await client.query(`
      SELECT e.*, u.email
      FROM enrollments e
      LEFT JOIN auth.users u ON e.user_id = u.id
      WHERE u.email IN (
        'yoyoyaya2952005@gmail.com',
        'megajack990@gmail.com',
        'israaroaa18@gmail.com'
      )
    `);

    console.log(`📋 Found ${enrollRes.rows.length} enrollments:`);
    enrollRes.rows.forEach(r => {
      console.log(`  - Enrollment ID: ${r.id} | Email: ${r.email} | Course ID: ${r.course_id} | Details:`, JSON.stringify(r));
    });

    // Query profiles or users to see if they exist
    console.log("\n🔎 Querying users...");
    const usersRes = await client.query(`
      SELECT id, email, created_at
      FROM auth.users
      WHERE email IN (
        'yoyoyaya2952005@gmail.com',
        'megajack990@gmail.com',
        'israaroaa18@gmail.com'
      )
    `);
    usersRes.rows.forEach(u => {
      console.log(`  - User: ${u.email} | Created At: ${u.created_at} | ID: ${u.id}`);
    });

  } catch (err) {
    console.error("Database error:", err);
  } finally {
    await client.end();
  }
}

main().catch(err => console.error('Error:', err));
