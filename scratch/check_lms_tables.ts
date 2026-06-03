import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const { Client } = pg;
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const tables = ['video_watch_sessions', 'lesson_completions', 'student_streaks', 'course_progress', 'user_course_progress', 'enrollments'];
    
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${table}';
      `);
      console.log(`Columns in ${table} table:`);
      console.log(JSON.stringify(res.rows, null, 2));
      console.log("-----------------------------------------");
    }

  } catch (err: any) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
