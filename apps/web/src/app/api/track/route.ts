import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize a secure server-side admin client bypassing RLS restrictions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

/**
 * Public Analytics Ingestion API Endpoint (/api/track)
 * 
 * Safe, asynchronous endpoint designed for non-blocking browser beacon telemetry.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Validate critical event name
    if (!payload.event_name) {
      console.error("[ANALYTICS_ROUTE] Ingestion failed: Missing event_name");
      return NextResponse.json({ error: "Missing event_name" }, { status: 400 });
    }

    // 2. Extract visitor IP address securely from standard deployment headers
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "Unknown";

    // 3. Construct event object mapped exactly to public.analytics_events
    const eventRow = {
      event_name: payload.event_name,
      session_id: payload.session_id || null,
      user_id: payload.user_id || null,
      product_id: payload.product_id || null,
      product_title: payload.product_title || null,
      utm_source: payload.utm_source || null,
      utm_medium: payload.utm_medium || null,
      utm_campaign: payload.utm_campaign || null,
      utm_content: payload.utm_content || null,
      utm_term: payload.utm_term || null,
      referrer: payload.referrer || null,
      ip_address: ip,
      user_agent: payload.user_agent || null,
      metadata: payload.metadata || {},
      created_at: new Date().toISOString()
    };

    // 4. Insert telemetry log into Supabase database
    const { error } = await supabaseAdmin
      .from("analytics_events")
      .insert([eventRow]);

    if (error) {
      console.error("[ANALYTICS_ROUTE] Supabase insert error:", error);
      return NextResponse.json({ error: "Database ingestion failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[ANALYTICS_ROUTE] Processing exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
