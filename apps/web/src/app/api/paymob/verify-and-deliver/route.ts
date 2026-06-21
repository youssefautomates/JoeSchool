import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendOrderEmail } from "@/lib/email/sendOrderEmail";
import { getOrCreateUser } from "@/lib/authHelpers";

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
                // Try A: merchant_order_id match
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

                // Try B: email-based matching fallback (for Unified Checkout where merchant_order_id is null)
                if (orders.length === 0) {
                  const email = paymobOrder.shipping_data?.email || paymobOrder.billing_data?.email;
                  if (email) {
                    console.log(`[VERIFY][${requestId}] 🔍 Searching DB for most recent pending order for email: ${email}...`);
                    const { data: matchedOrders } = await supabaseAdmin
                      .from("orders")
                      .select("*")
                      .eq("customer_email", email.toLowerCase().trim())
                      .eq("status", "pending")
                      .order("created_at", { ascending: false })
                      .limit(1);
                    
                    orders = matchedOrders || [];
                    if (orders.length > 0) {
                      console.log(`[VERIFY][${requestId}] ✅ Resolved Supabase UUID via email matching: ${orders[0].id}`);
                    }
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
                // Try A: merchant_order_id match
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

                // Try B: email-based matching fallback (for Unified Checkout where merchant_order_id is null)
                if (orders.length === 0) {
                  const email = paymobOrder.shipping_data?.email || paymobOrder.billing_data?.email;
                  if (email) {
                    console.log(`[VERIFY][${requestId}] 🔍 Searching DB for most recent pending order for email: ${email}...`);
                    const { data: matchedOrders } = await supabaseAdmin
                      .from("orders")
                      .select("*")
                      .eq("customer_email", email.toLowerCase().trim())
                      .eq("status", "pending")
                      .order("created_at", { ascending: false })
                      .limit(1);
                    
                    orders = matchedOrders || [];
                    if (orders.length > 0) {
                      console.log(`[VERIFY][${requestId}] ✅ Resolved Supabase UUID via email matching: ${orders[0].id}`);
                    }
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

    // Resolve purchased products early to avoid ReferenceError
    const resolvedProducts = await resolvePurchasedProducts(orders);
    const firstProduct = resolvedProducts[0] || {};

    // ── 3. Check if all matched orders are already completed ───────
    const allCompleted = orders.every(o => o.status === "completed");
    if (allCompleted) {
      console.log(`[VERIFY][${requestId}] ✅ All matching orders already marked as completed. Checking account linkage...`);
      
      let resolvedUserId = baseOrder.customer_id;
      let explicitPassword = baseOrder.checkout_password || "";
      let isNewStudent = false;
      let temporaryPassword: string | null = null;
      
      // Auto-retry account creation if customer_id is missing
      if (!resolvedUserId) {
        console.log(`[VERIFY][${requestId}] 🔄 Customer ID is missing for completed order. Retrying account creation...`);
        try {
          const userAccount = await getOrCreateUser(customerEmail, customerName, explicitPassword || undefined);
          resolvedUserId = userAccount.userId;
          if (userAccount.isNew) {
            isNewStudent = true;
            temporaryPassword = userAccount.password || null;
          }
          
          // Update orders with the newly resolved customer_id
          await supabaseAdmin
            .from("orders")
            .update({ customer_id: resolvedUserId })
            .eq("id", baseOrder.id);
            
          console.log(`[VERIFY][${requestId}] ✅ Account resolved & linked during success page retry: ${resolvedUserId}`);
          
          // Enroll the student
          for (const order of orders) {
            const isCourse = order.product_id?.startsWith("course-") || 
                             order.product_title?.includes("دورة") || 
                             order.product_title?.includes("كورس");
            if (isCourse) {
              const { getCoursesList, enrollUser } = await import("@/lib/coursesDb");
              const coursesList = await getCoursesList();
              const matchedCourse = coursesList.find(c => 
                c.title.toLowerCase().includes(order.product_title?.toLowerCase()) || 
                order.product_title?.toLowerCase().includes(c.title.toLowerCase())
              ) || coursesList[0];
              
              if (matchedCourse) {
                await enrollUser(resolvedUserId, matchedCourse.id, {
                  email: customerEmail,
                  name: customerName
                });
                console.log(`[VERIFY][${requestId}] ✅ Enrolled student during success page retry: ${matchedCourse.title}`);
              }
            }
          }
        } catch (err: any) {
          console.error(`[VERIFY][${requestId}] ❌ Account creation retry failed:`, err.message || err);
        }
      }

      // Check if this completed user account was created as part of this checkout transaction
      if (resolvedUserId && !isNewStudent) {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId);
          if (!userError && userData?.user) {
            const user = userData.user;
            const userCreatedAt = new Date(user.created_at).getTime();
            const orderCreatedAt = new Date(baseOrder.created_at).getTime();
            
            // If user was created within 60s of order creation, it's a new student
            if (userCreatedAt >= orderCreatedAt - 60000) {
              isNewStudent = true;
              temporaryPassword = explicitPassword || user.user_metadata?.clear_password || null;
            }
          }
        } catch (e: any) {
          console.error(`[VERIFY][${requestId}] Error checking existing user timestamp:`, e.message);
        }
      }

      // Generate an auto-login action link using Supabase Admin SDK
      let loginLink: string | null = null;
      if (resolvedUserId) {
        try {
          const siteUrl = new URL(req.url).origin;
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: customerEmail.toLowerCase().trim(),
            options: {
              redirectTo: `${siteUrl}/auth/callback?next=/dashboard`
            }
          });
          if (!linkError && linkData?.properties?.action_link) {
            loginLink = linkData.properties.action_link;
            console.log(`[VERIFY][${requestId}] Generated magic login link successfully during completed check`);
          }
        } catch (e: any) {
          console.error(`[VERIFY][${requestId}] Magic link generation exception:`, e.message);
        }
      }

      // Resolve details for success page representation
      const originalAmountUsd = orders.reduce((sum, o) => sum + (Number(o.original_amount_usd) || 0), 0);
      const chargedAmountEgp = orders.reduce((sum, o) => sum + (Number(o.charged_amount_egp) || 0), 0);
      const exchangeRate = baseOrder.exchange_rate || null;

      return NextResponse.json({ 
        success: true, 
        alreadyDelivered: true,
        productTitle: resolvedProducts.map(p => p.title).join(" + "),
        customerName,
        customerEmail,
        orderValue: currency === "USD" ? originalAmountUsd : chargedAmountEgp,
        currency,
        downloadToken: baseOrder.id,
        downloadUrl: firstProduct.downloadUrl || null,
        category: firstProduct.category || null,
        tags: firstProduct.tags || null,
        products: resolvedProducts,
        original_amount_usd: currency === "USD" ? originalAmountUsd : null,
        charged_amount_egp: chargedAmountEgp,
        exchange_rate: exchangeRate,
        loginLink: loginLink,
        isNewStudent: isNewStudent,
        temporaryPassword: temporaryPassword
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
    // Resolve student account credentials if courses are present in the batch
    let containsCourses = false;
    let explicitPassword = "";

    for (const order of orders) {
      if (order.checkout_password) {
        explicitPassword = order.checkout_password;
      }
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
      if (isCourse) containsCourses = true;
    }

    let resolvedUserId: string | null = null;
    let resolvedCredentials: { email: string; password?: string } | undefined;
    let resolvedIsNewStudent = false;
    let resolvedTemporaryPassword: string | null = null;

    if (containsCourses) {
      console.log(`[VERIFY][${requestId}] Course detected in purchase batch. Resolving user account...`);
      try {
        const userAccount = await getOrCreateUser(customerEmail, customerName, explicitPassword || undefined);
        resolvedUserId = userAccount.userId;
        if (userAccount.isNew) {
          resolvedCredentials = {
            email: customerEmail,
            password: userAccount.password
          };
          resolvedIsNewStudent = true;
          resolvedTemporaryPassword = userAccount.password || null;
          console.log(`[VERIFY][${requestId}] New student account created. Credentials set successfully.`);
        } else {
          console.log(`[VERIFY][${requestId}] Existing student account resolved. No credentials sent.`);
        }
      } catch (err: any) {
        console.error(`[VERIFY][${requestId}] ❌ Error in getOrCreateUser:`, err.message || err);
        // Send Telegram Admin Alert
        try {
          const { sendTelegramMessage } = await import("@/lib/telegram");
          await sendTelegramMessage(`⚠️ تنبيه: فشل إنشاء حساب الطالب تلقائياً للبريد (${customerEmail}) بعد نجاح الدفع.\nاسم الطالب: ${customerName}\nالخطأ: ${err.message || err}\nتم حفظ الطلب كـ "مكتمل" مع تعليق إنشاء الحساب وتأجيل التفعيل حتى زيارته لصفحة النجاح أو تسجيل دخوله لاحقاً.`);
        } catch (teleErr) {
          console.error(`[VERIFY][${requestId}] Failed to send Telegram alert:`, teleErr);
        }
        resolvedUserId = null;
      }
    }

    console.log(`[VERIFY][${requestId}] 🔄 Updating all matching orders to completed...`);
    
    for (const order of orders) {
      const updatePayload: any = { status: "completed" };
      if (resolvedUserId) {
        updatePayload.customer_id = resolvedUserId;
      }

      const { data: updatedOrders, error: updateError } = await supabaseAdmin
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .neq("status", "completed")
        .select();

      if (updateError) {
        console.error(`[VERIFY][${requestId}] ❌ Update Error for order ${order.id}:`, updateError);
      } else {
        const wasUpdated = updatedOrders && updatedOrders.length > 0;
        if (wasUpdated) {
          console.log(`[VERIFY][${requestId}] ✅ Order ${order.id} status updated to completed`);
          
          // Send Telegram Notification
          try {
            const { sendOrderTelegramNotification } = await import("@/lib/telegram");
            const fullOrderInfo = {
              ...order,
              ...updatePayload
            };
            await sendOrderTelegramNotification(fullOrderInfo);
          } catch (teleErr) {
            console.error(`[VERIFY][${requestId}] ❌ Telegram notification error:`, teleErr);
          }
        } else {
          console.log(`[VERIFY][${requestId}] ⚠️ Order ${order.id} was already completed. Notification skipped.`);
        }
        
        // Log timeline event for payment success
        try {
          await supabaseAdmin.from("analytics_events").insert({
            event_name: "payment_success",
            product_id: order.product_id,
            product_title: order.product_title,
            metadata: {
              order_id: order.id,
              description_ar: "تم تأكيد عملية الدفع بنجاح",
              description_en: "Payment confirmed successfully"
            }
          });
        } catch (analyticsErr) {
          console.error("Failed to log payment_success event:", analyticsErr);
        }
        
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
              const userId = resolvedUserId || order.customer_id;

              if (userId) {
                console.log(`[VERIFY][${requestId}] 🎓 Enrolling user ${userId} in course: ${matchedCourse.title}`);
                await enrollUser(userId, matchedCourse.id, {
                  email: customerEmail,
                  name: customerName
                });
                console.log(`[VERIFY][${requestId}] 🎓 Auto-enrollment completed successfully`);

                // Log timeline event for course enrollment
                try {
                  await supabaseAdmin.from("analytics_events").insert({
                    event_name: "course_enrolled",
                    product_id: order.product_id,
                    product_title: order.product_title,
                    user_id: userId,
                    metadata: {
                      order_id: order.id,
                      course_id: matchedCourse.id,
                      description_ar: `تم تفعيل دورة (${matchedCourse.title}) للطالب بنجاح`,
                      description_en: `Course (${matchedCourse.title}) activated for student successfully`
                    }
                  });
                } catch (analyticsErr) {
                  console.error("Failed to log course_enrolled event:", analyticsErr);
                }
              } else {
                console.warn(`[VERIFY][${requestId}] ⚠️ Skipping LMS enrollment because no valid user ID exists yet (creation failed).`);
              }
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
        const courseEmailResult = await sendOrderEmail(courseOrders, customerEmail, customerName, currency, resolvedCredentials);
        if (courseEmailResult.success) {
          console.log(`[VERIFY][${requestId}] ✅ Dedicated course email delivered successfully`);
          
          // Log timeline event for course email sent
          for (const order of courseOrders) {
            try {
              await supabaseAdmin.from("analytics_events").insert({
                event_name: "email_sent",
                product_id: order.product_id,
                product_title: order.product_title,
                metadata: {
                  order_id: order.id,
                  email_type: "course_activation",
                  recipient: customerEmail,
                  description_ar: `تم إرسال إيميل تفعيل الكورس بنجاح إلى (${customerEmail})`,
                  description_en: `Course activation email sent successfully to (${customerEmail})`
                }
              });
            } catch (err) {}
          }
        } else {
          console.error(`[VERIFY][${requestId}] ⚠️ Dedicated course email failed:`, courseEmailResult.error);
        }
      }

      if (digitalOrders.length > 0) {
        console.log(`[VERIFY][${requestId}] ⬇️ Sending dedicated Digital Download email...`);
        const digitalEmailResult = await sendOrderEmail(digitalOrders, customerEmail, customerName, currency);
        if (digitalEmailResult.success) {
          console.log(`[VERIFY][${requestId}] ✅ Dedicated digital email delivered successfully`);

          // Log timeline event for digital product email sent
          for (const order of digitalOrders) {
            try {
              await supabaseAdmin.from("analytics_events").insert({
                event_name: "email_sent",
                product_id: order.product_id,
                product_title: order.product_title,
                metadata: {
                  order_id: order.id,
                  email_type: "digital_download",
                  recipient: customerEmail,
                  description_ar: `تم إرسال إيميل تحميل المنتج الرقمي بنجاح إلى (${customerEmail})`,
                  description_en: `Digital download email sent successfully to (${customerEmail})`
                }
              });
            } catch (err) {}
          }
        } else {
          console.error(`[VERIFY][${requestId}] ⚠️ Dedicated digital email failed:`, digitalEmailResult.error);
        }
      }

    } catch (emailErr: any) {
      console.error(`[VERIFY][${requestId}] ❌ Safe catch: Exception during email delivery:`, emailErr.message);
    }

    const originalAmountUsd = orders.reduce((sum, o) => sum + (Number(o.original_amount_usd) || 0), 0);
    const chargedAmountEgp = orders.reduce((sum, o) => sum + (Number(o.charged_amount_egp) || 0), 0);
    const exchangeRate = baseOrder.exchange_rate || null;

    // Dispatch Unified Server-Side Meta CAPI Purchase event in parallel
    try {
      const orderValue = currency === "USD" ? originalAmountUsd : chargedAmountEgp;
      const productIds = resolvedProducts.map(p => String(p.id));
      const productTitle = resolvedProducts.map(p => p.title).join(" + ");
      
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
      const clientUserAgent = req.headers.get("user-agent") || "";
      
      // Fire backend CAPI conversion event asynchronously
      import("@/lib/metaCapiServer").then(({ trackServerPurchase }) => {
        trackServerPurchase({
          transactionId: baseOrder.id,
          price: Number(orderValue) || 0,
          currency,
          productTitle,
          productIds,
          customerEmail: customerEmail.toLowerCase().trim(),
          clientIp: clientIp.split(",")[0].trim(),
          clientUserAgent,
          eventSourceUrl: req.url
        }).catch(err => console.error("[VERIFY] Server CAPI trigger promise rejection:", err));
      });
    } catch (capiErr: any) {
      console.error("[VERIFY] Failed to invoke Server-Side CAPI tracking:", capiErr.message);
    }

    // Generate an auto-login action link using Supabase Admin SDK
    let loginLink: string | null = null;
    if (resolvedUserId) {
      try {
        const siteUrl = new URL(req.url).origin;
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: customerEmail.toLowerCase().trim(),
          options: {
            redirectTo: `${siteUrl}/auth/callback?next=/dashboard`
          }
        });
        if (!linkError && linkData?.properties?.action_link) {
          loginLink = linkData.properties.action_link;
          console.log(`[VERIFY][${requestId}] Generated magic login link successfully`);
        }
      } catch (e: any) {
        console.error(`[VERIFY][${requestId}] Magic link generation exception:`, e.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      productTitle: resolvedProducts.map(p => p.title).join(" + "),
      customerName,
      customerEmail,
      orderValue: currency === "USD" ? originalAmountUsd : chargedAmountEgp,
      currency,
      downloadToken: baseOrder.id,
      downloadUrl: firstProduct.downloadUrl || null,
      category: firstProduct.category || null,
      tags: firstProduct.tags || null,
      products: resolvedProducts,
      original_amount_usd: currency === "USD" ? originalAmountUsd : null,
      charged_amount_egp: chargedAmountEgp,
      exchange_rate: exchangeRate,
      loginLink: loginLink,
      isNewStudent: resolvedIsNewStudent,
      temporaryPassword: resolvedTemporaryPassword
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
          .select("id, slug, image_url, duration_hours, lessons_count")
          .or(`title.ilike.%${product.title}%,slug.eq.${product.id}`)
          .maybeSingle();

        let firstLessonSlug = null;
        if (course) {
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
          duration_hours: course?.duration_hours || 14,
          firstLessonSlug: firstLessonSlug
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
      // 1. Check if it's a course in the courses table directly using order.product_id
      const { data: dbCourse } = await supabaseAdmin
        .from("courses")
        .select("id, title, category, image_url, duration_hours, lessons_count, slug, tags")
        .eq("id", order.product_id)
        .maybeSingle();

      if (dbCourse) {
        let firstLessonSlug = null;
        const { data: modules } = await supabaseAdmin
          .from("course_modules")
          .select("id")
          .eq("course_id", dbCourse.id)
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

        resolved.push({
          id: dbCourse.id,
          title: dbCourse.title,
          category: dbCourse.category || "courses",
          tags: dbCourse.tags || [],
          isCourse: true,
          hasDownload: false,
          downloadUrl: null,
          orderId: order.id,
          slug: dbCourse.slug || "n8n-masterclass",
          image_url: dbCourse.image_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
          lessons_count: dbCourse.lessons_count || 12,
          duration_hours: dbCourse.duration_hours || 14,
          firstLessonSlug: firstLessonSlug
        });
      } else {
        const isCourse = order.product_title?.includes("دورة") || order.product_title?.includes("كورس");
        
        if (isCourse) {
          let firstLessonSlug = null;
          const { data: modules } = await supabaseAdmin
            .from("course_modules")
            .select("id")
            .eq("course_id", order.product_id || "course-n8n-masterclass")
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
            duration_hours: 14,
            firstLessonSlug: firstLessonSlug
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
  }
  return resolved;
}
