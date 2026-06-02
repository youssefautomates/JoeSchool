import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { PixelTracker } from "@/components/PixelTracker";
import { getKV } from "@/lib/kv";
import "./globals.css";

const cairo = { variable: "font-cairo" };
const alexandria = { variable: "font-alexandria" };

export const metadata: Metadata = {
  metadataBase: new URL("https://youssefautomates.com"),
  title: {
    default: "Youssef Automates | منصة يوسف أوتوميتس لتعليم الأتمتة والذكاء الاصطناعي",
    template: "%s | Youssef Automates"
  },
  description: "أكاديمية يوسف أوتوميتس لتعلم أتمتة الأعمال، أنظمة الذكاء الاصطناعي، إنتاج المحتوى وسير العمل الذكي لزيادة الإنتاجية.",
  keywords: ["ذكاء اصطناعي", "أتمتة الأعمال", "يوسف أوتوميتس", "Youssef Automates", "سير العمل بدون كود", "أنظمة الأتمتة", "أدوات الذكاء الاصطناعي", "صناعة المحتوى", "زيادة الإنتاجية"],
  authors: [{ name: "Youssef Ahmed" }],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "https://youssefautomates.com",
    title: "Youssef Automates | منصة احتراف الأتمتة وأنظمة الذكاء الاصطناعي",
    description: "تعلم أتمتة العمليات، أدوات الذكاء الاصطناعي، ورفع الإنتاجية مع منصة يوسف أوتوميتس.",
    siteName: "Youssef Automates",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getKV("marketing_settings");

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${alexandria.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-white text-zinc-900 font-cairo flex flex-col antialiased selection:bg-rose-600/10 selection:text-rose-600">
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

