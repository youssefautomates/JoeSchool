import { POST as masterPOST } from "../../paymob/webhook/route";

/**
 * Proxy for the master Paymob Webhook handler.
 * Forwards all incoming requests directly to the master route at /api/paymob/webhook.
 */
export const POST = masterPOST;
