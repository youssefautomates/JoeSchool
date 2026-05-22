import { NextResponse } from "next/server";
import { verifyPaymobHmac } from "@/lib/paymob";

/**
 * GET /api/paymob/callback
 * 
 * This is the redirect URL Paymob sends the customer to after 3DS/OTP verification.
 * We verify the HMAC, then redirect to our own success or failed page.
 * 
 * This ensures Store customers NEVER get redirected to JoeSchool or any external page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hmac = searchParams.get("hmac");
  
  // Convert searchParams to an object for HMAC verification
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // 1. Verify HMAC for security
  const isValid = verifyPaymobHmac(
    params,
    hmac || "",
    process.env.PAYMOB_HMAC_SECRET || "",
    false // GET request
  );

  if (!isValid) {
    console.error("[CALLBACK] ❌ Invalid HMAC signature from Paymob callback");
    return NextResponse.redirect(new URL("/checkout/failed?reason=verification_failed", request.url));
  }

  // 2. Check Transaction Success
  const success = searchParams.get("success") === "true";
  const orderId = searchParams.get("order");
  const merchantOrderId = searchParams.get("merchant_order_id") || "";

  console.log(`[CALLBACK] Success: ${success} | Order: ${orderId} | MerchantOrder: ${merchantOrderId}`);

  // 3. Always redirect to Youssef Automates Store pages
  // This guarantees store customers never see JoeSchool pages
  const reason = searchParams.get("txn_response_code") || "declined";
  
  if (success || reason === "verification_timeout") {
    // If verification_timeout, send to success page anyway so the robust
    // verify-and-deliver API can check Paymob directly. Often it's a false negative.
    return NextResponse.redirect(new URL(`/checkout/success?order_id=${orderId}`, request.url));
  } else {
    return NextResponse.redirect(new URL(`/checkout/failed?order_id=${orderId}&reason=${reason}`, request.url));
  }
}
