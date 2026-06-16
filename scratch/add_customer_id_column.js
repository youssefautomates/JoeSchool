const pg = require("pg");

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to database!");

    // 1. Add customer_id column to orders table referencing auth.users(id)
    console.log("Adding customer_id column to orders table...");
    await client.query(`
      ALTER TABLE public.orders 
      ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    `);
    console.log("Column added successfully!");

    // 2. Reload PostgREST schema cache
    console.log("Reloading schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("Schema cache reloaded successfully!");

  } catch (err) {
    console.error("Database schema update error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
