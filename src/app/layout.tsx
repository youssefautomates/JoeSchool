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
  metadataBase: new URL("https://joeschool.com"),
  title: {
    default: "JoeSchool | أكاديمية جو سكول لإنتاج المحتوى بالذكاء الاصطناعي",
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

