import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { PixelTracker } from "@/components/PixelTracker";
import { getKV } from "@/lib/kv";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://joeschool.com"),
  title: {
    default: "JoeSchool | Learn AI Content Creation",
    template: "%s | JoeSchool"
  },
  description: "أكاديمية جو سكول المتخصصة في تعليم إنتاج المحتوى الاحترافي بالذكاء الاصطناعي، صناعة الفيديوهات الاحترافية، المحتوى السينمائي، والأدوات الإبداعية للمبدعين.",
  keywords: ["ذكاء اصطناعي", "إنتاج المحتوى", "جو سكول", "JoeSchool", "محتوى سينمائي", "فيديو بالذكاء الاصطناعي", "أدوات الإبداع", "صناعة المحتوى", "تعليم رقمي"],
  authors: [{ name: "Youssef Mostafa" }],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "https://joeschool.com",
    title: "JoeSchool | أكاديمية إنتاج المحتوى الاحترافي بالذكاء الاصطناعي",
    description: "تعلم إنتاج المحتوى الاحترافي، الفيديوهات السينمائية، والأدوات الإبداعية مع أكاديمية جو سكول.",
    siteName: "JoeSchool",
    images: [
      {
        url: "/logo-text.png",
        width: 800,
        height: 600,
        alt: "JoeSchool Logo",
      }
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings: any = null;
  try {
    settings = await getKV("marketing_settings");
  } catch (err) {
    console.error("[RootLayout] Failed to fetch marketing settings:", err);
  }

  const cleanPixelId = settings?.metaPixelId ? String(settings.metaPixelId).trim() : "";
  const isPixelEnabled = settings?.metaPixelEnabled && cleanPixelId && /^\d+$/.test(cleanPixelId);

  return (
    <html
      lang="ar"
      dir="rtl"
      className="scroll-smooth"
    >
      <head>
        {isPixelEnabled && (
          <>
            <script
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
                  fbq('init', '${cleanPixelId}');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${cleanPixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}
      </head>
      <body className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col antialiased selection:bg-brand-600/10 selection:text-brand-600">
        <Providers>
          <Suspense fallback={null}>
            <PixelTracker initialSettings={settings} />
          </Suspense>
          {children}
          <Toaster theme="light" position="top-center" closeButton richColors />
        </Providers>
      </body>
    </html>
  );
}

