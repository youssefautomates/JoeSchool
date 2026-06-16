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
      SELECT * 
      FROM public.orders 
      WHERE product_title LIKE '%قصص الكارتون%'
      LIMIT 3;
    `);
    console.log("Orders matching 'قصص الكارتون':");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
