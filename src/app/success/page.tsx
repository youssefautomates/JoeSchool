"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "ORD-" + Math.floor(Math.random() * 100000);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-32 px-4 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl w-full relative z-10"
        >
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
            {/* Top Border Highlight */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
            
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-100 shadow-xl shadow-emerald-500/10"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-alexandria font-bold text-zinc-900 mb-4">تم الدفع بنجاح!</h1>
            <p className="text-zinc-600 font-cairo text-lg mb-2">
              رقم الطلب: <span className="text-zinc-900 font-mono font-bold">{orderId}</span>
            </p>
            
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-6 my-8 flex items-start gap-4 text-right shadow-sm">
              <Mail className="w-8 h-8 text-blue-600 shrink-0 mt-1" />
              <div>
                <h3 className="text-zinc-900 font-bold font-cairo text-lg mb-2">تم إرسال الملفات إلى بريدك الإلكتروني</h3>
                <p className="text-zinc-600 font-cairo text-sm leading-relaxed">
                  لقد قمنا للتو بإرسال رسالة تحتوي على روابط التحميل الآمنة للمنتجات التي قمت بشرائها. يرجى التحقق من صندوق الوارد (أو مجلد الرسائل المزعجة Spam).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Link
                href="/download/temporary-direct-link"
                className="w-full h-14 inline-flex items-center justify-center gap-2 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-cairo rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Download className="w-5 h-5" />
                تحميل الملفات الآن (رابط مباشر مؤقت)
              </Link>
              
              <Link
                href="/"
                className="w-full h-14 inline-flex items-center justify-center gap-2 text-lg font-semibold border border-zinc-200 text-zinc-900 hover:bg-zinc-50 font-cairo rounded-xl transition-all"
              >
                العودة للصفحة الرئيسية
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="mt-8 flex justify-center items-center gap-2 text-zinc-500 font-cairo text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            بياناتك ومعاملتك محمية ومؤمنة بالكامل
          </div>
        </motion.div>
      </div>
      <Footer />
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-zinc-500 font-cairo text-lg">جاري التحميل...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
