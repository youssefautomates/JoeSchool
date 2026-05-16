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
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const success = await setKV(MARKETING_KEY, body);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "فشل حفظ الإعدادات" }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
