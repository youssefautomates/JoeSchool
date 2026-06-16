const pg = require("pg");

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Select all events
    const res = await client.query(`
      SELECT event_name, metadata, created_at 
      FROM public.analytics_events 
      WHERE metadata::text LIKE '%5381c7c0-c219-4662-9899-511a24a7f4c8%'
      LIMIT 10;
    `);
    console.log("Analytics Events for order 5381c7c0-c219-4662-9899-511a24a7f4c8:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
