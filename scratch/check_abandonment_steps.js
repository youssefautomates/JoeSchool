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
      SELECT last_step_completed, count(*) 
      FROM public.checkout_abandonment 
      GROUP BY last_step_completed;
    `);
    console.log("Distinct last_step_completed values:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
