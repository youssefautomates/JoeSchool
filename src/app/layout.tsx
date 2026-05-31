import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Cairo, Alexandria } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { PixelTracker } from "@/components/PixelTracker";
import { getKV } from "@/lib/kv";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  variable: "--font-cairo",
  display: 'swap',
});

const alexandria = Alexandria({
  subsets: ["arabic"],
  variable: "--font-alexandria",
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL("https://joeschool.com"),
  title: {
    default: "JoeSchool | منصة وتطبيقات جو سكول للتعليم الرقمي",
    template: "%s | JoeSchool"
  },
  description: "أكاديمية جو سكول لتعلم صناعة المحتوى بالذكاء الاصطناعي، الرسوم المتحركة، إنتاج الفيديو الإبداعي، والسرد القصصي الرقمي.",
  keywords: ["ذكاء اصطناعي", "صناعة المحتوى بالذكاء الاصطناعي", "الرسوم المتحركة بالذكاء الاصطناعي", "إنتاج الفيديو الإبداعي", "السرد القصصي الرقمي", "جو سكول", "منشئ محتوى"],
  authors: [{ name: "Youssef Ahmed" }],
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "https://joeschool.com",
    title: "JoeSchool | منصة احتراف صناعة المحتوى بالذكاء الاصطناعي",
    description: "تعلم الرسوم المتحركة، إنتاج الفيديو الإبداعي، والسرد القصصي الرقمي باستخدام الذكاء الاصطناعي مع جو سكول.",
    siteName: "JoeSchool",
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

