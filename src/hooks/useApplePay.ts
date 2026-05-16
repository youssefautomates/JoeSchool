"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect Apple Pay availability.
 * Returns true ONLY on Apple devices with Apple Pay configured.
 * Returns false on Android, Windows, unsupported browsers, etc.
 */
export function useApplePay() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // SSR guard
    if (typeof window === "undefined") return;

    try {
      // Check if ApplePaySession exists (Safari on Apple devices only)
      if (
        "ApplePaySession" in window &&
        (window as any).ApplePaySession?.canMakePayments?.()
      ) {
        setIsAvailable(true);
      }
    } catch {
      // Silently fail — not an Apple device
      setIsAvailable(false);
    }
  }, []);

  return isAvailable;
}
