import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const { getCoursesList } = await import("./src/lib/coursesDb");
  const courses = await getCoursesList();
  console.log("getCoursesList output:", JSON.stringify(courses, null, 2));
}

run();
