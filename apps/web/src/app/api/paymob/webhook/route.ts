import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPaymobHmac } from "@/lib/paymob";
import { sendOrderEmail } from "@/lib/email/sendOrderEmail";
import { getOrCreateUser } from "@/lib/authHelpers";

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
function getCountryNameByCode(code: string | null): string {
  if (!code || code === "Unknown") return "Unknown";
  const codeMap: Record<string, string> = {
    "EG": "Egypt",
    "US": "United States",
    "SA": "Saudi Arabia",
    "AE": "United Arab Emirates",
    "KW": "Kuwait",
    "QA": "Qatar",
    "OM": "Oman",
    "BH": "Bahrain",
    "JO": "Jordan",
    "LB": "Lebanon",
    "GB": "United Kingdom",
    "CA": "Canada",
    "DE": "Germany",
    "FR": "France"
  };
  return codeMap[code.toUpperCase()] || code.toUpperCase();
}

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
    if (source === "youssefautomates") {
      console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 JoeSchool payment — passing through`);
      return NextResponse.json({ success: true, source: "youssefautomates", message: "Handled by JoeSchool" });
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
        const billingData = transaction.payment_key_claims?.billing_data;
        const customerEmail = billingData?.email || orderToUpdate.customer_email;
        const customerName = billingData?.first_name && billingData?.last_name
          ? `${billingData.first_name} ${billingData.last_name}`.trim()
          : (billingData?.first_name || orderToUpdate.customer_name || "عميلنا العزيز");
        const currency = orderToUpdate.currency || "EGP";

        // Query all sibling orders sharing the same payment_id (Multi-item cart purchase support)
        const { data: siblingOrders } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("payment_id", orderToUpdate.payment_id || paymobOrderId);

        const allOrders = siblingOrders && siblingOrders.length > 0 ? siblingOrders : [orderToUpdate];
        console.log(`[PAYMOB_WEBHOOK][${requestId}] Found ${allOrders.length} orders associated with this transaction.`);

        // Resolve student account credentials if courses are present in the batch
        let containsCourses = false;
        let explicitPassword = "";

        for (const ord of allOrders) {
          if (ord.checkout_password) {
            explicitPassword = ord.checkout_password;
          }
          // Fetch category to check if it's a course
          let isCourse = ord.product_id?.startsWith("course-") || false;
          try {
            if (!isCourse) {
              const { data: prodItem } = await supabaseAdmin
                .from("products")
                .select("category")
                .eq("id", ord.product_id)
                .maybeSingle();
              if (prodItem) {
                isCourse = 
                  prodItem.category === "courses" || 
                  prodItem.category === "الدورات التعليمية" || 
                  prodItem.category === "الدورات التدريبية" ||
                  ord.product_title?.includes("دورة") || 
                  ord.product_title?.includes("كورس");
              } else {
                const { data: courseItem } = await supabaseAdmin
                  .from("courses")
                  .select("category")
                  .eq("id", ord.product_id)
                  .maybeSingle();
                if (courseItem) isCourse = true;
              }
            }
          } catch (e) {}
          if (isCourse) containsCourses = true;
        }

        let resolvedUserId: string | null = null;
        let resolvedCredentials: { email: string; password?: string } | undefined;

        if (containsCourses) {
          console.log(`[PAYMOB_WEBHOOK][${requestId}] Course detected. Resolving user account...`);
          try {
            const userAccount = await getOrCreateUser(customerEmail, customerName, explicitPassword || undefined);
            resolvedUserId = userAccount.userId;
            if (userAccount.password) {
              resolvedCredentials = {
                email: customerEmail,
                password: userAccount.password
              };
              if (userAccount.isNew) {
                console.log(`[PAYMOB_WEBHOOK][${requestId}] New student account created. Credentials set successfully.`);
              } else {
                console.log(`[PAYMOB_WEBHOOK][${requestId}] Existing student account resolved with credentials from metadata.`);
              }
            } else if (explicitPassword) {
              resolvedCredentials = {
                email: customerEmail,
                password: explicitPassword
              };
              console.log(`[PAYMOB_WEBHOOK][${requestId}] Student account credentials set (checkout password present).`);
            } else {
              resolvedCredentials = undefined;
              console.log(`[PAYMOB_WEBHOOK][${requestId}] Existing student account resolved. No explicit password found.`);
            }
          } catch (err: any) {
            console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Error in getOrCreateUser:`, err.message || err);
            // Send Telegram Admin Alert
            try {
              const { sendTelegramMessage } = await import("@/lib/telegram");
              await sendTelegramMessage(`⚠️ تنبيه: فشل إنشاء حساب الطالب تلقائياً للبريد (${customerEmail}) في webhook بعد نجاح الدفع.\nاسم الطالب: ${customerName}\nالخطأ: ${err.message || err}\nتم حفظ الطلب كـ "مكتمل" مع تأجيل إنشاء الحساب وتأجيل التفعيل حتى زيارته لصفحة النجاح أو تسجيل دخوله لاحقاً.`);
            } catch (teleErr) {
              console.error(`[PAYMOB_WEBHOOK][${requestId}] Failed to send Telegram alert:`, teleErr);
            }
            resolvedUserId = null;
          }
        }

        // Process status changes, LMS enrollments, and sales increments for all matching orders
        let hasJustCompleted = false;
        for (const ord of allOrders) {
          if (ord.status === "completed") {
            console.log(`[PAYMOB_WEBHOOK][${requestId}] ⚠️ Order ${ord.id} is already completed. Skipping status update.`);
            continue;
          }

          const billingCountry = transaction.payment_key_claims?.billing_data?.country || "Unknown";
          const payMethod = transaction.source_data?.sub_type || transaction.source_data?.type || "Card";

          console.log(`[PAYMOB_WEBHOOK][${requestId}] 🔄 Completing order ${ord.id} in database (Country: ${billingCountry}, Method: ${payMethod})...`);
          
          const updatePayload: any = { 
            status: "completed", 
            payment_id: paymobOrderId,
            country: billingCountry,
            country_code: billingCountry,
            country_name: getCountryNameByCode(billingCountry),
            payment_method: payMethod
          };
          if (resolvedUserId) {
            updatePayload.customer_id = resolvedUserId;
          }

          const { data: updatedOrders, error: updErr } = await supabaseAdmin
            .from("orders")
            .update(updatePayload)
            .eq("id", ord.id)
            .neq("status", "completed")
            .select();

          if (updErr) {
            console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Database update error for ${ord.id}:`, updErr);
            continue;
          }

          const wasUpdated = updatedOrders && updatedOrders.length > 0;
          if (wasUpdated) {
            hasJustCompleted = true;
            // Send Telegram Notification
            try {
              const { sendOrderTelegramNotification } = await import("@/lib/telegram");
              const fullOrderInfo = {
                ...ord,
                ...updatePayload
              };
              await sendOrderTelegramNotification(fullOrderInfo);
            } catch (teleErr) {
              console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Telegram notification error:`, teleErr);
            }
          } else {
            console.log(`[PAYMOB_WEBHOOK][${requestId}] ⚠️ Order ${ord.id} was already completed. Notification skipped.`);
          }

          // If a coupon code was used, increment its usage count securely
          if (ord.coupon_code) {
            try {
              const { data: cData } = await supabaseAdmin
                .from("coupons")
                .select("id, used_count")
                .eq("code", ord.coupon_code.trim().toUpperCase())
                .maybeSingle();
              if (cData) {
                await supabaseAdmin
                  .from("coupons")
                  .update({ used_count: cData.used_count + 1 })
                  .eq("id", cData.id);
                console.log(`[PAYMOB_WEBHOOK][${requestId}] ✅ Successfully incremented usage for coupon: ${ord.coupon_code}`);
              }
            } catch (couponErr) {
              console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Coupon increment exception:`, couponErr);
            }
          }

          // Fetch item metadata (product or course) for sales count increment and category checks
          let itemMetadata: { title: string; sales: number; category: string } | null = null;
          let isCourse = ord.product_id?.startsWith("course-") || false;

          try {
            if (isCourse) {
              const { data: courseItem } = await supabaseAdmin
                .from("courses")
                .select("title, sales_count, category")
                .eq("id", ord.product_id)
                .maybeSingle();
              if (courseItem) {
                itemMetadata = {
                  title: courseItem.title,
                  sales: courseItem.sales_count || 0,
                  category: courseItem.category || "courses"
                };
              }
            } else {
              const { data: prodItem } = await supabaseAdmin
                .from("products")
                .select("title, sales, category")
                .eq("id", ord.product_id)
                .maybeSingle();
              if (prodItem) {
                itemMetadata = {
                  title: prodItem.title,
                  sales: prodItem.sales || 0,
                  category: prodItem.category || "products"
                };
              } else {
                // Fallback query to courses
                const { data: courseItem } = await supabaseAdmin
                  .from("courses")
                  .select("title, sales_count, category")
                  .eq("id", ord.product_id)
                  .maybeSingle();
                if (courseItem) {
                  itemMetadata = {
                    title: courseItem.title,
                    sales: courseItem.sales_count || 0,
                    category: courseItem.category || "courses"
                  };
                  isCourse = true;
                }
              }
            }
          } catch (metadataErr) {
            console.error(`[PAYMOB_WEBHOOK][${requestId}] Error fetching item metadata:`, metadataErr);
          }

          // If still not definitively course but title matches course signature
          if (!isCourse && itemMetadata) {
            isCourse = 
              itemMetadata.category === "courses" || 
              itemMetadata.category === "الدورات التعليمية" || 
              itemMetadata.category === "الدورات التدريبية" ||
              ord.product_title?.includes("دورة") || 
              ord.product_title?.includes("كورس");
          }

          if (itemMetadata) {
            // Increment sales count in respective table
            try {
              if (isCourse) {
                await supabaseAdmin
                  .from("courses")
                  .update({ sales_count: (itemMetadata.sales || 0) + 1 })
                  .eq("id", ord.product_id);
              } else {
                await supabaseAdmin
                  .from("products")
                  .update({ sales: (itemMetadata.sales || 0) + 1 })
                  .eq("id", ord.product_id);
              }
              console.log(`[PAYMOB_WEBHOOK][${requestId}] 📈 Sales incremented for: ${itemMetadata.title}`);
            } catch (salesErr) {
              console.error(`[PAYMOB_WEBHOOK][${requestId}] Error incrementing sales:`, salesErr);
            }
          }

          if (isCourse) {
            console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 Auto-enrolling student in LMS Course: ${ord.product_title}...`);
            try {
              const { getCoursesList, enrollUser } = await import("@/lib/coursesDb");
              const coursesList = await getCoursesList();
              const matchedCourse = coursesList.find(c => 
                c.id === ord.product_id ||
                c.title.toLowerCase().includes(ord.product_title?.toLowerCase()) || 
                ord.product_title?.toLowerCase().includes(c.title.toLowerCase())
              ) || coursesList[0];

              if (matchedCourse) {
                const userId = resolvedUserId || ord.customer_id;
                
                if (userId) {
                  console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 Enrolling user ${userId} in course: ${matchedCourse.title}`);
                  await enrollUser(userId, matchedCourse.id, {
                    email: customerEmail,
                    name: customerName
                  });
                  console.log(`[PAYMOB_WEBHOOK][${requestId}] 🎓 Auto-enrollment successful`);
                } else {
                  console.warn(`[PAYMOB_WEBHOOK][${requestId}] ⚠️ Skipping LMS enrollment because no valid user ID exists yet (creation failed).`);
                }
              }
            } catch (enrollErr) {
              console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Auto-enrollment error:`, enrollErr);
            }
          }
        }

        // ── Meta CAPI Purchase Trigger ─────────────────────────────
        if (hasJustCompleted) {
          console.log(`[PAYMOB_WEBHOOK][${requestId}] 🚀 Triggering Server-Side Meta CAPI Purchase event...`);
          try {
            const baseOrder = allOrders[0];
            const originalAmountUsd = allOrders.reduce((sum, o) => sum + (Number(o.original_amount_usd) || 0), 0);
            const chargedAmountEgp = allOrders.reduce((sum, o) => sum + (Number(o.charged_amount_egp) || 0), 0);
            const fallbackAmount = allOrders.reduce((sum, o) => sum + (Number(o.final_price) || Number(o.amount) || 0), 0);
            const orderValue = currency === "USD"
              ? (originalAmountUsd || fallbackAmount)
              : (chargedAmountEgp || fallbackAmount);
            const productIds = allOrders.map(o => String(o.product_id));
            const productTitle = allOrders.map(o => o.product_title || "منتج").join(" + ");
            const clientIp = baseOrder.ip_address || "127.0.0.1";
            
            // Try to resolve user agent from analytics_events
            let clientUserAgent = "Server Side Trigger";
            try {
              const { data: eventData } = await supabaseAdmin
                .from("analytics_events")
                .select("user_agent")
                .eq("event_name", "order_created")
                .eq("metadata->>order_id", baseOrder.id)
                .maybeSingle();
              if (eventData?.user_agent) {
                clientUserAgent = eventData.user_agent;
              }
            } catch (uaErr) {}

            console.log(`[PAYMOB_WEBHOOK][${requestId}] [META_PURCHASE_SERVER] transactionId=${baseOrder.id} | value=${orderValue} | currency=${currency} | orderIds=${allOrders.map(o => o.id).join(',')} | (chargedEgp=${chargedAmountEgp}, usd=${originalAmountUsd}, fallback=${fallbackAmount})`);

            const { trackServerPurchase } = await import("@/lib/meta-capi");
            // Do not await, fire asynchronously so it doesn't block the webhook response
            trackServerPurchase({
              transactionId: baseOrder.id,
              price: Number(orderValue) || 0,
              currency,
              productTitle,
              productIds,
              customerEmail: customerEmail.toLowerCase().trim(),
              clientIp: clientIp.split(",")[0].trim(),
              clientUserAgent,
              eventSourceUrl: `https://joeschool.com/checkout/success?id=${baseOrder.id}`
            }).then(() => console.log(`[PAYMOB_WEBHOOK][${requestId}] ✅ Server-Side Meta CAPI Purchase event dispatched successfully!`))
              .catch(capiErr => console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Meta CAPI trigger failed:`, capiErr.message || capiErr));
          } catch (capiErr: any) {
            console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Meta CAPI trigger block failed:`, capiErr.message || capiErr);
          }
        }

        // ── 5. Safe Decoupled Email Trigger (Resend Service) ─────────
        try {
          console.log(`[PAYMOB_WEBHOOK][${requestId}] 📧 Calling centralized sendOrderEmail...`);
          const emailResult = await sendOrderEmail(allOrders, customerEmail, customerName, currency, resolvedCredentials);
          
          if (emailResult.success) {
            console.log(`[PAYMOB_WEBHOOK][${requestId}] ✅ Order delivery email successfully sent`);
          } else {
            console.error(`[PAYMOB_WEBHOOK][${requestId}] ⚠️ Order delivery email failed:`, emailResult.error);
          }
        } catch (emailErr: any) {
          console.error(`[PAYMOB_WEBHOOK][${requestId}] ❌ Safe catch: Exception during email delivery:`, emailErr.message);
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
    if (merchantOrderId.startsWith("youssefautomates-")) return "youssefautomates";
  }

  const extraDesc = transaction.extra_description;
  if (typeof extraDesc === "string") {
    if (extraDesc.includes("store")) return "store";
    if (extraDesc.includes("youssefautomates")) return "youssefautomates";
  }

  return "store";
}
