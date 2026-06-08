const pg = require("pg");
const connectionString = "postgres://postgres.ftiyeuhqqxpraiasjjvz:%40Youssefmostafa26@34.241.16.247:6543/postgres";
const { Client } = pg;
async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log("Connected to DB, creating analytics_events table...");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.analytics_events (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      event_name text NOT NULL,
      session_id text,
      user_id uuid,
      product_id text,
      product_title text,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      utm_content text,
      utm_term text,
      referrer text,
      ip_address text,
      user_agent text,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_product_id ON public.analytics_events(product_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
  `;

  await client.query(createTableQuery);
  console.log("analytics_events table created successfully with indexes!");

  await client.end();
}
main().catch(console.error);
