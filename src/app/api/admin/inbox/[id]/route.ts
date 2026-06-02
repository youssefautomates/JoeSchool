import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getZohoAccessToken } from "@/lib/zoho";

function isPlaceholder(val?: string) {
  return !val || val.includes("your_") || val === "placeholder";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authorize Admin
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await resolvedParams(params);

    // 2. Check if credentials are placeholders
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const accountId = process.env.ZOHO_ACCOUNT_ID;

    const useMock = isPlaceholder(clientId) || isPlaceholder(clientSecret) || isPlaceholder(refreshToken) || isPlaceholder(accountId);

    if (useMock) {
      // Update mock state by hitting our own main inbox POST API
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      try {
        const updateRes = await fetch(`${appUrl}/api/admin/inbox`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": req.headers.get("cookie") || ""
          },
          body: JSON.stringify({ id, isRead: true })
        });
        if (!updateRes.ok) {
          console.error("Failed to update mock read flag in memory state:", await updateRes.text());
        }
      } catch (mockErr) {
        console.error("Mock state update fetch error:", mockErr);
      }

      return NextResponse.json({ success: true, mock: true });
    }

    // 3. Mark as read on real Zoho Mail API
    const accessToken = await getZohoAccessToken();
    const updateRes = await fetch(
      `https://mail.zoho.com/api/accounts/${accountId}/updatemessage`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Zoho-oauthtoken ${accessToken}`
        },
        body: JSON.stringify({
          mode: "markAsRead",
          messageId: [id]
        })
      }
    );

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("Zoho updatemessage API error:", errorText);
      return NextResponse.json({ error: "Failed to mark email as read in Zoho Mail" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Inbox PATCH API exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Next.js 15 route params unwrapper helper
async function resolvedParams<T>(params: Promise<T>): Promise<T> {
  return await params;
}
