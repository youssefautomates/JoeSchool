import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // Auth Check
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botToken, chatId } = await req.json();

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Bot Token and Chat ID are required" },
        { status: 400 }
      );
    }

    const testMessage = `
🔔 <b>رسالة تجريبية من JoeSchool!</b>

لقد تم إعداد وربط بوت التلجرام بنجاح مع منصتك التعليمية.
من الآن فصاعداً، ستصلك إشعارات وتفاصيل الطلبات الجديدة فور حدوثها هنا!
    `.trim();

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("[Telegram Test API] Error sending test message:", data);
      return NextResponse.json(
        { error: data.description || "Failed to send test message via Telegram" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Telegram Test API] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
