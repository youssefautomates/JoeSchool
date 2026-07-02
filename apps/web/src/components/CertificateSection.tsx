"use client";

import { motion } from "framer-motion";
import { Award, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

export function CertificateSection() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden bg-white select-none font-sans">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-brand-500/5 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-0 left-10 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-600/5 rounded-full blur-[80px] mix-blend-screen" />
      </div>

      <div className="container relative z-10 mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Details & Guarantees (Stacked vertically on mobile, aligned right) */}
          <div className="lg:col-span-6 space-y-8 order-2 lg:order-1 text-right" dir="rtl">
            
            {/* Certificate Detail Item */}
            <div className="flex gap-4 sm:gap-5 items-start">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/60">
                <Award className="w-7 h-7 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-sans font-bold text-zinc-900">شهادة إتمام الدورة</h3>
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl">
                  ستحصل عليها فوراً بعد إتمام مشاهدة جميع دروس الدورة من خلال لوحة التحكم الخاصة بك في الموقع، لتشهد على تفوقك واكتسابك المهارات الجديدة.
                </p>
              </div>
            </div>

            {/* Guarantee Detail Item */}
            <div className="flex gap-4 sm:gap-5 items-start">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/60">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-sans font-bold text-zinc-900">ضمان استرجاع كامل</h3>
                <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed max-w-xl">
                  تقدر تسترجع إشتراكك بالكامل في حالة عدم الإستفادة من الكورس. للاطلاع على كامل شروط وقواعد سياسة الاسترجاع الخاصة بنا{" "}
                  <Link href="/privacy?tab=refund" className="text-[#1D4ED8] underline font-bold hover:text-[#ff2d6b] transition-colors">
                    اضغط هنا
                  </Link>
                </p>
              </div>
            </div>

            {/* Subscribe Action Button */}
            <div className="pt-4 flex justify-center lg:justify-start">
              <Link
                href="#courses"
                className="group relative h-14 px-10 inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-sans text-sm sm:text-base font-bold shadow-[0_0_25px_rgba(29, 78, 216,0.35)] hover:shadow-[0_0_40px_rgba(29, 78, 216,0.6)] transition-all duration-300 hover:-translate-y-0.5 active:scale-98 cursor-pointer"
              >
                <span>إشترك الآن</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

          </div>

          {/* Right Column: Premium Certificate Image */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex justify-center w-full">
            <motion.div 
              whileHover={{ scale: 1.02, y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-full max-w-lg aspect-[1.414/1] shadow-sm border border-zinc-200/60 rounded-2xl overflow-hidden border border-zinc-200"
            >
              <img 
                src="/certificate-aiac.png" 
                alt="شهادة إتمام الدورة" 
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

        </div>
      </div>
      {/* Subtle Bottom Section Divider */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
