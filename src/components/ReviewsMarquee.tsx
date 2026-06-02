"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Review {
  name: string;
  title: string;
  text: string;
  stars: number;
  avatarUrl: string;
  gender: "male" | "female";
  isCourse?: boolean;
  courseTitle?: string;
  isFeatured?: boolean;
  featuredPosition?: number;
  createdAt?: string;
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

interface StarSVGProps {
  fillPercent: number;
}

// Highly optimized memoized individual fractional star SVG component
export const MemoizedStarSVG = memo(function StarSVG({ fillPercent }: StarSVGProps) {
  if (fillPercent <= 0) {
    return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-800 fill-transparent" />;
  }
  if (fillPercent >= 100) {
    return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-500" />;
  }
  
  return (
    <div className="relative w-3 h-3 md:w-3.5 md:h-3.5">
      <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-800 fill-transparent absolute inset-0" />
      <div 
        className="absolute inset-0 overflow-hidden text-yellow-500"
        style={{ width: `${fillPercent}%` }}
      >
        <div className="w-3 h-3 md:w-3.5 md:h-3.5">
          <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-500" />
        </div>
      </div>
    </div>
  );
});

function renderFractionalStars(rating: number) {
  return (
    <div className="flex gap-0.5 text-yellow-500" dir="ltr">
      {Array.from({ length: 5 }).map((_, i) => {
        const starVal = i + 1;
        const isFilled = starVal <= Math.floor(rating);
        const isHalf = !isFilled && starVal - 0.5 <= rating;

        let fillPercent = 0;
        if (isFilled) {
          fillPercent = 100;
        } else if (isHalf) {
          fillPercent = (rating - (starVal - 1)) * 100;
        }

        return <MemoizedStarSVG key={i} fillPercent={fillPercent} />;
      })}
    </div>
  );
}

