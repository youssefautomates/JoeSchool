import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin inside the email service to allow self-contained database queries
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

interface ProductInfo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  isCourse: boolean;
  hasDownload: boolean;
  downloadUrl: string | null;
  orderId: string;
}

/**
 * Premium email dispatch service focused entirely on maximum deliverability and anti-spam standards.
 * Implements customized Message-ID, List-Unsubscribe, Auto-Submitted headers, matches sender domains,
 * strips heavy CSS styles/glows, and supplies a clean Plain Text version fallback.
 */
export async function sendOrderEmail(
  orders: any[],
  customerEmail: string,
  customerName: string,
  currency: string
): Promise<{ success: boolean; error?: string; details?: any }> {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[EMAIL_SERVICE][${requestId}] starting transactional email dispatch for: ${customerEmail}`);

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const errMsg = "Missing RESEND_API_KEY environment variable";
      console.error(`[EMAIL_SERVICE][${requestId}] ❌ ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const resend = new Resend(apiKey);

    // 1. Resolve product details for all orders
    const resolvedProducts: ProductInfo[] = [];
    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const transactionId = orders[0]?.payment_id || Math.random().toString(36).substring(2, 10).toUpperCase();

    for (const order of orders) {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, title, category, tags, file_url")
        .eq("id", order.product_id)
        .single();

      if (product) {
        const isCourse = 
          product.category === "courses" || 
          product.category === "الدورات التعليمية" || 
          product.category === "الدورات التدريبية" ||
          product.category === "دورة" || 
          order.product_title?.includes("دورة") || 
          order.product_title?.includes("كورس");

        resolvedProducts.push({
          id: product.id,
          title: product.title,
          category: product.category || "digital",
          tags: product.tags || [],
          isCourse,
          hasDownload: !!product.file_url,
          downloadUrl: product.file_url ? `${process.env.NEXT_PUBLIC_APP_URL || "https://www.youssefautomates.com"}/api/download?token=${order.id}` : null,
          orderId: order.id
        });
      } else {
        resolvedProducts.push({
          id: order.product_id,
          title: order.product_title,
          category: "digital",
          tags: [],
          isCourse: order.product_title?.includes("دورة") || order.product_title?.includes("كورس"),
          hasDownload: false,
          downloadUrl: null,
          orderId: order.id
        });
      }
    }

    const containsCourses = resolvedProducts.some(p => p.isCourse);
    const containsDigital = resolvedProducts.some(p => p.hasDownload);

    // 2. Set dynamic transactional subject line based on product types
    let subjectLine = "تم تسليم طلبك | Youssef Automates";
    if (containsCourses && !containsDigital) {
      subjectLine = "تم تفعيل دورتك التعليمية | Youssef Automates";
    } else if (containsDigital && !containsCourses) {
      subjectLine = "روابط تحميل ملفاتك الرقمية | Youssef Automates";
    }

    // 3. Build bulletproof Plain Text Version (Crucial for Anti-Spam scores)
    let emailText = `أهلاً ${customerName}!\n\n`;
    emailText += `تم تأكيد وتفعيل طلبك بنجاح. جميع ملفاتك ودوراتك جاهزة لك الآن.\n\n`;
    emailText += `تفاصيل المنتجات المشتراة:\n`;
    
    for (const product of resolvedProducts) {
      emailText += `- ${product.title} (${product.isCourse ? 'دورة تدريبية' : 'منتج رقمي للتحميل'})\n`;
      if (product.isCourse) {
        emailText += `  رابط بدء التعلم: ${process.env.NEXT_PUBLIC_APP_URL || "https://www.youssefautomates.com"}/dashboard\n`;
      } else if (product.downloadUrl) {
        emailText += `  رابط التحميل المباشر: ${product.downloadUrl}\n`;
      }
    }

    emailText += `\nملخص المعاملة المعتمدة:\n`;
    emailText += `رقم المعاملة: #${transactionId}\n`;
    emailText += `المبلغ الإجمالي: ${totalAmount.toFixed(2)} ${currency}\n\n`;
    emailText += `--------------------------------------------------\n`;
    emailText += `استلمت هذا البريد لأنك قمت بشراء منتج من Youssef Automates.\n`;
    emailText += `الدعم الفني: support@youssefautomates.com\n`;
    emailText += `رابط الدعم: ${process.env.NEXT_PUBLIC_APP_URL || "https://www.youssefautomates.com"}/contact\n`;

    // 4. Build Clean, Anti-Spam Compliant HTML Version (No heavy shadows/glows/complex CSS)
    let productsBlock = "";
    for (const product of resolvedProducts) {
      const downloadLink = product.downloadUrl;
      const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.youssefautomates.com"}/dashboard`;

      if (product.isCourse) {
        productsBlock += `
        <tr>
          <td style="padding: 10px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
              <tr>
                <td style="padding: 20px; text-align: right;">
                  <span style="font-size: 11px; color: #b91c1c; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; display: block; margin-bottom: 4px;">🎓 دورة تعليمية معتمدة</span>
                  <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">${product.title}</h3>
                  <table cellpadding="0" cellspacing="0" style="margin-top: 5px;">
                    <tr>
                      <td style="background-color: #b91c1c; border-radius: 6px;">
                        <a href="${dashboardLink}" style="display: inline-block; padding: 10px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; font-family: 'Segoe UI', Arial, sans-serif;">🚀 ابدأ التعلم الآن</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        `;
      } else {
        productsBlock += `
        <tr>
          <td style="padding: 10px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
              <tr>
                <td style="padding: 20px; text-align: right;">
                  <span style="font-size: 11px; color: #15803d; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif; display: block; margin-bottom: 4px;">⬇️ منتج رقمي جاهز للتحميل</span>
                  <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">${product.title}</h3>
                  <table cellpadding="0" cellspacing="0" style="margin-top: 5px;">
                    <tr>
                      <td style="background-color: #15803d; border-radius: 6px;">
                        <a href="${downloadLink || '#'}" style="display: inline-block; padding: 10px 20px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; font-family: 'Segoe UI', Arial, sans-serif;">⬇️ تحميل الملف الرقمي</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        `;
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectLine}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;direction:rtl;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border: 1px solid #cbd5e1;box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header block -->
          <tr>
            <td style="padding:30px 24px;text-align:center;background-color:#0f172a;border-bottom:3px solid #b91c1c;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight: bold;font-family: 'Segoe UI', Arial, sans-serif;">أهلاً ${customerName} 🎉</h1>
              <p style="color:#94a3b8;margin:8px 0 0 0;font-size:13px;font-family: 'Segoe UI', Arial, sans-serif;">تم تأكيد وتفعيل طلبك بنجاح. منتجاتك جاهزة لك الآن.</p>
            </td>
          </tr>
          <!-- Products Block -->
          <tr>
            <td style="padding:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">${productsBlock}</table>
              
              <!-- Transaction Summary -->
              <div style="margin-top:24px;padding:16px;background-color:#f8fafc;border-radius:8px;border: 1px solid #e2e8f0;">
                <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 8px 0;font-weight: bold;font-family: 'Segoe UI', Arial, sans-serif;">تفاصيل المعاملة المعتمدة</p>
                <p style="color:#334155;font-size:13px;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;">رقم المعاملة: #${transactionId}</p>
                <p style="color:#16a34a;font-size:13px;font-weight:bold;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;">المبلغ الإجمالي: ${totalAmount.toFixed(2)} ${currency}</p>
              </div>
            </td>
          </tr>
          <!-- Footer Block -->
          <tr>
            <td style="padding:24px;text-align:center;background-color:#f8fafc;border-top: 1px solid #e2e8f0;">
              <p style="color:#475569;font-size:12px;margin:0 0 8px 0;line-height: 1.5;font-family: 'Segoe UI', Arial, sans-serif;">
                استلمت هذا البريد لأنك قمت بشراء منتج من Youssef Automates.<br/>
                لديك استفسار؟ <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.youssefautomates.com'}/contact" style="color:#b91c1c;text-decoration:underline;font-weight:bold;">اتصل بالدعم الفني</a>
              </p>
              <p style="color:#94a3b8;font-size:10px;margin:12px 0 0 0;font-family: 'Segoe UI', Arial, sans-serif;">&copy; ${new Date().getFullYear()} Youssef Automates. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    // 5. Dispatch strictly via the custom domain sender using precise headers
    const sender = "Youssef Automates <delivery@youssefautomates.com>";
    console.log(`[EMAIL_SERVICE][${requestId}] 🚀 Dispatching transactional via: "${sender}" to: "${customerEmail}"`);

    const emailResult = await resend.emails.send({
      from: sender,
      to: customerEmail,
      subject: subjectLine,
      html: emailHtml,
      text: emailText, // Bulletproof Plain Text fallback
      replyTo: "support@youssefautomates.com",
      headers: {
        "Message-ID": `<${transactionId}-${Date.now()}@youssefautomates.com>`,
        "List-Unsubscribe": `<mailto:unsubscribe@youssefautomates.com?subject=unsubscribe>`,
        "MIME-Version": "1.0",
        "Auto-Submitted": "auto-generated"
      }
    });

    console.log(`[EMAIL_SERVICE][${requestId}] 📝 Raw Resend SDK Output:`, JSON.stringify(emailResult, null, 2));

    if (emailResult.error) {
      console.error(`[EMAIL_SERVICE][${requestId}] ❌ Resend returned an error:`, JSON.stringify(emailResult.error, null, 2));
      return { 
        success: false, 
        error: emailResult.error.message || "Failed to send email via Resend", 
        details: emailResult.error 
      };
    }

    const responseId = emailResult.data?.id;
    console.log(`[EMAIL_SERVICE][${requestId}] ✅ Email successfully dispatched! Response ID: ${responseId}`);
    return { success: true, details: emailResult.data };

  } catch (err: any) {
    const errorMsg = `Exception in sendOrderEmail: ${err.message}`;
    console.error(`[EMAIL_SERVICE][${requestId}] 💥 ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
