const pg = require("pg");

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const ordersRes = await client.query(`
      SELECT * 
      FROM public.orders 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);
    console.log("\n=== Latest Order Complete Record ===");
    console.log(JSON.stringify(ordersRes.rows[0], null, 2));

  } catch (err) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
