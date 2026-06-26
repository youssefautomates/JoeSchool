/**
 * Unified High-Performance TikTok Pixel Tracking Library.
 * Implements browser event queueing, signature-based deduplication,
 * customizable diagnostics logs, and decorated console logging for debugging.
 */

import { supabaseClient } from "@/lib/supabaseClient";

declare global {
  interface Window {
    ttq: any;
  }
}

// Track fired event signatures to prevent double triggers in a single page view session
const firedEvents = new Set<string>();

// Queue for browser pixel events if ttq is not yet ready
const queuedEvents: Array<{ event: string; params?: any; eventId: string }> = [];

let activeSettings: any = null;
let cachedEmail: string | null = null;

export function initTiktokPixel(settings: any) {
  if (!settings) return;
  activeSettings = settings;
  if (typeof window !== "undefined") {
    (window as any).tiktokTrackingSettings = settings;
    console.log("[TikTok Pixel] Configured with settings:", settings);
    
    // Process queue if ttq is active
    if (window.ttq && typeof window.ttq.track === "function") {
      while (queuedEvents.length > 0) {
        const next = queuedEvents.shift();
        if (next) {
          console.log(`[TikTok Pixel] Firing queued event: ${next.event} with ID: ${next.eventId}`);
          window.ttq.track(next.event, next.params, { event_id: next.eventId });
        }
      }
    }
  }
}

export function getActiveSettings() {
  if (activeSettings) return activeSettings;
  if (typeof window !== "undefined" && (window as any).tiktokTrackingSettings) {
    activeSettings = (window as any).tiktokTrackingSettings;
    return activeSettings;
  }
  return null;
}

// Synchronously load settings and email in browser
if (typeof window !== "undefined") {
  // 1. Fetch settings once on load as fallback
  fetch("/api/admin/settings")
    .then(res => res.json())
    .then(data => {
      if (data && !data.error) {
        initTiktokPixel(data);
      }
    })
    .catch(() => {});

  // 2. Load cached email from active session
  supabaseClient.auth.getSession().then(({ data: { session } }: any) => {
    cachedEmail = session?.user?.email || null;
  });
  supabaseClient.auth.onAuthStateChange((_event: any, session: any) => {
    cachedEmail = session?.user?.email || null;
  });

  // 3. Process queued events when ttq becomes active
  const interval = setInterval(() => {
    if (window.ttq && typeof window.ttq.track === "function") {
      while (queuedEvents.length > 0) {
        const next = queuedEvents.shift();
        if (next) {
          console.log(`[TikTok Pixel] Firing queued event: ${next.event} with ID: ${next.eventId}`);
          window.ttq.track(next.event, next.params, { event_id: next.eventId });
          
          logEventToDiagnostics({
            event: next.event,
            eventId: next.eventId,
            timestamp: new Date().toISOString(),
            browserStatus: "success",
            params: next.params
          });
        }
      }
      clearInterval(interval);
    }
  }, 100);
  setTimeout(() => clearInterval(interval), 15000);
}

/**
 * Stores tracking events in localStorage for diagnostics.
 */
export function logEventToDiagnostics(log: {
  event: string;
  eventId: string;
  timestamp: string;
  browserStatus: "success" | "queued" | "disabled" | "failed";
  params: any;
}) {
  if (typeof window === "undefined") return;
  try {
    const rawLogs = localStorage.getItem("tiktok_pixel_events_log") || "[]";
    const logs = JSON.parse(rawLogs);
    
    // Check if event already exists
    const existingIdx = logs.findIndex((l: any) => l.eventId === log.eventId);
    if (existingIdx > -1) {
      logs[existingIdx] = { ...logs[existingIdx], ...log };
    } else {
      logs.unshift(log);
    }
    
    // Keep last 30 diagnostics traces
    localStorage.setItem("tiktok_pixel_events_log", JSON.stringify(logs.slice(0, 30)));
    
    // Notify diagnostics panel
    window.dispatchEvent(new CustomEvent("tiktok_tracking_event_logged"));
  } catch (err) {
    console.error("[TikTok Diagnostics Logging Fail]:", err);
  }
}

/**
 * Primary High-Performance TikTok Tracking Dispatcher.
 */
