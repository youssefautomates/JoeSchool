import { getKV } from "./kv";
import crypto from "crypto";

const MARKETING_KEY = "marketing_settings";

function hashSHA256(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

export interface CapiCustomData {
  currency?: string;
  value?: number;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
}

export interface CapiEventOptions {
  eventName: string;
  eventId: string;
  customerEmail?: string;
  customerPhone?: string;
  clientIp?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
  customData?: CapiCustomData;
}

/**
 * Dispatch a Server-Side Meta Conversion API (CAPI) event.
 * Fully loads connection parameters dynamically from the unified KV store settings.
 */
export async function triggerServerCapiEvent(options: CapiEventOptions) {
  try {
    const settings = await getKV<any>(MARKETING_KEY);
    if (!settings || !settings.metaCapiEnabled || !settings.metaCapiToken || !settings.metaPixelId) {
      console.log("[Meta CAPI Server] CAPI is disabled or credentials missing. Skipping server dispatch.");
      return { success: false, status: "disabled" };
    }

    const hashedEmail = options.customerEmail ? hashSHA256(options.customerEmail) : undefined;
    const hashedPhone = options.customerPhone ? hashSHA256(options.customerPhone) : undefined;

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

    if (hashedEmail) {
      capiEvent.user_data.em = [hashedEmail];
    }
    if (hashedPhone) {
      capiEvent.user_data.ph = [hashedPhone];
    }

    if (options.customData) {
      capiEvent.custom_data = {
        currency: options.customData.currency || "EGP",
        value: Number(options.customData.value) || 0,
        content_name: options.customData.content_name || undefined,
        content_type: options.customData.content_type || "product",
        content_ids: options.customData.content_ids || undefined
      };
    }

    const payload: any = {
      data: [capiEvent]
    };

    if (settings.metaCapiTestCode) {
      payload.test_event_code = settings.metaCapiTestCode;
    }

    const metaUrl = `https://graph.facebook.com/v19.0/${settings.metaPixelId}/events?access_token=${settings.metaCapiToken}`;
    
    console.log(`[Meta CAPI Server] Dispatching server-side event: ${options.eventName} (ID: ${options.eventId})`);
    
    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[Meta CAPI Server] Response for event ${options.eventName}:`, result);
    
    return { success: !result.error, result };
  } catch (err: any) {
    console.error("[Meta CAPI Server Critical Exception]:", err);
    return { success: false, error: err.message };
  }
}

/**
 * High-performance backend tracking helper for Purchase conversions.
 */
export async function trackServerPurchase({
  transactionId,
  price,
  currency,
  productTitle,
  productIds,
  customerEmail,
  clientIp,
  clientUserAgent,
  eventSourceUrl
}: {
  transactionId: string;
  price: number;
  currency: string;
  productTitle: string;
  productIds: string[];
  customerEmail: string;
  clientIp?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
}) {
  return triggerServerCapiEvent({
    eventName: "Purchase",
    eventId: `purchase_${transactionId}`,
    customerEmail,
    clientIp,
    clientUserAgent,
    eventSourceUrl,
    customData: {
      currency,
      value: price,
      content_name: productTitle,
      content_type: "product",
      content_ids: productIds
    }
  });
}
