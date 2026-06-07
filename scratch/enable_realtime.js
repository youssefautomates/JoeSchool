const pg = require("pg");
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";
const { Client } = pg;
async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log("Connected to DB, checking and enabling realtime...");

  // In Supabase, we can enable replication by adding the tables to the 'supabase_realtime' publication.
  // First, check if the publication exists (it usually does by default).
  const pubCheck = await client.query(`
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  `);

  if (pubCheck.rows.length === 0) {
    console.log("Creating publication supabase_realtime...");
    await client.query("CREATE PUBLICATION supabase_realtime;");
  }

  // To safely add tables, we can alter publication
  const tables = ['orders', 'enrollments', 'reviews', 'analytics_events'];
  for (const table of tables) {
    try {
      console.log(`Enabling realtime for table: ${table}...`);
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};`);
      console.log(`Successfully enabled realtime for ${table}`);
    } catch (err) {
      if (err.message.includes("already exists") || err.message.includes("duplicate key")) {
        console.log(`Realtime was already enabled for ${table}`);
      } else {
        console.error(`Error enabling realtime for ${table}:`, err.message);
      }
    }
  }

  await client.end();
}
main().catch(console.error);
