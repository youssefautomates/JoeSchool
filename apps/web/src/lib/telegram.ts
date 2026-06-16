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
 * Maps raw gateway method and provider values to clean business labels.
 */
function formatPaymentMethod(method?: string, provider?: string, amount?: number): string {
  if (amount === 0 || provider === "admin_grant" || method === "Admin Manual Grant") {
    if (provider === "admin_grant" || method === "Admin Manual Grant") {
      return "Admin Manual Grant";
    }
    return "Free Order (100% Coupon)";
  }

  const m = (method || "").toLowerCase();
  const p = (provider || "").toLowerCase();

  if (m === "tbc" || m === "card" || m.includes("card") || p.includes("card")) {
    return "Bank Card";
  }
  if (m === "wallet" || m.includes("wallet") || m === "mw" || p.includes("wallet")) {
    return "E-Wallet";
  }
  if (m === "instapay") {
    return "Instapay";
  }

  return method || provider || "Online Payment";
}

/**
 * Formats and sends a Telegram notification for a completed order.
 */
export async function sendOrderTelegramNotification(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  product_title: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_provider?: string;
  coupon_code?: string;
  subtotal_price?: number;
  gateway_fee_amount?: number;
  created_at?: string;
}) {
  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleString("en-US", {
        timeZone: "Africa/Cairo",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("en-US", {
        timeZone: "Africa/Cairo",
        dateStyle: "medium",
        timeStyle: "short",
      });

  const currency = order.currency || "EGP";
  const originalPrice = order.subtotal_price || order.amount || 0;
  const finalPaid = order.amount || 0;

  const hasCoupon = !!(order.coupon_code && order.coupon_code.trim() !== "");
  const isFree = finalPaid === 0 || order.payment_provider === "admin_grant" || order.payment_method === "Admin Manual Grant";

  // Calculate discount
  let discountAmount = 0;
  if (hasCoupon) {
    if (isFree) {
      discountAmount = originalPrice;
    } else {
      const finalBeforeFee = finalPaid - (order.gateway_fee_amount || 0);
      discountAmount = Math.max(0, originalPrice - finalBeforeFee);
    }
  }

  // Format payment method
  const formattedPaymentMethod = formatPaymentMethod(order.payment_method, order.payment_provider, finalPaid);

  // Format final paid text
  let finalPaidText = `${finalPaid} ${currency}`;
  if (isFree && hasCoupon) {
    finalPaidText = `Free (100% Coupon)`;
  } else if (isFree) {
    finalPaidText = `Free`;
  }

  // Check category (isCourse)
  const isCourse = 
    order.product_title?.includes("دورة") || 
    order.product_title?.includes("كورس") || 
    order.product_title?.toLowerCase().includes("course");

  const statusText = isCourse 
    ? "✅ Course Access Granted Successfully" 
    : "✅ Product Delivered Successfully";

  // Is it manual grant?
  const isManual =
    order.payment_provider === "admin_grant" ||
    order.payment_method === "Admin Manual Grant";

  const header = isManual ? "🎁 Manual Grant" : "🛒 New Order";

  let message = `${header}\n\n`;
  message += `👤 <b>Customer:</b> ${order.customer_name || "Unknown"}\n`;
  message += `📧 <b>Email:</b> ${order.customer_email || "None"}\n\n`;
  
  message += `📚 <b>Product:</b>\n${order.product_title || "Unknown"}\n\n`;
  
  message += `💰 <b>Original Price:</b> ${originalPrice} ${currency}\n`;
  if (hasCoupon) {
    message += `🎟️ <b>Discount:</b> ${discountAmount} ${currency}\n`;
  }
  message += `💵 <b>Final Paid:</b> ${finalPaidText}\n\n`;
  
  message += `💳 <b>Payment Method:</b> ${formattedPaymentMethod}\n\n`;
  
  if (hasCoupon) {
    message += `🎁 <b>Coupon:</b> <code>${order.coupon_code?.trim()}</code>\n\n`;
  }
  
  message += `<b>${statusText}</b>\n\n`;
  
  message += `🧾 <b>Order ID:</b> <code>${order.id}</code>\n`;
  message += `📅 <b>Date:</b> ${dateStr}\n\n`;

  // 📊 Structured analytics block at the bottom for business exports
  message += `📊 <b>Metadata:</b> [Category: ${isCourse ? 'course' : 'digital'} | Coupon: ${order.coupon_code || 'none'} | Method: ${formattedPaymentMethod} | Provider: ${order.payment_provider || 'none'} | Original: ${originalPrice} | Discount: ${discountAmount} | Final: ${finalPaid} | Currency: ${currency}]`;

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
  const dateStr = new Date().toLocaleString("en-US", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const message = `
🎓 <b>Manual Course Enrollment</b>

👤 <b>Customer:</b> ${enrollment.user_name || "Unknown"}
📧 <b>Email:</b> ${enrollment.user_email}

📚 <b>Product:</b>
${enrollment.course_title}

💳 <b>Payment Method:</b> Admin Manual Enrollment

<b>✅ Course Access Granted Successfully</b>

📅 <b>Date:</b> ${dateStr}

📊 <b>Metadata:</b> [Category: course | Coupon: none | Method: Admin Manual Enrollment | Provider: admin | Original: 0 | Discount: 0 | Final: 0 | Currency: EGP]
  `.trim();

  return await sendTelegramMessage(message);
}
