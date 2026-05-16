import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[CART_BACKEND_REQUEST_BODY] Received:", JSON.stringify(body, null, 2));
    const { amount, email, firstName, lastName, phone, items, paymentMethod, cardData } = body;

    // --- Env Validation ---
    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const apiKey = process.env.PAYMOB_API_KEY;
    const publicKey = process.env.NEXT_PUBLIC_PAYMOB_PUBLIC_KEY || process.env.PAYMOB_PUBLIC_KEY;
    
    // Read the specific integration IDs from env
    const envCardIntegrationId = parseInt(process.env.PAYMOB_CARD_INTEGRATION_ID as string, 10);
    const envWalletIntegrationId = parseInt(process.env.PAYMOB_WALLET_INTEGRATION_ID as string, 10);

    console.log("[PAYMOB_CART_INITIATE] Payment Method:", paymentMethod);

    if (isNaN(envCardIntegrationId) || isNaN(envWalletIntegrationId)) {
      throw new Error("Missing or invalid PAYMOB_CARD_INTEGRATION_ID or PAYMOB_WALLET_INTEGRATION_ID in .env.local");
    }

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    // 2. Create Orders in Supabase locally first (One per item)
    const dbOrders = [];
    for (const item of items) {
      const order = await createOrder({
        customer_name: `${firstName} ${lastName}`,
        customer_email: email,
        customer_phone: phone || "+201000000000",
        product_id: item.id,
        product_title: item.title,
        amount: parseFloat(item.price),
        currency: "EGP",
        status: "pending",
        payment_id: "PENDING", 
      });
      dbOrders.push(order);
    }

    const safeFirstName = (firstName || "Test").replace(/[^a-zA-Z\u0600-\u06FF]/g, "");
    const safeLastName = (lastName || "User").replace(/[^a-zA-Z\u0600-\u06FF]/g, "");
    const safePhone = phone || "+201000000000";
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
    // UNIFIED CHECKOUT FLOW (CARD & WALLET)
    // ==========================================
    if (!secretKey) throw new Error("PAYMOB_SECRET_KEY is missing for Intention API.");
    
    const integrationId = paymentMethod === "wallet" ? envWalletIntegrationId : envCardIntegrationId;
    console.log(`[PAYMOB_INTEGRATION] Selected Integration: ${integrationId} for method: ${paymentMethod}`);
    
    const intentionResponse = await fetch("https://accept.paymob.com/v1/intention/", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Token ${secretKey}`
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "EGP",
        payment_methods: [integrationId],
        items: [{ name: cartTitle, amount: amountCents, description: "Digital Cart Purchase", quantity: 1 }],
        billing_data: billingData,
        extras: { supabase_order_id: dbOrders[0].id }
      }),
    });

    const intentionData = await intentionResponse.json();
    if (!intentionResponse.ok) throw new Error(`Intention failed: ${JSON.stringify(intentionData)}`);

    // Update all orders with the same payment ID
    await supabase.from("orders").update({ payment_id: intentionData.id?.toString() }).in("id", dbOrders.map(o => o.id));
    
    return NextResponse.json({
      checkoutUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${intentionData.client_secret}`,
      orderId: dbOrders[0].id
    });

    throw new Error("Invalid Payment Method");
  } catch (error: any) {
    console.error("[PAYMOB_CART_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
