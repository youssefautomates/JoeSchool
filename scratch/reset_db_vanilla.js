const pg = require("pg");

const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to DB!");

    // List all tables in public schema first
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("Tables in public schema:", tables.join(', '));

    // Tables we want to clear to reset the dashboard / control panel
    const deleteOrder = [
      "reviews",
      "certificates",
      "user_course_progress",
      "active_sessions",
      "lesson_notes",
      "activity_logs",
      "enrollments",
      "orders",
      "user_status"
    ];

    console.log("Starting reset of platform tables...");
    
    for (const table of deleteOrder) {
      if (tables.includes(table)) {
        console.log(`Clearing table: ${table}...`);
        const result = await client.query(`DELETE FROM public.${table};`);
        console.log(`Successfully cleared ${table} (${result.rowCount} rows affected).`);
      } else {
        console.log(`Table ${table} does not exist in schema. Skipping.`);
      }
    }

    console.log("🎉 Database reset completed successfully!");

  } catch (err) {
    console.error("Database error during reset:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
