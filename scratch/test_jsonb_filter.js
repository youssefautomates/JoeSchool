const pg = require("pg");

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Fetch latest order IDs
    const ordersRes = await client.query(`SELECT id FROM public.orders LIMIT 5;`);
    const ids = ordersRes.rows.map(r => r.id);
    console.log("Order IDs:", ids);

    if (ids.length > 0) {
      // Query analytics events for these orders
      const eventsRes = await client.query(`
        SELECT event_name, metadata->>'order_id' as order_id, created_at
        FROM public.analytics_events
        WHERE metadata->>'order_id' = ANY($1)
        ORDER BY created_at DESC;
      `, [ids]);
      console.log("Events found:", eventsRes.rows);
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
