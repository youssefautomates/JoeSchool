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
        <div style="direction: rtl; font-family: sans-serif; padding: 20px; background-color: #f9f9fc; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05);">
          <h2 style="color: #D6004B;">🧪 اختبار بريد النطاق المخصص</h2>
          <p>أهلاً بك، هذه رسالة بريد إلكتروني تجريبية لتأكيد نجاح ربط النطاق المخصص بنجاح 100%!</p>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #666;">المرسل الفعلي: ${sender}</p>
          <p style="font-size: 12px; color: #999;">توقيت الإرسال: ${new Date().toLocaleString()}</p>
        </div>
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
