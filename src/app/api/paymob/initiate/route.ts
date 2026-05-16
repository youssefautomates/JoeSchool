import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createOrder } from "@/lib/orders";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[BACKEND_REQUEST_BODY] Received:", JSON.stringify(body, null, 2));
    const { amount, email, firstName, lastName, phone, productId, paymentMethod, cardData } = body;

    // --- Env Validation ---
    const secretKey = process.env.PAYMOB_SECRET_KEY;
    const apiKey = process.env.PAYMOB_API_KEY;
    const publicKey = process.env.NEXT_PUBLIC_PAYMOB_PUBLIC_KEY || process.env.PAYMOB_PUBLIC_KEY;
    
    // Read the specific integration IDs from env
    const envCardIntegrationId = parseInt(process.env.PAYMOB_CARD_INTEGRATION_ID as string, 10);
    const envWalletIntegrationId = parseInt(process.env.PAYMOB_WALLET_INTEGRATION_ID as string, 10);

    console.log("[PAYMOB_INITIATE] Payment Method:", paymentMethod);

    if (isNaN(envCardIntegrationId) || isNaN(envWalletIntegrationId)) {
      throw new Error("Missing or invalid PAYMOB_CARD_INTEGRATION_ID or PAYMOB_WALLET_INTEGRATION_ID in .env.local");
    }

    // 1. Fetch Product Details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("title, price")
      .eq("id", productId)
      .single();

    if (productError || !product) throw new Error("Product not found in database");
    
    const amountCents = Math.round(parseFloat(amount) * 100);

    // 2. Create Order in Supabase locally first
    const dbOrder = await createOrder({
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      customer_phone: phone,
      product_id: productId,
      product_title: product.title,
      amount: parseFloat(amount),
      currency: "EGP",
      status: "pending",
      payment_id: "PENDING", 
    });

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
          items: [{ name: product.title, amount: amountCents, description: "Digital Purchase", quantity: 1 }],
          billing_data: billingData,
          extras: { supabase_order_id: dbOrder.id }
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
          name: cardName,
          cardholder_name: cardName,
          card_holder_name: cardName
        },
        payment_token: paymentKey
      };

      console.log("[FINAL_PAYLOAD] Submitting to Paymob:", JSON.stringify({ ...payPayload, source: { ...payPayload.source, identifier: "MASKED", cvn: "***" } }, null, 2));
      
      const payResponse = await fetch("https://accept.paymob.com/api/acceptance/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payPayload),
      });
      
      const payData = await payResponse.json();
      console.log("[CARD_INTEGRATION] Pay Response:", payData.success, payData.redirection_url ? "Requires 3DS OTP" : "Direct Success");

      if (!payResponse.ok && !payData.redirection_url) {
        throw new Error(`Payment processing failed: ${payData.message || JSON.stringify(payData)}`);
      }

      // If it requires 3DS OTP
      if (payData.redirection_url) {
        return NextResponse.json({ checkoutUrl: payData.redirection_url, orderId: dbOrder.id });
      }

      // Direct Success
      if (payData.success) {
        return NextResponse.json({ success: true, checkoutUrl: `/success?order_id=${dbOrder.id}` });
      }

      throw new Error(`Payment declined: ${payData.data?.message || 'Unknown error'}`);
    }

    throw new Error("Invalid Payment Method");
  } catch (error: any) {
    console.error("[PAYMOB_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
