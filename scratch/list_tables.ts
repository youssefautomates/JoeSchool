import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

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
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    console.log("Tables in public schema:");
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err: any) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
