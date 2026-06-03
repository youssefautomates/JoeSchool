import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const tables = ['profiles', 'student_profiles', 'orders', 'enrollments', 'course_progress', 'certificates', 'user_status'];
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${table}';
      `);
      console.log(`\n=== Columns in ${table} table ===`);
      console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    }

  } catch (err: any) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
