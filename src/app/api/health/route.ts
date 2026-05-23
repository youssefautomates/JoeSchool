import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // 1. Makes a simple query to Supabase (select count from users)
    const { error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Health check database query failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Returns { status: "ok" }
    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Health check API exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
