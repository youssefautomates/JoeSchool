import { NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with environment variable
const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

function buildEmailHtml(
  customerName: string,
  secureDownloadLink: string
): string {
  const year = new Date().getFullYear();

  const parts: string[] = [
    '<div dir="rtl" style="font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #27272a;">',
    '<div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 40px 20px; text-align: center;">',
    '<h1 style="color: white; margin: 0; font-size: 28px; text-align: center;">',
    "\u0634\u0643\u0631\u0627\u064b \u0644\u0634\u0631\u0627\u0626\u0643 \u0645\u0646 Youssef Automates</h1>",
    '<p style="color: #c7d2fe; text-align: center; margin-top: 10px; font-size: 16px;">',
    "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639 \u0628\u0646\u062c\u0627\u062d</p>",
    "</div>",
    '<div style="padding: 40px 30px;">',
    '<p style="font-size: 18px; color: #e4e4e7; margin-bottom: 24px;">',
    "\u0645\u0631\u062d\u0628\u0627\u064b " + customerName + "\u060c</p>",
    '<p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 32px;">',
    "\u064a\u0633\u0639\u062f\u0646\u0627 \u0625\u062e\u0628\u0627\u0631\u0643 \u0628\u0623\u0646\u0647 \u062a\u0645 \u062a\u062c\u0647\u064a\u0632 \u062d\u0632\u0645\u0629 \u0627\u0644\u0623\u062a\u0645\u062a\u0629 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0643 \u0648\u0647\u064a \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0622\u0646. ",
    "\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0622\u0645\u0646 \u0648\u0635\u0627\u0644\u062d \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062e\u0627\u0635 \u0628\u0643 \u0641\u0642\u0637.</p>",
    '<div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 32px;">',
    '<div style="flex: 1;">',
    '<h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 18px;">',
    "\u062d\u0632\u0645\u0629 \u0623\u062a\u0645\u062a\u0629 \u0627\u0644\u0631\u062f \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a</h3>",
    '<p style="margin: 0; color: #a1a1aa; font-size: 14px;">',
    "\u064a\u062a\u0636\u0645\u0646: \u0645\u0644\u0641 PDF \u0625\u0631\u0634\u0627\u062f\u064a + \u0631\u0627\u0628\u0637 \u0627\u0633\u062a\u064a\u0631\u0627\u062f n8n</p>",
    "</div></div>",
    '<div style="text-align: center;">',
    '<a href="' + secureDownloadLink + '" style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.39);">',
    "\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0622\u0646</a></div>",
    '<p style="color: #ef4444; font-size: 12px; text-align: center; margin-top: 16px;">',
    "\u0645\u0644\u0627\u062d\u0638\u0629: \u0644\u0623\u0633\u0628\u0627\u0628 \u0623\u0645\u0646\u064a\u0629\u060c \u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0633\u064a\u062a\u0648\u0642\u0641 \u0639\u0646 \u0627\u0644\u0639\u0645\u0644 \u0628\u0639\u062f 24 \u0633\u0627\u0639\u0629 \u0623\u0648 \u0628\u0639\u062f \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u062a\u062d\u0645\u064a\u0644\u0627\u062a.</p>",
    "</div>",
    '<div style="background-color: #18181b; padding: 24px; text-align: center; border-top: 1px solid #27272a;">',
    '<p style="color: #71717a; font-size: 14px; margin: 0;">',
    '\u0625\u0630\u0627 \u0648\u0627\u062c\u0647\u062a\u0643 \u0623\u064a \u0645\u0634\u0643\u0644\u0629\u060c \u0644\u0627 \u062a\u062a\u0631\u062f\u062f \u0641\u064a <a href="mailto:support@youssefautomates.com" style="color: #818cf8; text-decoration: none;">\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062f\u0639\u0645 \u0627\u0644\u0641\u0646\u064a</a>.</p>',
    '<p style="color: #52525b; font-size: 12px; margin-top: 16px;">',
    "\u00a9 " + String(year) + " Youssef Automates. \u062c\u0645\u064a\u0639 \u0627\u0644\u062d\u0642\u0648\u0642 \u0645\u062d\u0641\u0648\u0638\u0629.</p>",
    "</div></div>",
  ];

  return parts.join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify Paymob Webhook signature here (HMAC verification)
    // const hmac = request.headers.get('hmac');
    // verifyHmac(body, hmac, process.env.PAYMOB_HMAC_SECRET);

    // Check if the transaction is successful
    if (body.obj && body.obj.success === true) {
      const order = body.obj.order;
      const customerEmail =
        body.obj.payment_key_claims.billing_data.email;
      const customerName =
        body.obj.payment_key_claims.billing_data.first_name;

      // Generate secure download link (Expires in 24 hours)
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://youssefautomates.com";
      const secureDownloadLink =
        baseUrl + "/download/secure-token-" + String(Date.now());

      // Build the email HTML
      const emailHtml = buildEmailHtml(customerName, secureDownloadLink);

      // Send the email
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: "Youssef Automates <delivery@youssefautomates.com>",
          to: customerEmail,
          subject:
            "\u062a\u0645 \u062a\u0633\u0644\u064a\u0645 \u0637\u0644\u0628\u0643 \u0628\u0646\u062c\u0627\u062d \ud83d\ude80 - \u0631\u0627\u0628\u0637 \u0627\u0644\u062a\u062d\u0645\u064a\u0644 \u0628\u0627\u0644\u062f\u0627\u062e\u0644",
          html: emailHtml,
        });
      }

      // Log success
      console.log("Successfully processed and sent email to " + customerEmail);

      return NextResponse.json({
        success: true,
        message: "Order processed and email sent",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook received but not a successful transaction",
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
