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
      SELECT id, customer_name, customer_email, product_title, status, payment_id, created_at 
      FROM public.orders 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    console.log("\n=== Latest Orders ===");
    ordersRes.rows.forEach(r => {
      console.log(JSON.stringify(r));
    });

    const enrollRes = await client.query(`
      SELECT id, user_id, course_id, enrolled_at, user_name, user_email 
      FROM public.enrollments 
      ORDER BY enrolled_at DESC 
      LIMIT 5;
    `);
    console.log("\n=== Latest Enrollments ===");
    enrollRes.rows.forEach(r => {
      console.log(JSON.stringify(r));
    });

  } catch (err) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
