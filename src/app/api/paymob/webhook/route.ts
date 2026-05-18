import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { verifyPaymobHmac } from "@/lib/paymob";

const resend = new Resend(process.env.RESEND_API_KEY);

// Server-side admin client to bypass RLS for payment fulfillment
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

/**
 * Unified Paymob Webhook Handler (Master Endpoint: /api/paymob/webhook)
 * 
 * Supports both digital store products and LMS courses with full auto-delivery,
 * auto-enrollment, email notifications, and HMAC signature verification.
 */
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[PAYMOB_WEBHOOK][${requestId}] ===== Received new Paymob webhook =====`);

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
        console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Invalid HMAC signature`);
        return NextResponse.json({ error: "Verification failed" }, { status: 401 });
      }
      console.log(`[PAYMOB_WEBHOOK][${requestId}] ✅ HMAC verification passed`);
    }

    const transaction = body.obj;
    if (!transaction || !transaction.order) {
      console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Missing transaction or order object`);
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const paymobOrderId = String(transaction.order.id);
    const isSuccess = transaction.success === true;
    const txnId = transaction.id;

    // ── 2. Detect Payment Source ──────────────────────────────────
    const source = detectSource(transaction);
    console.log(`[PAYMOB_WEBHOOK][${requestId}] Source: ${source} | Order: ${paymobOrderId} | Success: ${isSuccess} | Txn: ${txnId}`);

    // Route other merchant profiles if needed (e.g., JoeSchool passthrough)
    if (source === "joeschool") {
      console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 JoeSchool payment — passing through`);
      return NextResponse.json({ success: true, source: "joeschool", message: "Handled by JoeSchool" });
    }

    // ── 3. Find Matching Supabase Order ───────────────────────────
    let orderToUpdate: any = null;

    // A. Match via supabase_order_id metadata
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

    // B. Match via merchant_order_id prefix (store-...)
    const merchantOrderId = transaction.order?.merchant_order_id;
    if (!resolvedSupabaseOrderId && typeof merchantOrderId === "string" && merchantOrderId.startsWith("store-")) {
      resolvedSupabaseOrderId = merchantOrderId.replace("store-", "");
    }

    if (resolvedSupabaseOrderId) {
      console.log(`[PAYMOB_WEBHOOK][${requestId}] 🔍 Resolving order via Supabase Order ID: ${resolvedSupabaseOrderId}`);
      const { data } = await supabaseAdmin
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
      console.log(`[PAYMOB_WEBHOOK][${requestId}] 🔍 Fallback query: matching payment_id to paymobOrderId: ${paymobOrderId}`);
      const { data } = await supabaseAdmin
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
      console.log(`[PAYMOB_WEBHOOK][${requestId}] 🔍 Fallback query: matching payment_id to intentionId: ${intentionId}`);
      const { data } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("payment_id", String(intentionId));
      if (data && data.length > 0) {
        orderToUpdate = data[0];
      }
    }

    // ── 4. Process Status & Deliveries ────────────────────────────
    if (isSuccess) {
      if (orderToUpdate) {
        // If order already marked completed, avoid redundant dispatches
        if (orderToUpdate.status === "completed") {
          console.log(`[PAYMOB_WEBHOOK][${requestId}] ⚠️ Order ${orderToUpdate.id} is already completed. Skipping delivery logic.`);
          return NextResponse.json({ success: true, message: "Order already fulfilled" });
        }

        console.log(`[PAYMOB_WEBHOOK][${requestId}] 🔄 Completing order ${orderToUpdate.id} in database...`);
        
        const updateData: any = { 
          status: "completed"
        };
        
        // Keep database payment_id aligned with Paymob Order ID
        if (!orderToUpdate.payment_id || orderToUpdate.payment_id === "PENDING" || orderToUpdate.payment_id.startsWith("pi_")) {
          updateData.payment_id = paymobOrderId;
        }

        const { error: updErr } = await supabaseAdmin
          .from("orders")
          .update(updateData)
          .eq("id", orderToUpdate.id);
          
        if (updErr) {
          console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Database update error:`, updErr);
          throw updErr;
        }
        
        console.log(`[PAYMOB_WEBHOOK][${requestId}] ✅ Order status updated successfully`);

        // Fetch Product Info for exact Category and Sales increment
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("title, sales, category, file_url")
          .eq("id", orderToUpdate.product_id)
          .single();

        if (product) {
          // Increment sales count
          await supabaseAdmin
            .from("products")
            .update({ sales: (product.sales || 0) + 1 })
            .eq("id", orderToUpdate.product_id);
          console.log(`[PAYMOB_WEBHOOK][${requestId}] 📈 Sales incremented for product: ${product.title}`);
        }

        // Determine if this is an LMS Course purchase
        const isCourse = 
          product?.category === "courses" || 
          product?.category === "الدورات التعليمية" || 
          product?.category === "الدورات التدريبية" ||
          orderToUpdate.product_title?.includes("دورة") || 
          orderToUpdate.product_title?.includes("كورس") || 
          orderToUpdate.product_title?.includes("مساق");

        const customerEmail = transaction.payment_key_claims?.billing_data?.email || orderToUpdate.customer_email;
        const customerName = transaction.payment_key_claims?.billing_data?.first_name || orderToUpdate.customer_name || "عميلنا العزيز";
        const amountPaid = (transaction.amount_cents / 100).toFixed(2);
        const currency = transaction.currency || "EGP";
        const productTitle = product?.title || orderToUpdate.product_title;

        // ── 5. Dynamic Auto-Enrollment (LMS) ─────────────────────────
        if (isCourse) {
          console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 Auto-enrolling student in LMS Course...`);
          try {
            const { getCoursesList, enrollUser } = await import("@/lib/coursesDb");
            const coursesList = await getCoursesList();
            
            // Match course by title
            const matchedCourse = coursesList.find(c => 
              c.title.toLowerCase().includes(productTitle.toLowerCase()) || 
              productTitle.toLowerCase().includes(c.title.toLowerCase())
            ) || coursesList[0];

            if (matchedCourse) {
              let userId = orderToUpdate.customer_id;
              if (!userId || userId === "anonymous") {
                const { data: profile } = await supabaseAdmin
                  .from("profiles")
                  .select("id")
                  .eq("email", customerEmail)
                  .maybeSingle();
                
                userId = profile?.id || "usr-student-" + Math.random().toString(36).substring(2, 11);
              }

              console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 Enrolling user ${userId} in course: ${matchedCourse.title}`);
              await enrollUser(userId, matchedCourse.id, {
                email: customerEmail,
                name: customerName
              });
              console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 Student successfully enrolled!`);
            }
          } catch (enrollErr) {
            console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Auto-enrollment error:`, enrollErr);
          }
        }

        // ── 6. Send Premium Email (Fulfillment) ──────────────────────
        const downloadLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/download?token=${orderToUpdate.id}`;
        const dashboardLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

        let productBlock = "";
        if (isCourse) {
          productBlock = `
          <tr>
            <td style="padding: 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.05);">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 11px; color: #ff1a6d; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">دورة تدريبية معتمدة</p>
                          <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #ffffff; font-weight: 700; font-family: 'Segoe UI', sans-serif;">${productTitle}</h3>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background: linear-gradient(135deg, #D6004B, #ff1a6d); border-radius: 8px;">
                                <a href="${dashboardLink}" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">🚀 ابدأ التعلم الآن</a>
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
        } else {
          productBlock = `
          <tr>
            <td style="padding: 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.05);">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 11px; color: #4ade80; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">منتج رقمي للتحميل</p>
                          <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #ffffff; font-weight: 700; font-family: 'Segoe UI', sans-serif;">${productTitle}</h3>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background: linear-gradient(135deg, #10b981, #059669); border-radius: 8px;">
                                <a href="${downloadLink}" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">⬇ تحميل الملف الرقمي</a>
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
        }

        const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تهانينا على عملية الشراء! 🎉</title>
</head>
<body style="margin:0;padding:0;background-color:#050508;direction:rtl;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0b0b12;border-radius:24px;overflow:hidden;border: 1px solid rgba(255, 255, 255, 0.05);box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);">
          <tr>
            <td style="padding:40px 32px;text-align:center;background:linear-gradient(180deg,#16162e 0%,#0b0b12 100%);">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight: 800;">أهلاً ${customerName}! 🎉</h1>
              <p style="color:#a1a1aa;margin-top:10px;font-size:14px;">تم تأكيد دفعك بنجاح. ملفاتك وكورساتك أصبحت جاهزة لك فوراً.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">${productBlock}</table>
              <div style="margin-top:32px;padding:20px;background-color:#141424;border-radius:12px;border: 1px solid rgba(255, 255, 255, 0.03);">
                <p style="color:#71717a;font-size:12px;text-transform:uppercase;margin:0 0 8px 0;font-weight: bold;letter-spacing: 1px;">ملخص الطلب</p>
                <p style="color:#ffffff;font-size:13px;margin:4px 0;">رقم المعاملة: #${txnId}</p>
                <p style="color:#4ade80;font-size:13px;font-weight:700;margin:4px 0;">المبلغ المدفوع: ${amountPaid} ${currency}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center;background-color:#06060c;border-top: 1px solid rgba(255, 255, 255, 0.03);">
              <p style="color:#52525b;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Youssef Automates. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

        if (customerEmail) {
          console.log(`[PAYMOB_WEBHOOK][${requestId}] 📧 Sending delivery email to ${customerEmail}...`);
          await resend.emails.send({
            from: "Youssef Automates <delivery@youssefautomates.com>",
            to: customerEmail,
            subject: `🎉 طلبك جاهز! ${productTitle} - Youssef Automates`,
            html: emailHtml,
          });
          console.log(`[PAYMOB_WEBHOOK][${requestId}] 📧 Email successfully dispatched`);
        }
      } else {
        console.warn(`[PAYMOB_WEBHOOK][${requestId}] ⚠️ Success transaction received but no matching order found in Supabase.`);
      }
    } else {
      if (orderToUpdate) {
        console.log(`[PAYMOB_WEBHOOK][${requestId}] ❌ Transaction unsuccessful. Marking order ${orderToUpdate.id} as failed.`);
        await supabaseAdmin
          .from("orders")
          .update({ status: "failed" })
          .eq("id", orderToUpdate.id);
      }
    }

    return NextResponse.json({ success: true, source: "store" });
  } catch (error: any) {
    console.error(`[PAYMOB_WEBHOOK][${requestId}] 💥 EXCEPTION:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Detect the payment source from Paymob transaction metadata
 */
function detectSource(transaction: any): string {
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

  const merchantOrderId = transaction.order?.merchant_order_id;
  if (typeof merchantOrderId === "string") {
    if (merchantOrderId.startsWith("store-")) return "store";
    if (merchantOrderId.startsWith("joeschool-")) return "joeschool";
  }

  const extraDesc = transaction.extra_description;
  if (typeof extraDesc === "string") {
    if (extraDesc.includes("store")) return "store";
    if (extraDesc.includes("joeschool")) return "joeschool";
  }

  return "store";
}
