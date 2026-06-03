import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
// Use IPv4 Pooler IP address directly to avoid flaky DNS issues
const host = "34.241.16.247";
const projectRef = "ftiyeuhqqxpraiasjjvz";
const password = "@Youssefmostafa26";

async function main() {
  console.log(`Connecting to PostgreSQL pooler at ${host}...`);
  const client = new Client({
    host,
    port: 6543,
    user: `postgres.${projectRef}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const migrationSql = `
      -- Add gateway_fee_percentage to orders table
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_fee_percentage NUMERIC(4,2) DEFAULT 3.00;
      
      -- Update existing records if any
      UPDATE public.orders SET gateway_fee_percentage = 3.00 WHERE gateway_fee_percentage IS NULL;

      -- Reload PostgREST schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log("Executing percentage column migration...");
    await client.query(migrationSql);
    console.log("Migration executed successfully!");

  } catch (err: any) {
    console.error("Migration database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
