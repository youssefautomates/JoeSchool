import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createVideoPlaceholder, generateTusSignature } from "@/lib/bunny";

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === "authenticated";
}

export async function POST(req: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // 1. Create empty video placeholder on Bunny Stream
    const videoId = await createVideoPlaceholder(title);

    // 2. Generate pre-signed signature and expiration (2 hours in the future)
    const expirationTime = Math.floor(Date.now() / 1000) + 7200;
    const signature = generateTusSignature(videoId, expirationTime);
    const libraryId = process.env.BUNNY_LIBRARY_ID || "";

    return NextResponse.json({
      success: true,
      videoId,
      signature,
      expiry: expirationTime,
      libraryId
    });
  } catch (err: any) {
    console.error("[BUNNY_CREATE_VIDEO_ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
