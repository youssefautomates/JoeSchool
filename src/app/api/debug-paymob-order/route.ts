import { NextResponse } from "next/server";

export async function GET() {
  console.log("[DEBUG_PAYMOB_ORDER] Route hit");

  try {
    const apiKey = process.env.PAYMOB_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "PAYMOB_API_KEY missing" }, { status: 500 });
    }

    // Step 1: Get Auth Token
    console.log("[DEBUG_PAYMOB_ORDER] Step 1: Getting Auth Token...");
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!authRes.ok) {
      return NextResponse.json({ error: "Auth failed", details: await authRes.text() }, { status: 500 });
    }

    const authData = await authRes.json();
    const token = authData.token;
    console.log("[DEBUG_PAYMOB_ORDER] Auth token obtained successfully.");

    // Step 2: Create Order
    console.log("[DEBUG_PAYMOB_ORDER] Step 2: Creating Order...");
    const orderEndpoint = "https://accept.paymob.com/api/ecommerce/orders";
    
    // Convert EGP to cents. Paymob requires amount in cents.
    const amountCents = 1500 * 100; // 1500 EGP as a test

    const orderPayload = {
      auth_token: token,
      delivery_needed: "false",
      amount_cents: amountCents.toString(),
      currency: "EGP",
      items: [
        {
          name: "Test Debug Product",
          amount_cents: amountCents.toString(),
          description: "Debug Order",
          quantity: "1"
        }
      ],
    };

    console.log("[DEBUG_PAYMOB_ORDER] Calling order endpoint:", orderEndpoint);
    console.log("[DEBUG_PAYMOB_ORDER] Order Payload (amount_cents):", orderPayload.amount_cents);

    const orderRes = await fetch(orderEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const rawOrderText = await orderRes.text();
    console.log("[DEBUG_PAYMOB_ORDER] Response HTTP Status:", orderRes.status);
    console.log("[DEBUG_PAYMOB_ORDER] Raw Order Response:", rawOrderText);

    let parsedOrder;
    try {
      parsedOrder = JSON.parse(rawOrderText);
    } catch (e) {
      parsedOrder = { raw: rawOrderText };
    }

    if (!orderRes.ok) {
      return NextResponse.json({
        success: false,
        step: "order_creation",
        status: orderRes.status,
        response: parsedOrder
      }, { status: orderRes.status });
    }

    return NextResponse.json({
      success: true,
      paymob_order_id: parsedOrder.id,
      amount_cents: parsedOrder.amount_cents,
      currency: parsedOrder.currency,
      response: parsedOrder
    });

  } catch (error: any) {
    console.error("[DEBUG_PAYMOB_ORDER] Exception:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
