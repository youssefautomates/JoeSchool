import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";
import { createClient } from "@supabase/supabase-js";
import { getKV } from "@/lib/kv";
import { getOrCreateUser } from "@/lib/authHelpers";


const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { headers } from "next/headers";
import { resolveUserCurrency, resolveProductPrice, getUSDtoEGPExchangeRate } from "@/lib/pricing";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[BACKEND_REQUEST_BODY] Received:", JSON.stringify(body, null, 2));
    const { amount, email, firstName, lastName, phone, productId, paymentMethod, cardData, couponCode, password, instapayScreenshotUrl } = body;

    // --- Geolocation Currency Resolver & Tracking ---
    let headersList: any;
    try {
      headersList = await headers();
    } catch {
      // Mock headers map for external execution context (runner)
      headersList = {
        get: (name: string) => {
          const mockHeaders: Record<string, string> = {
            "x-vercel-ip-country": "EG",
            "x-vercel-ip-city": "Cairo",
            "x-vercel-ip-timezone": "Africa/Cairo",
            "x-real-ip": "127.0.0.1",
            "accept-language": "en-US",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          };
          return mockHeaders[name.toLowerCase()] || null;
        }
      };
    }
    const userCurrency = await resolveUserCurrency(headersList);
    console.log(`[PAYMOB_INITIATE] Server Resolved Currency: ${userCurrency}`);

    const country = headersList.get("x-vercel-ip-country") || headersList.get("cf-ipcountry") || "Unknown";
    const city = headersList.get("x-vercel-ip-city") || headersList.get("cf-ipcity") || "Unknown";
    const timezone = headersList.get("x-vercel-ip-timezone") || headersList.get("cf-timezone") || "UTC";
    const ipAddress = headersList.get("x-real-ip") || headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "Unknown";
    const language = headersList.get("accept-language")?.split(",")[0]?.split(";")[0] || "Unknown";

    const userAgent = headersList.get("user-agent") || "";
    let deviceType = "Desktop";
    let os = "Unknown";
    let browser = "Unknown";

    if (userAgent) {
      const ua = userAgent.toLowerCase();
      if (ua.includes("tablet") || ua.includes("ipad") || (ua.includes("android") && !ua.includes("mobile"))) {
        deviceType = "Tablet";
      } else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
        deviceType = "Mobile";
      }

      if (ua.includes("windows")) os = "Windows";
      else if (ua.includes("macintosh") || ua.includes("mac os") || ua.includes("os x")) os = "MacOS";
      else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) os = "iOS";
      else if (ua.includes("android")) os = "Android";
      else if (ua.includes("linux")) os = "Linux";

      if (ua.includes("edg/")) browser = "Edge";
      else if (ua.includes("chrome") || ua.includes("crios")) browser = "Chrome";
      else if (ua.includes("firefox") || ua.includes("fxios")) browser = "Firefox";
      else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")) browser = "Safari";
      else if (ua.includes("opera") || ua.includes("opr/")) browser = "Opera";
    }

    // --- Env Validation ---
    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const apiKey = process.env.PAYMOB_API_KEY;
    const publicKey = process.env.NEXT_PUBLIC_PAYMOB_PUBLIC_KEY || process.env.PAYMOB_PUBLIC_KEY;
    
    // Read the specific integration IDs from env
    const rawCardId = process.env.PAYMOB_CARD_INTEGRATION_ID;
    const rawWalletId = process.env.PAYMOB_WALLET_INTEGRATION_ID;
    const envCardIntegrationId = parseInt(rawCardId || "", 10);
    const envWalletIntegrationId = parseInt(rawWalletId || "", 10);

    console.log("[PAYMOB_INITIATE] Payment Method:", paymentMethod);
    console.log("[PAYMOB_ENV_DEBUG] rawCardId:", rawCardId, "| parsed:", envCardIntegrationId, "| rawWalletId:", rawWalletId, "| parsed:", envWalletIntegrationId);

    // Only validate the integration ID needed for the selected method
    if (paymentMethod === "card" && isNaN(envCardIntegrationId)) {
      throw new Error("Missing or invalid PAYMOB_CARD_INTEGRATION_ID in .env.local");
    }
    if (paymentMethod === "wallet" && isNaN(envWalletIntegrationId)) {
      throw new Error("Missing or invalid PAYMOB_WALLET_INTEGRATION_ID in .env.local");
    }

    // 1. Fetch Item (Product or Course) Details
    let dbItem: any = null;
    let isCourseItem = productId.startsWith("course-");

    if (isCourseItem) {
      const { data: course } = await supabase
        .from("courses")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (course) {
        dbItem = course;
      }
    }

    if (!dbItem) {
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (product) {
        dbItem = product;
      }
    }

    if (!dbItem) {
      const { data: bundle } = await supabase
        .from("bundles")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (bundle) {
        dbItem = bundle;
      }
    }

    // Secondary fallback to courses
    if (!dbItem) {
      const { data: course } = await supabase
        .from("courses")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (course) {
        dbItem = course;
        isCourseItem = true;
      }
    }

    if (!dbItem) throw new Error("المحتوى المطلوب غير متوفر حالياً في قاعدة البيانات");

    // Check for existing enrollment to prevent double purchase
    if (isCourseItem && email) {
      const { data: existingEnrollment } = await supabaseAdmin
        .from("enrollments")
        .select("id")
        .eq("course_id", dbItem.id)
        .eq("user_email", email.toLowerCase().trim())
        .maybeSingle();

      if (existingEnrollment) {
        throw new Error("لقد قمت بالاشتراك في هذه الدورة مسبقاً بنفس البريد الإلكتروني.");
      }
    }

    // 2. Dual Pricing Secure Resolver Layer
    const resolvedPrice = resolveProductPrice(dbItem, userCurrency);
    const exchangeRate = await getUSDtoEGPExchangeRate();
    let expectedPriceBase = resolvedPrice.price; 
    let expectedPriceEGP = userCurrency === "USD" 
      ? Math.round(expectedPriceBase * exchangeRate)
      : expectedPriceBase;

    console.log(`[PAYMOB_INITIATE] resolvedPriceBase: ${expectedPriceBase} ${userCurrency} | exchangeRate: ${exchangeRate} | expectedPriceEGP: ${expectedPriceEGP} EGP`);

    let originalPriceBase = expectedPriceBase;

    if (couponCode) {
      const upperCode = couponCode.trim().toUpperCase();
      // Query the database for the coupon
      const { data: dbCoupon, error: couponErr } = await supabaseAdmin
         .from("coupons")
         .select("*")
         .eq("code", upperCode)
         .maybeSingle();

      if (couponErr || !dbCoupon) {
        throw new Error("كود الخصم المدخل غير صالح أو غير متوفر");
      }

      // Check expiry
      if (dbCoupon.expiry_date && new Date(dbCoupon.expiry_date) < new Date()) {
        throw new Error("عذراً، كود الخصم هذا قد انتهت صلاحيته");
      }

      // Check max uses
      if (dbCoupon.used_count >= dbCoupon.max_uses) {
        throw new Error("عذراً، كود الخصم هذا وصل للحد الأقصى من الاستخدام");
      }

      // Check product restriction
      if (dbCoupon.applies_to_type !== "all") {
        const isMatch = dbCoupon.applies_to_id === productId || 
                        `course-${dbCoupon.applies_to_id}` === productId ||
                        productId.replace("course-", "") === dbCoupon.applies_to_id;
        if (!isMatch) {
          throw new Error("كود الخصم هذا غير صالح للمنتج المختار");
        }
      }

      // Apply coupon to base price and recalculate final EGP amount
      const discountedBase = expectedPriceBase * (1 - dbCoupon.discount_percent / 100);
      originalPriceBase = discountedBase;
      expectedPriceEGP = userCurrency === "USD"
        ? Math.round(discountedBase * exchangeRate)
        : Math.round(discountedBase);

      console.log(`[PAYMOB_INITIATE] Applied coupon: ${upperCode} (-${dbCoupon.discount_percent}%) | Discounted expectedPriceEGP: ${expectedPriceEGP}`);
    }

    // Fetch global fee settings
    const MARKETING_KEY = "marketing_settings";
    const defaultSettings = {
      globalGatewayFeeEnabled: true,
      globalGatewayFeePercentage: 3.00
    };
    const savedSettings: any = await getKV(MARKETING_KEY);
    const settings = savedSettings ? { ...defaultSettings, ...savedSettings } : defaultSettings;
    const globalFeeEnabled = settings.globalGatewayFeeEnabled !== false;
    const globalFeePercentage = typeof settings.globalGatewayFeePercentage === "number" ? settings.globalGatewayFeePercentage : 3.00;

    const isFeeActive = userCurrency === "EGP" && paymentMethod !== "instapay" && globalFeeEnabled && (dbItem.enable_gateway_fee !== false) && expectedPriceEGP > 0;
    const gatewayFeeEGP = isFeeActive ? Math.ceil(expectedPriceEGP * (globalFeePercentage / 100)) : 0;
    const finalPriceEGP = expectedPriceEGP + gatewayFeeEGP;

    const gatewayFeeUSD = isFeeActive ? Number((originalPriceBase * (globalFeePercentage / 100)).toFixed(2)) : 0;
    const finalPriceUSD = originalPriceBase + gatewayFeeUSD;

    // Prevent price spoofing from the client side
    const clientAmount = parseFloat(amount);
    if (Math.abs(clientAmount - finalPriceEGP) > 5) { // 5 EGP threshold for rounding safety
      throw new Error(`محاولة تلاعب بالسعر! السعر الفعلي هو ${finalPriceEGP} EGP`);
    }

    const amountCents = Math.round(finalPriceEGP * 100);

    const cleanPhoneDigits = (phone || "").replace(/\D/g, "");
    const safePhone = (cleanPhoneDigits.length < 8) ? "+201000000000" : (phone.startsWith("+") ? phone : `+${phone}`);

    const year = new Date().getFullYear();
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invoiceId = `JS-${year}-${uniqueSuffix}`;

    const dbOrder = await createOrder({
      customer_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      customer_email: email,
      customer_phone: safePhone,
      product_id: productId,
      product_title: dbItem.title,
      amount: userCurrency === "USD" ? Number(finalPriceUSD.toFixed(2)) : finalPriceEGP,
      currency: userCurrency,
      status: "pending",
      payment_id: paymentMethod === "instapay" ? (instapayScreenshotUrl || "PENDING_INSTAPAY") : "PENDING", 
      coupon_code: couponCode ? couponCode.trim().toUpperCase() : undefined,
      original_amount_usd: userCurrency === "USD" ? Number(finalPriceUSD.toFixed(2)) : null,
      charged_amount_egp: finalPriceEGP,
      exchange_rate: userCurrency === "USD" ? exchangeRate : null,
      gateway_fee_amount: userCurrency === "USD" ? gatewayFeeUSD : gatewayFeeEGP,
      gateway_fee_enabled: isFeeActive,
      subtotal_price: userCurrency === "USD" ? Number(originalPriceBase.toFixed(2)) : expectedPriceEGP,
      final_price: userCurrency === "USD" ? Number(finalPriceUSD.toFixed(2)) : finalPriceEGP,
      gateway_fee_percentage: isFeeActive ? globalFeePercentage : 0,
      country,
      country_code: country,
      country_name: getCountryNameByCode(country),
      invoice_id: invoiceId,
      city,
      timezone,
      ip_address: ipAddress,
      payment_provider: paymentMethod === "instapay" ? "instapay" : "paymob",
      payment_method: paymentMethod || "card",
      device_type: deviceType,
      browser,
      os,
      language,
      checkout_password: password || null
    } as any);

    // Log timeline event for order creation
    try {
      await supabaseAdmin.from("analytics_events").insert({
        event_name: "order_created",
        product_id: productId,
        product_title: dbItem.title,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          order_id: dbOrder.id,
          description_ar: "تم إنشاء الطلب بنجاح بانتظار الدفع",
          description_en: "Order created successfully, awaiting payment"
        }
      });
    } catch (analyticsErr) {
      console.error("Failed to log order_created event to analytics_events:", analyticsErr);
    }


    if (expectedPriceEGP === 0) {
      // 100% Free Promo Code Flow!
      // Update order status to completed directly
      await supabaseAdmin.from("orders").update({ status: "completed", payment_id: "FREE_COUPON" }).eq("id", dbOrder.id);

      // Increment coupon count if used
      if (couponCode) {
        try {
          const { data: cData } = await supabaseAdmin
            .from("coupons")
            .select("id, used_count")
            .eq("code", couponCode.trim().toUpperCase())
            .maybeSingle();
          if (cData) {
            await supabaseAdmin
              .from("coupons")
              .update({ used_count: cData.used_count + 1 })
              .eq("id", cData.id);
            console.log(`[PAYMOB_INITIATE] ✅ Successfully incremented usage for coupon: ${couponCode}`);
          }
        } catch (couponErr) {
          console.error(`[PAYMOB_INITIATE] ❌ Coupon increment exception:`, couponErr);
        }
      }

      // Increment sales count
      await supabaseAdmin
        .from("products")
        .update({ sales: (dbItem.sales || 0) + 1 })
        .eq("id", dbItem.id);
      console.log(`[PAYMOB_INITIATE] 📈 Sales incremented for product: ${dbItem.title}`);

      // LMS Auto-enrollment logic if it's a course
      let resolvedUserId: string | null = null;
      let resolvedCredentials: { email: string; password?: string } | undefined;

      if (isCourseItem) {
        console.log(`[PAYMOB_INITIATE] Course detected in free batch. Resolving user account...`);
        try {
          const userAccount = await getOrCreateUser(email, `${firstName} ${lastName}`, password || undefined);
          resolvedUserId = userAccount.userId;
          
          // Update the order row in the database with the resolved customer_id
          await supabaseAdmin
            .from("orders")
            .update({ customer_id: resolvedUserId })
            .eq("id", dbOrder.id);

          if (userAccount.isNew && password) {
            resolvedCredentials = {
              email: email,
              password: password
            };
          }
        } catch (err: any) {
          console.error(`[PAYMOB_INITIATE] ❌ Error in getOrCreateUser:`, err.message || err);
        }

        console.log(`[PAYMOB_INITIATE] 🎓 Dynamic Auto-enrollment triggered...`);
        try {
          const { getCoursesList, enrollUser } = await import("@/lib/coursesDb");
          const coursesList = await getCoursesList();
          
          const matchedCourse = coursesList.find(c => 
            c.title.toLowerCase().includes(dbItem.title?.toLowerCase()) || 
            dbItem.title?.toLowerCase().includes(c.title.toLowerCase())
          ) || coursesList[0];

          if (matchedCourse) {
            const userId = resolvedUserId || dbOrder.customer_id || "usr-student-" + Math.random().toString(36).substring(2, 11);

            console.log(`[PAYMOB_INITIATE] 🎓 Enrolling user ${userId} in course: ${matchedCourse.title}`);
            await enrollUser(userId, matchedCourse.id, {
              email: email,
              name: `${firstName} ${lastName}`
            });
            console.log(`[PAYMOB_INITIATE] 🎓 Auto-enrollment completed successfully`);
          }
        } catch (enrollErr) {
          console.error(`[PAYMOB_INITIATE] ❌ Auto-enrollment error:`, enrollErr);
        }
      }

      // Deliver Emails
      try {
        const { sendOrderEmail } = await import("@/lib/email/sendOrderEmail");
        const orderForEmail = {
          ...dbOrder,
          status: "completed",
          payment_id: "FREE_COUPON"
        };
        console.log(`[PAYMOB_INITIATE] 📧 Sending FREE order activation email to: ${email}`);
        await sendOrderEmail([orderForEmail], email, `${firstName} ${lastName}`, userCurrency, resolvedCredentials);
      } catch (emailErr: any) {
        console.error(`[PAYMOB_INITIATE] ❌ Exception during FREE email delivery:`, emailErr.message);
      }

      return NextResponse.json({
        success: true,
        orderId: dbOrder.id
      });
    }

    const safeFirstName = (firstName || "Test").replace(/[^a-zA-Z\u0600-\u06FF]/g, "");
    const safeLastName = (lastName || "User").replace(/[^a-zA-Z\u0600-\u06FF]/g, "");
    const safeEmail = email || "test@example.com";

    const billingData = {
      apartment: "NA", 
      email: safeEmail, 
      floor: "NA", 
      first_name: safeFirstName || "Test", 
      street: "NA", 
      building: "NA", 
      phone_number: safePhone, 
      shipping_method: "NA", 
      postal_code: "NA", 
      city: "Cairo", 
      country: "EG", 
      last_name: safeLastName || "User", 
      state: "NA"
    };

    // ==========================================
    // WALLET FLOW: USE INTENTION API & UNIFIED CHECKOUT REDIRECT
    // ==========================================
    if (paymentMethod === "wallet") {
      if (!secretKey) throw new Error("PAYMOB_SECRET_KEY is missing for Wallet Intention API.");
      console.log(`[WALLET_INTEGRATION] Selected Wallet Integration: ${envWalletIntegrationId}`);
      
      const intentionResponse = await fetch("https://accept.paymob.com/v1/intention/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Token ${secretKey}`
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: "EGP",
          payment_methods: [envWalletIntegrationId],
          merchant_order_id: `store-${dbOrder.id}`,
          items: [{ name: dbItem.title, amount: amountCents, description: "Digital Purchase", quantity: 1 }],
          billing_data: billingData,
          extras: { 
            supabase_order_id: dbOrder.id, 
            source: "store",
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? Number(finalPriceUSD.toFixed(2)) : finalPriceEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });

      const intentionData = await intentionResponse.json();
      if (!intentionResponse.ok) throw new Error(`Wallet Intention failed: ${JSON.stringify(intentionData)}`);

      await supabase.from("orders").update({ payment_id: intentionData.id?.toString() }).eq("id", dbOrder.id);
      
      return NextResponse.json({
        checkoutUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${intentionData.client_secret}`,
        orderId: dbOrder.id
      });
    }

    // ==========================================
    // CARD FLOW: SERVER-TO-SERVER (CLASSIC API)
    // ==========================================
    if (paymentMethod === "card") {
      if (!apiKey) throw new Error("PAYMOB_API_KEY is missing for Card S2S Flow.");
      if (!cardData) throw new Error("Card data is required for inline processing.");
      
      console.log(`[CARD_INTEGRATION] Processing Inline Card S2S: ${envCardIntegrationId}`);

      // 1. Auth
      const authResponse = await fetch("https://accept.paymob.com/api/auth/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });
      if (!authResponse.ok) throw new Error(`Auth failed`);
      const authToken = (await authResponse.json()).token;

      // 2. Order
      const orderResponse = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: "false",
          amount_cents: amountCents.toString(),
          currency: "EGP",
          items: [],
          merchant_order_id: `store-${dbOrder.id}`,
          extras: { 
            source: "store", 
            supabase_order_id: dbOrder.id,
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? Number(finalPriceUSD.toFixed(2)) : finalPriceEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });
      if (!orderResponse.ok) throw new Error(`Order failed`);
      const paymobOrderId = (await orderResponse.json()).id;

      await supabase.from("orders").update({ payment_id: String(paymobOrderId) }).eq("id", dbOrder.id);

      // 3. Payment Key
      const paymentKeyResponse = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: amountCents.toString(), 
          expiration: 3600,
          order_id: paymobOrderId.toString(),
          billing_data: billingData,
          currency: "EGP",
          integration_id: envCardIntegrationId,
        }),
      });
      if (!paymentKeyResponse.ok) throw new Error(`Payment key failed`);
      const paymentKey = (await paymentKeyResponse.json()).token;

      // Paymob API expects "CARD" as the subtype for all credit/debit cards
      const detectedSubtype = "CARD";
      const cleanCard = cardData.cardNumber.replace(/\s/g, '');

      const cardName = cardData.cardHolder?.trim() || `${firstName} ${lastName}`;
      if (!cardName) {
        throw new Error("No cardholder name provided from frontend");
      }

      const payPayload = {
        source: {
          identifier: cleanCard,
          subtype: detectedSubtype,
          cvn: cardData.cvv,
          expiry_month: cardData.expiry.split("/")[0],
          expiry_year: cardData.expiry.split("/")[1],
          sourceholder_name: cardName
        },
        payment_token: paymentKey,
        billing: billingData
      };

      console.log("[FINAL_PAYLOAD] cardName:", cardName, "| Submitting to Paymob:", JSON.stringify({ ...payPayload, source: { ...payPayload.source, identifier: "MASKED", cvn: "***" } }, null, 2));
      
      const payResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payPayload),
      });
      
      const payData = await payResponse.json();
      
      // Full diagnostic logging
      const redirectUrl = payData.redirection_url || payData.redirect_url || payData.iframe_redirection_url;
      console.log("[CARD_INTEGRATION] FULL Pay Response:", JSON.stringify({
        status: payResponse.status,
        success: payData.success,
        pending: payData.pending,
        is_3d_secure: payData.is_3d_secure,
        redirection_url: payData.redirection_url,
        redirect_url: payData.redirect_url,
        iframe_redirection_url: payData.iframe_redirection_url,
        data_message: payData.data?.message,
        txn_response_code: payData.data?.txn_response_code,
        message: payData.message,
        id: payData.id,
      }, null, 2));

      if (!payResponse.ok && !redirectUrl) {
        throw new Error(`Payment processing failed: ${payData.message || JSON.stringify(payData)}`);
      }

      // If it requires 3DS OTP redirect
      if (redirectUrl) {
        return NextResponse.json({ checkoutUrl: redirectUrl, orderId: dbOrder.id });
      }

      // Direct Success
      if (payData.success) {
        return NextResponse.json({ success: true, checkoutUrl: `/checkout/success?order_id=${dbOrder.id}` });
      }

      // Pending transaction (some cards return pending=true before 3DS)
      if (payData.pending) {
        return NextResponse.json({ success: true, checkoutUrl: `/checkout/success?order_id=${dbOrder.id}&pending=true` });
      }

      // Extract the real decline reason
      const declineReason = payData.data?.message 
        || payData.data?.txn_response_code 
        || payData.message 
        || payData.detail 
        || (payData.data ? JSON.stringify(payData.data) : 'Unknown error');
      throw new Error(`Payment declined: ${declineReason}`);
    }

    // ==========================================
    // INSTAPAY FLOW: MANUAL TRANSFER RECORDING
    // ==========================================
    if (paymentMethod === "instapay") {
      return NextResponse.json({
        success: true,
        orderId: dbOrder.id
      });
    }

    throw new Error("Invalid Payment Method");
  } catch (error: any) {
    console.error("[PAYMOB_ERROR]", error);
    return NextResponse.json({ error: `عذراً، حدث خطأ أثناء معالجة الطلب: ${error.message || error}` }, { status: 500 });
  }
}
