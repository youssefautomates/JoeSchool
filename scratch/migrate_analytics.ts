import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
// Use IPv4 Pooler host for Supabase in eu-west-1 region directly to bypass Node.js DNS failure
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  console.log("Connecting to Supabase PostgreSQL pooler via direct IP 34.241.16.247...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const migrationSql = `
      -- 1. Add international customer tracking fields to orders table
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS timezone TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ip_address TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS device_type TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS browser TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS os TEXT;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS language TEXT;

      -- 2. Notify schema reload
      NOTIFY pgrst, 'reload schema';
    `;

    console.log("Executing tracking schema migration...");
    await client.query(migrationSql);
    console.log("Migration executed successfully!");

  } catch (err: any) {
    console.error("Migration error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
