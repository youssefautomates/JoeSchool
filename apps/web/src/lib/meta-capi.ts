import { getKV } from "./kv";
import crypto from "crypto";

const MARKETING_KEY = "marketing_settings";

/**
 * Hash PII data using SHA256 as required by Meta.
 */
function hashSHA256(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export interface CapiCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  num_items?: number;
  contents?: any[];
}

export interface CapiEventOptions {
  eventName: string;
  eventId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerCity?: string;
  customerCountry?: string;
  externalId?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  customData?: CapiCustomData;
}

/**
 * Send an event to Meta Conversions API (CAPI) with 3 retries and timeout protection.
 * Ensures zero application crashes if Meta is down.
 */
export async function sendMetaEvent(options: CapiEventOptions, attempt = 1): Promise<{ success: boolean; status: string; error?: string }> {
  try {
    const settings = await getKV<any>(MARKETING_KEY);
    const pixelId = settings?.metaPixelId;
    // Prefer env variable for token, fallback to DB settings
    const token = process.env.META_ACCESS_TOKEN || settings?.metaCapiToken;
    const isCapiEnabled = settings?.metaCapiEnabled === true || !!settings?.metaCapiToken || !!token;

    console.log('[CAPI_SETTINGS_DEBUG]', {
      isCapiEnabled,
      hasToken: !!token,
      pixelId,
      rawSettings: settings
    });

    console.log('[META_CAPI_PRE_CHECK]', {
      isCapiEnabled,
      hasToken: !!token,
      hasPixelId: !!pixelId,
      eventName: options.eventName
    });

    if (!isCapiEnabled || !token || !pixelId) {
      console.log(`[META_CAPI] ❌ CAPI is disabled or credentials missing (Event: ${options.eventName}). Skipping.`);
      console.log('[EARLY_RETURN_CAPI_DISABLED]');
      return { success: false, status: "disabled" };
    }

    const capiEvent: any = {
      event_name: options.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: options.eventId,
      action_source: "website",
      event_source_url: options.eventSourceUrl || "https://joeschool.com",
      user_data: {
        client_ip_address: options.clientIp || "127.0.0.1",
        client_user_agent: options.clientUserAgent || "Server Side Trigger"
      }
    };

    // Unhashed standard tracking params
    if (options.fbp) capiEvent.user_data.fbp = options.fbp;
    if (options.fbc) capiEvent.user_data.fbc = options.fbc;

    // Hashed PII data
    const hashedEmail = hashSHA256(options.customerEmail);
    if (hashedEmail) capiEvent.user_data.em = [hashedEmail];

    const hashedPhone = hashSHA256(options.customerPhone);
    if (hashedPhone) capiEvent.user_data.ph = [hashedPhone];

    const hashedFn = hashSHA256(options.customerFirstName);
    if (hashedFn) capiEvent.user_data.fn = [hashedFn];

    const hashedLn = hashSHA256(options.customerLastName);
    if (hashedLn) capiEvent.user_data.ln = [hashedLn];

    const hashedCity = hashSHA256(options.customerCity);
    if (hashedCity) capiEvent.user_data.ct = [hashedCity];

    const hashedCountry = hashSHA256(options.customerCountry);
    if (hashedCountry) capiEvent.user_data.country = [hashedCountry];

    const hashedExternalId = hashSHA256(options.externalId);
    if (hashedExternalId) capiEvent.user_data.external_id = [hashedExternalId];

    // Custom Data
    if (options.customData) {
      capiEvent.custom_data = {
        currency: options.customData.currency || "EGP",
        value: Number(options.customData.value) || 0,
        content_name: options.customData.content_name,
        content_type: options.customData.content_type || "product",
        content_ids: options.customData.content_ids,
        num_items: options.customData.num_items,
        contents: options.customData.contents
      };
    }

    const payload: any = { data: [capiEvent] };
    
    // Test code logic (only if explicitly set in settings, never auto-populated)
    if (settings.metaCapiTestCode && settings.metaCapiTestCode.trim() !== "") {
      payload.test_event_code = settings.metaCapiTestCode;
    }

    const metaUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`;
    
    console.log(`[META_CAPI_DEBUG] 🚀 Sending ${options.eventName} to CAPI...`);
    console.log('[META_CAPI_PAYLOAD]', JSON.stringify(payload));

    // Fetch with Timeout (10 seconds max) to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    const result = await response.json();
    
    console.log('[META_CAPI_RESPONSE_STATUS]', response.status);
    console.log('[META_CAPI_RESPONSE_BODY]', result);
    
    if (result.error) {
      throw new Error(result.error.message || "Meta API Error");
    }

    console.log(`[META_CAPI] ✅ Successfully sent ${options.eventName} (event_id: ${options.eventId})`);
    return { success: true, status: "sent" };

  } catch (err: any) {
    if (attempt < 3) {
      console.warn(`[META_CAPI] ⚠️ Failed ${options.eventName} (Attempt ${attempt}/3). Retrying...`, err.message);
      return await sendMetaEvent(options, attempt + 1);
    }
    console.error(`[META_CAPI] ❌ Final failure sending ${options.eventName}:`, err.message);
    return { success: false, status: "failed", error: err.message };
  }
}

/**
 * Server CAPI: Purchase
 */
export async function trackServerPurchase({
  transactionId,
  price,
  currency = "EGP",
  productTitle,
  productIds,
  customerEmail,
  clientIp,
  clientUserAgent,
  fbp,
  fbc,
  eventSourceUrl
}: {
  transactionId: string;
  price: number;
  currency?: string;
  productTitle: string;
  productIds: string[];
  customerEmail?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}) {
  console.log('[META_CAPI_FUNCTION_ENTERED]');
  return sendMetaEvent({
    eventName: "Purchase",
    eventId: `purchase_${transactionId}`,
    customerEmail,
    clientIp,
    clientUserAgent,
    fbp,
    fbc,
    eventSourceUrl,
    customData: {
      currency,
      value: price,
      content_name: productTitle,
      content_type: "product",
      content_ids: productIds,
      num_items: productIds.length
    }
  });
}

/**
 * Server CAPI: InitiateCheckout
 */
export async function trackServerInitiateCheckout({
  checkoutEventId,
  price,
  currency = "EGP",
  productTitle,
  productIds,
  customerEmail,
  clientIp,
  clientUserAgent,
  fbp,
  fbc,
  eventSourceUrl
}: {
  checkoutEventId: string;
  price: number;
  currency?: string;
  productTitle: string;
  productIds: string[];
  customerEmail?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}) {
  return sendMetaEvent({
    eventName: "InitiateCheckout",
    eventId: checkoutEventId, // Deterministic ID passed from frontend
    customerEmail,
    clientIp,
    clientUserAgent,
    fbp,
    fbc,
    eventSourceUrl,
    customData: {
      currency,
      value: price,
      content_name: productTitle,
      content_type: "product",
      content_ids: productIds,
      num_items: productIds.length
    }
  });
}
