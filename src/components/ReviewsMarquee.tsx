"use client";

import { motion } from "framer-motion";
import { Star, CheckCircle2 } from "lucide-react";
import Image from "next/image";

const reviews = [
  {
    name: "يوسف",
    initial: "أ",
    text: "أفضل استثمار قمت به لمتجري. وفرت ساعات من العمل اليدوي في n8n.",
    stars: 5,
    img: "https://i.pravatar.cc/100?img=1"
  },
  {
    name: "سارة",
    initial: "م",
    text: "التسليم كان فوري والدعم الفني ساعدني في الربط بسرعة احترافية.",
    stars: 5,
    img: "https://i.pravatar.cc/100?img=5"
  },
  {
    name: "أحمد",
    initial: "ع",
    text: "الحزم جاهزة فعلاً للعمل، لم أحتاج لكتابة سطر برمج واحد.",
    stars: 5,
    img: "https://i.pravatar.cc/100?img=12"
  },
  {
    name: "خالد",
    initial: "ب",
    text: "دقة متناهية في تصميم تدفقات العمل. شكراً لكم على هذا الجهد.",
    stars: 5,
    img: "https://i.pravatar.cc/100?img=13"
  },
  {
    name: "ريم",
    initial: "س",
    text: "المتجر أنيق والمنتجات ذات جودة عالية جداً. أنصح به بشدة.",
    stars: 5,
    img: "https://i.pravatar.cc/100?img=20"
  },
  {
    name: "محمد",
    initial: "ك",
    text: "استخدمت حزم الأتمتة ونجحت في مضاعفة إنتاجية فريقي في أسبوع واحد.",
    stars: 5,
    img: "https://i.pravatar.cc/100?img=33"
  }
];

export function ReviewsMarquee() {
  // Triple the reviews to ensure seamless looping
  const duplicatedReviews = [...reviews, ...reviews, ...reviews];

  return (
    <section id="reviews" className="py-24 md:py-32 bg-white/[0.01] border-y border-white/5 overflow-hidden">
      <div className="container mx-auto px-4 mb-16 text-center">
        <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-4">ثقة عملائنا</h2>
        <p className="text-zinc-500 font-cairo">آراء واقعية من أشخاص طوروا أعمالهم معنا</p>
      </div>

      <div className="relative flex overflow-hidden">
        <motion.div
          animate={{
            x: [0, "-33.33%"],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex gap-6 whitespace-nowrap"
        >
          {duplicatedReviews.map((review, idx) => (
            <div
              key={idx}
              className="w-[300px] md:w-[400px] flex-shrink-0 bg-[#0a0a0f] border border-white/5 p-6 rounded-[2rem] relative group hover:border-rose-500/20 transition-colors"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden relative border border-white/10">
                  <Image src={review.img} alt={review.name} fill className="object-cover" />
                </div>
                <div>
                  <h4 className="font-alexandria font-bold text-white text-sm">
                    {review.name} {review.initial}.
                  </h4>
                  <div className="flex text-yellow-500">
                    {[...Array(review.stars)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <div className="mr-auto">
                  <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold font-cairo">موثق</span>
                  </div>
                </div>
              </div>
              <p className="text-zinc-400 font-cairo text-sm leading-relaxed whitespace-normal">
                "{review.text}"
              </p>
              
              {/* Subtle Glow */}
              <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] pointer-events-none" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
