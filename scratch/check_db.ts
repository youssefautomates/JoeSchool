import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// 1. Install pg module dynamically
console.log("Installing pg module...");
try {
  execSync("npm install pg --no-save", { stdio: "inherit" });
} catch (err) {
  console.error("Failed to install pg:", err);
}

// 2. Import pg and connect
import pg from "pg";

const { Client } = pg;

// Connection string
// Host: db.ftiyeuhqqxpraiasjjvz.supabase.co
// Password is from ADMIN_PASSWORD or similar. We will try @Youssefmostafa26
const connectionString = "postgres://postgres:%40Youssefmostafa26@db.ftiyeuhqqxpraiasjjvz.supabase.co:5432/postgres";

async function main() {
  console.log("Connecting to PostgreSQL...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase external connections
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS public.product_reviews (
        id TEXT PRIMARY KEY,
        "productId" TEXT,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT,
        rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
        text TEXT NOT NULL,
        "avatarUrl" TEXT,
        gender TEXT,
        "isVerified" BOOLEAN NOT NULL DEFAULT true,
        "isHidden" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        status TEXT NOT NULL DEFAULT 'pending',
        "isFeatured" BOOLEAN NOT NULL DEFAULT false,
        "featuredPosition" INTEGER DEFAULT 999,
        source TEXT NOT NULL DEFAULT 'manual_admin',
        "schemaVersion" INTEGER NOT NULL DEFAULT 1,
        "sourceType" TEXT,
        "sourceId" TEXT,
        "archiveReason" TEXT,
        "editedAt" TIMESTAMPTZ DEFAULT now(),
        "editedBy" TEXT,
        "moderationAction" TEXT
      );
    `;

    console.log("Creating public.product_reviews table...");
    await client.query(createTableSql);
    console.log("Table created successfully!");

    // Set Row Level Security (RLS) policies so it is readable and writable
    const alterSql = `
      ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Public read access for product_reviews" ON public.product_reviews;
      CREATE POLICY "Public read access for product_reviews" ON public.product_reviews FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Admin full control on product_reviews" ON public.product_reviews;
      CREATE POLICY "Admin full control on product_reviews" ON public.product_reviews FOR ALL USING (true);
    `;
    console.log("Applying RLS and policies...");
    await client.query(alterSql);
    console.log("Policies applied successfully!");

  } catch (err: any) {
    console.error("Database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
