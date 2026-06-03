import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
// Use IPv4 Pooler host for Supabase in eu-west-1 region
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function main() {
  console.log("Connecting to PostgreSQL pooler in eu-west-1...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const migrationSql = `
      -- 1. Add enable_gateway_fee to products table
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS enable_gateway_fee BOOLEAN DEFAULT true;
      
      -- 2. Add enable_gateway_fee to courses table
      ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enable_gateway_fee BOOLEAN DEFAULT true;
      
      -- 3. Add fee recovery columns to orders table
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_fee_amount NUMERIC(10,2) DEFAULT 0;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gateway_fee_enabled BOOLEAN DEFAULT false;
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal_price NUMERIC(10,2);
      ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS final_price NUMERIC(10,2);
      
      -- 4. Set existing records' enable_gateway_fee to true
      UPDATE public.products SET enable_gateway_fee = true WHERE enable_gateway_fee IS NULL;
      UPDATE public.courses SET enable_gateway_fee = true WHERE enable_gateway_fee IS NULL;
      
      -- 5. Reload PostgREST schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log("Executing gateway fee recovery system migration...");
    await client.query(migrationSql);
    console.log("Migration executed successfully!");

  } catch (err: any) {
    console.error("Migration database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
