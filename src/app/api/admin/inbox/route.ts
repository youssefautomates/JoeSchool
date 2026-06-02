import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getZohoAccessToken } from "@/lib/zoho";

export const dynamic = "force-dynamic";

const MOCK_EMAILS = [
  {
    id: "mock-1",
    from: "ahmed.kamel@gmail.com",
    subject: "مشكلة في تحميل ملفات كورس الذكاء الاصطناعي",
    preview: "السلام عليكم، قمت بشراء الكورس اليوم ولكن عند الضغط على زر تحميل أصول التصميم يظهر لي خطأ في الصفحة...",
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    isRead: false,
    folderId: "mock-inbox",
    content: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; color: #f3f4f6; background-color: #18181b; padding: 20px; border-radius: 12px;">
        <p>السلام عليكم ورحمة الله وبركاته،</p>
        <p>يا باشمهندس يوسف، أنا اشتريت كورس صناعة المحتوى بالذكاء الاصطناعي النهاردة والحمد لله الدورة ممتازة جداً.</p>
        <p>لكن عندي مشكلة بسيطة: لما بدخل على صفحة المنتج الرقمي وأضغط على <strong>تحميل ملفات الحقيبة الإبداعية</strong>، بيحمل لغاية 90% وبعدين يوقف ويظهر لي خطأ في الشبكة.</p>
        <p>هل المشكلة من عندي ولا فيه رابط بديل للتحميل؟</p>
        <p>شكراً جزيلاً لجهودك،<br>أحمد كامل</p>
      </div>
    `
  },
  {
    id: "mock-2",
    from: "mona.ali@zylker.com",
    subject: "استفسار بخصوص خصم المجموعات للمؤسسات",
    preview: "أهلاً يوسف، نحن فريق مكون من 5 صناع محتوى في شركة زيلكر ونرغب في التسجيل في الأكاديمية كاملة...",
    date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    isRead: false,
    folderId: "mock-inbox",
    content: `
      <div dir="rtl" style="font-family: sans-serif; line-height: 1.6; color: #f3f4f6; background-color: #18181b; padding: 20px; border-radius: 12px;">
        <p>مرحباً فريق يوسف أوتوميتس،</p>
        <p>نحن معجبون جداً بالمحتوى الذي تقدمونه على تيك توك وإنستغرام.</p>
        <p>نحن فريق صناعة محتوى إبداعي مكون من 5 أشخاص في شركتنا، ونريد شراء الدخول الكامل لجميع الكورسات والمنتجات الرقمية لجميع أعضاء الفريق.</p>
        <p>هل توجد باقة خصم خاصة بالمجموعات أو الشركات؟ وكيف يمكننا الدفع والحصول على الفواتير الضريبية؟</p>
        <p>تحياتي،<br>منى علي - مديرة القسم الإبداعي</p>
      </div>
    `
  },
  {
    id: "mock-3",
    from: "support@zoho.com",
    subject: "Welcome to Zoho Mail Developer Center",
    preview: "Hello dev support, your OAuth configuration is complete and ready to fetch support tickets...",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    isRead: true,
    folderId: "mock-inbox",
    content: `
      <div dir="ltr" style="font-family: sans-serif; line-height: 1.6; color: #f3f4f6; background-color: #18181b; padding: 20px; border-radius: 12px;">
        <p>Dear support,</p>
        <p>Welcome to Zoho Mail Developer Hub. Your self-client OAuth 2.0 application setup has been verified successfully.</p>
        <p>You can now fetch messages, read folders, and automate inbox tasks using our APIs.</p>
        <p>Best regards,<br>Zoho Mail Developer Relations Team</p>
      </div>
    `
  }
];

// Memory state to hold mock read flags for interactive testing
let mockReadFlags: Record<string, boolean> = {};

function isPlaceholder(val?: string) {
  return !val || val.includes("your_") || val === "placeholder";
}

export async function GET(req: Request) {
  try {
    // 1. Authorize Admin
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");
    const folderId = url.searchParams.get("folderId");

    // 2. Check if credentials are placeholders
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const accountId = process.env.ZOHO_ACCOUNT_ID;

    const useMock = isPlaceholder(clientId) || isPlaceholder(clientSecret) || isPlaceholder(refreshToken) || isPlaceholder(accountId);

    if (useMock) {
      if (messageId) {
        // Return single mock email content
        const mock = MOCK_EMAILS.find(e => e.id === messageId);
        if (!mock) {
          return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }
        return NextResponse.json({ content: mock.content });
      }

      // Return list of mock emails (applying interactive read state overrides)
      const emailsList = MOCK_EMAILS.map(e => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        preview: e.preview,
        date: e.date,
        isRead: mockReadFlags[e.id] !== undefined ? mockReadFlags[e.id] : e.isRead,
        folderId: e.folderId
      }));
      return NextResponse.json(emailsList);
    }

    // 3. Fetch from real Zoho Mail API
    const accessToken = await getZohoAccessToken();

    if (messageId && folderId) {
      // Get single message content
      const contentRes = await fetch(
        `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      if (!contentRes.ok) {
        const errorText = await contentRes.text();
        console.error("Zoho message body content fetch error:", errorText);
        return NextResponse.json({ error: "Failed to fetch email body content" }, { status: 500 });
      }

      const contentData = await contentRes.json();
      return NextResponse.json({ content: contentData.data?.content || "" });
    }

    // Default: Get messages list
    const listRes = await fetch(
      `https://mail.zoho.com/api/accounts/${accountId}/messages/view?limit=50&sortorder=false`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    if (!listRes.ok) {
      const errorText = await listRes.text();
      console.error("Zoho messages list fetch error:", errorText);
      return NextResponse.json({ error: "Failed to fetch messages from Zoho Mail" }, { status: 500 });
    }

    const listData = await listRes.json();
    const emails = (listData.data || []).map((item: any) => ({
      id: item.messageId,
      from: item.sender || item.fromAddress || "Unknown",
      subject: item.subject || "(بدون عنوان)",
      preview: item.summary || "",
      date: item.sentDateInGMT 
        ? new Date(Number(item.sentDateInGMT)).toISOString() 
        : new Date(Number(item.receivedTime)).toISOString(),
      isRead: item.status !== 0 && item.status !== "0",
      folderId: item.folderId
    }));

    return NextResponse.json(emails);
  } catch (err: any) {
    console.error("Inbox GET API exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Internal API interface to update mock state for testing
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token || token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isRead } = await req.json();
    if (id) {
      mockReadFlags[id] = isRead;
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