export async function trackTiktokEvent(event: string, params: any = {}, dedupeKey?: string) {
  if (typeof window === "undefined") return;

  // 1. Check dynamic signature cache to block Transition/Hydration double-firings
  const signature = `${event}_${JSON.stringify(params || {})}`;
  if (firedEvents.has(signature) && !dedupeKey) {
    console.log(`[TikTok Pixel] Blocked duplicate transitional render of event: ${event}`);
    return;
  }
  firedEvents.add(signature);
  setTimeout(() => firedEvents.delete(signature), 1000); // 1-second signature throttle

  // 2. Event ID generation for deduplication
  const randomStr = Math.random().toString(36).substring(2, 9);
  const eventId = dedupeKey || `${event}*${Date.now()}*${randomStr}`;

  if (dedupeKey) {
    if (firedEvents.has(dedupeKey)) {
      console.log(`[TikTok Pixel] Blocked duplicate event for key: ${dedupeKey}`);
      return;
    }
    firedEvents.add(dedupeKey);
  }

  // Inject email from local cache if missing
  const trackingParams = { ...params };
  if (!trackingParams.email && !trackingParams.user_email && cachedEmail) {
    trackingParams.email = cachedEmail;
  }

  // 3. Browser-side Pixel execution
  let browserStatus: "success" | "queued" | "disabled" | "failed" = "disabled";
  const currentSettings = getActiveSettings();
  const envPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "";
  const pixelIdActive = envPixelId || currentSettings?.tiktokPixelId || "";
  const pixelEnabled = envPixelId ? true : (currentSettings ? !!currentSettings.tiktokPixelEnabled : true);

  if (pixelEnabled && pixelIdActive) {
    if (window.ttq && typeof window.ttq.track === "function") {
      try {
        window.ttq.track(event, trackingParams, { event_id: eventId });
        browserStatus = "success";
      } catch (err) {
        browserStatus = "failed";
      }
    } else {
      queuedEvents.push({ event, params: trackingParams, eventId });
      browserStatus = "queued";
    }
  }

  // 4. Detailed console log for debugging
  console.log(
    `%c[TikTok Pixel] 🚀 Event: ${event} | Status: ${browserStatus} | ID: ${eventId}`,
    "color: #ffffff; background: #ff0050; font-weight: bold; padding: 4px 8px; border-radius: 4px;"
  );

  logEventToDiagnostics({
    event,
    eventId,
    timestamp: new Date().toISOString(),
    browserStatus,
    params: trackingParams
  });
}

/**
 * Standard Analytics Event Wrappers
 */
export function trackTiktokPageView() {
  trackTiktokEvent("PageView");
}

export function trackTiktokViewContent(id: string, name: string, price: number, currency: string = "EGP", type: string = "product") {
  trackTiktokEvent("ViewContent", {
    contents: [{
      content_id: String(id),
      content_name: name,
      content_type: "product",
      price: price,
      quantity: 1
    }],
    value: price,
    currency: currency
  }, `view_${type}_${id}`);
}

export function trackTiktokInitiateCheckout(id: string, name: string, price: number, currency: string = "EGP", type: string = "product") {
  trackTiktokEvent("InitiateCheckout", {
    contents: [{
      content_id: String(id),
      content_name: name,
      content_type: "product",
      price: price,
      quantity: 1
    }],
    value: price,
    currency: currency
  }, `initiate_checkout_${type}_${id}`);
}

export function trackTiktokAddToCart(id: string, name: string, price: number, currency: string = "EGP", type: string = "product") {
  trackTiktokEvent("AddToCart", {
    contents: [{
      content_id: String(id),
      content_name: name,
      content_type: "product",
      price: price,
      quantity: 1
    }],
    value: price,
    currency: currency
  }, `add_to_cart_${type}_${id}`);
}

export function trackTiktokCompletePayment(transactionId: string, name: string, ids: string[], price: number, currency: string = "EGP") {
  trackTiktokEvent("CompletePayment", {
    contents: ids.map(id => ({
      content_id: String(id),
      content_name: name,
      content_type: "product",
      price: price / ids.length,
      quantity: 1
    })),
    value: price,
    currency: currency
  }, `purchase_${transactionId}`);
}
