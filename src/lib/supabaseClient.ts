import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing in environment variables.");
}

// Browser-compatible Supabase client (singleton) with persistent auth sessions enabled
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "youssef-automates-auth-token",
  },
  global: {
    headers: { "x-application-name": "youssef-automates-courses-auth" },
  },
});

// Helper utility to sync auth state with a secure cookie for Next.js Middleware auth checks
export function syncSessionToCookie(session: any | null) {
  if (typeof window === "undefined") return;

  if (session?.access_token) {
    // Set cookie that lasts for 7 days
    const expires = new Date();
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `sb-access-token=${session.access_token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure`;
  } else {
    // Clear cookie
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
  }
}

// Automatically subscribe to auth state changes and sync cookie
if (typeof window !== "undefined") {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log(`[AUTH EVENT] ${event}`);
    syncSessionToCookie(session);
  });
}
