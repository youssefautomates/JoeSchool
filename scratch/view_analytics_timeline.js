const pg = require("pg");

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, event_name, product_title, metadata, created_at 
      FROM public.analytics_events 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    console.log("Recent Analytics Events:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
