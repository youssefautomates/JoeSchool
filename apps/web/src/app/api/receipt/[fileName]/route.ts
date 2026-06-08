import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  try {
    const resolvedParams = await params;
    const { fileName } = resolvedParams;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL is not configured" }, { status: 500 });
    }

    // Construct the original Supabase storage public URL
    const originalUrl = `${supabaseUrl}/storage/v1/object/public/instapay-receipts/${fileName}`;

    // Redirect the request to the original Supabase URL
    return NextResponse.redirect(originalUrl, 302);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
