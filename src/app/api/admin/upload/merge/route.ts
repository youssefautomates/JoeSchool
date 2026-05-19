import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use SERVICE_ROLE_KEY to perform merge operations and bypass size limits or folder permissions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { bucket, chunkPaths, finalPath } = await req.json();

    if (!bucket || !chunkPaths || !finalPath || !Array.isArray(chunkPaths) || chunkPaths.length === 0) {
      return NextResponse.json({ success: false, error: "Missing merge parameters" }, { status: 400 });
    }

    console.log(`[MERGE_API] Merging ${chunkPaths.length} chunks into path: ${finalPath} inside bucket: ${bucket}`);

    // Download all chunks in order
    const buffers: Buffer[] = [];
    for (const chunkPath of chunkPaths) {
      const { data, error } = await supabase.storage.from(bucket).download(chunkPath);
      if (error || !data) {
        console.error(`[MERGE_API_ERROR] Failed to download chunk: ${chunkPath}`, error);
        return NextResponse.json({ success: false, error: `Failed to download chunk: ${chunkPath}` }, { status: 500 });
      }
      
      const arrayBuffer = await data.arrayBuffer();
      buffers.push(Buffer.from(arrayBuffer));
    }

    // Concatenate all chunks
    const mergedBuffer = Buffer.concat(buffers);
    console.log(`[MERGE_API] Combined size: ${mergedBuffer.length} bytes.`);

    // Determine contentType
    const ext = finalPath.split('.').pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === "mp4") contentType = "video/mp4";
    else if (ext === "webm") contentType = "video/webm";
    else if (ext === "mov") contentType = "video/quicktime";
    else if (ext === "pdf") contentType = "application/pdf";
    else if (ext === "zip") contentType = "application/zip";
    else if (ext === "mp3") contentType = "audio/mpeg";

    // Upload the complete combined file
    const { error: uploadError } = await supabase.storage.from(bucket).upload(finalPath, mergedBuffer, {
      contentType,
      upsert: true
    });

    if (uploadError) {
      console.error("[MERGE_API_UPLOAD_ERROR]", uploadError);
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    // Clean up temporary chunks asynchronously to not block response
    console.log(`[MERGE_API] Uploaded merged file. Cleaning up ${chunkPaths.length} parts...`);
    supabase.storage.from(bucket).remove(chunkPaths).then(({ error: deleteError }) => {
      if (deleteError) {
        console.warn("[MERGE_API_CLEANUP_WARNING] Failed to delete temporary chunk files:", deleteError.message);
      } else {
        console.log("[MERGE_API_CLEANUP] Temporary parts deleted successfully.");
      }
    });

    return NextResponse.json({ success: true, path: finalPath });
  } catch (err: any) {
    console.error("[MERGE_API_CRASH]", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
