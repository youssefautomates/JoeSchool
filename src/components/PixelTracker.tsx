"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

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

  useEffect(() => {
    if (!settings) return;

    // Track PageView on route change
    if (settings.metaPixelEnabled && settings.metaPixelId && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
    if (settings.tiktokPixelEnabled && settings.tiktokPixelId && (window as any).ttq) {
      (window as any).ttq.page();
    }
  }, [pathname, searchParams, settings]);

  if (!settings) return null;

  return (
    <>
      {/* Meta Pixel */}
      {settings.metaPixelEnabled && settings.metaPixelId && (
        <>
          <Script
            id="meta-pixel-base"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${settings.metaPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img 
              height="1" 
              width="1" 
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${settings.metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
      
      {/* TikTok Pixel */}
      {settings.tiktokPixelEnabled && settings.tiktokPixelId && (
        <Script
          id="tiktok-pixel-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${settings.tiktokPixelId}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
}
