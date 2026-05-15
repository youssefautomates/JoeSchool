import crypto from "crypto";

/**
 * Calculates the HMAC-SHA512 for Paymob Transaction Callback/Webhook
 * Based on: https://developers.paymob.com/paymob-docs/transaction-processed-callback
 */
export function calculateHmac(obj: any, hmacSecret: string, isPost: boolean = true): string {
  // Extract values in the specific order required by Paymob
  // The values must be concatenated WITHOUT any separators
  
  const extract = (path: string) => {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return "";
      current = current[part];
    }
    return current !== null && current !== undefined ? String(current) : "";
  };

  // For POST webhooks, the order ID is at obj.order.id
  // For GET callbacks, the order ID is in the query param order_id
  const orderIdField = isPost ? "order.id" : "order_id";

  const fields = [
    extract("amount_cents"),
    extract("created_at"),
    extract("currency"),
    extract("error_occured"),
    extract("has_parent_transaction"),
    extract("id"),
    extract("integration_id"),
    extract("is_3d_secure"),
    extract("is_auth"),
    extract("is_capture"),
    extract("is_refunded"),
    extract("is_standalone_payment"),
    extract("is_voided"),
    extract(orderIdField),
    extract("owner"),
    extract("pending"),
    extract("source_data.pan"),
    extract("source_data.sub_type"),
    extract("source_data.type"),
    extract("success"),
  ];

  const concatenatedString = fields.join("");

  return crypto
    .createHmac("sha512", hmacSecret)
    .update(concatenatedString)
    .digest("hex");
}

/**
 * Verifies the HMAC for a Paymob callback or webhook
 */
export function verifyPaymobHmac(
  data: any,
  receivedHmac: string,
  hmacSecret: string,
  isPost: boolean = true
): boolean {
  if (!hmacSecret) {
    console.error("PAYMOB_HMAC_SECRET is not set");
    return false;
  }
  
  const calculatedHmac = calculateHmac(data, hmacSecret, isPost);
  return calculatedHmac === receivedHmac;
}
