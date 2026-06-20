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
  slug?: string;
  firstLessonSlug?: string | null;
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

        let courseSlug = "n8n-masterclass";
        let firstLessonSlug = null;

        if (isCourse) {
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("id, slug")
            .or(`title.ilike.%${product.title}%,slug.eq.${product.id}`)
            .maybeSingle();

          if (course) {
            courseSlug = course.slug || "n8n-masterclass";
            const { data: modules } = await supabaseAdmin
              .from("course_modules")
              .select("id")
              .eq("course_id", course.id)
              .order("sort_order", { ascending: true });

            if (modules && modules.length > 0) {
              const moduleIds = modules.map(m => m.id);
              const { data: lessons } = await supabaseAdmin
                .from("course_lessons")
                .select("slug")
                .in("module_id", moduleIds)
                .order("sort_order", { ascending: true })
                .limit(1);

              if (lessons && lessons.length > 0) {
                firstLessonSlug = lessons[0].slug;
              }
            }
          }
        }

        resolvedProducts.push({
          id: product.id,
          title: product.title,
          category: product.category || "digital",
          tags: product.tags || [],
          isCourse,
          hasDownload: !!product.file_url,
          downloadUrl: product.file_url ? `https://www.joeschool.com/api/download?token=${order.id}` : null,
          orderId: order.id,
          slug: courseSlug,
          firstLessonSlug
        });
      } else {
        const isCourse = !!(order.product_title?.includes("دورة") || order.product_title?.includes("كورس"));
        let courseSlug = "n8n-masterclass";
        let firstLessonSlug = null;

        if (isCourse) {
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("id, slug")
            .or(`title.ilike.%${order.product_title}%,slug.eq.${order.product_id}`)
            .maybeSingle();

          if (course) {
            courseSlug = course.slug || "n8n-masterclass";
            const { data: modules } = await supabaseAdmin
              .from("course_modules")
              .select("id")
              .eq("course_id", course.id)
              .order("sort_order", { ascending: true });

            if (modules && modules.length > 0) {
              const moduleIds = modules.map(m => m.id);
              const { data: lessons } = await supabaseAdmin
                .from("course_lessons")
                .select("slug")
                .in("module_id", moduleIds)
                .order("sort_order", { ascending: true })
                .limit(1);

              if (lessons && lessons.length > 0) {
                firstLessonSlug = lessons[0].slug;
              }
            }
          }
        }

        resolvedProducts.push({
          id: order.product_id,
          title: order.product_title,
          category: "digital",
          tags: [],
          isCourse,
          hasDownload: false,
          downloadUrl: null,
          orderId: order.id,
          slug: courseSlug,
          firstLessonSlug
        });
      }
    }

    const containsCourses = resolvedProducts.some(p => p.isCourse);
    const containsDigital = resolvedProducts.some(p => p.hasDownload);

    // 2. Set dynamic subject line
    let subjectLine = "تم تسليم طلبك بنجاح | JoeSchool";
    if (containsCourses && !containsDigital) {
      subjectLine = "تم تفعيل دورتك التعليمية | JoeSchool";
    } else if (containsDigital && !containsCourses) {
      subjectLine = "روابط تحميل ملفاتك الرقمية | JoeSchool";
    }

    const loginEmail = credentials?.email || customerEmail;
    const loginPassword = credentials?.password;

    // 3. Build bulletproof Plain Text Version (Crucial for Anti-Spam scores)
    let emailText = `أهلاً ${customerName}!\n\n`;
    emailText += `تم تفعيل اشتراكك بنجاح! 🎉\n\n`;
    
    // Primary CTA - Course access
    const primaryCourse = resolvedProducts.find(p => p.isCourse);
    if (primaryCourse) {
      const redirectPath = primaryCourse.firstLessonSlug 
        ? `/learn/${primaryCourse.slug}/${primaryCourse.firstLessonSlug}` 
        : `/courses/${primaryCourse.slug || "n8n-masterclass"}`;
      const courseLink = `https://www.joeschool.com/login?email=${encodeURIComponent(loginEmail)}&redirect=${encodeURIComponent(redirectPath)}`;
      emailText += `🚀 ابدأ التعلم الآن: ${courseLink}\n\n`;
    }
    
    emailText += `تفاصيل الدخول لحسابك:\n`;
    emailText += `البريد الإلكتروني: ${loginEmail}\n`;
    if (loginPassword) {
      emailText += `كلمة المرور المؤقتة: ${loginPassword}\n`;
      emailText += `⚠️ يرجى تغيير كلمة المرور بعد أول تسجيل دخول\n`;
    } else {
      emailText += `كلمة المرور: استخدم كلمة مرور حسابك الحالية\n`;
    }
    emailText += `رابط تسجيل الدخول: https://www.joeschool.com/login?email=${encodeURIComponent(loginEmail)}&redirect=%2Fdashboard\n\n`;

    emailText += `تفاصيل المنتجات المشتراة:\n`;
    for (const product of resolvedProducts) {
      emailText += `- ${product.title} (${product.isCourse ? 'دورة تدريبية' : 'منتج رقمي للتحميل'})\n`;
      if (product.isCourse) {
        const redirectPath = product.firstLessonSlug 
          ? `/learn/${product.slug}/${product.firstLessonSlug}` 
          : `/courses/${product.slug || "n8n-masterclass"}`;
        const courseLink = `https://www.joeschool.com/login?email=${encodeURIComponent(loginEmail)}&redirect=${encodeURIComponent(redirectPath)}`;
        emailText += `  رابط بدء التعلم: ${courseLink}\n`;
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
    emailText += `رابط الدعم: https://www.joeschool.com/contact\n`;

    // 4. Build HTML products block
    let productsBlock = "";
    for (const product of resolvedProducts) {
      const downloadLink = product.downloadUrl;

      let courseLink = `https://www.joeschool.com/login?email=${encodeURIComponent(loginEmail)}&redirect=%2Fdashboard`;
      if (product.isCourse) {
        const redirectPath = product.firstLessonSlug 
          ? `/learn/${product.slug}/${product.firstLessonSlug}` 
          : `/courses/${product.slug || "n8n-masterclass"}`;
        courseLink = `https://www.joeschool.com/login?email=${encodeURIComponent(loginEmail)}&redirect=${encodeURIComponent(redirectPath)}`;
      }

      if (product.isCourse) {
        productsBlock += `
        <tr>
          <td style="padding: 8px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfcfd; border-radius: 16px; border: 1px solid #eef2f6; direction: rtl;">
              <tr>
                <td class="inner-padding" style="padding: 24px; text-align: right;">
                  <span style="font-size: 12px; color: #D6004B; font-weight: bold; margin-bottom: 8px; display: inline-block; padding: 4px 10px; background-color: #fff0f5; border-radius: 20px;">🎓 دورة تعليمية معتمدة</span>
                  <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: bold; line-height: 1.4;">${product.title}</h3>
                  <table cellpadding="0" cellspacing="0" class="mobile-btn-container" style="margin-top: 5px;">
                    <tr>
                      <td style="background-color: #D6004B; border-radius: 10px; box-shadow: 0 4px 12px rgba(214, 0, 75, 0.25);">
                        <a href="${courseLink}" class="mobile-btn" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">🚀 ابدأ التعلم الآن</a>
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
          <td style="padding: 8px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfcfd; border-radius: 16px; border: 1px solid #eef2f6; direction: rtl;">
              <tr>
                <td class="inner-padding" style="padding: 24px; text-align: right;">
                  <span style="font-size: 12px; color: #15803d; font-weight: bold; margin-bottom: 8px; display: inline-block; padding: 4px 10px; background-color: #f0fdf4; border-radius: 20px;">⬇️ منتج رقمي جاهز للتحميل</span>
                  <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #0f172a; font-weight: bold; line-height: 1.4;">${product.title}</h3>
                  <table cellpadding="0" cellspacing="0" class="mobile-btn-container" style="margin-top: 5px;">
                    <tr>
                      <td style="background-color: #15803d; border-radius: 10px; box-shadow: 0 4px 12px rgba(21, 128, 61, 0.25);">
                        <a href="${downloadLink || '#'}" class="mobile-btn" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">⬇️ تحميل الملف الرقمي</a>
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

    // Build Credentials Card (Always shown now)
    const passwordRow = loginPassword ? `
      <tr class="mobile-row">
        <td class="mobile-label" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; background-color: #f8fafc; width: 120px;"><strong>كلمة المرور:</strong></td>
        <td class="mobile-value" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; text-align: left; font-weight: bold; font-family: monospace; direction: ltr; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word;">${loginPassword}</td>
      </tr>
    ` : `
      <tr class="mobile-row">
        <td class="mobile-label" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; background-color: #f8fafc; width: 120px;"><strong>كلمة المرور:</strong></td>
        <td class="mobile-value" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; text-align: left; font-style: italic;">استخدم كلمة مرور حسابك الحالية</td>
      </tr>
    `;

    const credentialsBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfcfd; border-radius: 16px; border: 1px solid #eef2f6; border-right: 4px solid #D6004B; direction: rtl; text-align: right; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
      <tr>
        <td class="inner-padding" style="padding: 24px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: bold;">🔑 تفاصيل الدخول لحسابك الموحد</h3>
          <p style="margin: 0 0 18px 0; font-size: 13px; color: #475569; line-height: 1.6;">استخدم البيانات التالية لتسجيل الدخول إلى حسابك ومتابعة كورساتك:</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; overflow: hidden;">
            <tr class="mobile-row">
              <td class="mobile-label" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569; background-color: #f8fafc; width: 120px;"><strong>البريد الإلكتروني:</strong></td>
              <td class="mobile-value" style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a; text-align: left; font-weight: bold; font-family: monospace; direction: ltr; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word;">${loginEmail}</td>
            </tr>
            ${passwordRow}
          </table>
          
          <table cellpadding="0" cellspacing="0" class="mobile-btn-container" style="margin: 0 auto;">
            <tr>
              <td style="background-color: #D6004B; border-radius: 10px; box-shadow: 0 4px 12px rgba(214, 0, 75, 0.25);">
                <a href="https://www.joeschool.com/login?email=${encodeURIComponent(loginEmail)}&redirect=%2Fdashboard" class="mobile-btn" style="display: inline-block; padding: 12px 28px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px;">🔑 اضغط هنا لتسجيل الدخول مباشرة</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    `;

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjectLine}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    }
    @media only screen and (max-width: 480px) {
      .wrapper-table {
        padding: 12px 0 !important;
      }
      .main-table {
        border-radius: 12px !important;
      }
      .content-padding {
        padding: 20px 14px !important;
      }
      .inner-padding {
        padding: 16px !important;
      }
      .header-padding {
        padding: 28px 16px !important;
      }
      .header-title {
        font-size: 20px !important;
      }
      .mobile-row {
        display: block !important;
        width: 100% !important;
      }
      .mobile-label {
        display: block !important;
        width: 100% !important;
        text-align: right !important;
        background-color: #f8fafc !important;
        border-bottom: none !important;
        padding: 10px 12px 4px 12px !important;
      }
      .mobile-value {
        display: block !important;
        width: 100% !important;
        text-align: right !important;
        padding: 4px 12px 10px 12px !important;
        border-top: none !important;
      }
      .mobile-btn-container {
        width: 100% !important;
      }
      .mobile-btn-container td {
        display: block !important;
        width: 100% !important;
      }
      .mobile-btn {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
        padding: 14px 16px !important;
      }
      .invoice-box {
        padding: 16px !important;
        margin-top: 24px !important;
      }
      .footer-padding {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;direction:rtl;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" class="wrapper-table" style="background-color:#f5f7fa;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="main-table" style="max-width:580px;background-color:#ffffff;border-radius:20px;overflow:hidden;border: 1px solid #e2e8f0;box-shadow: 0 10px 30px rgba(0,0,0,0.025);">
          <!-- Header block -->
          <tr>
            <td class="header-padding" style="padding:40px 24px;text-align:center;background-color:#060505;border-bottom:4px solid #D6004B;">
              <h1 class="header-title" style="margin:0;color:#ffffff;font-size:24px;font-weight: 900;line-height: 1.4;">أهلاً ${customerName} 🎉</h1>
              <p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;line-height: 1.6;">تم تأكيد وتفعيل طلبك بنجاح. دورتك ومنتجاتك التعليمية بانتظارك.</p>
            </td>
          </tr>
          <!-- Products & Credentials Block -->
          <tr>
            <td class="content-padding" style="padding:32px 24px;">
              ${credentialsBlock}
              <table width="100%" cellpadding="0" cellspacing="0">${productsBlock}</table>
              
              <!-- Transaction Summary / Invoice -->
              <div class="invoice-box" style="margin-top:32px;padding:24px;background-color:#fcfcfd;border-radius:16px;border: 1px solid #eef2f6;text-align: right; direction: rtl; box-shadow: 0 4px 20px rgba(0,0,0,0.01); word-break: break-all; word-wrap: break-word; overflow-wrap: break-word;">
                <p style="color:#64748b;font-size:12px;text-transform:uppercase;margin:0 0 12px 0;font-weight: 800;letter-spacing: 0.5px;">🧾 تفاصيل الفاتورة المعتمدة</p>
                <p style="color:#334155;font-size:14px;margin:6px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;"><strong>اسم العميل:</strong> ${customerName}</p>
                <p style="color:#334155;font-size:14px;margin:6px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;"><strong>رقم الفاتورة:</strong> #${transactionId}</p>
                <p style="color:#334155;font-size:14px;margin:6px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;"><strong>التاريخ:</strong> ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                ${isUSDOrder ? `
                  <p style="color:#D6004B;font-size:15px;font-weight:bold;margin:6px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;"><strong>المبلغ الإجمالي:</strong> $${totalOriginalUsd.toFixed(2)} USD</p>
                  <p style="color:#475569;font-size:13px;margin:6px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;"><strong>المبلغ المخصوم فعلياً:</strong> ${totalChargedEgp.toFixed(2)} ج.م</p>
                  ${firstExchangeRate ? `<p style="color:#64748b;font-size:11px;margin:4px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;">سعر الصرف المثبت: 1 USD = ${firstExchangeRate.toFixed(4)} ج.م</p>` : ''}
                ` : `
                  <p style="color:#D6004B;font-size:15px;font-weight:bold;margin:6px 0;line-height: 1.5; word-break: break-all; word-wrap: break-word;"><strong>المبلغ الإجمالي:</strong> ${totalAmount.toFixed(2)} ج.م</p>
                `}
              </div>
            </td>
          </tr>
          <!-- Footer Block -->
          <tr>
            <td class="footer-padding" style="padding:32px 24px;text-align:center;background-color:#060505;border-top: 1px solid #1e293b;">
              <p style="color:#94a3b8;font-size:13px;margin:0 0 12px 0;line-height: 1.6;">
                استلمت هذا البريد لأنك قمت بالاشتراك في دورتنا التعليمية عبر JoeSchool.<br/>
                لديك استفسار؟ <a href="https://www.joeschool.com/contact" style="color:#D6004B;text-decoration:underline;font-weight:bold;margin-top:4px;display:inline-block;">اتصل بالدعم الفني للمنصة</a>
              </p>
              <p style="color:#64748b;font-size:11px;margin:16px 0 0 0;">&copy; ${new Date().getFullYear()} JoeSchool. جميع الحقوق محفوظة.</p>
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
