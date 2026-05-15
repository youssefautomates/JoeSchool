import { NextResponse } from "next/server";
import { verifyPaymobHmac } from "@/lib/paymob";

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
    console.error("Invalid HMAC signature from Paymob callback");
    return NextResponse.redirect(new URL("/checkout/error?reason=verification_failed", request.url));
  }

  // 2. Check Transaction Success
  const success = searchParams.get("success") === "true";
  const orderId = searchParams.get("order");

  if (success) {
    return NextResponse.redirect(new URL(`/success?order_id=${orderId}`, request.url));
  } else {
    return NextResponse.redirect(new URL(`/checkout/error?order_id=${orderId}&reason=${searchParams.get("txn_response_code")}`, request.url));
  }
}
