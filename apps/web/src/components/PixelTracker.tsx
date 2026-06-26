"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { initSession, trackEvent } from "@/lib/analytics";
import { trackMetaEvent } from "@/lib/metaPixel";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    ttq: any;
  }
}

export function PixelTracker({ initialSettings }: { initialSettings?: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<any>(initialSettings || null);

  // Synchronously write settings to window for early/static loads
  if (typeof window !== "undefined" && settings) {
    (window as any).metaTrackingSettings = settings;
  }

  // Sync settings with metaPixel and tiktokPixel modules reactive tracking layer
  useEffect(() => {
    if (settings) {
      import("@/lib/metaPixel").then(mod => {
        mod.initMetaPixel(settings);
      });
      import("@/lib/tiktokPixel").then(mod => {
        mod.initTiktokPixel(settings);
      });
    }
  }, [settings]);

  useEffect(() => {
    if (!initialSettings) {
      console.log("%c[PixelTracker] No initial settings, fetching...", "color: #ff0055; font-weight: bold;");
      fetch("/api/admin/settings")
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setSettings(data);
          }
        })
        .catch(err => console.error("[PixelTracker] Fetch error:", err));
    }
  }, [initialSettings]);

  // 1. Initialize visitor session & parse UTM/referrer params on mount
  useEffect(() => {
    initSession();
  }, []);

  const envTiktokId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID ? String(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID).trim() : "";
  const activeTiktokId = envTiktokId || (settings?.tiktokPixelId ? String(settings.tiktokPixelId).trim() : "");
  const isTiktokEnabled = envTiktokId ? true : (settings ? (!!settings.tiktokPixelEnabled && !!activeTiktokId) : false);

  // 2. Track global database PageView & pixel page views on route changes
  useEffect(() => {
    // Database Clickstream PageView Ingestion
    trackEvent("page_view", null, null, { path: pathname });

    // Track Meta PageViews on route change (without window.fbq guard to let queue work)
    if (settings && settings.metaPixelEnabled && settings.metaPixelId) {
      trackMetaEvent("PageView");
    }
    
    // Track TikTok PageViews on route change (using tiktokPixel module)
    if (isTiktokEnabled && activeTiktokId) {
      import("@/lib/tiktokPixel").then(mod => {
        mod.trackTiktokPageView();
      });
    }
  }, [pathname, searchParams, settings, isTiktokEnabled, activeTiktokId]);

  // 3. Visitor Type Tracker (First Time vs. Returning)
  useEffect(() => {
    if (!settings || !settings.metaPixelEnabled) return;
    
    const visited = localStorage.getItem("youssef_visited_before");
    if (!visited) {
      localStorage.setItem("youssef_visited_before", "true");
      trackMetaEvent("FirstTimeVisit", { path: pathname }, `first_visit_${pathname}`);
    } else {
      trackMetaEvent("ReturningVisit", { path: pathname }, `returning_visit_${pathname}`);
    }
  }, [pathname, settings]);

  // 4. Throttled Scroll Depth Tracker (50%, 90% only)
  useEffect(() => {
    if (!settings || !settings.metaPixelEnabled) return;
    
    const trackedDepths = new Set<number>();
    
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
      const milestones = [50, 90];
      
      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !trackedDepths.has(milestone)) {
          trackedDepths.add(milestone);
          trackMetaEvent("ScrollDepth", { 
            percent: milestone, 
            path: pathname 
          }, `scroll_${pathname}_${milestone}`);
        }
      }
    };
    
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledScroll = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        handleScroll();
        throttleTimeout = null;
      }, 250); // 250ms throttle to maintain core page performance
    };
    
    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [pathname, settings]);

  // 5. Time on Page retention tracker (30s, 2m only)
  useEffect(() => {
    if (!settings || !settings.metaPixelEnabled) return;
    
    const intervals = [30, 120]; // 30s, 2m retention milestones
    const timers = intervals.map(seconds => {
      return setTimeout(() => {
        trackMetaEvent("TimeOnPage", { 
          seconds, 
          path: pathname 
        }, `time_${pathname}_${seconds}`);
      }, seconds * 1000);
    });
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [pathname, settings]);

  // 6. Smart Funnel Checkout Abandonment Tracker
  useEffect(() => {
    if (!settings || !settings.metaPixelEnabled) return;
    
    const isCheckoutPage = pathname.startsWith("/checkout") && !pathname.includes("/success") && !pathname.includes("/failed");
    
    if (pathname.includes("/checkout/success")) {
      sessionStorage.removeItem("youssef_abandonment_flag");
      sessionStorage.removeItem("checkout_abandoned_fired");
      return;
    }

    if (!isCheckoutPage) {
      return;
    }

    // Set abandonment flag
    sessionStorage.setItem("youssef_abandonment_flag", "true");

    let inactivityTimer: NodeJS.Timeout | null = null;
    let tabLeaveTimer: NodeJS.Timeout | null = null;

    const fireAbandonment = (reason: string) => {
      const alreadyFired = sessionStorage.getItem("checkout_abandoned_fired");
      if (alreadyFired) return;
      
      sessionStorage.setItem("checkout_abandoned_fired", "true");
      trackMetaEvent("CheckoutAbandonment", { 
        reason,
        path: pathname 
      }, `abandonment_${Date.now()}`);
    };

    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        fireAbandonment("inactivity_3min");
      }, 3 * 60 * 1000); // 3 minutes inactivity timeout
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User switched tab or minimized browser. Debounce by 20s to prevent false alarms on refresh or brief transitions
        tabLeaveTimer = setTimeout(() => {
          fireAbandonment("tab_hidden_leave");
        }, 20000);
      } else {
        if (tabLeaveTimer) clearTimeout(tabLeaveTimer);
      }
    };

    // Event listeners to detect activity
    window.addEventListener("mousemove", resetInactivity, { passive: true });
    window.addEventListener("keypress", resetInactivity, { passive: true });
    window.addEventListener("scroll", resetInactivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initialize inactivity timer
    resetInactivity();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (tabLeaveTimer) clearTimeout(tabLeaveTimer);
      window.removeEventListener("mousemove", resetInactivity);
      window.removeEventListener("keypress", resetInactivity);
      window.removeEventListener("scroll", resetInactivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname, settings]);

  if (!settings) return null;

  const cleanPixelId = settings.metaPixelId ? String(settings.metaPixelId).trim() : "";
  const isPixelEnabled = settings.metaPixelEnabled && cleanPixelId && /^\d+$/.test(cleanPixelId);

  return (
    <>
      {/* Meta Pixel */}
      {isPixelEnabled && (
        <>
          <Script id="meta-pixel-base" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${cleanPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img 
              height="1" 
              width="1" 
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${cleanPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
      
      {/* TikTok Pixel */}
      {isTiktokEnabled && activeTiktokId && (
        <Script
          id="tiktok-pixel-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${activeTiktokId}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
}
