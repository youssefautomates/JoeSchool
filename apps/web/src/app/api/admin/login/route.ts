import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();

    const validEmail = process.env.ADMIN_EMAIL || 'admin@joeschool.com';
    const validPassword = process.env.ADMIN_PASSWORD || '@Youssefmostafa26';

    if (email === validEmail && password === validPassword) {
      // Set HTTP-only cookie for secure session management
      const cookieStore = await cookies();
      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : undefined; // 30 days if checked, else session cookie

      cookieStore.set('admin_token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAge,
      });

      return NextResponse.json({ success: true });
    }

    // Log the failed admin login attempt as a real security telemetry event
    const headersList = request.headers;
    const ipAddress = headersList.get("x-real-ip") || headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "Unknown";
    const userAgent = headersList.get("user-agent") || "Unknown";

    try {
      await supabaseAdmin.from("analytics_events").insert({
        event_name: "admin_login_failed",
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          email_attempted: email,
          timestamp: new Date().toISOString()
        }
      });
    } catch (dbErr) {
      console.error("Failed to log admin login failure:", dbErr);
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
