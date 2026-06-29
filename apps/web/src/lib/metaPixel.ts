/**
 * Unified High-Performance Meta Pixel & CAPI Tracking Library.
 * Implements strict event deduplication via unique eventID, forwards server CAPI triggers in parallel,
 * caches student email metadata, and stores extensive tracing logs in localStorage for admin panel diagnostics.
 */

// Let's resolve the correct supabase client import by using supabaseClient from "@/lib/supabaseClient"
import { supabaseClient } from "@/lib/supabaseClient";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

// Track fired event signatures to prevent double triggers in a single page view session
const firedEvents = new Set<string>();

// Queue for browser pixel events if fbq is not yet ready
const queuedEvents: Array<{ event: string; params?: any; eventId: string }> = [];

let activeSettings: any = null;
let cachedEmail: string | null = null;

export function initMetaPixel(settings: any) {
  if (!settings) return;
  activeSettings = settings;
  if (typeof window !== "undefined") {
    (window as any).metaTrackingSettings = settings;
    console.log("[Meta Pixel] Configured with settings:", settings);
    
    // Immediately process queue if fbq is ready
    if (window.fbq && typeof window.fbq === "function") {
      while (queuedEvents.length > 0) {
        const next = queuedEvents.shift();
        if (next) {
          console.log(`[Meta Pixel] Firing queued event: ${next.event} with ID: ${next.eventId}`);
          window.fbq("track", next.event, next.params, { eventID: next.eventId });
        }
      }
    }
  }
}

