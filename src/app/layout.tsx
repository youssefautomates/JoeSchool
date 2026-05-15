import type { Metadata, Viewport } from "next";
import { Cairo, Alexandria } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
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
  title: {
    default: "Youssef Automates | حلول الأتمتة والمنتجات الرقمية الفاخرة",
    template: "%s | Youssef Automates"
  },
  description: "انطلق نحو المستقبل مع يوسف أوتميتس. نوفر لك أرقى حلول أتمتة الأعمال n8n والمنتجات الرقمية التي تضاعف إنتاجيتك.",
  keywords: ["أتمتة", "n8n", "منتجات رقمية", "ذكاء اصطناعي", "تسويق رقمي", "يوسف أوتميتس"],
  authors: [{ name: "Youssef Ahmed" }],
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "https://youssefautomates.com",
    title: "Youssef Automates | الحل الأمثل للأتمتة الذكية",
    description: "ضاعف إنتاجيتك الآن مع أرقى حلول الأتمتة n8n.",
    siteName: "Youssef Automates",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${alexandria.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-white text-zinc-900 font-cairo flex flex-col antialiased selection:bg-rose-600/10 selection:text-rose-600">
        <Providers>
          {children}
          <Toaster theme="light" position="top-center" closeButton richColors />
        </Providers>
      </body>
    </html>
  );
}

