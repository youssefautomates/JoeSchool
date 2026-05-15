"use client";

import { motion } from "framer-motion";
import { XCircle, ArrowRight, RefreshCcw, ShieldAlert, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "N/A";
  const reason = searchParams.get("reason") || "حدث خطأ غير متوقع";

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      
      <main className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full text-center"
          >
            <div className="glass-card rounded-[3rem] p-12 border-red-50 bg-white/80 shadow-2xl relative overflow-hidden">
              <div className="w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>

              <h1 className="text-4xl font-alexandria font-black text-zinc-900 mb-4">عذراً، فشلت عملية الدفع</h1>
              <p className="text-zinc-500 font-cairo text-lg mb-8">
                لم نتمكن من معالجة عملية الدفع الخاصة بك. يرجى التأكد من بيانات البطاقة أو المحفظة والمحاولة مرة أخرى.
              </p>

              <div className="bg-zinc-50 rounded-2xl p-6 mb-10 text-right space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-zinc-900 font-bold">{orderId}</span>
                  <span className="font-cairo text-zinc-500">رقم الطلب:</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-cairo text-red-500 font-bold">{reason}</span>
                  <span className="font-cairo text-zinc-500">السبب:</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => window.history.back()}
                  className="w-full h-16 bg-zinc-900 hover:bg-zinc-800 text-white font-alexandria font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <RefreshCcw className="w-5 h-5" />
                  المحاولة مرة أخرى
                </button>
                <Link
                  href="/"
                  className="w-full h-16 bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50 font-alexandria font-bold rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  العودة للرئيسية
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-zinc-400 font-cairo text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>دفع آمن ومشفر 100%</span>
              </div>
              <Link href="#" className="flex items-center gap-2 text-rose-600 font-cairo text-sm hover:underline font-bold">
                <MessageCircle className="w-4 h-4" />
                تواصل مع الدعم الفني
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  );
}