export function getActiveSettings() {
  if (activeSettings) return activeSettings;
  if (typeof window !== "undefined" && (window as any).metaTrackingSettings) {
    activeSettings = (window as any).metaTrackingSettings;
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
        initMetaPixel(data);
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

  // 3. Process queued events when fbq becomes active
  const interval = setInterval(() => {
    if (window.fbq && typeof window.fbq === "function") {
      while (queuedEvents.length > 0) {
        const next = queuedEvents.shift();
        if (next) {
          console.log(`[Meta Pixel] Firing queued event: ${next.event} with ID: ${next.eventId}`);
          window.fbq("track", next.event, next.params, { eventID: next.eventId });
          
          let existingCapiStatus: "success" | "disabled" | "failed" | "pending" = "pending";
          let existingMetaCapiResponse: any = undefined;
          try {
            const rawLogs = localStorage.getItem("meta_pixel_events_log") || "[]";
            const logs = JSON.parse(rawLogs);
            const found = logs.find((l: any) => l.eventId === next.eventId);
            if (found) {
              existingCapiStatus = found.capiStatus;
              existingMetaCapiResponse = found.metaCapiResponse;
            }
          } catch (e) {}

          logEventToDiagnostics({
            event: next.event,
            eventId: next.eventId,
            timestamp: new Date().toISOString(),
            browserStatus: "success",
            capiStatus: existingCapiStatus,
            deduplicated: existingCapiStatus === "success",
            params: next.params,
            metaCapiResponse: existingMetaCapiResponse
          } as any);
        }
      }
      clearInterval(interval);
    }
  }, 100);
  setTimeout(() => clearInterval(interval), 15000);
}

/**
 * Stores tracking events in localStorage for the Admin Diagnostics tab.
 */
export function logEventToDiagnostics(log: {
  event: string;
  eventId: string;
  timestamp: string;
  browserStatus: "success" | "queued" | "disabled" | "failed";
  capiStatus: "success" | "disabled" | "failed" | "pending";
  deduplicated: boolean;
  params: any;
}) {
  if (typeof window === "undefined") return;
  try {
    const rawLogs = localStorage.getItem("meta_pixel_events_log") || "[]";
    const logs = JSON.parse(rawLogs);
    
    // Check if event already exists (update it, e.g. updating CAPI status)
    const existingIdx = logs.findIndex((l: any) => l.eventId === log.eventId);
    if (existingIdx > -1) {
      logs[existingIdx] = { ...logs[existingIdx], ...log };
    } else {
      logs.unshift(log);
    }
    
    // Keep last 30 diagnostics traces
    localStorage.setItem("meta_pixel_events_log", JSON.stringify(logs.slice(0, 30)));
    
    // Notify diagnostics panel
    window.dispatchEvent(new CustomEvent("meta_tracking_event_logged"));
  } catch (err) {
    console.error("[Diagnostics Logging Fail]:", err);
  }
}

/**
 * Primary High-Performance Unified Tracking Dispatcher.
 * Resolves CAPI and Pixel deduplication in parallel.
 */
export async function trackMetaEvent(event: string, params: any = {}, dedupeKey?: string) {
  if (typeof window === "undefined") return;

  // 1. Check dynamic signature cache to block Transition/Hydration double-firings
  const signature = `${event}_${JSON.stringify(params || {})}`;
  if (firedEvents.has(signature) && !dedupeKey) {
    console.log(`[Tracking] Blocked duplicate transitional render of event: ${event}`);
    return;
  }
  firedEvents.add(signature);
  setTimeout(() => firedEvents.delete(signature), 1000); // 1-second signature throttle

  // 2. Strict Deduplication eventID generation
  const randomStr = Math.random().toString(36).substring(2, 9);
  const eventId = dedupeKey || `${event}*${Date.now()}*${randomStr}`;

  if (dedupeKey) {
    if (firedEvents.has(dedupeKey)) {
      console.log(`[Tracking] Blocked duplicate event for key: ${dedupeKey}`);
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
  const pixelIdActive = currentSettings?.metaPixelId || "";
  const pixelEnabled = currentSettings ? !!currentSettings.metaPixelEnabled : true;

  if (pixelEnabled) {
    if (window.fbq && typeof window.fbq === "function") {
      try {
        window.fbq("track", event, trackingParams, { eventID: eventId });
        browserStatus = "success";
      } catch (err) {
        browserStatus = "failed";
      }
    } else {
      queuedEvents.push({ event, params: trackingParams, eventId });
      browserStatus = "queued";
    }
  }

  // Log initial state (pending CAPI proxy response)
  logEventToDiagnostics({
    event,
    eventId,
    timestamp: new Date().toISOString(),
    browserStatus,
    capiStatus: currentSettings?.metaCapiEnabled ? "pending" : "disabled",
    deduplicated: currentSettings?.metaCapiEnabled && pixelEnabled,
    params: trackingParams
  });

  // 4. Server-side Conversion API (CAPI) proxy invocation has been disabled
}

/**
 * Standard Analytics Event Wrappers
 */
export function trackPageView() {
  trackMetaEvent("PageView");
}

export function trackViewContent(id: string, name: string, price: number, currency: string = "EGP", type: string = "product") {
  trackMetaEvent("ViewContent", {
    content_name: name,
    content_category: type,
    content_ids: [id],
    content_type: type,
    value: price,
    currency: currency
  }, `view_${type}_${id}`);
}

export function trackInitiateCheckout(id: string, name: string, price: number, currency: string = "EGP", type: string = "product") {
  trackMetaEvent("InitiateCheckout", {
    content_name: name,
    content_ids: [id],
    content_type: type,
    value: price,
    currency: currency
  }, `initiate_checkout_${type}_${id}`);
}

export function trackAddToCart(id: string, name: string, price: number, currency: string = "EGP", type: string = "product") {
  trackMetaEvent("AddToCart", {
    content_name: name,
    content_ids: [id],
    content_type: type,
    value: price,
    currency: currency
  }, `add_to_cart_${type}_${id}`);
}

export function trackPurchase(transactionId: string, name: string, ids: string[], price: number, currency: string = "EGP") {
  trackMetaEvent("Purchase", {
    content_name: name,
    content_ids: ids,
    content_type: "product",
    value: price,
    currency: currency,
    transaction_id: transactionId
  }, `purchase_${transactionId}`);
}

export function trackCompleteRegistration() {
  trackMetaEvent("CompleteRegistration", {}, "complete_registration");
}

export function trackLead(label: string = "lead") {
  trackMetaEvent("Lead", { content_name: label }, `lead_${label}`);
}
