"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Mail, ArrowRight, ShieldCheck, Sparkles, Star, Rocket, Camera, X } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "ORD-" + Math.floor(Math.random() * 100000);
  const [mounted, setMounted] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<"verifying" | "delivered" | "pending" | "error">("verifying");

  useEffect(() => {
    setMounted(true);

    // Automatically verify payment and trigger delivery
    async function verifyAndDeliver() {
      if (!orderId || orderId.startsWith("ORD-")) return;
      
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch("/api/paymob/verify-and-deliver", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          const data = await res.json();
          
          if (data.success) {
            setDeliveryStatus("delivered");
            console.log("[SUCCESS] ✅ Product delivered via email.", data.alreadyDelivered ? "(already sent)" : "(just sent)");
            
            // Fire Purchase Pixel Events (only once per session if possible, but safe here)
            if (!data.alreadyDelivered && typeof window !== "undefined") {
              if (window.fbq) {
                window.fbq('track', 'Purchase', {
                  value: data.orderValue,
                  currency: data.currency,
                  content_name: data.productNames,
                  content_ids: [orderId],
                  content_type: 'product'
                });
              }
              if (window.ttq) {
                window.ttq.track('CompletePayment', {
                  value: data.orderValue,
                  currency: data.currency,
                  contents: [{ content_id: orderId, content_name: data.productNames, quantity: 1 }],
                  content_type: 'product'
                });
              }
            }
            return;
          }
          
          if (data.status === "pending" && attempts < maxAttempts) {
            console.log(`[SUCCESS] ⏳ Payment pending, retrying in 3s... (${attempts}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }

          setDeliveryStatus("pending");
          return;
        } catch (err) {
          console.error("[SUCCESS] Verification error:", err);
          if (attempts >= maxAttempts) {
            setDeliveryStatus("error");
          }
        }
      }
    }

    verifyAndDeliver();
  }, [orderId]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      
      <main className="pt-32 pb-24 relative overflow-hidden">
        {/* Celebrate Background Particles/Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-4 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="max-w-3xl w-full"
          >
            {/* Main Success Card */}
            <div className="glass-card rounded-[3rem] p-8 md:p-16 border-emerald-100 bg-white/80 shadow-2xl text-center relative overflow-hidden">
              {/* Confetti-like elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-rose-500 to-teal-500" />
              
              <motion.div 
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/30 rotate-3"
              >
                <CheckCircle2 className="w-16 h-16 text-white" />
              </motion.div>

              <div className="space-y-4 mb-12">
                <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-1.5 font-cairo text-xs font-bold uppercase tracking-widest">
                  Order Confirmed ⚡
                </Badge>
                <h1 className="text-4xl md:text-6xl font-alexandria font-black text-zinc-900 tracking-tighter">أهلاً بك في المستقبل!</h1>
                <p className="text-zinc-500 font-cairo text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
                  تم تأكيد طلبك بنجاح. لقد اتخذت الخطوة الأولى نحو أتمتة أعمالك بذكاء.
                </p>
                <div className="inline-flex items-center gap-2 bg-zinc-50 px-6 py-2 rounded-full border border-zinc-100 mt-4">
                  <span className="font-cairo text-zinc-400 text-sm">رقم الطلب:</span>
                  <span className="font-mono font-black text-zinc-900">{orderId}</span>
                </div>
              </div>

              {/* Action Box */}
              <div className="grid gap-6 mb-12">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6 text-right">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-alexandria font-bold text-zinc-900 text-xl mb-2">الملفات في طريقها إليك</h3>
                    <p className="font-cairo text-zinc-600 leading-relaxed text-sm md:text-base">
                      تحقق من بريدك الإلكتروني الآن. ستجد رسالة من <span className="text-emerald-600 font-bold">يوسف أوتميتس</span> تحتوي على جميع روابط التحميل والتعليمات.
                    </p>
                  </div>
                </div>

                <Link
                  href="/download/temporary-direct-link"
                  className="w-full h-20 bg-zinc-900 hover:bg-emerald-600 text-white font-alexandria font-black text-2xl rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl shadow-zinc-900/10 active:scale-95 group"
                >
                  <Download className="w-7 h-7 group-hover:translate-y-1 transition-transform" />
                  تحميل الملفات فوراً
                </Link>
              </div>

              {/* Share & Support */}
              <div className="pt-8 border-t border-zinc-100">
                <p className="font-cairo text-zinc-400 text-sm mb-6">هل أنت متحمس؟ شاركنا نجاحك!</p>
                <div className="flex justify-center gap-4">
                  <Link href="#" className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-rose-500 transition-colors">
                    <X className="w-5 h-5" />
                  </Link>
                  <Link href="#" className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-pink-500 transition-colors">
                    <Camera className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Support Trust */}
            <div className="mt-12 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-zinc-400 font-cairo">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>جميع ملفاتك مؤمنة بضمان يوسف أوتميتس</span>
              </div>
              <p className="text-sm text-zinc-400 font-cairo">
                تواجه مشكلة؟ <Link href="#" className="text-rose-600 font-bold hover:underline">تحدث مع الدعم الفني مباشرة</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full"
        />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

