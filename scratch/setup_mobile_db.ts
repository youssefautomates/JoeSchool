import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const { Client } = pg;

// Connection configurations
const host = "34.241.16.247";
const port = 6543;
const user = "postgres.ftiyeuhqqxpraiasjjvz";
const password = process.env.ADMIN_PASSWORD || "@Youssefmostafa26"; // Fallback database password
const database = "postgres";

// Password hashing helper (reusable pbkdf2)
function hashPassword(pass: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 10000;
  const keylen = 64;
  const digest = "sha512";
  const hash = crypto.pbkdf2Sync(pass, salt, iterations, keylen, digest).toString("hex");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function main() {
  console.log(`Connecting to PostgreSQL pooler at ${host}...`);
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

    // 1. DDL Statements
    const ddl = `
      -- 1. Admin Users Table
      CREATE TABLE IF NOT EXISTS public.admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin', -- 'super_admin', 'admin', 'editor'
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 2. Mobile Refresh Tokens Table
      CREATE TABLE IF NOT EXISTS public.mobile_refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash TEXT NOT NULL UNIQUE,
        admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
        device_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 3. Mobile FCM Tokens Table
      CREATE TABLE IF NOT EXISTS public.mobile_fcm_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_token TEXT NOT NULL UNIQUE,
        admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
        device_name TEXT,
        platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
        app_version TEXT,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 4. Mobile Notifications Table
      CREATE TABLE IF NOT EXISTS public.mobile_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        notification_type TEXT NOT NULL CHECK (
          notification_type IN (
            'completed_orders', 'failed_payments', 'usd_sales', 
            'new_reviews', 'support_messages', 'student_signups', 
            'coupon_usage', 'security_alerts', 'system_alerts'
          )
        ),
        data JSONB DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        error_message TEXT,
        read_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        clicked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 5. Mobile Notification Preferences Table
      CREATE TABLE IF NOT EXISTS public.mobile_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID UNIQUE NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
        completed_orders BOOLEAN NOT NULL DEFAULT true, -- default true
        failed_payments BOOLEAN NOT NULL DEFAULT false, -- default false
        usd_sales BOOLEAN NOT NULL DEFAULT false,
        new_reviews BOOLEAN NOT NULL DEFAULT false,
        support_messages BOOLEAN NOT NULL DEFAULT false,
        student_signups BOOLEAN NOT NULL DEFAULT false,
        coupon_usage BOOLEAN NOT NULL DEFAULT false,
        security_alerts BOOLEAN NOT NULL DEFAULT false,
        system_alerts BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 6. Mobile Audit Logs Table
      CREATE TABLE IF NOT EXISTS public.mobile_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
        admin_email TEXT NOT NULL,
        action TEXT NOT NULL,
        device_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Indexing for high performance queries
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.mobile_refresh_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_admin ON public.mobile_fcm_tokens(admin_id);
      CREATE INDEX IF NOT EXISTS idx_fcm_device_token ON public.mobile_fcm_tokens(device_token);
      CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.mobile_notifications(status);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.mobile_audit_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.mobile_audit_logs(created_at DESC);

      -- Enable RLS for security
      ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mobile_refresh_tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mobile_fcm_tokens ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mobile_notifications ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mobile_notification_preferences ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mobile_audit_logs ENABLE ROW LEVEL SECURITY;
    `;

    console.log("Executing migration DDL queries...");
    await client.query(ddl);
    console.log("Tables, indexes, and RLS policies created successfully!");

    // 2. Seeding default admin user if admin_users is empty
    const email = process.env.ADMIN_EMAIL || "admin@joeschool.com";
    const rawPass = process.env.ADMIN_PASSWORD || "@Youssefmostafa26";

    console.log("Checking if default admin exists...");
    const checkRes = await client.query("SELECT id FROM public.admin_users WHERE email = $1", [email]);
    
    let adminId: string;
    
    if (checkRes.rows.length === 0) {
      console.log(`Seeding default admin account: ${email}...`);
      const passHash = hashPassword(rawPass);
      
      const insertRes = await client.query(
        `INSERT INTO public.admin_users (email, password_hash, name, role, is_active)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, passHash, "JoeSchool Admin", "super_admin", true]
      );
      
      adminId = insertRes.rows[0].id;
      console.log(`Default admin seeded successfully with ID: ${adminId}`);
    } else {
      adminId = checkRes.rows[0].id;
      console.log(`Admin account already exists with ID: ${adminId}`);
    }

    // 3. Seeding default notification preferences for the admin
    const checkPref = await client.query("SELECT id FROM public.mobile_notification_preferences WHERE admin_id = $1", [adminId]);
    if (checkPref.rows.length === 0) {
      console.log("Seeding default notification preferences (completed_orders = true, others = false)...");
      await client.query(
        `INSERT INTO public.mobile_notification_preferences (admin_id, completed_orders, failed_payments, usd_sales, new_reviews, support_messages, student_signups, coupon_usage, security_alerts, system_alerts)
         VALUES ($1, true, false, false, false, false, false, false, false, false)`,
        [adminId]
      );
      console.log("Notification preferences seeded successfully!");
    } else {
      console.log("Notification preferences already exist.");
    }

    // 4. Reload PostgREST schema cache
    console.log("Reloading schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("PostgREST schema reloaded successfully!");

  } catch (err: any) {
    console.error("Migration database error:", err.message || err);
  } finally {
    await client.end();
  }
}

main();
