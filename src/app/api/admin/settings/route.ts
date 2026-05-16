import { NextResponse } from "next/server";
import { getKV, setKV } from "@/lib/kv";
import { cookies } from "next/headers";

const MARKETING_KEY = "marketing_settings";

export async function GET() {
  const settings = await getKV(MARKETING_KEY) || {
    metaPixelId: "",
    metaPixelEnabled: false,
    tiktokPixelId: "",
    tiktokPixelEnabled: false
  };
  console.log("[Settings API] GET Returning:", JSON.stringify(settings));
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  console.log("[Settings API] POST Request Received");
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    console.log("[Settings API] Auth Token:", token ? "Found" : "Missing");
    
    if (!token || token !== "authenticated") {
      console.warn("[Settings API] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[Settings API] Payload:", JSON.stringify(body));
    
    const success = await setKV(MARKETING_KEY, body);
    console.log("[Settings API] setKV result:", success);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      console.error("[Settings API] setKV failed to persist data");
      return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[Settings API] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
