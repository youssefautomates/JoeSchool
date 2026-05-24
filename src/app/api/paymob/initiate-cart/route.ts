import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";
import { headers } from "next/headers";
import { resolveUserCurrency, resolveProductPrice, getUSDtoEGPExchangeRate } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[CART_BACKEND_REQUEST_BODY] Received:", JSON.stringify(body, null, 2));
    const { amount, email, firstName, lastName, phone, items, paymentMethod, cardData } = body;

    // --- Geolocation Currency Resolver ---
    const headersList = await headers();
    const userCurrency = await resolveUserCurrency(headersList);
    console.log(`[PAYMOB_CART_INITIATE] Server Resolved Currency: ${userCurrency}`);

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

    // 1. Dual Pricing Secure Resolver Layer for Multi-Item Cart
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

      totalExpectedEGP += itemEGPPrice;
      verifiedItems.push({
        id: item.id,
        title: dbItem.title,
        priceUSD: itemPriceUSD,
        priceEGP: itemEGPPrice
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

    // 2. Create Orders in Supabase locally first (One per item - Logging snapshots)
    const dbOrders = [];
    for (const item of verifiedItems) {
      const order = await createOrder({
        customer_name: `${firstName} ${lastName}`,
        customer_email: email,
        customer_phone: safePhone,
        product_id: item.id,
        product_title: item.title,
        amount: userCurrency === "USD" ? (item.priceUSD || 0) : item.priceEGP,
        currency: userCurrency,
        status: "pending",
        payment_id: "PENDING", 
        original_amount_usd: userCurrency === "USD" ? item.priceUSD : null,
        charged_amount_egp: item.priceEGP,
        exchange_rate: userCurrency === "USD" ? exchangeRate : null
      });
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
      phone_number: safePhone, 
      shipping_method: "NA", 
      postal_code: "NA", 
      city: "Cairo", 
      country: "EG", 
      last_name: safeLastName || "User", 
      state: "NA"
    };

    const cartTitle = `سلة مشتريات (${items.length} منتجات)`;

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
          items: [{ name: cartTitle, amount: amountCents, description: "Digital Cart Purchase", quantity: 1 }],
          billing_data: billingData,
          extras: { 
            supabase_order_id: dbOrders[0].id,
            source: "store",
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? verifiedItems.reduce((sum, i) => sum + (i.priceUSD || 0), 0) : totalExpectedEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });

      const intentionData = await intentionResponse.json();
      if (!intentionResponse.ok) throw new Error(`Wallet Intention failed: ${JSON.stringify(intentionData)}`);

      // Update all orders with the same payment ID
      await supabase.from("orders").update({ payment_id: intentionData.id?.toString() }).in("id", dbOrders.map(o => o.id));
      
      return NextResponse.json({
        checkoutUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${intentionData.client_secret}`,
        orderId: dbOrders[0].id
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
          items: [{ name: cartTitle, amount: amountCents, description: "Digital Cart Purchase", quantity: 1 }],
          billing_data: billingData,
          extras: { 
            supabase_order_id: dbOrders[0].id,
            source: "store",
            original_currency: userCurrency,
            original_amount: userCurrency === "USD" ? verifiedItems.reduce((sum, i) => sum + (i.priceUSD || 0), 0) : totalExpectedEGP,
            exchange_rate: userCurrency === "USD" ? exchangeRate : 1.0
          }
        }),
      });

      const intentionData = await intentionResponse.json();
      if (!intentionResponse.ok) throw new Error(`Card Intention failed: ${JSON.stringify(intentionData)}`);

      // Update all orders with the same payment ID
      await supabase.from("orders").update({ payment_id: intentionData.id?.toString() }).in("id", dbOrders.map(o => o.id));
      
      return NextResponse.json({
        checkoutUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${intentionData.client_secret}`,
        orderId: dbOrders[0].id
      });
    }

    throw new Error("Invalid Payment Method");
  } catch (error: any) {
    console.error("[PAYMOB_CART_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
