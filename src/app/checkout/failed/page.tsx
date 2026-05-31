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
    <div className="min-h-screen bg-[#050505] text-white font-cairo overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px]" />
      </div>

      <main className="pt-32 pb-24 relative z-10">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full text-center"
          >
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600" />
              
              <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>

              <h1 className="text-3xl md:text-4xl font-alexandria font-black text-white mb-4">فشلت عملية الدفع</h1>
              <p className="text-zinc-400 font-cairo text-lg mb-8 leading-relaxed">
                نعتذر، لم نتمكن من إتمام عملية الدفع. يرجى التأكد من رصيد حسابك أو بيانات البطاقة والمحاولة مرة أخرى.
              </p>

              <div className="bg-white/5 rounded-2xl p-6 mb-10 text-right space-y-3 border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-white font-bold" dir="ltr">{orderId}</span>
                  <span className="font-cairo text-zinc-500 text-sm">رقم الطلب:</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                  <span className="font-cairo text-red-400 font-bold text-sm">
                    {reason === "verification_timeout" ? "انتهت مهلة التحقق من البنك (البطاقة)" : 
                     reason === "declined" ? "تم رفض العملية من البنك المصدر للبطاقة" : 
                     reason === "insufficient_funds" ? "الرصيد غير كافٍ في البطاقة" : 
                     reason === "expired_card" ? "البطاقة البنكية منتهية الصلاحية" : 
                     reason}
                  </span>
                  <span className="font-cairo text-zinc-500 text-sm">السبب:</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => window.history.back()}
                  className="w-full h-16 bg-white text-[#050505] hover:bg-zinc-200 font-alexandria font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                >
                  <RefreshCcw className="w-5 h-5" />
                  إعادة المحاولة
                </button>
                <Link
                  href="/"
                  className="w-full h-16 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-alexandria font-bold rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  العودة للرئيسية
                  <Home className="w-5 h-5" />
                </Link>
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-zinc-500 font-cairo text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>دفع آمن ومشفر 100%</span>
              </div>
              <Link href="https://wa.me/message/YOUR_WHATSAPP" className="flex items-center gap-2 text-rose-500 font-cairo text-sm hover:underline font-bold transition-all">
                <MessageCircle className="w-4 h-4" />
                تواصل مع الدعم الفني للمساعدة
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <div className="fixed bottom-0 w-full py-6 text-center opacity-40">
        <p className="text-zinc-600 text-xs font-cairo">© {new Date().getFullYear()} JoeSchool — Premium Digital Experiences</p>
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
