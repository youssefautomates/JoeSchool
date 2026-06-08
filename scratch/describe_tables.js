const pg = require("pg");
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";
const { Client } = pg;
async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN ('activity_logs', 'orders');
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main().catch(console.error);
