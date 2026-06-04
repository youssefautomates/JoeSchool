import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const libraryId = process.env.BUNNY_LIBRARY_ID || "";
    const apiKey = process.env.BUNNY_API_KEY || "";

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: "Bunny Stream library configurations are missing." }, { status: 500 });
    }

    return NextResponse.json({ libraryId, apiKey });
  } catch (err: any) {
    console.error("[BUNNY_CONFIG_API_ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
