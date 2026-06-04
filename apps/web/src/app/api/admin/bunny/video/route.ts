import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { 
  createVideoPlaceholder, 
  deleteVideoFromBunny, 
  getVideoStatusFromBunny 
} from "@/lib/bunny";

// Helper to check admin authentication
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === "authenticated";
}

/**
 * GET: Retrieve status of a video from Bunny Stream
 */
export async function GET(req: NextRequest) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const status = await getVideoStatusFromBunny(videoId);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error("[BUNNY_VIDEO_GET_ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Create a video placeholder on Bunny Stream
 */
export async function POST(req: NextRequest) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const videoId = await createVideoPlaceholder(title);
    return NextResponse.json({ success: true, videoId });
  } catch (err: any) {
    console.error("[BUNNY_VIDEO_POST_ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Delete a video from Bunny Stream
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!await verifyAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    await deleteVideoFromBunny(videoId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[BUNNY_VIDEO_DELETE_ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
