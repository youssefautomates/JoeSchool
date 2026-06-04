const pg = require("E:/Antigravity Projects/YoussefAutomates/node_modules/pg");
const dotenv = require("E:/Antigravity Projects/YoussefAutomates/node_modules/dotenv");

// Load environment variables
dotenv.config({ path: "E:/Antigravity Projects/YoussefAutomates/.env.local" });

const { Client } = pg;

const host = "34.241.16.247";
const port = 6543;
const user = "postgres.ftiyeuhqqxpraiasjjvz";
const password = process.env.ADMIN_PASSWORD || "@Youssefmostafa26";
const database = "postgres";

async function main() {
  console.log("Connecting to PostgreSQL to apply alterations...");
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const sql = `
      -- 1. Alter mobile_fcm_tokens: add device_push_provider and device_id (with unique constraint)
      ALTER TABLE public.mobile_fcm_tokens 
        ADD COLUMN IF NOT EXISTS device_push_provider TEXT NOT NULL DEFAULT 'fcm',
        ADD COLUMN IF NOT EXISTS device_id TEXT;

      -- Add unique constraint on device_id to support clean upserts
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_mobile_fcm_device_id'
        ) THEN
          ALTER TABLE public.mobile_fcm_tokens ADD CONSTRAINT uq_mobile_fcm_device_id UNIQUE (device_id);
        END IF;
      END $$;

      -- 2. Alter mobile_audit_logs: add severity field
      ALTER TABLE public.mobile_audit_logs
        ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'));

      -- 3. Alter mobile_notification_preferences: add quiet hours preferences
      ALTER TABLE public.mobile_notification_preferences
        ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '22:00',
        ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT '08:00';

      -- Reload PostgREST schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log("Running SQL alterations...");
    await client.query(sql);
    console.log("Database alterations applied successfully!");

  } catch (err) {
    console.error("Migration error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
