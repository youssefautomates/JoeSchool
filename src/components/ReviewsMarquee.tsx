"use client";

import { useState, useEffect } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Review {
  name: string;
  title: string;
  text: string;
  stars: number;
  avatarUrl: string;
  gender: "male" | "female";
}

const MALE_SEEDS = ["Felix", "Oliver", "Charlie", "Jack", "Liam", "Noah", "James", "Ethan"];
const FEMALE_SEEDS = ["Mia", "Lily", "Emma", "Sara", "Luna", "Aria", "Zoe", "Chloe"];

function getAvatarUrl(seed: string, gender: "male" | "female"): string {
  const seeds = gender === "female" ? FEMALE_SEEDS : MALE_SEEDS;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chosen = seeds[Math.abs(hash) % seeds.length];
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${chosen}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
}

export function ReviewsMarquee() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const [reviewsRes, { data: productsData }] = await Promise.all([
          fetch("/api/admin/reviews").then(res => res.json()),
          supabase.from("products").select("id, title")
        ]);

        if (Array.isArray(reviewsRes)) {
          const active = reviewsRes.filter((r: any) => !r.isHidden);
          const mapped = active.map((r: any) => {
            const product = productsData?.find((p: any) => p.id === r.productId);
            
            // Check if avatarUrl is fully specified, else fallback to generated one
            let finalAvatar = r.avatarUrl;
            if (!finalAvatar || finalAvatar.trim() === "") {
              finalAvatar = getAvatarUrl(r.firstName, r.gender || "male");
            }

            return {
              name: `${r.firstName} ${r.lastName ? r.lastName.trim().charAt(0) + "." : ""}`,
              title: `مشتري موثق · ${product ? product.title : "تم تأكيد الشراء"}`,
              text: r.text,
              stars: r.rating || 5,
              avatarUrl: finalAvatar,
              gender: r.gender || "male"
            };
          });
          setReviews(mapped);
        }
      } catch (err) {
        console.error("Failed to load marquee reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  if (loading) {
    return (
      <section id="reviews" className="py-24 bg-[#050505] border-y border-white/5 relative flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  const defaultReviews: Review[] = [
    {
      name: "أحمد محمود",
      title: "مشتري موثق · حزمة أدوات منشئي المحتوى المتكاملة",
      text: "الحزم وفرت علي الكثير من الجهد والبحث. جودة القوالب وسهولة الاستخدام ممتازة وأنصح بها كل منشئ محتوى يريد توفير وقته.",
      stars: 5,
      avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Jack&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc",
      gender: "male"
    },
    {
      name: "سارة عبد الرحمن",
      title: "مشتري موثق · كورس صناعة المحتوى بالذكاء الاصطناعي",
      text: "شرح مبسط وعملي للغاية. تمكنت من إنتاج أول قصة مصورة بالذكاء الاصطناعي بجودة فائقة وحصلت على تفاعل ضخم في حساباتي.",
      stars: 5,
      avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Sara&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc",
      gender: "female"
    },
    {
      name: "خالد توفيق",
      title: "مشتري موثق · حزمة بوتات الواتساب الذكية",
      text: "الدعم الفني متميز جداً ومساعد لأبعد الحدود. البوت يعمل بسلاسة تامة ومعدل التحويل في متجرنا زاد بنسبة كبيرة.",
      stars: 5,
      avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Liam&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc",
      gender: "male"
    },
    {
      name: "يوسف أحمد",
      title: "مشتري موثق · كورس الرسوم المتحركة وصناعة الشخصيات بالذكاء الاصطناعي",
      text: "أفضل استثمار استثمرته في عملي الإبداعي هذا العام. المحتوى غني بالتطبيقات الحقيقية والتقنيات الحديثة للتطبيق الفوري.",
      stars: 5,
      avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc",
      gender: "male"
    },
    {
      name: "منى الباز",
      title: "مشتري موثق · حزمة السكربتات الاحترافية",
      text: "سهولة تامة في التثبيت والتشغيل، والنتائج تظهر فوراً. وفرت مجهوداً جباراً كنت أستهلكه يومياً في إدخال البيانات المكررة.",
      stars: 5,
      avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Mia&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc",
      gender: "female"
    }
  ];

  const displayReviews = reviews.length > 0 ? reviews : defaultReviews;

  // Duplicate to ensure seamless infinite looping marquee
  const baseCount = displayReviews.length;
  const repeatTimes = Math.max(3, Math.ceil(15 / (baseCount * 3)) * 3);
  const duplicatedReviews: Review[] = [];
  for (let i = 0; i < repeatTimes; i++) {
    duplicatedReviews.push(...displayReviews);
  }

  return (
    <section id="reviews" className="py-24 md:py-32 bg-[#050505] border-y border-white/5 overflow-hidden relative select-none">
      
      {/* Visual background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 mb-16 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-4 tracking-tighter">
          ثقة عملائنا
        </h2>
        <p className="text-zinc-500 font-cairo text-sm md:text-base">
          آراء واقعية من أشخاص حقيقيين قاموا بتطوير مهاراتهم الإبداعية وإنتاج محتوى استثنائي معنا بنجاح
        </p>
      </div>

      {/* Endless Marquee Slider */}
      <div className="relative w-full overflow-hidden flex flex-col gap-6" dir="ltr">
        
        {/* CSS Keyframes for perfectly seamless looping slide (left-to-right) */}
        <style jsx global>{`
          @keyframes marquee-scroll-right {
            0% {
              transform: translate3d(-33.333%, 0, 0);
            }
            100% {
              transform: translate3d(0, 0, 0);
            }
          }
          .animate-marquee-endless-right {
            display: flex;
            gap: 1.5rem;
            width: max-content;
            animation: marquee-scroll-right 45s linear infinite;
          }
          .animate-marquee-endless-right:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="animate-marquee-endless-right">
          {duplicatedReviews.map((review, idx) => (
            <div
              key={idx}
              className="w-[320px] h-[240px] md:w-[360px] md:h-[270px] flex-shrink-0 bg-[#08080c]/60 border border-white/5 p-5 md:p-6 rounded-3xl relative group hover:border-rose-500/30 transition-all duration-500 shadow-2xl flex flex-col justify-between"
              dir="rtl"
            >
              <div className="space-y-3.5">
                
                {/* User Info Header */}
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-800 overflow-hidden shadow-lg border border-white/10 shrink-0 relative">
                    <img 
                      src={review.avatarUrl} 
                      alt={review.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-alexandria font-bold text-white text-xs md:text-sm truncate">
                      {review.name}
                    </h4>
                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold truncate mt-0.5">{review.title}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span className="text-[8px] md:text-[9px] font-black font-cairo">موثق</span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars */}
                <div className="flex text-yellow-500 gap-0.5">
                  {[...Array(review.stars)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-zinc-400 font-cairo text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 md:line-clamp-4">
                  "{review.text}"
                </p>

              </div>
              
              {/* Subtle Ambient Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
