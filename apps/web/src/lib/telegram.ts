import { getKV } from "./kv";
import { supabaseAdmin } from "./supabaseAdmin";
import { resolveProductPrice, Currency } from "./pricing";

export function sanitizeMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#+\s+(.*?)$/gm, "$1");
}

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

export async function sendTelegramMessage(text: string, customChatId?: string): Promise<boolean> {
  const sanitizedText = sanitizeMarkdown(text);

  // 1. Try environment variables first (development/hosting overrides)
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;

  let botToken = envToken;
  let chatId = customChatId || envChatId;
  let enabled = true; // Enabled by default if environment variables are explicitly provided

  // 2. Fall back to settings stored in KV database
  if (!botToken || !chatId) {
    const settings = await getTelegramSettings();
    botToken = settings.telegramBotToken;
    chatId = customChatId || settings.telegramChatId;
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
          text: sanitizedText,
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

function escapeHtml(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Formats and sends a Telegram notification for a completed order.
 */
export async function sendOrderTelegramNotification(order: {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_id?: string;
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
  let basePrice = order.subtotal_price || order.amount || 0;
  let originalPrice = basePrice;
  let discountPct = 0;

  // 1. Fetch item prices from DB if product_id is provided
  if (order.product_id) {
    try {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("price_egp, original_price_egp, price_usd, original_price_usd, price, original_price")
        .eq("id", order.product_id)
        .maybeSingle();

      let dbItem = product;
      if (!dbItem) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("price_egp, original_price_egp, price_usd, original_price_usd, price, original_price")
          .eq("id", order.product_id)
          .maybeSingle();
        if (course) {
          dbItem = course;
        }
      }

      if (dbItem) {
        const resolved = resolveProductPrice(dbItem, currency as Currency);
        basePrice = resolved.price;
        originalPrice = resolved.original_price || resolved.price;
        discountPct = resolved.discount_pct;
      }
    } catch (e) {
      console.error("[Telegram Notification] Error resolving product prices:", e);
    }
  }

  // 2. Fetch coupon discount percent
  let couponDiscountPercent = 0;
  if (order.coupon_code) {
    try {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("discount_percent")
        .eq("code", order.coupon_code.trim().toUpperCase())
        .maybeSingle();
      if (coupon) {
        couponDiscountPercent = coupon.discount_percent || 0;
      }
    } catch (e) {
      console.error("[Telegram Notification] Error resolving coupon:", e);
    }
  }

  // 3. Pricing arithmetic
  const courseDiscountAmount = originalPrice > basePrice ? (originalPrice - basePrice) : 0;
  const couponDiscountAmount = couponDiscountPercent > 0 ? Math.round(basePrice * (couponDiscountPercent / 100)) : 0;
  const totalDiscountAmount = courseDiscountAmount + couponDiscountAmount;

  const gatewayFee = order.gateway_fee_amount || 0;
  const finalPaid = order.amount || 0;

  const hasCoupon = !!(order.coupon_code && order.coupon_code.trim() !== "");
  const isFree = finalPaid === 0 || order.payment_provider === "admin_grant" || order.payment_method === "Admin Manual Grant";

  // Format payment method using existing helper
  const formattedPaymentMethod = formatPaymentMethod(order.payment_method, order.payment_provider, finalPaid);

  // Translate payment method to Arabic for template readability
  let paymentMethodArabic = formattedPaymentMethod;
  if (formattedPaymentMethod === "Admin Manual Grant") {
    paymentMethodArabic = "تفعيل إداري (مجاني)";
  } else if (formattedPaymentMethod === "Free Order (100% Coupon)") {
    paymentMethodArabic = "طلب مجاني (كوبون 100%)";
  } else if (formattedPaymentMethod === "Bank Card") {
    paymentMethodArabic = "بطاقة بنكية";
  } else if (formattedPaymentMethod === "E-Wallet") {
    paymentMethodArabic = "محفظة إلكترونية (فودافون كاش...)";
  } else if (formattedPaymentMethod === "Instapay") {
    paymentMethodArabic = "إنستاباي (Instapay)";
  } else if (formattedPaymentMethod === "Online Payment") {
    paymentMethodArabic = "دفع إلكتروني";
  }

  // Format final paid text
  let finalPaidText = `${finalPaid} ${currency}`;
  if (isFree && hasCoupon) {
    finalPaidText = `0 ${currency} (كوبون 100%)`;
  } else if (isFree) {
    finalPaidText = `0 ${currency} (مجاني)`;
  }

  // Check phone conditional display rules
  const phone = order.customer_phone?.trim();
  const hasPhone = phone && phone !== "" && phone !== "+201000000000" && !phone.toLowerCase().includes("placeholder") && phone.toLowerCase() !== "n/a";

  let message = `🎉 <b>طلب جديد</b>\n\n`;
  message += `👤 <b>الاسم</b>\n${escapeHtml(order.customer_name) || "غير معروف"}\n\n`;
  message += `📧 <b>البريد الإلكتروني</b>\n${escapeHtml(order.customer_email) || "لا يوجد"}\n\n`;
  
  if (hasPhone) {
    message += `📱 <b>رقم الهاتف (واتساب)</b>\n<code>${escapeHtml(phone)}</code>\n\n`;
  }
  
  message += `📚 <b>الكورس</b>\n${escapeHtml(order.product_title) || "غير معروف"}\n\n`;
  
  message += `💰 <b>تفاصيل السعر</b>\n\n`;
  message += `• <b>السعر الأصلي:</b> ${originalPrice} ${currency}\n\n`;
  
  if (totalDiscountAmount > 0) {
    const totalDiscountPct = Math.round((totalDiscountAmount / originalPrice) * 100);
    message += `• <b>الخصم:</b> ${totalDiscountAmount} ${currency} (-${totalDiscountPct}%)\n\n`;
  }
  
  if (gatewayFee > 0) {
    message += `• <b>رسوم الدفع:</b> ${gatewayFee} ${currency}\n\n`;
  }
  
  message += `• <b>المبلغ المدفوع:</b> ${finalPaidText}\n\n`;
  
  if (hasCoupon) {
    message += `🎟️ <b>الكوبون</b>\n<code>${escapeHtml(order.coupon_code?.trim().toUpperCase())}</code>\n\n`;
  }
  
  message += `💳 <b>طريقة الدفع</b>\n${escapeHtml(paymentMethodArabic)}\n\n`;
  message += `🕒 <b>وقت الطلب</b>\n${dateStr}\n`;

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

/**
 * Sends a document (such as an Excel report) directly to Telegram.
 */
export async function sendTelegramDocument(
  chatId: string,
  fileBuffer: Buffer,
  fileName: string,
  caption?: string
): Promise<boolean> {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  let botToken = envToken;

  if (!botToken) {
    const settings = await getTelegramSettings();
    botToken = settings.telegramBotToken;
    if (!settings.telegramEnabled || !botToken) {
      console.log("[Telegram Document] Bot Token is missing or disabled.");
      return false;
    }
  }

  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    
    // Convert Buffer to Blob so standard FormData sends it as a multipart file upload
    const fileBlob = new Blob([new Uint8Array(fileBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    formData.append("document", fileBlob, fileName);
    
    if (caption) {
      formData.append("caption", sanitizeMarkdown(caption));
      formData.append("parse_mode", "HTML");
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("[Telegram Document] Telegram API returned error:", data);
      return false;
    }

    console.log("[Telegram Document] Document sent successfully!");
    return true;
  } catch (err) {
    console.error("[Telegram Document] Exception sending document:", err);
    return false;
  }
}

