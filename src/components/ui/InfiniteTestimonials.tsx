"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    id: 1,
    name: "أحمد عبدالله",
    role: "رائد أعمال",
    content: "هذا الدليل وفر علي أكثر من 50 ساعة عمل شهرياً. الـ Workflow كان جاهزاً وممتازاً وتمكنت من استيراده بنقرة واحدة.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: 2,
    name: "خالد محمد",
    role: "مسوق رقمي",
    content: "الجودة احترافية جداً مقارنة بالسعر. الرد التلقائي للواتساب رفع نسبة مبيعاتي 40% في أول أسبوع.",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: 3,
    name: "سارة فهد",
    role: "صاحبة متجر إلكتروني",
    content: "لم أكن أعرف شيئاً عن n8n، ولكن الشرح المرفق في الـ PDF كان مفصلاً لدرجة أنني بنيت النظام بالكامل بنفسي.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: 4,
    name: "ياسر عبدالرحمن",
    role: "مدير عمليات",
    content: "أفضل استثمار قمت به هذا العام. الأتمتة تعمل بشكل مثالي ولا توجد أخطاء. الدعم الفني كان رائعاً أيضاً.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: 5,
    name: "نورة القحطاني",
    role: "مؤسسة شركة ناشئة",
    content: "كل ما كنت أحتاجه لتطوير خدمة العملاء. الـ Workflow المرفق عبقري وموفر للوقت والجهد.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
  }
];

export function InfiniteTestimonials() {
  return (
    <div className="w-full overflow-hidden bg-white py-10 relative">
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-white to-transparent z-10"></div>
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-white to-transparent z-10"></div>
      
      <div className="flex w-[200%] md:w-[150%] animate-scroll hover:[animation-play-state:paused] will-change-transform">
        {[...testimonials, ...testimonials].map((testimonial, idx) => (
          <div 
            key={`${testimonial.id}-${idx}`} 
            className="w-[300px] md:w-[400px] shrink-0 px-4"
          >
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 h-full flex flex-col hover:bg-white hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md">
              <div className="flex items-center gap-1 mb-4 text-emerald-500">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-emerald-500" />
                ))}
              </div>
              <p className="text-zinc-600 font-cairo leading-relaxed flex-1 mb-6 text-sm md:text-base">
                "{testimonial.content}"
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <Image 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-alexandria font-bold text-zinc-900 text-sm">{testimonial.name}</h4>
                  <p className="font-cairo text-zinc-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
