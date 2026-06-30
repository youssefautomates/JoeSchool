import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import { getOrCreateUser } from "@/lib/authHelpers";
import { resolveUserCurrency, resolveProductPrice, getUSDtoEGPExchangeRate } from "@/lib/pricing";
import { getKV } from "@/lib/kv";


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
    console.log("[CART_BACKEND_REQUEST_BODY] Received:", JSON.stringify(body, null, 2));
    const { amount, email, firstName, lastName, phone, items, paymentMethod, cardData, password, instapayScreenshotUrl, walletNumber, checkoutEventId } = body;

    // --- Geolocation Currency Resolver & Tracking ---
    const headersList = await headers();
    const userCurrency = await resolveUserCurrency(headersList);
    console.log(`[PAYMOB_CART_INITIATE] Server Resolved Currency: ${userCurrency}`);

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

    console.log("[PAYMOB_CART_INITIATE] Payment Method:", paymentMethod);
    console.log("[PAYMOB_CART_ENV_DEBUG] rawCardId:", rawCardId, "| parsed:", envCardIntegrationId, "| rawWalletId:", rawWalletId, "| parsed:", envWalletIntegrationId);

    // Only validate the integration ID needed for the selected method
    if (paymentMethod === "card" && isNaN(envCardIntegrationId)) {
      throw new Error("Missing or invalid PAYMOB_CARD_INTEGRATION_ID in .env.local");
    }
    if (paymentMethod === "wallet" && isNaN(envWalletIntegrationId)) {
      throw new Error("Missing or invalid PAYMOB_WALLET_INTEGRATION_ID in .env.local");
    }

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Fetch global settings
    const MARKETING_KEY = "marketing_settings";
    const defaultSettings = {
      globalGatewayFeeEnabled: true,
      globalGatewayFeePercentage: 3.00
    };
    const savedSettings: any = await getKV(MARKETING_KEY);
    const settings = savedSettings ? { ...defaultSettings, ...savedSettings } : defaultSettings;
    const globalFeeEnabled = settings.globalGatewayFeeEnabled !== false;
    const globalFeePercentage = typeof settings.globalGatewayFeePercentage === "number" ? settings.globalGatewayFeePercentage : 3.00;

    let totalExpectedEGP = 0;
    const verifiedItems: any[] = [];
    const exchangeRate = await getUSDtoEGPExchangeRate();

    for (const item of items) {
      let dbItem: any = null;
      let isCourseItem = item.id.startsWith("course-");

      if (isCourseItem) {
        const { data: course } = await supabase
          .from("courses")
          .select("*")
          .eq("id", item.id)
          .maybeSingle();
        if (course) dbItem = course;
      }

      if (!dbItem) {
        const { data: product } = await supabase
          .from("products")
          .select("*")
          .eq("id", item.id)
          .maybeSingle();
        if (product) dbItem = product;
      }

      if (!dbItem) {
        const { data: bundle } = await supabase
          .from("bundles")
          .select("*")
          .eq("id", item.id)
          .maybeSingle();
        if (bundle) dbItem = bundle;
      }

      // Secondary fallback to courses
      if (!dbItem) {
        const { data: course } = await supabase
          .from("courses")
          .select("*")
          .eq("id", item.id)
          .maybeSingle();
        if (course) {
          dbItem = course;
          isCourseItem = true;
        }
      }

      if (!dbItem) {
        throw new Error(`المحتوى المطلق (${item.title}) غير متوفر حالياً في قاعدة البيانات`);
      }

      const resolvedPrice = resolveProductPrice(dbItem, userCurrency);
      const itemPriceUSD = userCurrency === "USD" ? resolvedPrice.price : null;
      const itemEGPPrice = userCurrency === "USD"
        ? Math.round(resolvedPrice.price * exchangeRate)
        : resolvedPrice.price;

      // Surcharge gateway fee recovery calculation
      const isFeeActive = userCurrency === "EGP" && paymentMethod !== "instapay" && globalFeeEnabled && (dbItem.enable_gateway_fee !== false) && itemEGPPrice > 0;
      const gatewayFeeEGP = isFeeActive ? Math.ceil(itemEGPPrice * (globalFeePercentage / 100) + 3) : 0;
      const itemFinalEGPPrice = itemEGPPrice + gatewayFeeEGP;

      const itemFeeUSD = isFeeActive ? Number((resolvedPrice.price * (globalFeePercentage / 100)).toFixed(2)) : 0;
      const itemFinalUSDPrice = resolvedPrice.price + itemFeeUSD;

      totalExpectedEGP += itemFinalEGPPrice;
      verifiedItems.push({
        id: item.id,
        title: dbItem.title,
        priceUSD: itemPriceUSD,
        priceEGP: itemEGPPrice,
        gatewayFeeEGP,
        gatewayFeeUSD: itemFeeUSD,
        gatewayFeeEnabled: isFeeActive,
        finalUSDPrice: itemFinalUSDPrice,
        finalEGPPrice: itemFinalEGPPrice
      });
    }

    console.log(`[PAYMOB_CART_INITIATE] Server calculated totalExpectedEGP: ${totalExpectedEGP} EGP | Client submitted: ${amount} EGP`);

    // Prevent price spoofing from client side
    const clientAmount = parseFloat(amount);
    if (Math.abs(clientAmount - totalExpectedEGP) > 10) { // 10 EGP threshold for rounding safe across multiple products
      throw new Error(`محاولة تلاعب بأسعار السلة! الإجمالي الفعلي هو ${totalExpectedEGP} EGP`);
    }

    const amountCents = Math.round(totalExpectedEGP * 100);

    const cleanPhoneDigits = (phone || "").replace(/\D/g, "");
    const safePhone = (cleanPhoneDigits.length < 8) ? "+201000000000" : (phone.startsWith("+") ? phone : `+${phone}`);

    const year = new Date().getFullYear();
    const uniqueSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invoiceId = `JS-${year}-${uniqueSuffix}`;

    if (checkoutEventId) {
      try {
        const { trackServerInitiateCheckout } = await import("@/lib/meta-capi");
        trackServerInitiateCheckout({
          checkoutEventId,
          price: totalExpectedEGP,
          currency: "EGP",
          productTitle: verifiedItems.map(i => i.title).join(" + "),
          productIds: verifiedItems.map(i => i.id),
          customerEmail: email,
          clientIp: ipAddress,
          clientUserAgent: userAgent,
          eventSourceUrl: `https://joeschool.com/checkout/cart`
        }).then(() => console.log(`[PAYMOB_CART_INITIATE] ✅ Server CAPI InitiateCheckout dispatched (eventId: ${checkoutEventId})`))
          .catch(e => console.error("[PAYMOB_CART_INITIATE] ❌ CAPI Exception:", e));
      } catch (capiErr) {}
    }

    // 2. Create Orders in Supabase locally first (One per item - Logging snapshots)
    const dbOrders = [];
    for (const item of verifiedItems) {
      const order = await createOrder({
        customer_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        customer_email: email,
        customer_phone: safePhone,
        product_id: item.id,
        product_title: item.title,
        amount: userCurrency === "USD" ? item.finalUSDPrice : item.finalEGPPrice,
        currency: userCurrency,
        status: "pending",
        payment_id: paymentMethod === "instapay" ? (instapayScreenshotUrl || "PENDING_INSTAPAY") : "PENDING", 
        original_amount_usd: userCurrency === "USD" ? item.finalUSDPrice : null,
        charged_amount_egp: item.finalEGPPrice,
        exchange_rate: userCurrency === "USD" ? exchangeRate : null,
        gateway_fee_amount: userCurrency === "USD" ? item.gatewayFeeUSD : item.gatewayFeeEGP,
        gateway_fee_enabled: item.gatewayFeeEnabled,
        subtotal_price: userCurrency === "USD" ? item.priceUSD : item.priceEGP,
        final_price: userCurrency === "USD" ? item.finalUSDPrice : item.finalEGPPrice,
        gateway_fee_percentage: item.gatewayFeeEnabled ? globalFeePercentage : 0,
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

      // Log timeline event for order creation in analytics_events
      try {
        await supabaseAdmin.from("analytics_events").insert({
          event_name: "order_created",
          product_id: item.id,
          product_title: item.title,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            order_id: order.id,
            description_ar: "تم إنشاء طلب السلة بنجاح بانتظار الدفع",
            description_en: "Cart order created successfully, awaiting payment"
          }
        });
      } catch (analyticsErr) {
        console.error("Failed to log order_created event to analytics_events:", analyticsErr);
      }

      dbOrders.push(order);
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
      phone_number: (paymentMethod === "wallet" && walletNumber) 
        ? `+20${walletNumber.replace(/\D/g, "").startsWith("0") ? walletNumber.replace(/\D/g, "").slice(1) : walletNumber.replace(/\D/g, "")}` 
        : safePhone,
      shipping_method: "NA", 
      postal_code: "NA", 
      city: "Cairo", 
      country: "EG", 
      last_name: safeLastName || "User", 
      state: "NA"
    };

    const cartTitle = `سلة مشتريات (${items.length} منتجات)`;

    // ==========================================
    // WALLET FLOW: SERVER-TO-SERVER (CLASSIC API) DIRECT REDIRECT
    // ==========================================
    if (paymentMethod === "wallet") {
      if (!apiKey) throw new Error("PAYMOB_API_KEY is missing for Wallet S2S Flow.");
      if (!walletNumber) throw new Error("Wallet number is required.");
      
      console.log(`[WALLET_INTEGRATION] Selected Wallet Integration: ${envWalletIntegrationId}`);

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
          merchant_order_id: `cart-${dbOrders[0].id}`,
          extras: { 
            source: "store", 
            supabase_order_id: dbOrders[0].id,
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? verifiedItems.reduce((sum: number, i: any) => sum + (i.finalUSDPrice || 0), 0) : totalExpectedEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });
      if (!orderResponse.ok) throw new Error(`Order failed`);
      const paymobOrderId = (await orderResponse.json()).id;

      await supabase.from("orders").update({ payment_id: String(paymobOrderId) }).in("id", dbOrders.map(o => o.id));

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
          integration_id: envWalletIntegrationId,
        }),
      });
      if (!paymentKeyResponse.ok) throw new Error(`Payment key failed`);
      const paymentKey = (await paymentKeyResponse.json()).token;

      // 4. Pay
      const payPayload = {
        source: {
          identifier: walletNumber.replace(/\D/g, "").startsWith("1") ? `0${walletNumber.replace(/\D/g, "")}` : walletNumber.replace(/\D/g, ""),
          subtype: "WALLET"
        },
        payment_token: paymentKey
      };

      console.log("[CART_WALLET_PAYLOAD] Submitting to Paymob:", JSON.stringify(payPayload, null, 2));

      const payResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payPayload),
      });
      
      const payData = await payResponse.json();
      const redirectUrl = payData.redirection_url || payData.redirect_url || payData.iframe_redirection_url;
      console.log("[CART_WALLET_INTEGRATION] FULL Wallet Pay Response:", JSON.stringify({
        status: payResponse.status,
        success: payData.success,
        pending: payData.pending,
        redirection_url: payData.redirection_url,
        redirect_url: payData.redirect_url,
        iframe_redirection_url: payData.iframe_redirection_url,
        message: payData.message,
        id: payData.id,
      }, null, 2));

      if (!payResponse.ok && !redirectUrl) {
        throw new Error(`Wallet payment failed: ${payData.message || JSON.stringify(payData)}`);
      }

      if (redirectUrl) {
        return NextResponse.json({ checkoutUrl: redirectUrl, orderId: dbOrders[0].id });
      }

      throw new Error("No redirection URL returned from Paymob Wallet Payment API.");
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
          merchant_order_id: `store-${dbOrders[0].id}`,
          extras: { 
            source: "store", 
            supabase_order_id: dbOrders[0].id,
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? verifiedItems.reduce((sum: number, i: any) => sum + (i.finalUSDPrice || 0), 0) : totalExpectedEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });
      if (!orderResponse.ok) throw new Error(`Order failed`);
      const paymobOrderId = (await orderResponse.json()).id;

      // Update all orders with the same payment ID
      await supabase.from("orders").update({ payment_id: String(paymobOrderId) }).in("id", dbOrders.map(o => o.id));

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

      console.log("[FINAL_CART_PAYLOAD] cardName:", cardName, "| Submitting to Paymob:", JSON.stringify({ ...payPayload, source: { ...payPayload.source, identifier: "MASKED", cvn: "***" } }, null, 2));
      
      const payResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payPayload),
      });
      
      const payData = await payResponse.json();
      
      const redirectUrl = payData.redirection_url || payData.redirect_url || payData.iframe_redirection_url;
      console.log("[CARD_CART_INTEGRATION] FULL Pay Response:", JSON.stringify({
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

      if (redirectUrl) {
        return NextResponse.json({ checkoutUrl: redirectUrl, orderId: dbOrders[0].id });
      }

      if (payData.success) {
        return NextResponse.json({ success: true, checkoutUrl: `/checkout/success?order_id=${dbOrders[0].id}` });
      }

      if (payData.pending) {
        return NextResponse.json({ success: true, checkoutUrl: `/checkout/success?order_id=${dbOrders[0].id}&pending=true` });
      }

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
        orderId: dbOrders[0].id
      });
    }

    throw new Error("Invalid Payment Method");
  } catch (error: any) {
    console.error("[PAYMOB_CART_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
