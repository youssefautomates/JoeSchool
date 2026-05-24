import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

import { headers } from "next/headers";
import { resolveUserCurrency, resolveProductPrice, getUSDtoEGPExchangeRate } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[BACKEND_REQUEST_BODY] Received:", JSON.stringify(body, null, 2));
    const { amount, email, firstName, lastName, phone, productId, paymentMethod, cardData, couponCode } = body;

    // --- Geolocation Currency Resolver ---
    const headersList = await headers();
    const userCurrency = await resolveUserCurrency(headersList);
    console.log(`[PAYMOB_INITIATE] Server Resolved Currency: ${userCurrency}`);

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

    // Prevent price spoofing from the client side
    const clientAmount = parseFloat(amount);
    if (Math.abs(clientAmount - expectedPriceEGP) > 5) { // 5 EGP threshold for rounding safety
      throw new Error(`محاولة تلاعب بالسعر! السعر الفعلي هو ${expectedPriceEGP} EGP`);
    }

    const amountCents = Math.round(expectedPriceEGP * 100);

    const cleanPhoneDigits = (phone || "").replace(/\D/g, "");
    const safePhone = (cleanPhoneDigits.length < 8) ? "+201000000000" : (phone.startsWith("+") ? phone : `+${phone}`);

    // 3. Create Order in Supabase locally first (Logging immutable snapshot details)
    const dbOrder = await createOrder({
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: safePhone,
      product_id: productId,
      product_title: dbItem.title,
      amount: userCurrency === "USD" ? Number(originalPriceBase.toFixed(2)) : expectedPriceEGP,
      currency: userCurrency,
      status: "pending",
      payment_id: "PENDING", 
      coupon_code: couponCode ? couponCode.trim().toUpperCase() : undefined,
      original_amount_usd: userCurrency === "USD" ? Number(originalPriceBase.toFixed(2)) : null,
      charged_amount_egp: expectedPriceEGP,
      exchange_rate: userCurrency === "USD" ? exchangeRate : null
    });

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
            original_amount: userCurrency === "USD" ? Number(originalPriceBase.toFixed(2)) : expectedPriceEGP,
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
    // CARD FLOW: USE INTENTION API & UNIFIED CHECKOUT REDIRECT (NO PORT 8445 BLOCKS)
    // ==========================================
    if (paymentMethod === "card") {
      if (!secretKey) throw new Error("PAYMOB_SECRET_KEY is missing for Card Intention API.");
      console.log(`[CARD_INTEGRATION] Selected Card Integration: ${envCardIntegrationId}`);
      
      const intentionResponse = await fetch("https://accept.paymob.com/v1/intention/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Token ${secretKey}`
        },
        body: JSON.stringify({
          amount: amountCents,
          currency: "EGP",
          payment_methods: [envCardIntegrationId],
          merchant_order_id: `store-${dbOrder.id}`,
          items: [{ name: dbItem.title, amount: amountCents, description: "Digital Purchase", quantity: 1 }],
          billing_data: billingData,
          extras: { 
            supabase_order_id: dbOrder.id, 
            source: "store",
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? Number(originalPriceBase.toFixed(2)) : expectedPriceEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });

      const intentionData = await intentionResponse.json();
      if (!intentionResponse.ok) throw new Error(`Card Intention failed: ${JSON.stringify(intentionData)}`);

      await supabase.from("orders").update({ payment_id: intentionData.id?.toString() }).eq("id", dbOrder.id);
      
      return NextResponse.json({
        checkoutUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${intentionData.client_secret}`,
        orderId: dbOrder.id
      });
    }

    throw new Error("Invalid Payment Method");
  } catch (error: any) {
    console.error("[PAYMOB_ERROR]", error);
    return NextResponse.json({ error: "عذراً، حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى أو التواصل مع الدعم." }, { status: 500 });
  }
}
