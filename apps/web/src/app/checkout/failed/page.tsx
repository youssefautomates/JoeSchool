"use client";

import { motion } from "framer-motion";
import { XCircle, ArrowRight, RefreshCcw, ShieldAlert, MessageCircle, Home } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "N/A";
  const reason = searchParams.get("reason") || "حدث خطأ غير متوقع أثناء معالجة الدفع";

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[100px]" />
      </div>

      <main className="pt-32 pb-24 relative z-10">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full text-center"
          >
            <div className="bg-zinc-100/30 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 border border-zinc-200/60 shadow-sm border border-zinc-200/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-brand-600" />
              
              <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>

              <h1 className="text-3xl md:text-4xl font-sans font-black text-zinc-900 mb-4">فشلت عملية الدفع</h1>
              <p className="text-zinc-500 font-alexandria text-lg mb-8 leading-relaxed">
                نعتذر، لم نتمكن من إتمام عملية الدفع. يرجى التأكد من رصيد حسابك أو بيانات البطاقة والمحاولة مرة أخرى.
              </p>

              <div className="bg-zinc-100/40 rounded-2xl p-6 mb-10 text-right space-y-3 border border-zinc-200/60">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-zinc-900 font-bold" dir="ltr">{orderId}</span>
                  <span className="font-sans text-zinc-500 text-sm">رقم الطلب:</span>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-200/60 pt-3">
                  <span className="font-sans text-red-400 font-bold text-sm">
                    {reason === "verification_timeout" ? "انتهت مهلة التحقق من البنك (البطاقة)" : 
                     reason === "declined" ? "تم رفض العملية من البنك المصدر للبطاقة" : 
                     reason === "insufficient_funds" ? "الرصيد غير كافٍ في البطاقة" : 
                     reason === "expired_card" ? "البطاقة البنكية منتهية الصلاحية" : 
                     reason}
                  </span>
                  <span className="font-sans text-zinc-500 text-sm">السبب:</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => window.history.back()}
                  className="w-full h-16 bg-white text-[#050505] hover:bg-zinc-200 font-sans font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm border border-zinc-200/60 shadow-white/5"
                >
                  <RefreshCcw className="w-5 h-5" />
                  إعادة المحاولة
                </button>
                <Link
                  href="/"
                  className="w-full h-16 bg-zinc-100/40 border border-zinc-200 text-zinc-900 hover:bg-zinc-100/80 font-sans font-bold rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  العودة للرئيسية
                  <Home className="w-5 h-5" />
                </Link>
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-zinc-500 font-sans text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>دفع آمن ومشفر 100%</span>
              </div>
              <Link href="https://wa.me/201107099196" className="flex items-center gap-2 text-yellow-500 font-sans text-sm hover:underline font-bold transition-all">
                <MessageCircle className="w-4 h-4" />
                تواصل مع الدعم الفني للمساعدة
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <div className="fixed bottom-0 w-full py-6 text-center opacity-40">
        <p className="text-zinc-600 text-xs font-sans">© {new Date().getFullYear()} JoeSchool — Premium Digital Experiences</p>
      </div>
    </div>
  );
}

export default function FailedPage() {
  return (
    <Suspense fallback={null}>
      <FailedContent />
    </Suspense>
  );
}
