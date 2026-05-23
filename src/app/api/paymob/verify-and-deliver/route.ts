import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOrderEmail } from "@/lib/email/sendOrderEmail";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

/**
 * POST /api/paymob/verify-and-deliver
 * 
 * Verifies payment directly with Paymob API and delivers the product.
 * Fully supports cart purchases, single item orders, direct UUID lookups,
 * and numeric Paymob Order ID lookups.
 * Splits mixed purchases into separate dedicated transactional emails.
 */
export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[VERIFY][${requestId}] Verifying transaction...`);

  try {
    const { orderId, paymobOrderId, forceResend } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    console.log(`[VERIFY][${requestId}] Lookup ID: ${orderId} | ForceResend: ${forceResend}`);

    // ── 1. Resolve Orders by internal UUID, payment_id, or paymobOrderId ────────────
    let orders: any[] = [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);

    if (isUuid) {
      // Direct query by UUID
      const { data } = await supabaseAdmin.from("orders").select("*").eq("id", orderId);
      orders = data || [];
    }

    if (orders.length === 0) {
      // Query by Paymob payment_id (covers both classic order ID and intention ID)
      const { data } = await supabaseAdmin.from("orders").select("*").eq("payment_id", String(orderId));
      orders = data || [];
    }

    // Fallback: try paymobOrderId if different from orderId
    if (orders.length === 0 && paymobOrderId && paymobOrderId !== orderId) {
      const { data } = await supabaseAdmin.from("orders").select("*").eq("payment_id", String(paymobOrderId));
      orders = data || [];
    }

    // Fallback: if we still haven't found the order, and the lookup ID is numeric (not a UUID),
    // fetch the Paymob order details from the Paymob API to resolve the merchant_order_id.
    if (orders.length === 0 && !isUuid && /^\d+$/.test(String(orderId))) {
      try {
        const apiKey = process.env.PAYMOB_API_KEY;
        if (apiKey) {
          console.log(`[VERIFY][${requestId}] 🔍 Fetching Paymob Order from API to resolve Supabase UUID...`);
          const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey }),
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            const authToken = authData.token;
            
            const orderRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${orderId}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
              }
            });
            if (orderRes.ok) {
              const paymobOrder = await orderRes.json();
              if (paymobOrder) {
                const apiMerchantOrderId = paymobOrder.merchant_order_id;
                if (apiMerchantOrderId && apiMerchantOrderId.startsWith("store-")) {
                  const resolvedUuid = apiMerchantOrderId.replace("store-", "");
                  const isResolvedUuidValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resolvedUuid);
                  if (isResolvedUuidValid) {
                    console.log(`[VERIFY][${requestId}] ✅ Resolved Supabase UUID via Paymob Order API: ${resolvedUuid}`);
                    const { data } = await supabaseAdmin.from("orders").select("*").eq("id", resolvedUuid);
                    orders = data || [];
                  }
                }
              }
            }
          }
        }
      } catch (paymobApiErr) {
        console.error(`[VERIFY][${requestId}] ⚠️ Paymob Order API query failed during verification:`, paymobApiErr);
      }
    }

    // Also try fallback with paymobOrderId if still empty and numeric
    if (orders.length === 0 && paymobOrderId && paymobOrderId !== orderId && /^\d+$/.test(String(paymobOrderId))) {
      try {
        const apiKey = process.env.PAYMOB_API_KEY;
        if (apiKey) {
          console.log(`[VERIFY][${requestId}] 🔍 Fetching Paymob Order from API to resolve UUID via paymobOrderId: ${paymobOrderId}...`);
          const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: apiKey }),
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            const authToken = authData.token;
            
            const orderRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${paymobOrderId}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
              }
            });
            if (orderRes.ok) {
              const paymobOrder = await orderRes.json();
              if (paymobOrder) {
                const apiMerchantOrderId = paymobOrder.merchant_order_id;
                if (apiMerchantOrderId && apiMerchantOrderId.startsWith("store-")) {
                  const resolvedUuid = apiMerchantOrderId.replace("store-", "");
                  const isResolvedUuidValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resolvedUuid);
                  if (isResolvedUuidValid) {
                    console.log(`[VERIFY][${requestId}] ✅ Resolved Supabase UUID via Paymob Order API: ${resolvedUuid}`);
                    const { data } = await supabaseAdmin.from("orders").select("*").eq("id", resolvedUuid);
                    orders = data || [];
                  }
                }
              }
            }
          }
        }
      } catch (paymobApiErr) {
        console.error(`[VERIFY][${requestId}] ⚠️ Paymob Order API query failed during verification (paymobOrderId):`, paymobApiErr);
      }
    }

    if (orders.length === 0) {
      console.error(`[VERIFY][${requestId}] ❌ Order not found in DB for orderId=${orderId}, paymobOrderId=${paymobOrderId}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If multiple orders share the same payment_id (cart purchase), resolve all
    const baseOrder = orders[0];
    const customerEmail = baseOrder.customer_email;
    const customerName = baseOrder.customer_name || "عميلنا العزيز";
    const currency = baseOrder.currency || "EGP";

    // ── 2. Force Resend Email Bypass ──────────────────────────────
    if (forceResend) {
      console.log(`[VERIFY][${requestId}] 📧 Force resending premium delivery emails...`);
      
      const courseOrders: any[] = [];
      const digitalOrders: any[] = [];

      for (const order of orders) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("id, category")
          .eq("id", order.product_id)
          .single();

        const isCourse = 
          product?.category === "courses" || 
          product?.category === "الدورات التعليمية" || 
          product?.category === "الدورات التدريبية" ||
          order.product_title?.includes("دورة") || 
          order.product_title?.includes("كورس");

        if (isCourse) {
          courseOrders.push(order);
        } else {
          digitalOrders.push(order);
        }
      }

      let courseSuccess = true;
      let digitalSuccess = true;

      if (courseOrders.length > 0) {
        const res = await sendOrderEmail(courseOrders, customerEmail, customerName, currency);
        courseSuccess = res.success;
      }
      if (digitalOrders.length > 0) {
        const res = await sendOrderEmail(digitalOrders, customerEmail, customerName, currency);
        digitalSuccess = res.success;
      }

      if (courseSuccess && digitalSuccess) {
        return NextResponse.json({ success: true, message: "Emails resent successfully", alreadyDelivered: true });
      } else {
        return NextResponse.json({ success: false, error: "Failed to resend some emails" }, { status: 500 });
      }
    }

    // ── 3. Check if all matched orders are already completed ───────
    const allCompleted = orders.every(o => o.status === "completed");
    if (allCompleted) {
      console.log(`[VERIFY][${requestId}] ✅ All matching orders already marked as completed. Skipping verification.`);
      
      // Resolve details for success page representation
      const resolvedProducts = await resolvePurchasedProducts(orders);
      const firstProduct = resolvedProducts[0] || {};

      return NextResponse.json({ 
        success: true, 
        alreadyDelivered: true,
        productTitle: resolvedProducts.map(p => p.title).join(" + "),
        customerName,
        customerEmail,
        orderValue: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
        currency,
        downloadToken: baseOrder.id,
        downloadUrl: firstProduct.downloadUrl || null,
        category: firstProduct.category || null,
        tags: firstProduct.tags || null,
        products: resolvedProducts
      });
    }

    // ── 4. Verify Payment Status directly with Paymob API ───────────
    const paymobPaymentId = paymobOrderId || baseOrder.payment_id;
    if (!paymobPaymentId || paymobPaymentId === "PENDING") {
      console.warn(`[VERIFY][${requestId}] ⚠️ Payment not initiated or pending in DB`);
      return NextResponse.json({ error: "Payment not initiated yet", status: "pending" }, { status: 200 });
    }

    let isPaymentSuccessful = false;
    let transactionId = "";
    let amountCents = 0;

    // ── 4a. Try Intention API first (for wallet/unified checkout payments) ─────
    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const storedPaymentId = baseOrder.payment_id;

    if (secretKey && storedPaymentId) {
      try {
        console.log(`[VERIFY][${requestId}] 🔍 Trying Intention API with ID: ${storedPaymentId}...`);
        const intentionRes = await fetch(`https://accept.paymob.com/v1/intention/${storedPaymentId}/`, {
          method: "GET",
          headers: {
            "Authorization": `Token ${secretKey}`,
          },
        });

        if (intentionRes.ok) {
          const intentionData = await intentionRes.json();
          console.log(`[VERIFY][${requestId}] 📋 Intention status: ${intentionData.status}, confirmed: ${intentionData.confirmed}`);

          // Check if the intention has a successful payment
          if (intentionData.status === "PAID" || intentionData.confirmed === true) {
            isPaymentSuccessful = true;
            amountCents = intentionData.amount || intentionData.intention_detail?.amount || 0;
            transactionId = intentionData.transaction_id || intentionData.id || storedPaymentId;
            console.log(`[VERIFY][${requestId}] ✅ Intention API: Payment confirmed! TxnID: ${transactionId}`);
          }

          // Also check payment_methods for successful transactions
          if (!isPaymentSuccessful && intentionData.payment_methods) {
            for (const pm of intentionData.payment_methods) {
              if (pm.status === "PAID" || pm.confirmed === true) {
                isPaymentSuccessful = true;
                amountCents = pm.amount || intentionData.amount || 0;
                transactionId = pm.transaction_id || pm.id || storedPaymentId;
                console.log(`[VERIFY][${requestId}] ✅ Intention API (payment_method): Payment confirmed! TxnID: ${transactionId}`);
                break;
              }
            }
          }

          // Store the Paymob numeric order ID back to the order for future lookups
          if (isPaymentSuccessful && intentionData.order_id && intentionData.order_id !== storedPaymentId) {
            await supabaseAdmin
              .from("orders")
              .update({ payment_id: `${storedPaymentId}|${intentionData.order_id}` })
              .eq("id", baseOrder.id);
          }
        } else {
          console.log(`[VERIFY][${requestId}] ℹ️ Intention API returned ${intentionRes.status}, falling back to Classic API...`);
        }
      } catch (intentionErr) {
        console.warn(`[VERIFY][${requestId}] ⚠️ Intention API check failed:`, intentionErr);
      }
    }

    // ── 4b. Fallback: Classic ecommerce API (for card S2S payments) ─────
    if (!isPaymentSuccessful) {
      const apiKey = process.env.PAYMOB_API_KEY;
      if (!apiKey) throw new Error("PAYMOB_API_KEY is missing");

      const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });
      const authData = await authRes.json();
      const authToken = authData.token;

      // Determine the correct numeric Paymob Order ID.
      // If paymobOrderId is numeric, use it.
      // If orderId is numeric, use it.
      // If storedPaymentId contains both intention ID and order ID separated by | (from our API resolve update), extract it.
      // Otherwise, fallback to paymobPaymentId.
      let classicOrderId = "";
      if (paymobOrderId && /^\d+$/.test(String(paymobOrderId))) {
        classicOrderId = String(paymobOrderId);
      } else if (orderId && /^\d+$/.test(String(orderId))) {
        classicOrderId = String(orderId);
      } else if (storedPaymentId && String(storedPaymentId).includes("|")) {
        const parts = String(storedPaymentId).split("|");
        classicOrderId = parts[1] || parts[0];
      } else if (storedPaymentId && /^\d+$/.test(String(storedPaymentId))) {
        classicOrderId = String(storedPaymentId);
      } else {
        classicOrderId = paymobPaymentId;
      }
      
      console.log(`[VERIFY][${requestId}] 🔍 Checking Paymob Classic API Order: ${classicOrderId}...`);
      const txnRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${classicOrderId}`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
      });
      
      const paymobOrder = await txnRes.json();

      // Try to find a successful transaction in the order's transactions list
      const txnListRes = await fetch(`https://accept.paymob.com/api/ecommerce/orders/${classicOrderId}/transactions`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
      });

      if (txnListRes.ok) {
        const transactions = await txnListRes.json();
        if (Array.isArray(transactions)) {
          const successfulTxn = transactions.find((t: any) => t.success === true);
          if (successfulTxn) {
            isPaymentSuccessful = true;
            transactionId = successfulTxn.id;
            amountCents = successfulTxn.amount_cents;
            console.log(`[VERIFY][${requestId}] ✅ Classic API: Successful transaction found: ${transactionId}`);
          }
        }
      }

      if (!isPaymentSuccessful && paymobOrder.paid_amount_cents > 0) {
        isPaymentSuccessful = true;
        amountCents = paymobOrder.paid_amount_cents;
        transactionId = paymobOrder.id;
        console.log(`[VERIFY][${requestId}] ✅ Classic API: Order marked as paid: ${amountCents} cents`);
      }
    }

    // ── 4c. Final check: if order already completed in DB (webhook beat us) ────
    if (!isPaymentSuccessful && baseOrder.status === "completed") {
      isPaymentSuccessful = true;
      transactionId = baseOrder.payment_id || paymobPaymentId;
      amountCents = Math.round((baseOrder.amount || 0) * 100);
      console.log(`[VERIFY][${requestId}] ✅ Order already completed in DB (webhook processed it)`);
    }

    if (!isPaymentSuccessful) {
      console.warn(`[VERIFY][${requestId}] ⏳ Payment not yet confirmed by Paymob`);
      return NextResponse.json({ success: false, status: "pending", message: "Payment not confirmed" });
    }

    // ── 5. Fulfill and Complete All Matching Orders in DB ──────────
    console.log(`[VERIFY][${requestId}] 🔄 Updating all matching orders to completed...`);
    
    for (const order of orders) {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);

      if (updateError) {
        console.error(`[VERIFY][${requestId}] ❌ Update Error for order ${order.id}:`, updateError);
      } else {
        console.log(`[VERIFY][${requestId}] ✅ Order ${order.id} status updated to completed`);
        
        // Increment coupon count if used
        if (order.coupon_code) {
          try {
            const { data: cData } = await supabaseAdmin
              .from("coupons")
              .select("id, used_count")
              .eq("code", order.coupon_code.trim().toUpperCase())
              .maybeSingle();
            if (cData) {
              await supabaseAdmin
                .from("coupons")
                .update({ used_count: cData.used_count + 1 })
                .eq("id", cData.id);
              console.log(`[VERIFY][${requestId}] ✅ Successfully incremented usage for coupon: ${order.coupon_code}`);
            }
          } catch (couponErr) {
            console.error(`[VERIFY][${requestId}] ❌ Coupon increment exception:`, couponErr);
          }
        }
      }

      // Fetch Product Info for exact Category, tags, and Sales increment
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, title, sales, category, tags")
        .eq("id", order.product_id)
        .single();

      if (product) {
        // Increment sales count
        await supabaseAdmin
          .from("products")
          .update({ sales: (product.sales || 0) + 1 })
          .eq("id", product.id);
        console.log(`[VERIFY][${requestId}] 📈 Sales incremented for product: ${product.title}`);

        // LMS Auto-enrollment logic
        const isCourse = 
          product.category === "courses" || 
          product.category === "الدورات التعليمية" || 
          product.category === "الدورات التدريبية" ||
          order.product_title?.includes("دورة") || 
          order.product_title?.includes("كورس");

        if (isCourse) {
          console.log(`[VERIFY][${requestId}] 🎓 Dynamic Auto-enrollment triggered...`);
          try {
            const { getCoursesList, enrollUser } = await import("@/lib/coursesDb");
            const coursesList = await getCoursesList();
            
            const matchedCourse = coursesList.find(c => 
              c.title.toLowerCase().includes(order.product_title?.toLowerCase()) || 
              order.product_title?.toLowerCase().includes(c.title.toLowerCase())
            ) || coursesList[0];

            if (matchedCourse) {
              let userId = order.customer_id;
              if (!userId || userId === "anonymous") {
                const { data: profile } = await supabaseAdmin
                  .from("profiles")
                  .select("id")
                  .eq("email", customerEmail)
                  .maybeSingle();
                
                userId = profile?.id || "usr-student-" + Math.random().toString(36).substring(2, 11);
              }

              console.log(`[VERIFY][${requestId}] 🎓 Enrolling user ${userId} in course: ${matchedCourse.title}`);
              await enrollUser(userId, matchedCourse.id, {
                email: customerEmail,
                name: customerName
              });
              console.log(`[VERIFY][${requestId}] 🎓 Auto-enrollment completed successfully`);
            }
          } catch (enrollErr) {
            console.error(`[VERIFY][${requestId}] ❌ Auto-enrollment error:`, enrollErr);
          }
        }
      }
    }

    // ── 6. Deliver Premium Emails (Separated by category to improve deliverability and experience) ──
    try {
      const courseOrders: any[] = [];
      const digitalOrders: any[] = [];

      for (const order of orders) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("id, category")
          .eq("id", order.product_id)
          .single();

        const isCourse = 
          product?.category === "courses" || 
          product?.category === "الدورات التعليمية" || 
          product?.category === "الدورات التدريبية" ||
          order.product_title?.includes("دورة") || 
          order.product_title?.includes("كورس");

        if (isCourse) {
          courseOrders.push(order);
        } else {
          digitalOrders.push(order);
        }
      }

      console.log(`[VERIFY][${requestId}] 📧 Email Splitting: ${courseOrders.length} courses, ${digitalOrders.length} digital products.`);

      if (courseOrders.length > 0) {
        console.log(`[VERIFY][${requestId}] 🎓 Sending dedicated Course Activation email...`);
        const courseEmailResult = await sendOrderEmail(courseOrders, customerEmail, customerName, currency);
        if (courseEmailResult.success) {
          console.log(`[VERIFY][${requestId}] ✅ Dedicated course email delivered successfully`);
        } else {
          console.error(`[VERIFY][${requestId}] ⚠️ Dedicated course email failed:`, courseEmailResult.error);
        }
      }

      if (digitalOrders.length > 0) {
        console.log(`[VERIFY][${requestId}] ⬇️ Sending dedicated Digital Download email...`);
        const digitalEmailResult = await sendOrderEmail(digitalOrders, customerEmail, customerName, currency);
        if (digitalEmailResult.success) {
          console.log(`[VERIFY][${requestId}] ✅ Dedicated digital email delivered successfully`);
        } else {
          console.error(`[VERIFY][${requestId}] ⚠️ Dedicated digital email failed:`, digitalEmailResult.error);
        }
      }

    } catch (emailErr: any) {
      console.error(`[VERIFY][${requestId}] ❌ Safe catch: Exception during email delivery:`, emailErr.message);
    }

    // Resolve final data for Success Page representation
    const resolvedProducts = await resolvePurchasedProducts(orders);
    const firstProduct = resolvedProducts[0] || {};
    const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

    return NextResponse.json({ 
      success: true, 
      productTitle: resolvedProducts.map(p => p.title).join(" + "),
      customerName,
      customerEmail,
      orderValue: totalAmount,
      currency,
      downloadToken: baseOrder.id,
      downloadUrl: firstProduct.downloadUrl || null,
      category: firstProduct.category || null,
      tags: firstProduct.tags || null,
      products: resolvedProducts
    });

  } catch (error: any) {
    console.error(`[VERIFY][${requestId}] 💥 ERROR:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Resolve DB product details, categories, tags and secure download URLs for success page
 */
async function resolvePurchasedProducts(orders: any[]): Promise<any[]> {
  const resolved = [];
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

      if (isCourse) {
        // Look up detailed course stats
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("slug, image_url, duration_hours, lessons_count")
          .or(`title.ilike.%${product.title}%,slug.eq.${product.id}`)
          .maybeSingle();

        resolved.push({
          id: product.id,
          title: product.title,
          category: product.category,
          tags: product.tags || [],
          isCourse,
          hasDownload: false,
          downloadUrl: null,
          orderId: order.id,
          slug: course?.slug || "n8n-masterclass",
          image_url: course?.image_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
          lessons_count: course?.lessons_count || 12,
          duration_hours: course?.duration_hours || 14
        });
      } else {
        const fileUrl = product.file_url || "";
        const fileExtension = fileUrl.split("?")[0].split(".").pop()?.toUpperCase() || "ZIP";

        resolved.push({
          id: product.id,
          title: product.title,
          category: product.category,
          tags: product.tags || [],
          isCourse: false,
          hasDownload: true,
          downloadUrl: `/api/download?token=${order.id}`,
          orderId: order.id,
          fileName: product.title.replace(/\s+/g, "_") + "." + fileExtension.toLowerCase(),
          fileType: fileExtension,
          fileSize: product.tags?.find((t: string) => t.startsWith("size:"))?.replace("size:", "") || "18.4 MB",
          remainingDownloads: "غير محدود (تحميل مدى الحياة)"
        });
      }
    } else {
      const isCourse = order.product_title?.includes("دورة") || order.product_title?.includes("كورس");
      
      if (isCourse) {
        resolved.push({
          id: order.product_id,
          title: order.product_title,
          category: "courses",
          tags: [],
          isCourse: true,
          hasDownload: false,
          downloadUrl: null,
          orderId: order.id,
          slug: "n8n-masterclass",
          image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
          lessons_count: 12,
          duration_hours: 14
        });
      } else {
        resolved.push({
          id: order.product_id,
          title: order.product_title,
          category: "digital",
          tags: [],
          isCourse: false,
          hasDownload: true,
          downloadUrl: `/api/download?token=${order.id}`,
          orderId: order.id,
          fileName: order.product_title?.replace(/\s+/g, "_") + ".zip",
          fileType: "ZIP",
          fileSize: "12.5 MB",
          remainingDownloads: "غير محدود"
        });
      }
    }
  }
  return resolved;
}
