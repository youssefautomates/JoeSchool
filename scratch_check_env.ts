import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

console.log("Environment variables keys:", Object.keys(process.env).filter(k => 
  k.includes("SUPABASE") || k.includes("DATABASE") || k.includes("POSTGRES") || k.includes("URL") || k.includes("KEY")
));
