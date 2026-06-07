export type Currency = "EGP" | "USD";

/**
 * 🌍 Resolves the user's currency based on Vercel's IP Geolocation headers.
 * Safe to be called on both Server Side and Client Side.
 */
export async function resolveUserCurrency(forcedHeaders?: Headers): Promise<Currency> {
  // 1. If executing on the server (with forcedHeaders passed)
  if (typeof window === "undefined") {
    if (forcedHeaders) {
      const country = forcedHeaders.get("x-vercel-ip-country") || "EG";
      if (country.toUpperCase() === "EG") {
        return "EGP";
      }
      return "USD";
    }
    return "EGP";
  }

  // 2. Client Side: Fetch geolocalized currency from our API endpoint
  try {
    const response = await fetch("/api/pricing/detect");
    const data = await response.json();
    if (data && data.currency) {
      return data.currency as Currency;
    }
    return "EGP";
  } catch (e) {
    console.warn("[Pricing Resolver] Failed to fetch detected currency, falling back to EGP:", e);
    return "EGP";
  }
}

/**
 * 💵 Resolves and maps the dual-price properties of an item (Product, Course, Bundle) 
 * into standard price/original_price properties for backward-compatible rendering.
 */
export function resolveProductPrice(
  item: any,
  currency: Currency
): { price: number; original_price: number; discount_pct: number } {
  if (!item) {
    return { price: 0, original_price: 0, discount_pct: 0 };
  }

  let price = 0;
  let original_price = 0;

  if (currency === "EGP") {
    price = item.price_egp !== undefined && item.price_egp !== null && Number(item.price_egp) > 0
      ? Number(item.price_egp)
      : Number(item.price) || 0;
    
    original_price = item.original_price_egp !== undefined && item.original_price_egp !== null && Number(item.original_price_egp) > 0
      ? Number(item.original_price_egp)
      : Number(item.original_price) || 0;
  } else {
    price = item.price_usd !== undefined && item.price_usd !== null && Number(item.price_usd) > 0
      ? Number(item.price_usd)
      : Number(item.price) || 0;

    original_price = item.original_price_usd !== undefined && item.original_price_usd !== null && Number(item.original_price_usd) > 0
      ? Number(item.original_price_usd)
      : Number(item.original_price) || 0;
  }

  // Calculate discount percentage
  let discount_pct = 0;
  if (original_price > price) {
    discount_pct = Math.round(((original_price - price) / original_price) * 100);
  }

  return { price, original_price, discount_pct };
}

/**
 * 🎨 Formats a numeric price into a localized currency string.
 */
export function formatPrice(price: number, currency: Currency): string {
  if (currency === "EGP") {
    if (typeof window !== "undefined" && window.location.pathname.includes("/admin")) {
      return `${price} EGP`;
    }
    return `${price} \u062c.\u0645`;
  }
  return `$${price.toFixed(2)}`;
}

let cachedRate: number | null = null;
let lastFetched: number = 0;

/**
 * 💸 Gets real-time or configured exchange rate for USD to EGP conversions.
 * Fetches from a live dynamic API with in-memory caching and timeout fallbacks.
 */
export async function getUSDtoEGPExchangeRate(): Promise<number> {
  const cacheDuration = 10 * 60 * 1000; // 10 minutes cache
  const now = Date.now();

  if (cachedRate && (now - lastFetched < cacheDuration)) {
    return cachedRate;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 600 } // NextJS fetch cache options
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    if (data && data.rates && typeof data.rates.EGP === "number") {
      cachedRate = data.rates.EGP;
      lastFetched = now;
      console.log(`[ExchangeRate] Successfully fetched live USD to EGP rate: ${cachedRate}`);
      return data.rates.EGP;
    }
  } catch (error) {
    console.error("[ExchangeRate] Failed to fetch live exchange rate, falling back to 50.0:", error);
  }

  return cachedRate || 50.0;
}
