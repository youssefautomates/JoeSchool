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

    // 1. Find the course id
    const coursesRes = await client.query("SELECT id, title FROM courses;");
    console.log("Courses in DB:", coursesRes.rows);
    
    // Find course matching "صناعة فيديوهات الأنيميشن"
    const animationCourse = coursesRes.rows.find(c => c.title.includes("الأنيميشن"));
    if (!animationCourse) {
      throw new Error("Animation course not found in DB!");
    }
    console.log("Found Animation Course ID:", animationCourse.id);

    // 2. Find the user in auth.users by email
    const userEmail = "themainjoenesta@gmail.com";
    const userRes = await client.query("SELECT id, email FROM auth.users WHERE email = $1;", [userEmail]);
    if (userRes.rows.length === 0) {
      console.log("User not found in auth.users! Let's search by prefix or wait. Maybe we need to register first?");
      // If the user got created during login/auth, we can check.
      return;
    }
    const userId = userRes.rows[0].id;
    console.log("Found User ID:", userId);

    // 3. Update the order in public.orders
    console.log("Updating order...");
    const orderRes = await client.query(`
      UPDATE public.orders 
      SET status = 'completed', customer_id = $1 
      WHERE customer_email = $2 AND status = 'pending'
      RETURNING *;
    `, [userId, userEmail]);
    console.log("Updated order rows:", orderRes.rows);

    if (orderRes.rows.length === 0) {
      console.log("No pending orders found to update!");
      return;
    }

    // 4. Enroll the user in enrollments table
    console.log("Enrolling user...");
    const enrollRes = await client.query(`
      INSERT INTO public.enrollments (user_id, course_id, status, user_name, user_email)
      VALUES ($1, $2, 'active', $3, $4)
      ON CONFLICT (user_id, course_id) DO NOTHING
      RETURNING *;
    `, [userId, animationCourse.id, "ياسمينة صلاح", userEmail]);
    console.log("Enrollment rows:", enrollRes.rows);

    console.log("🎉 Manual fulfillment successful!");

  } catch (err) {
    console.error("Fulfillment error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
