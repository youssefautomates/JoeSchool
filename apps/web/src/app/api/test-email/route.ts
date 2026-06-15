import { NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * GET /api/test-email
 * 
 * Strict diagnostic endpoint to verify Resend API connection, custom domain verification list,
 * and dispatch real emails exclusively from delivery@joeschool.com.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetEmail = searchParams.get("to") || "youssefmostafabusiness@gmail.com";

  console.log(`[TEST_EMAIL] Initiating connection diagnostics for target: ${targetEmail}`);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[TEST_EMAIL] ❌ RESEND_API_KEY environment variable is missing.");
    return NextResponse.json({
      success: false,
      error: "Missing RESEND_API_KEY inside environment variables (.env.local)"
    }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const sender = "JoeSchool <delivery@joeschool.com>";
  
  const diagnostics: any = {
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 7),
    targetEmail,
    senderUsed: sender,
    domainStatus: {},
    emailDispatch: {},
    timestamp: new Date().toISOString()
  };

  // ── Step 1: Query Resend Domain Verification list ──────────────────
  try {
    console.log("[TEST_EMAIL] 🔍 Querying Resend domain verification list...");
    const domainsList: any = await resend.domains.list();
    console.log("[TEST_EMAIL] 📝 Raw Domains list output:", JSON.stringify(domainsList, null, 2));

    let rawDomains: any[] = [];
    if (domainsList) {
      if (Array.isArray(domainsList.data)) {
        rawDomains = domainsList.data;
      } else if (Array.isArray(domainsList)) {
        rawDomains = domainsList;
      }
    }

    diagnostics.domainStatus = {
      success: true,
      domains: rawDomains.map(d => ({
        id: d.id,
        name: d.name,
        status: d.status, // "verified" | "pending"
        createdAt: d.created_at || d.createdAt,
        region: d.region
      }))
    };
  } catch (err: any) {
    console.error("[TEST_EMAIL] ❌ Domain list query exception:", err.message);
    diagnostics.domainStatus = {
      success: false,
      error: err.message,
      tip: "If this failed with a 403, your API key might be restricted to Sending Only and does not have Domain Read permissions."
    };
  }

  // ── Step 2: Attempt sending exclusively from custom domain ─────────
  try {
    console.log(`[TEST_EMAIL] 🚀 Dispatching test email from: "${sender}" to: "${targetEmail}"`);
    const emailResult = await resend.emails.send({
      from: sender,
      to: targetEmail,
      subject: "🧪 JoeSchool - Custom Domain Verified Test Email",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin:0;padding:0;background-color:#f5f7fa;direction:rtl;font-family:'Segoe UI', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:30px 0;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:20px;overflow:hidden;border: 1px solid #e2e8f0;box-shadow: 0 10px 30px rgba(0,0,0,0.025);">
                  <!-- Header -->
                  <tr>
                    <td style="padding:30px 24px;text-align:center;background-color:#050505;border-bottom:4px solid #D6004B;">
                      <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.joeschool.com'}/logo-email.png" alt="JoeSchool Logo" style="height: 40px; display: block; margin: 0 auto 12px auto;" />
                      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; font-family: 'Segoe UI', Arial, sans-serif;">🧪 اختبار توصيلية البريد</h2>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px 24px; text-align: center; direction: rtl;">
                      <h3 style="color: #16a34a; font-size: 20px; font-weight: bold; margin-top: 0;">🎉 تم الاتصال والربط بنجاح!</h3>
                      <p style="font-size: 14px; line-height: 1.6; color: #334155; font-family: 'Segoe UI', Arial, sans-serif;">
                        أهلاً بك، هذه رسالة بريد إلكتروني تجريبية لتأكيد نجاح ربط النطاق المخصص بنجاح 100% وإمكانية إرسال البريد بصورة سليمة.
                      </p>
                      
                      <div style="background-color: #fcfcfd; border-radius: 12px; border: 1px solid #eef2f6; padding: 16px; margin-top: 24px; text-align: right; font-size: 12px; color: #64748b;">
                        <p style="margin: 4px 0;"><strong>المرسل الفعلي:</strong> ${sender}</p>
                        <p style="margin: 4px 0;"><strong>توقيت الإرسال:</strong> ${new Date().toLocaleString('ar-EG')}</p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:24px;text-align:center;background-color:#f8fafc;border-top: 1px solid #e2e8f0;">
                      <p style="color:#94a3b8;font-size:11px;margin:0;font-family: 'Segoe UI', Arial, sans-serif;">&copy; ${new Date().getFullYear()} JoeSchool. جميع الحقوق محفوظة.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    console.log("[TEST_EMAIL] 📝 Raw Resend SDK Send Output:", JSON.stringify(emailResult, null, 2));

    if (emailResult.error) {
      console.error("[TEST_EMAIL] ❌ Resend returned an error:", JSON.stringify(emailResult.error, null, 2));
      diagnostics.emailDispatch = {
        success: false,
        error: emailResult.error
      };
    } else {
      const responseId = emailResult.data?.id;
      console.log(`[TEST_EMAIL] ✅ Test email successfully dispatched! Response ID: ${responseId}`);
      diagnostics.emailDispatch = {
        success: true,
        responseId,
        data: emailResult.data
      };
    }
  } catch (err: any) {
    console.error("[TEST_EMAIL] 💥 Exception during primary domain send:", err.message);
    diagnostics.emailDispatch = {
      success: false,
      error: {
        message: err.message,
        stack: err.stack
      }
    };
  }

  const finalStatus = diagnostics.emailDispatch.success ? "success" : "failed";

  return NextResponse.json({
    status: finalStatus,
    diagnostics
  }, { status: finalStatus === "success" ? 200 : 500 });
}
