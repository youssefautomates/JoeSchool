const pg = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Tables in public schema:");
    console.log(res.rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
