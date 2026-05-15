import { NextResponse } from "next/server";

export async function GET() {
  console.log("[DEBUG_PAYMOB_PAYMENT] Route hit");

  try {
    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationId = process.env.PAYMOB_INTEGRATION_ID;
    const iframeId = process.env.NEXT_PUBLIC_PAYMOB_IFRAME_ID;

    if (!apiKey || !integrationId || !iframeId) {
      return NextResponse.json({ 
        error: "Missing Env Variables",
        has_api_key: !!apiKey,
        has_integration_id: !!integrationId,
        has_iframe_id: !!iframeId
      }, { status: 500 });
    }

    // Step 1: Auth Token
    console.log("[DEBUG_PAYMOB_PAYMENT] Step 1: Auth");
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
    const token = (await authRes.json()).token;

    // Step 2: Order Creation
    console.log("[DEBUG_PAYMOB_PAYMENT] Step 2: Order Creation");
    const amountCents = 1500 * 100;
    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: "false",
        amount_cents: amountCents.toString(),
        currency: "EGP",
        items: [],
      }),
    });
    if (!orderRes.ok) throw new Error(`Order failed: ${await orderRes.text()}`);
    const orderData = await orderRes.json();
    const orderId = orderData.id;
    console.log("[DEBUG_PAYMOB_PAYMENT] Order ID generated:", orderId);

    // Step 3: Payment Key Request
    console.log("[DEBUG_PAYMOB_PAYMENT] Step 3: Payment Key Request");
    const paymentEndpoint = "https://accept.paymob.com/api/acceptance/payment_keys";
    
    // Paymob requires very specific dummy data for billing_data if it's digital
    const paymentPayload = {
      auth_token: token,
      amount_cents: amountCents.toString(),
      expiration: 3600,
      order_id: orderId.toString(),
      billing_data: {
        apartment: "NA",
        email: "test@example.com",
        floor: "NA",
        first_name: "Test",
        street: "NA",
        building: "NA",
        phone_number: "+201000000000",
        shipping_method: "NA",
        postal_code: "NA",
        city: "Cairo",
        country: "EG",
        last_name: "User",
        state: "NA"
      },
      currency: "EGP",
      integration_id: parseInt(integrationId, 10),
    };

    console.log("[DEBUG_PAYMOB_PAYMENT] Calling payment endpoint:", paymentEndpoint);
    console.log("[DEBUG_PAYMOB_PAYMENT] Integration ID used:", paymentPayload.integration_id);

    const paymentRes = await fetch(paymentEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentPayload),
    });

    const rawPaymentText = await paymentRes.text();
    console.log("[DEBUG_PAYMOB_PAYMENT] Response HTTP Status:", paymentRes.status);
    console.log("[DEBUG_PAYMOB_PAYMENT] Raw Payment Response:", rawPaymentText);

    let parsedPayment;
    try {
      parsedPayment = JSON.parse(rawPaymentText);
    } catch (e) {
      parsedPayment = { raw: rawPaymentText };
    }

    if (!paymentRes.ok) {
      return NextResponse.json({
        success: false,
        step: "payment_key",
        status: paymentRes.status,
        response: parsedPayment
      }, { status: paymentRes.status });
    }

    // Step 4: Iframe URL Generation
    const paymentToken = parsedPayment.token;
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;

    return NextResponse.json({
      success: true,
      order_id: orderId,
      payment_token: paymentToken,
      iframe_url: iframeUrl,
      raw_response: parsedPayment
    });

  } catch (error: any) {
    console.error("[DEBUG_PAYMOB_PAYMENT] Exception:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
