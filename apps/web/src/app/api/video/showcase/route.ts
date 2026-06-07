import { NextRequest, NextResponse } from "next/server";
import { generateSignedEmbedUrl } from "@/lib/bunny";

/**
 * GET: Generates a signed Bunny Stream embed url for public landing page showcase videos.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    if (videoId.startsWith("http")) {
      return NextResponse.json({ url: videoId });
    }

    // Generate signed embed URL with 24 hours expiry for public showcase playback
    const signedUrl = generateSignedEmbedUrl(videoId, 1440);
    
    return NextResponse.json({ url: signedUrl });
  } catch (err: any) {
    console.error("[SHOWCASE_VIDEO_SIGN_ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
