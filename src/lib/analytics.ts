/**
 * 🎓 JoeSchool - Advanced Client-Side Marketing & Analytics Engine
 * 
 * Manages unique user sessions, captures UTM attribution parameters, locks referrers,
 * and handles robust, non-blocking clickstream event logging to the Supabase database.
 */

// Safe browser detection
const isBrowser = typeof window !== "undefined";

/**
 * Generate a cryptographically secure or highly random UUID for sessions
 */
function generateUUID(): string {
  if (isBrowser && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "sess_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Initiates the visitor session, captures UTM parameters, and stores traffic source referrers
 */
export function initSession() {
  if (!isBrowser) return null;

  // 1. Establish persistent session ID
  let sessionId = localStorage.getItem("youssef_session_id");
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem("youssef_session_id", sessionId);
  }

  // 2. Lock session traffic source referrer (First touch wins)
  let sessionReferrer = sessionStorage.getItem("youssef_referrer");
  if (!sessionReferrer) {
    sessionReferrer = document.referrer || "Direct";
    sessionStorage.setItem("youssef_referrer", sessionReferrer);
  }

  // 3. Extract and lock UTM query parameters (Session attribution persistence)
  const urlParams = new URLSearchParams(window.location.search);
  const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  
  utmParams.forEach(param => {
    const value = urlParams.get(param);
    if (value) {
      sessionStorage.setItem(`youssef_${param}`, value.trim());
      console.log(`[ANALYTICS] Captured UTM parameter: ${param} = ${value}`);
    }
  });

  return sessionId;
}

/**
 * Dispatches a non-blocking tracking event beacon to the database
 * 
 * @param eventName Name of the telemetry action (e.g. 'page_view', 'product_view', 'add_to_cart')
 * @param productId Optional course or digital product ID
 * @param productTitle Optional course or digital product title
 * @param metadata Extra payload parameters (e.g. price, path, errors)
 */
export async function trackEvent(
  eventName: string,
  productId?: string | null,
  productTitle?: string | null,
  metadata: Record<string, any> = {}
) {
  if (!isBrowser) return;

  try {
    // Lazy initialize session parameters if missing
    let sessionId = localStorage.getItem("youssef_session_id");
    if (!sessionId) {
      sessionId = initSession() || "";
    }

    const referrer = sessionStorage.getItem("youssef_referrer") || document.referrer || "Direct";
    const utmSource = sessionStorage.getItem("youssef_utm_source");
    const utmMedium = sessionStorage.getItem("youssef_utm_medium");
    const utmCampaign = sessionStorage.getItem("youssef_utm_campaign");
    const utmContent = sessionStorage.getItem("youssef_utm_content");
    const utmTerm = sessionStorage.getItem("youssef_utm_term");

    // Retrieve active user ID if signed in (lazily read from token or custom storage if available)
    let loggedInUserId = null;
    try {
      const sbTokenStr = localStorage.getItem("sb-ftiyeuhqqxpraiasjjvz-auth-token");
      if (sbTokenStr) {
        const parsed = JSON.parse(sbTokenStr);
        if (parsed?.user?.id) {
          loggedInUserId = parsed.user.id;
        }
      }
    } catch {}

    const payload = {
      event_name: eventName,
      session_id: sessionId,
      user_id: loggedInUserId,
      product_id: productId || null,
      product_title: productTitle || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      utm_content: utmContent || null,
      utm_term: utmTerm || null,
      referrer: referrer,
      user_agent: navigator.userAgent,
      metadata: {
        ...metadata,
        url: window.location.href,
        pathname: window.location.pathname
      }
    };

    console.log(`[ANALYTICS] Tracking event "${eventName}":`, payload);

    const apiPath = "/api/track";

    // Use sendBeacon for guaranteed asynchronous background delivery on unload/navigation
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      navigator.sendBeacon(apiPath, blob);
    } else {
      // Fallback to fetch with keepalive true
      fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(err => console.warn("[ANALYTICS] Fetch track failed:", err));
    }
  } catch (err) {
    console.warn("[ANALYTICS] Firing track failed safely:", err);
  }
}

// Bind to window for easy inline event triggers across static elements
if (isBrowser) {
  (window as any).trackYoussefEvent = trackEvent;
}
