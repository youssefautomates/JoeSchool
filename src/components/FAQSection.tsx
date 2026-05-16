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
    a: "نوفر لك مع كل منتج دليل تشغيل مبسط. معظم الحزم مصممة بنظام 'انسخ والصق' لتعمل مباشرة، لكن الإلمام بأساسيات n8n سيعزز تجربتك."
  },
  {
    q: "هل أحصل على تحديثات مجانية للمنتجات؟",
    a: "نعم، كل منتج تشتريه يحصل على تحديثات مدى الحياة مجاناً. سيتم إخطارك بالبريد الإلكتروني عند توفر أي نسخة جديدة."
  },
  {
    q: "ما هي وسائل الدفع المتاحة وهل هي آمنة؟",
    a: "ندعم كافة البطاقات البنكية (Visa/Mastercard)، ميزة، والمحافظ الإلكترونية (فودافون كاش وغيرها). الدفع يتم عبر بوابات مشفرة بالكامل ومعتمدة."
  },
  {
    q: "هل يمكنني استرجاع المنتج؟",
    a: "بسبب طبيعة المنتجات الرقمية (ملفات قابلة للنسخ)، الاسترجاع غير متاح بعد التحميل، إلا في حال وجود خلل فني لا يمكننا إصلاحه."
  },
  {
    q: "كيف يمكنني الحصول على دعم فني؟",
    a: "يمكنك التواصل معنا مباشرة عبر البريد الإلكتروني أو الواتساب، وسيقوم فريقنا بمساعدتك في أسرع وقت ممكن."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-6">الأسئلة الشائعة</h2>
          <p className="text-zinc-500 font-cairo">كل ما تحتاج لمعرفته حول خدماتنا ومنتجاتنا</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className={cn(
                "group rounded-2xl border transition-all duration-300",
                openIndex === idx 
                  ? "bg-white/[0.05] border-rose-500/30 shadow-[0_0_20px_rgba(214,0,75,0.05)]" 
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              )}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 text-right gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    openIndex === idx ? "bg-rose-500 text-white" : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "text-lg font-alexandria font-bold transition-colors",
                    openIndex === idx ? "text-white" : "text-zinc-300 group-hover:text-white"
                  )}>
                    {faq.q}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-zinc-500 transition-transform duration-300",
                  openIndex === idx && "rotate-180 text-rose-500"
                )} />
              </button>

              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-0 text-zinc-400 font-cairo leading-relaxed pr-12">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
