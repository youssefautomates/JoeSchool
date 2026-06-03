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
  currency: string,
  credentials?: { email: string; password?: string }
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
    const totalOriginalUsd = orders.reduce((sum, o) => sum + (Number(o.original_amount_usd) || 0), 0);
    const totalChargedEgp = orders.reduce((sum, o) => sum + (Number(o.charged_amount_egp) || 0), 0);
    const firstExchangeRate = orders[0]?.exchange_rate ? Number(orders[0].exchange_rate) : null;
    const isUSDOrder = currency === "USD" || orders[0]?.currency === "USD" || totalOriginalUsd > 0;
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
          downloadUrl: product.file_url ? `${process.env.NEXT_PUBLIC_APP_URL || "https://www.joeschool.com"}/api/download?token=${order.id}` : null,
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
    let subjectLine = "تم تسليم طلبك | JoeSchool";
    if (containsCourses && !containsDigital) {
      subjectLine = "تم تفعيل دورتك التعليمية | JoeSchool";
    } else if (containsDigital && !containsCourses) {
      subjectLine = "روابط تحميل ملفاتك الرقمية | JoeSchool";
    }

    // 3. Build bulletproof Plain Text Version (Crucial for Anti-Spam scores)
    let emailText = `أهلاً ${customerName}!\n\n`;
    emailText += `تم تأكيد وتفعيل طلبك بنجاح. جميع ملفاتك ودوراتك جاهزة لك الآن.\n\n`;
    
    if (credentials && credentials.password) {
      emailText += `تفاصيل حسابك للمنصة:\n`;
      emailText += `البريد الإلكتروني: ${credentials.email}\n`;
      emailText += `كلمة المرور: ${credentials.password}\n`;
      emailText += `رابط تسجيل الدخول: ${process.env.NEXT_PUBLIC_APP_URL || "https://www.joeschool.com"}/login\n\n`;
    }

    emailText += `تفاصيل المنتجات المشتراة:\n`;
    
    for (const product of resolvedProducts) {
      emailText += `- ${product.title} (${product.isCourse ? 'دورة تدريبية' : 'منتج رقمي للتحميل'})\n`;
      if (product.isCourse) {
        emailText += `  رابط بدء التعلم: ${process.env.NEXT_PUBLIC_APP_URL || "https://www.joeschool.com"}/dashboard\n`;
      } else if (product.downloadUrl) {
        emailText += `  رابط التحميل المباشر: ${product.downloadUrl}\n`;
      }
    }

    emailText += `\nملخص الفاتورة المعتمدة:\n`;
    emailText += `رقم المعاملة: #${transactionId}\n`;
    if (isUSDOrder) {
      emailText += `المبلغ الإجمالي: $${totalOriginalUsd.toFixed(2)} USD\n`;
      emailText += `المبلغ المخصوم فعلياً: ${totalChargedEgp.toFixed(2)} ج.م\n`;
      if (firstExchangeRate) {
        emailText += `سعر الصرف المثبت: 1 USD = ${firstExchangeRate.toFixed(4)} ج.م\n`;
      }
    } else {
      emailText += `المبلغ الإجمالي: ${totalAmount.toFixed(2)} ج.م\n`;
    }
    emailText += `\n`;
    emailText += `--------------------------------------------------\n`;
    emailText += `استلمت هذا البريد لأنك قمت بشراء منتج من JoeSchool.\n`;
    emailText += `الدعم الفني: support@joeschool.com\n`;
    emailText += `رابط الدعم: ${process.env.NEXT_PUBLIC_APP_URL || "https://www.joeschool.com"}/contact\n`;

    // 4. Build Clean, Anti-Spam Compliant HTML Version (No heavy shadows/glows/complex CSS)
    let productsBlock = "";
    for (const product of resolvedProducts) {
      const downloadLink = product.downloadUrl;
      const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.joeschool.com"}/dashboard`;

      if (product.isCourse) {
        productsBlock += `
        <tr>
          <td style="padding: 10px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; direction: rtl;">
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
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; direction: rtl;">
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

    let credentialsBlock = "";
    if (credentials && credentials.password) {
      credentialsBlock = `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #cbd5e1; direction: rtl; text-align: right; margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">🔑 تفاصيل حسابك على المنصة</h3>
            <p style="margin: 0 0 14px 0; font-size: 12px; color: #475569; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5;">تم إنشاء حساب جديد لك لتتمكن من تسجيل الدخول والدراسة مباشرة:</p>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
              <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #475569; font-family: 'Segoe UI', Arial, sans-serif;"><strong>البريد الإلكتروني:</strong></td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; text-align: left; font-weight: bold; font-mono: true;">${credentials.email}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-size: 12px; color: #475569; font-family: 'Segoe UI', Arial, sans-serif;"><strong>كلمة المرور:</strong></td>
                <td style="padding: 10px 14px; font-size: 12px; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; text-align: left; font-weight: bold; font-mono: true;">${credentials.password}</td>
              </tr>
            </table>
            
            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #b91c1c; border-radius: 6px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.joeschool.com'}/login" style="display: inline-block; padding: 10px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; font-family: 'Segoe UI', Arial, sans-serif;">🔑 تسجيل الدخول إلى حسابك</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      `;
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
          <!-- Products & Credentials Block -->
          <tr>
            <td style="padding:24px;">
              ${credentialsBlock}
              <table width="100%" cellpadding="0" cellspacing="0">${productsBlock}</table>
              
              <!-- Transaction Summary / Invoice -->
              <div style="margin-top:24px;padding:16px;background-color:#f8fafc;border-radius:8px;border: 1px solid #e2e8f0;text-align: right; direction: rtl;">
                <p style="color:#64748b;font-size:11px;text-transform:uppercase;margin:0 0 8px 0;font-weight: bold;font-family: 'Segoe UI', Arial, sans-serif;">🧾 تفاصيل الفاتورة المعتمدة</p>
                <p style="color:#334155;font-size:13px;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;"><strong>رقم الفاتورة:</strong> #${transactionId}</p>
                <p style="color:#334155;font-size:13px;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;"><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${isUSDOrder ? `
                  <p style="color:#16a34a;font-size:14px;font-weight:bold;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;"><strong>المبلغ الإجمالي:</strong> $${totalOriginalUsd.toFixed(2)} USD</p>
                  <p style="color:#475569;font-size:12px;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;"><strong>المبلغ المخصوم فعلياً:</strong> ${totalChargedEgp.toFixed(2)} ج.م</p>
                  ${firstExchangeRate ? `<p style="color:#64748b;font-size:10px;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;">سعر الصرف المثبت: 1 USD = ${firstExchangeRate.toFixed(4)} ج.م</p>` : ''}
                ` : `
                  <p style="color:#16a34a;font-size:13px;font-weight:bold;margin:4px 0;font-family: 'Segoe UI', Arial, sans-serif;"><strong>المبلغ الإجمالي:</strong> ${totalAmount.toFixed(2)} ج.م</p>
                `}
              </div>
            </td>
          </tr>
          <!-- Footer Block -->
          <tr>
            <td style="padding:24px;text-align:center;background-color:#f8fafc;border-top: 1px solid #e2e8f0;">
              <p style="color:#475569;font-size:12px;margin:0 0 8px 0;line-height: 1.5;font-family: 'Segoe UI', Arial, sans-serif;">
                استلمت هذا البريد لأنك قمت بشراء منتج من JoeSchool.<br/>
                لديك استفسار؟ <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.joeschool.com'}/contact" style="color:#b91c1c;text-decoration:underline;font-weight:bold;">اتصل بالدعم الفني</a>
              </p>
              <p style="color:#94a3b8;font-size:10px;margin:12px 0 0 0;font-family: 'Segoe UI', Arial, sans-serif;">&copy; ${new Date().getFullYear()} JoeSchool. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    // 5. Dispatch strictly via the custom domain sender using precise headers
    const sender = "JoeSchool <delivery@joeschool.com>";
    console.log(`[EMAIL_SERVICE][${requestId}] 🚀 Dispatching transactional via: "${sender}" to: "${customerEmail}"`);

    const emailResult = await resend.emails.send({
      from: sender,
      to: customerEmail,
      subject: subjectLine,
      html: emailHtml,
      text: emailText, // Bulletproof Plain Text fallback
      replyTo: "support@joeschool.com",
      headers: {
        "Message-ID": `<${transactionId}-${Date.now()}@joeschool.com>`,
        "List-Unsubscribe": `<mailto:unsubscribe@joeschool.com?subject=unsubscribe>`,
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
