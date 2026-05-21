import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const { getCourseBySlug } = await import("./src/lib/coursesDb");
  const result = await getCourseBySlug("AI-Animation-Course");
  console.log("getCourseBySlug output course:", JSON.stringify(result.course, null, 2));
  console.log("getCourseBySlug output sections count:", result.sections.length);
  for (const s of result.sections) {
    console.log(`Section "${s.title}" has ${s.lessons?.length || 0} lessons`);
  }
}

run();
