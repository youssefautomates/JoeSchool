const pg = require("pg");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: ".env.local" });

const { Client } = pg;

const host = "34.241.16.247";
const port = 6543;
const user = "postgres.ftiyeuhqqxpraiasjjvz";
const password = process.env.ADMIN_PASSWORD || "@Youssefmostafa26";
const database = "postgres";

async function main() {
  console.log("Connecting to PostgreSQL to apply Phase 1 Refinements (v3)...");
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
    console.log("Connected successfully to database!");

    const sql = `
      -- 1. Create public.mobile_sync_deletions table
      CREATE TABLE IF NOT EXISTS public.mobile_sync_deletions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        deleted_by TEXT NOT NULL DEFAULT 'system',
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Add indexing for deletion synchronization performance
      CREATE INDEX IF NOT EXISTS idx_sync_deletions_type_date 
        ON public.mobile_sync_deletions(entity_type, deleted_at DESC);

      -- 2. Alter mobile_fcm_tokens to include device_trust_score (0-100) and trust_updated_at
      ALTER TABLE public.mobile_fcm_tokens 
        ADD COLUMN IF NOT EXISTS device_trust_score INTEGER NOT NULL DEFAULT 100 CHECK (device_trust_score >= 0 AND device_trust_score <= 100),
        ADD COLUMN IF NOT EXISTS trust_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

      -- 3. Alter mobile_notification_preferences to add default notification_priority filter
      ALTER TABLE public.mobile_notification_preferences 
        ADD COLUMN IF NOT EXISTS notification_priority TEXT NOT NULL DEFAULT 'normal' CHECK (notification_priority IN ('low', 'normal', 'high', 'critical'));

      -- 4. Alter mobile_notifications to include priority, deep_link, fallback_url, delivered_at, and expires_at
      ALTER TABLE public.mobile_notifications 
        ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
        ADD COLUMN IF NOT EXISTS deep_link TEXT,
        ADD COLUMN IF NOT EXISTS fallback_url TEXT,
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

      -- 5. Create public.mobile_feature_flags table for remote configuration and beta rollouts
      CREATE TABLE IF NOT EXISTS public.mobile_feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flag_key TEXT UNIQUE NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT false,
        value TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.mobile_feature_flags(flag_key);

      -- Seed sample feature flags if table is empty
      INSERT INTO public.mobile_feature_flags (flag_key, is_enabled, value, description)
      VALUES 
        ('maintenance_mode', false, 'System operates normally', 'Global mobile app maintenance mode toggle'),
        ('beta_analytics_dashboard', false, 'v2-dashboard', 'Enables experimental charting metrics for beta group admins')
      ON CONFLICT (flag_key) DO NOTHING;

      -- Enable RLS for security across new tables
      ALTER TABLE public.mobile_sync_deletions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mobile_feature_flags ENABLE ROW LEVEL SECURITY;

      -- RLS policies for anonymous/admin read
      DROP POLICY IF EXISTS anonymous_select ON public.mobile_feature_flags;
      CREATE POLICY anonymous_select ON public.mobile_feature_flags FOR SELECT USING (true);

      -- Reload PostgREST schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log("Applying database upgrades...");
    await client.query(sql);
    console.log("Phase 1 database refinements successfully migrated!");

  } catch (err) {
    console.error("Database migration error:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
