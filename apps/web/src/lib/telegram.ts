import { getKV } from "./kv";

export interface TelegramSettings {
  telegramBotToken: string;
  telegramChatId: string;
  telegramEnabled: boolean;
}

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const MARKETING_KEY = "marketing_settings";
  const defaultSettings = {
    telegramBotToken: "",
    telegramChatId: "",
    telegramEnabled: false,
  };

  try {
    const saved = await getKV<any>(MARKETING_KEY);
    return saved ? { ...defaultSettings, ...saved } : defaultSettings;
  } catch (error) {
    console.error("[Telegram Config] Error getting settings:", error);
    return defaultSettings;
  }
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  // 1. Try environment variables first (development/hosting overrides)
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  let botToken = envToken;
  let chatId = envChatId;
  let enabled = true; // Enabled by default if environment variables are explicitly provided

  // 2. Fall back to settings stored in KV database
  if (!botToken || !chatId) {
    const settings = await getTelegramSettings();
    botToken = settings.telegramBotToken;
    chatId = settings.telegramChatId;
    enabled = settings.telegramEnabled;
  }

  // 3. Skip if not configured or disabled
  if (!enabled || !botToken || !chatId) {
    console.log(
      `[Telegram Notification] Skipped. Enabled: ${enabled}, Bot Token: ${
        botToken ? "Configured" : "Missing"
      }, Chat ID: ${chatId ? "Configured" : "Missing"}`
    );
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("[Telegram Notification] Telegram API returned error:", data);
      return false;
    }

    console.log("[Telegram Notification] Notification sent successfully!");
    return true;
  } catch (err) {
    console.error("[Telegram Notification] Exception sending message:", err);
    return false;
  }
}

/**
 * Formats and sends a Telegram notification for a completed order.
 */
export async function sendOrderTelegramNotification(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_title: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_provider?: string;
  coupon_code?: string;
  created_at?: string;
}) {
  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleString("ar-EG", {
        timeZone: "Africa/Cairo",
      })
    : new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });

  const amountFormatted = `${order.amount} ${order.currency || "EGP"}`;
  const couponText = order.coupon_code?.trim()
    ? `<code>${order.coupon_code}</code>`
    : "لا يوجد";

  // Check if it was an admin grant or normal checkout
  const isManual =
    order.payment_provider === "admin_grant" ||
    order.payment_method === "Admin Manual Grant";
  const headerIcon = isManual ? "🎁" : "🛒";
  const headerText = isManual ? "منح يدوي لمنتج رقمي" : "طلب جديد في المنصة";

  const message = `
${headerIcon} <b>${headerText}</b>

👤 <b>العميل:</b> ${order.customer_name || "غير معروف"}
📧 <b>البريد الإلكتروني:</b> ${order.customer_email || "لا يوجد"}
📞 <b>الهاتف:</b> ${order.customer_phone || "لا يوجد"}

📦 <b>المنتج / الكورس:</b> ${order.product_title || "غير محدد"}
💰 <b>القيمة:</b> <b>${amountFormatted}</b>
💳 <b>طريقة الدفع:</b> ${order.payment_method || "غير محدد"} (${
    order.payment_provider || "بوابة الدفع"
  })
🎟️ <b>كوبون الخصم:</b> ${couponText}
🔢 <b>رقم الطلب:</b> <code>${order.id}</code>

📅 <b>التاريخ:</b> ${dateStr}
  `.trim();

  return await sendTelegramMessage(message);
}

/**
 * Formats and sends a Telegram notification for a manual enrollment.
 */
export async function sendEnrollmentTelegramNotification(enrollment: {
  user_name: string;
  user_email: string;
  course_title: string;
  enrolled_by?: string;
}) {
  const dateStr = new Date().toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
  });

  const message = `
🎓 <b>تسجيل يدوي جديد في كورس</b>

👤 <b>الاسم:</b> ${enrollment.user_name || "طالب جو سكول"}
📧 <b>البريد الإلكتروني:</b> ${enrollment.user_email}
📚 <b>الكورس:</b> ${enrollment.course_title}
⚙️ <b>بواسطة:</b> لوحة التحكم (الأدمن)

📅 <b>التاريخ:</b> ${dateStr}
  `.trim();

  return await sendTelegramMessage(message);
}
