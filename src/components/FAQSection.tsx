"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "كيف يتم استلام المنتج بعد الدفع؟",
    a: "التسليم فوري وتلقائي. بمجرد إتمام الدفع، ستظهر لك روابط التحميل مباشرة في صفحة النجاح، كما ستصلك رسالة بريد إلكتروني تحتوي على كافة الملفات والروابط."
  },
  {
    q: "هل أحتاج لخبرة تقنية لاستخدام الأدوات؟",
    a: "نوفر لك مع كل منتج أدلة استخدام ومقاطع تعليمية مبسطة. الحزم والأصول الإبداعية مصممة لتستخدمها مباشرة في إنتاجك اليومي بسهولة تامة."
  },
  {
    q: "هل أحصل على تحديثات مجانية للمنتجات؟",
    a: "نعم، كل منتج تشتريه يحصل على تحديثات مدى الحياة مجاناً. سيتم إخطارك بالبريد الإلكتروني عند توفر أي نسخة جديدة."
  },
  {
    q: "ما هي وسائل الدفع المتاحة وهل هي آمنة؟",
    a: "ندعم كافة البطاقات البنكية (Visa/Mastercard)، ميزة، والمحافظ الإلكترونية (فودافون كاش وغيرها). الدفع يتم عبر بوابات مشفرة بالكامل ومعتمدة."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-20 relative">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-alexandria font-black text-white mb-3">الأسئلة الشائعة</h2>
          <p className="text-zinc-500 text-xs md:text-sm font-cairo">كل ما تحتاج لمعرفته حول خدماتنا ومنتجاتنا</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className={cn(
                "group rounded-xl border transition-all duration-300",
                openIndex === idx 
                  ? "bg-white/[0.04] border-rose-500/20 shadow-[0_0_15px_rgba(214,0,75,0.03)]" 
                  : "bg-white/[0.01] border-white/5 hover:border-white/10"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between py-4 px-5 text-right gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0",
                    openIndex === idx ? "bg-rose-500 text-white" : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className={cn(
                    "text-sm md:text-base font-alexandria font-bold transition-colors",
                    openIndex === idx ? "text-white" : "text-zinc-300 group-hover:text-white"
                  )}>
                    {faq.q}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-zinc-500 transition-transform duration-300 shrink-0",
                  openIndex === idx && "rotate-180 text-rose-500"
                )} />
              </button>

              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-0 text-xs md:text-sm text-zinc-400 font-cairo leading-relaxed pr-11">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
      {/* Subtle Bottom Section Divider */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
