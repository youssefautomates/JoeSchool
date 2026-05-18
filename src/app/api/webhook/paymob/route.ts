import { NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyPaymobHmac } from "@/lib/paymob";
import { supabase } from "@/lib/supabase";
import { updateOrderStatus } from "@/lib/orders";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Unified Paymob Webhook Handler
 * 
 * Supports multiple systems on the same Paymob account:
 * - source = "store"     → Youssef Automates Store flow
 * - source = "joeschool" → JoeSchool flow (passthrough)
 * 
 * Detection priority:
 * 1. transaction.extra_description or order.extras.source
 * 2. order.merchant_order_id prefix ("store-...")
 * 3. Match against Supabase orders table (fallback)
 */
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[WEBHOOK][${requestId}] ===== Received new Paymob webhook =====`);

  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const hmac = searchParams.get("hmac");

    // ── 1. HMAC Verification ──────────────────────────────────────
    if (body.obj) {
      const isValid = verifyPaymobHmac(
        body.obj,
        hmac || "",
        process.env.PAYMOB_HMAC_SECRET || "",
        true // POST request
      );

      if (!isValid) {
        console.error(`[WEBHOOK][${requestId}] ❌ Invalid HMAC signature`);
        return NextResponse.json({ error: "Verification failed" }, { status: 401 });
      }
    }

    const transaction = body.obj;
    if (!transaction || !transaction.order) {
      console.error(`[WEBHOOK][${requestId}] ❌ Missing transaction or order object`);
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const paymobOrderId = String(transaction.order.id);
    const isSuccess = transaction.success === true;
    const txnId = transaction.id;

    // ── 2. Detect Payment Source ──────────────────────────────────
    const source = detectSource(transaction);
    console.log(`[WEBHOOK][${requestId}] Source: ${source} | Order: ${paymobOrderId} | Success: ${isSuccess} | Txn: ${txnId}`);

    // ── 3. Route Based on Source ──────────────────────────────────
    if (source === "joeschool") {
      console.log(`[WEBHOOK][${requestId}] 🎓 JoeSchool payment — passing through without Store processing`);
      return NextResponse.json({ success: true, source: "joeschool", message: "Handled by JoeSchool" });
    }

    // ── 4. Youssef Automates Store Flow ──────────────────────────
    // Robust multi-fallback order resolution
    let orderToUpdate: any = null;

    // A. Resolve via extras.supabase_order_id
    let resolvedSupabaseOrderId = "";
    const extras = transaction.order?.extras;
    if (extras) {
      if (typeof extras === "string") {
        try {
          const parsed = JSON.parse(extras);
          if (parsed.supabase_order_id) resolvedSupabaseOrderId = parsed.supabase_order_id;
        } catch {}
      } else if (typeof extras === "object" && extras.supabase_order_id) {
        resolvedSupabaseOrderId = extras.supabase_order_id;
      }
    }

    // B. Resolve via merchant_order_id (store-...)
    const merchantOrderId = transaction.order?.merchant_order_id;
    if (!resolvedSupabaseOrderId && typeof merchantOrderId === "string" && merchantOrderId.startsWith("store-")) {
      resolvedSupabaseOrderId = merchantOrderId.replace("store-", "");
    }

    if (resolvedSupabaseOrderId) {
      console.log(`[WEBHOOK][${requestId}] 🔍 Resolving order via Supabase Order ID: ${resolvedSupabaseOrderId}`);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", resolvedSupabaseOrderId)
        .single();
      if (data) {
        orderToUpdate = data;
      }
    }

    // C. Fallback: Query by payment_id matching numeric paymobOrderId
    if (!orderToUpdate) {
      console.log(`[WEBHOOK][${requestId}] 🔍 Fallback query: matching payment_id to paymobOrderId: ${paymobOrderId}`);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_id", paymobOrderId);
      if (data && data.length > 0) {
        orderToUpdate = data[0];
      }
    }

    // D. Fallback: Query by payment_id matching Intention ID (pi_...)
    const intentionId = transaction.payment_intention?.id || transaction.payment_intention;
    if (!orderToUpdate && intentionId) {
      console.log(`[WEBHOOK][${requestId}] 🔍 Fallback query: matching payment_id to intentionId: ${intentionId}`);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_id", String(intentionId));
      if (data && data.length > 0) {
        orderToUpdate = data[0];
      }
    }

    if (isSuccess) {
      if (orderToUpdate) {
        console.log(`[WEBHOOK][${requestId}] 🔄 Updating order ${orderToUpdate.id} status to completed...`);
        
        const updateData: any = { 
          status: "completed"
        };
        
        // Keep the database payment_id aligned with Paymob order ID if it was stored as pending or if it has another value
        if (!orderToUpdate.payment_id || orderToUpdate.payment_id === "PENDING" || orderToUpdate.payment_id.startsWith("pi_")) {
          updateData.payment_id = paymobOrderId;
        }

        await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderToUpdate.id);
          
        console.log(`[WEBHOOK][${requestId}] ✅ Order updated successfully to completed`);

        // ── 5. Product Delivery via Email ────────────────────────────
        const customerEmail = transaction.payment_key_claims?.billing_data?.email || orderToUpdate.customer_email;
        const customerName = transaction.payment_key_claims?.billing_data?.first_name || orderToUpdate.customer_name || "عميلنا العزيز";
        const amountPaid = (transaction.amount_cents / 100).toFixed(2);
        const currency = transaction.currency || "EGP";
        
        const { data: product } = await supabase
          .from("products")
          .select("title, sales")
          .eq("id", orderToUpdate.product_id)
          .single();

        const downloadLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/download?token=${orderToUpdate.id}`;
        const productTitle = product?.title || orderToUpdate.product_title;
        
        // Increment product sales
        if (product) {
          await supabase
            .from("products")
            .update({ sales: (product.sales || 0) + 1 })
            .eq("id", orderToUpdate.product_id);
        }

        const productBlock = `
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
        `;

        const emailHtml = `
  <!DOCTYPE html>
  <html dir="rtl" lang="ar">
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;direction:rtl;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0d0d1a;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:40px 32px;text-align:center;background:linear-gradient(180deg,#1a1a2e 0%,#0d0d1a 100%);">
                <h1 style="margin:0;color:#ffffff;font-size:24px;">أهلاً ${customerName}! 🎉</h1>
                <p style="color:#a1a1aa;margin-top:10px;">تم تأكيد دفعك بنجاح. منتجاتك جاهزة للتحميل.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <table width="100%" cellpadding="0" cellspacing="0">${productBlock}</table>
                <div style="margin-top:32px;padding:20px;background-color:#1a1a2e;border-radius:12px;">
                  <p style="color:#71717a;font-size:12px;text-transform:uppercase;">ملخص الطلب</p>
                  <p style="color:#ffffff;font-size:14px;margin-top:8px;">رقم المعاملة: #${txnId}</p>
                  <p style="color:#4ade80;font-size:14px;font-weight:700;">المبلغ: ${amountPaid} ${currency}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;text-align:center;background-color:#0a0a14;">
                <p style="color:#52525b;font-size:12px;">&copy; ${new Date().getFullYear()} Youssef Automates</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`.trim();

        if (customerEmail) {
          console.log(`[WEBHOOK][${requestId}] 📧 Sending delivery email to ${customerEmail}...`);
          await resend.emails.send({
            from: "Youssef Automates <delivery@youssefautomates.com>",
            to: customerEmail,
            subject: `🎉 طلبك جاهز! ${productTitle} - Youssef Automates`,
            html: emailHtml,
          });
          console.log(`[WEBHOOK][${requestId}] 📧 Email sent`);
        }
      } else {
        console.warn(`[WEBHOOK][${requestId}] ⚠️ Success notification received but no matching order found in Supabase.`);
      }
    } else {
      if (orderToUpdate) {
        console.log(`[WEBHOOK][${requestId}] ❌ Payment failed, updating order ${orderToUpdate.id} status to failed...`);
        await supabase
          .from("orders")
          .update({ status: "failed" })
          .eq("id", orderToUpdate.id);
      }
    }

    return NextResponse.json({ success: true, source: "store" });
  } catch (error: any) {
    console.error(`[WEBHOOK][${requestId}] 💥 ERROR:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Detect the payment source from Paymob transaction metadata.
 * 
 * Checks multiple locations where "source" could be stored:
 * 1. transaction.order.extras.source (Intention API)
 * 2. transaction.order.merchant_order_id prefix (Classic API)
 * 3. transaction.extra_description (some Paymob flows)
 * 4. Fallback: check if payment_id exists in our Supabase orders table
 */
function detectSource(transaction: any): string {
  // Check extras object (works with both Intention and Classic API)
  const extras = transaction.order?.extras;
  if (extras) {
    if (typeof extras === "string") {
      try {
        const parsed = JSON.parse(extras);
        if (parsed.source) return parsed.source;
      } catch {}
    } else if (typeof extras === "object" && extras.source) {
      return extras.source;
    }
  }

  // Check merchant_order_id prefix
  const merchantOrderId = transaction.order?.merchant_order_id;
  if (typeof merchantOrderId === "string") {
    if (merchantOrderId.startsWith("store-")) return "store";
    if (merchantOrderId.startsWith("joeschool-")) return "joeschool";
  }

  // Check extra_description field (some Paymob flows put metadata here)
  const extraDesc = transaction.extra_description;
  if (typeof extraDesc === "string") {
    if (extraDesc.includes("store")) return "store";
    if (extraDesc.includes("joeschool")) return "joeschool";
  }

  // Default: assume store (since this webhook URL belongs to the store)
  // JoeSchool should tag its own payments — untagged ones belong here
  console.log(`[WEBHOOK] ⚠️ No source tag found, defaulting to "store"`);
  return "store";
}
