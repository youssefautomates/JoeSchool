import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/paymob/verify-and-deliver
 * 
 * This endpoint verifies payment directly with Paymob API (no webhook needed)
 * and delivers the digital product via email.
 * 
 * Called from the success page after payment completion.
 * Safe to call multiple times — it checks if delivery was already done.
 */
export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // 1. Fetch order(s) from Supabase
    const { data: orders, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId);

    if (orderError || !orders || orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orders[0];

    // 2. Already delivered? Skip.
    if (order.status === "completed") {
      console.log(`[VERIFY] Order ${orderId} already completed. Skipping.`);
      return NextResponse.json({ success: true, alreadyDelivered: true });
    }

    const paymobPaymentId = order.payment_id;
    if (!paymobPaymentId || paymobPaymentId === "PENDING") {
      return NextResponse.json({ error: "Payment not initiated yet", status: "pending" }, { status: 200 });
    }

    // 3. Authenticate with Paymob
    const apiKey = process.env.PAYMOB_API_KEY;
    if (!apiKey) {
      throw new Error("PAYMOB_API_KEY is missing");
    }

    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authToken = (await authRes.json()).token;

    // 4. Fetch order transactions from Paymob
    const txnRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobPaymentId}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
    });
    
    const paymobOrder = await txnRes.json();
    console.log("[VERIFY] Paymob order status:", paymobOrder.id, "| paid_amount_cents:", paymobOrder.paid_amount_cents, "| is_cancel:", paymobOrder.is_cancel);

    // Check if there are successful transactions
    let isPaymentSuccessful = false;
    let transactionId = "";
    let amountCents = 0;
    let currency = "EGP";
    let customerEmail = order.customer_email;
    let customerName = order.customer_name;

    // Try to get transactions for this order
    const txnListRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobPaymentId}/transactions`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
    });

    if (txnListRes.ok) {
      const transactions = await txnListRes.json();
      console.log("[VERIFY] Transactions count:", Array.isArray(transactions) ? transactions.length : "not array");
      
      if (Array.isArray(transactions)) {
        const successfulTxn = transactions.find((t: any) => t.success === true);
        if (successfulTxn) {
          isPaymentSuccessful = true;
          transactionId = successfulTxn.id;
          amountCents = successfulTxn.amount_cents;
          currency = successfulTxn.currency || "EGP";
          // Try to get email from transaction
          if (successfulTxn.payment_key_claims?.billing_data?.email) {
            customerEmail = successfulTxn.payment_key_claims.billing_data.email;
          }
          if (successfulTxn.payment_key_claims?.billing_data?.first_name) {
            customerName = successfulTxn.payment_key_claims.billing_data.first_name;
          }
        }
      }
    }

    // Also check paid_amount_cents from order itself
    if (!isPaymentSuccessful && paymobOrder.paid_amount_cents > 0) {
      isPaymentSuccessful = true;
      amountCents = paymobOrder.paid_amount_cents;
      transactionId = paymobOrder.id;
    }

    if (!isPaymentSuccessful) {
      console.log(`[VERIFY] Order ${orderId} payment not confirmed yet.`);
      return NextResponse.json({ success: false, status: "pending", message: "Payment not confirmed yet" });
    }

    // 5. Payment confirmed! Update order status
    await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", orderId);

    // Also update any related cart orders with same payment_id
    await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("payment_id", paymobPaymentId);

    console.log(`[VERIFY] ✅ Order ${orderId} marked as completed.`);

    // 6. Fetch product details for email
    const { data: allOrders } = await supabase
      .from("orders")
      .select("product_id, product_title")
      .eq("payment_id", paymobPaymentId);

    if (!allOrders || allOrders.length === 0) {
      return NextResponse.json({ success: true, emailSent: false, reason: "No products found" });
    }

    // 7. Build and send email
    const productBlocks: string[] = [];
    const productTitles: string[] = [];

    for (const o of allOrders) {
      const { data: product } = await supabase
        .from("products")
        .select("file_url, title")
        .eq("id", o.product_id)
        .single();

      const downloadLink = product?.file_url || "https://youssefautomates.com";
      const productTitle = product?.title || o.product_title;
      productTitles.push(productTitle);

      productBlocks.push(`
        <tr>
          <td style="padding: 12px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #D6004B; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">منتج رقمي</p>
                        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #ffffff; font-weight: 700;">${productTitle}</h3>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background: linear-gradient(135deg, #D6004B, #ff1a6d); border-radius: 8px;">
                              <a href="${downloadLink}" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">⬇ تحميل الملف الآن</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `);
    }

    const isMultiple = productTitles.length > 1;
    const subjectTitle = isMultiple ? `${productTitles.length} منتجات جاهزة للتحميل` : productTitles[0];
    const amountPaid = (amountCents / 100).toFixed(2);

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>طلبك جاهز - Youssef Automates</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0d0d1a; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.15);">
          
          <tr>
            <td style="padding: 40px 32px 24px 32px; text-align: center; background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: linear-gradient(135deg, #D6004B, #ff1a6d); padding: 12px 16px; border-radius: 14px; margin-bottom: 20px;">
                      <span style="color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: -0.5px;">Y</span>
                    </div>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.3px;">Youssef Automates</p>
                    <p style="margin: 4px 0 0 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">PREMIUM WORKFLOWS</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 8px 32px; text-align: center;">
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #052e16; border-radius: 99px; padding: 8px 20px;">
                    <span style="color: #4ade80; font-size: 13px; font-weight: 700;">✓ تم تأكيد الدفع بنجاح</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 8px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; line-height: 1.3;">أهلاً ${customerName}! 🎉</h1>
              <p style="margin: 12px 0 0 0; color: #a1a1aa; font-size: 16px; line-height: 1.7;">شكراً لثقتك بنا. منتجاتك الرقمية جاهزة للتحميل الفوري.</p>
            </td>
          </tr>

          <tr><td style="padding: 24px 32px;"><div style="height: 1px; background: linear-gradient(90deg, transparent, #27272a, transparent);"></div></td></tr>

          <tr>
            <td style="padding: 0 32px;">
              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">${isMultiple ? "منتجاتك الرقمية" : "منتجك الرقمي"}</p>
              <table width="100%" cellpadding="0" cellspacing="0">${productBlocks.join("")}</table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">ملخص الطلب</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">رقم المعاملة</td>
                        <td style="padding: 6px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: left; direction: ltr; font-family: monospace;">#${transactionId}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">المبلغ المدفوع</td>
                        <td style="padding: 6px 0; color: #4ade80; font-size: 14px; font-weight: 700; text-align: left; direction: ltr;">${amountPaid} ${currency}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #a1a1aa; font-size: 14px;">الحالة</td>
                        <td style="padding: 6px 0; text-align: left;"><span style="background-color: #052e16; color: #4ade80; padding: 2px 10px; border-radius: 99px; font-size: 12px; font-weight: 700;">مكتمل ✓</span></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1c1917; border-radius: 12px; border-right: 4px solid #D6004B;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; color: #D6004B; font-size: 13px; font-weight: 700;">⚡ ملاحظة مهمة</p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 13px; line-height: 1.7;">احتفظ بهذا الإيميل كمرجع. روابط التحميل ستظل متاحة. إذا واجهت أي مشكلة، ببساطة رد على هذه الرسالة وسنساعدك فوراً.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 32px 32px; text-align: center; background-color: #0a0a14;">
              <p style="margin: 0 0 8px 0; color: #52525b; font-size: 13px;">تم الإرسال بواسطة <span style="color: #D6004B; font-weight: 700;">Youssef Automates</span></p>
              <p style="margin: 0; color: #3f3f46; font-size: 11px;">&copy; ${new Date().getFullYear()} Youssef Automates. جميع الحقوق محفوظة.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const emailResult = await resend.emails.send({
      from: "Youssef Automates <delivery@youssefautomates.com>",
      to: customerEmail,
      replyTo: "youssefautomates@gmail.com",
      subject: `🎉 طلبك جاهز! ${subjectTitle} - Youssef Automates`,
      html: emailHtml,
      headers: {
        "X-Entity-Ref-ID": `order-${orderId}-${Date.now()}`,
      },
    });

    console.log(`[VERIFY] 📧 Email sent to ${customerEmail} for ${allOrders.length} item(s). Resend ID: ${emailResult?.data?.id}`);

    return NextResponse.json({ 
      success: true, 
      emailSent: true,
      transactionId,
      orderValue: amountPaid,
      currency: currency,
      productNames: productTitles.join(", ")
    });

  } catch (error: any) {
    console.error("[VERIFY_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