export function ReviewsMarquee() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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
      gender: "female",
      isCourse: true,
      courseTitle: "كورس صناعة المحتوى بالذكاء الاصطناعي"
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
      gender: "male",
      isCourse: true,
      courseTitle: "كورس الرسوم المتحركة وصناعة الشخصيات بالذكاء الاصطناعي"
    }
  ];

  // Intersection Observer to pause animation when out of viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    async function loadReviews() {
      try {
        const [reviewsRes, { data: productsData }, { data: coursesData }, { data: bundlesData }] = await Promise.all([
          fetch("/api/admin/reviews").then(res => res.json()),
          supabase.from("products").select("id, title"),
          supabase.from("courses").select("id, title"),
          supabase.from("bundles").select("id, title")
        ]);

        if (Array.isArray(reviewsRes)) {
          const active = reviewsRes.filter((r: any) => r.status === "visible");
          
          const mapped = active.map((r: any) => {
            const course = coursesData?.find((c: any) => c.id === r.productId);
            const product = productsData?.find((p: any) => p.id === r.productId);
            const bundle = bundlesData?.find((b: any) => b.id === r.productId);
            
            const isCourse = !!course;
            const itemTitle = course ? course.title : product ? product.title : bundle ? bundle.title : "تم تأكيد الشراء";
            
            let finalAvatar = r.avatarUrl;
            if (!finalAvatar || finalAvatar.trim() === "") {
              finalAvatar = getAvatarUrl(r.firstName, r.gender || "male");
            }

            return {
              name: `${r.firstName} ${r.lastName ? r.lastName.trim().charAt(0) + "." : ""}`,
              title: `مشتري موثق · ${itemTitle}`,
              text: r.text,
              stars: r.rating || 5,
              avatarUrl: finalAvatar,
              gender: r.gender || "male",
              isCourse,
              courseTitle: course ? course.title : undefined,
              isFeatured: r.isFeatured === true,
              featuredPosition: typeof r.featuredPosition === "number" ? r.featuredPosition : 999,
              createdAt: r.createdAt
            };
          });

          // Separate featured and normal reviews
          const featured = mapped.filter((r: any) => r.isFeatured);
          featured.sort((a: any, b: any) => {
            if (a.featuredPosition !== b.featuredPosition) {
              return a.featuredPosition - b.featuredPosition;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          const normal = mapped.filter((r: any) => !r.isFeatured);
          normal.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Prioritize featured reviews on homepage, fallback to normal ones if none are marked
          const displayReviews = featured.length > 0 ? featured : normal;
          setReviews(displayReviews);
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

  const finalReviews = reviews.length > 0 ? reviews : defaultReviews;

  // Split reviews array between Row 1 and Row 2 for double alternating looping marquee rows
  const halfLength = Math.ceil(finalReviews.length / 2);
  const row1Raw = finalReviews.slice(0, halfLength);
  const row2Raw = finalReviews.slice(halfLength);

  // Helper to ensure each row has at least 8 elements for perfect, seamless loop animation transitions
  const duplicateRowReviews = (items: Review[]) => {
    let list = [...items];
    if (list.length === 0) list = defaultReviews;
    while (list.length < 8) {
      list = [...list, ...list];
    }
    // Duplicate once more to cover full viewport width
    return [...list, ...list, ...list];
  };

  const row1Reviews = duplicateRowReviews(row1Raw);
  const row2Reviews = duplicateRowReviews(row2Raw);

  return (
    <section ref={containerRef} id="reviews" className="py-24 md:py-32 bg-[#050505] border-y border-white/5 overflow-hidden relative select-none">
      
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

      {/* Endless Double-Row Marquee Slider */}
      <div className="relative w-full overflow-hidden flex flex-col gap-6" dir="ltr">
        
        {/* CSS Keyframes for perfectly seamless looping slide (both directions) */}
        <style jsx global>{`
          @keyframes marquee-scroll-right {
            0% { transform: translate3d(-33.333%, 0, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes marquee-scroll-left {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-33.333%, 0, 0); }
          }
          .animate-marquee-endless-right {
            display: flex;
            gap: 1.5rem;
            width: max-content;
            animation: marquee-scroll-right 45s linear infinite;
          }
          .animate-marquee-endless-left {
            display: flex;
            gap: 1.5rem;
            width: max-content;
            animation: marquee-scroll-left 45s linear infinite;
          }
          .animate-marquee-endless-right:hover,
          .animate-marquee-endless-left:hover {
            animation-play-state: paused;
          }
          
          /* Reduced Motion Support for Accessibility */
          @media (prefers-reduced-motion: reduce) {
            .animate-marquee-endless-right,
            .animate-marquee-endless-left {
              animation-play-state: paused !important;
            }
          }
        `}</style>

        {/* ROW 1: Right-Scrolling Track */}
        <div className="animate-marquee-endless-right" style={{ animationPlayState: isIntersecting ? undefined : "paused" }}>
          {row1Reviews.map((review, idx) => (
            <div
              key={`row1-${idx}`}
              className="w-[320px] h-[250px] md:w-[360px] md:h-[280px] flex-shrink-0 bg-[#08080c]/60 border border-white/5 p-5 md:p-6 rounded-3xl relative group hover:border-[#D6004B]/30 transition-all duration-500 shadow-2xl flex flex-col justify-between"
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
                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold truncate mt-0.5 font-cairo">{review.title}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span className="text-[8px] md:text-[9px] font-black font-cairo">موثق</span>
                    </div>
                  </div>
                </div>

                {/* Star Ratings (Supporting Float Decimals) */}
                <div className="flex items-center gap-1">
                  {renderFractionalStars(review.stars)}
                  <span className="text-[9px] font-mono text-zinc-600 bg-white/5 px-1 rounded">
                    {review.stars.toFixed(1)}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-zinc-400 font-cairo text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 md:line-clamp-4 italic">
                  "{review.text}"
                </p>

              </div>
              
              {/* Card Footer: Displays Course Title underneath review cards ONLY for Courses */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                {review.isCourse && review.courseTitle ? (
                  <span className="text-[10px] text-zinc-500 font-bold font-cairo opacity-65 truncate max-w-[220px]" title={review.courseTitle}>
                    كورس: {review.courseTitle}
                  </span>
                ) : (
                  <span />
                )}
              </div>
              
              {/* Subtle Ambient Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#D6004B]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl pointer-events-none" />
            </div>
          ))}
        </div>

        {/* ROW 2: Left-Scrolling Track */}
        <div className="animate-marquee-endless-left" style={{ animationPlayState: isIntersecting ? undefined : "paused" }}>
          {row2Reviews.map((review, idx) => (
            <div
              key={`row2-${idx}`}
              className="w-[320px] h-[250px] md:w-[360px] md:h-[280px] flex-shrink-0 bg-[#08080c]/60 border border-white/5 p-5 md:p-6 rounded-3xl relative group hover:border-[#D6004B]/30 transition-all duration-500 shadow-2xl flex flex-col justify-between"
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
                    <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold truncate mt-0.5 font-cairo">{review.title}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span className="text-[8px] md:text-[9px] font-black font-cairo">موثق</span>
                    </div>
                  </div>
                </div>

                {/* Star Ratings (Supporting Float Decimals) */}
                <div className="flex items-center gap-1">
                  {renderFractionalStars(review.stars)}
                  <span className="text-[9px] font-mono text-zinc-600 bg-white/5 px-1 rounded">
                    {review.stars.toFixed(1)}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-zinc-400 font-cairo text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 md:line-clamp-4 italic">
                  "{review.text}"
                </p>

              </div>
              
              {/* Card Footer: Displays Course Title underneath review cards ONLY for Courses */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                {review.isCourse && review.courseTitle ? (
                  <span className="text-[10px] text-zinc-500 font-bold font-cairo opacity-65 truncate max-w-[220px]" title={review.courseTitle}>
                    كورس: {review.courseTitle}
                  </span>
                ) : (
                  <span />
                )}
              </div>
              
              {/* Subtle Ambient Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#D6004B]/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl pointer-events-none" />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
