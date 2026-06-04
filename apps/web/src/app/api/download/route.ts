import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

/**
 * GET /api/download?token=ORDER_ID
 * 
 * Secure download proxy. Verifies order status before redirecting to the actual file.
 * Generates secure signed URLs with 1 hour expiration for storage-hosted assets,
 * preventing general sharing or unauthorized access.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Verify order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("status, product_id")
      .eq("id", token)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "completed") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 403 });
    }

    // 2. Get product file URL
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("file_url")
      .eq("id", order.product_id)
      .single();

    if (productError || !product || !product.file_url) {
      return NextResponse.json({ error: "Product file not found" }, { status: 404 });
    }

    let finalDownloadUrl = product.file_url;

    // 3. Generate Signed Secure URL if hosted inside Supabase Storage
    if (finalDownloadUrl.includes("/storage/v1/object/public/")) {
      try {
        const parts = finalDownloadUrl.split("/storage/v1/object/public/");
        if (parts.length > 1) {
          const pathParts = parts[1].split("/");
          const bucket = pathParts[0];
          const path = pathParts.slice(1).join("/");

          // Create a signed URL that expires in 3600 seconds (1 hour)
          const { data: signedData, error: signedError } = await supabaseAdmin.storage
            .from(bucket)
            .createSignedUrl(path, 3600);

          if (!signedError && signedData?.signedUrl) {
            finalDownloadUrl = signedData.signedUrl;
            console.log(`[DOWNLOAD] Generated secure signed URL for storage path: ${path}`);
          } else if (signedError) {
            console.error(`[DOWNLOAD] Signed URL generation error:`, signedError);
          }
        }
      } catch (err) {
        console.error("[DOWNLOAD] Failed parsing storage url for signing:", err);
      }
    }

    // 4. Redirect to the secure file url
    return NextResponse.redirect(finalDownloadUrl);

  } catch (error) {
    console.error("[DOWNLOAD_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
