"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Star, CheckCircle2, BookOpen } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";

interface Review {
  name: string;
  title: string;
  text: string;
  stars: number;
  avatarUrl?: string;
  isCourse?: boolean;
  courseTitle?: string;
  isFeatured?: boolean;
  featuredPosition?: number;
  createdAt?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components & Helpers for Rendering Fractional Stars (Clean UI)
// ────────────────────────────────────────────────────────────────────────────
interface StarSVGProps {
  fillPercent: number; // 0 to 100
}

export const MemoizedStarSVG = memo(function StarSVG({ fillPercent }: StarSVGProps) {
  if (fillPercent <= 0) {
    return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-transparent text-zinc-200" />;
  }
  if (fillPercent >= 100) {
    return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-500" />;
  }
  
  return (
    <div className="relative w-3 h-3 md:w-3.5 md:h-3.5">
      <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-transparent text-zinc-200 absolute inset-0" />
      <div 
        className="absolute inset-0 overflow-hidden"
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
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    let fillPercent = 0;
    if (diff >= 1) {
      fillPercent = 100;
    } else if (diff > 0) {
      fillPercent = Math.round(diff * 100);
    }
    stars.push(<MemoizedStarSVG key={i} fillPercent={fillPercent} />);
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

export function ReviewsMarquee() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const [reviewsRes, productsData, coursesData, bundlesData] = await Promise.all([
          fetch("/api/admin/reviews")
            .then(res => res.json())
            .catch(err => {
              console.error("ReviewsMarquee: reviews fetch failed:", err);
              return [];
            }),
          Promise.resolve(supabaseClient.from("products").select("id, title"))
            .then(res => res.data || [])
            .catch(err => {
              console.error("ReviewsMarquee: products fetch failed:", err);
              return [];
            }),
          Promise.resolve(supabaseClient.from("courses").select("id, title"))
            .then(res => res.data || [])
            .catch(err => {
              console.error("ReviewsMarquee: courses fetch failed:", err);
              return [];
            }),
          Promise.resolve(supabaseClient.from("bundles").select("id, title"))
            .then(res => res.data || [])
            .catch(err => {
              console.error("ReviewsMarquee: bundles fetch failed:", err);
              return [];
            })
        ]);

        if (Array.isArray(reviewsRes)) {
          const active = reviewsRes.filter((r: any) => r.status === "visible");
          
          const mapped = active.map((r: any) => {
            const course = coursesData?.find((c: any) => c.id === r.productId);
            const product = productsData?.find((p: any) => p.id === r.productId);
            const bundle = bundlesData?.find((b: any) => b.id === r.productId);
            
            const isCourse = !!course;
            const itemTitle = course ? course.title : product ? product.title : bundle ? bundle.title : "تم تأكيد الشراء";
            
            return {
              name: `${r.firstName} ${r.lastName ? r.lastName.trim().charAt(0) + "." : ""}`,
              title: `مشتري موثق · ${itemTitle}`,
              text: r.text,
              stars: r.rating || 5,
              avatarUrl: r.avatarUrl,
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

          const fallbackReviews: Review[] = [
            {
              name: "أحمد م.",
              title: "مشتري موثق · كورس الذكاء الاصطناعي",
              text: "هذا الكورس غيّر مفاهيمي تماماً عن صناعة المحتوى بالذكاء الاصطناعي. الشرح العملي والخطوات المباشرة ساعدتني في إطلاق قناتي على اليوتيوب وبدء تحقيق الأرباح.",
              stars: 5,
              isCourse: true,
              courseTitle: "كورس صناعة فيديوهات الأنيميشن بالذكاء الاصطناعي"
            },
            {
              name: "سارة أ.",
              title: "مشتري موثق · حزمة المؤثرين",
              text: "الأدوات المرفقة بالحزمة وفرت عليّ ساعات طويلة من العمل الإبداعي. جودة الملفات والتحديثات المستمرة تفوق التوقعات.",
              stars: 5,
              isCourse: false
            },
            {
              name: "محمد ع.",
              title: "مشتري موثق · أتمتة الأعمال",
              text: "أفضل استثمار قمت به لشركتي هذا العام. تمكنت من أتمتة الردود على العملاء بالكامل وتوفير تكاليف الدعم الفني.",
              stars: 5,
              isCourse: true,
              courseTitle: "كورس أتمتة الأعمال المتكامل"
            },
            {
              name: "فاطمة ح.",
              title: "مشتري موثق · كورس الأنيميشن",
              text: "الدورة مبسطة جداً ومناسبة للمبتدئين. الدعم الفني متجاوب وسريع جداً في الإجابة على أي استفسار.",
              stars: 5,
              isCourse: true,
              courseTitle: "كورس صناعة فيديوهات الأنيميشن بالذكاء الاصطناعي"
            }
          ];

          // Prioritize featured reviews on homepage, fallback to normal ones if none are marked, otherwise fallback to premium mock reviews
          const displayReviews = featured.length > 0 ? featured : (normal.length > 0 ? normal : fallbackReviews);
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
      <section id="reviews" className="py-24 bg-white border-y border-zinc-200/60 relative flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  // Prepares the list of reviews and triples them to ensure seamless infinite loops in a single row
  const getSingleRowReviews = (items: Review[]) => {
    if (items.length === 0) return [];
    
    let list = [...items];
    while (list.length < 12) {
      list = [...list, ...list];
    }
    
    return [...list, ...list, ...list];
  };

  const marqueeReviews = getSingleRowReviews(reviews);

  return (
    <section id="reviews" className="py-12 md:py-16 bg-white overflow-hidden relative select-none">
      
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Cinematic Vignette Overlays for seamless edge fade-out */}
      <div className="absolute top-0 left-0 w-20 md:w-56 h-full bg-gradient-to-r from-white via-white/70 to-transparent z-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 md:w-56 h-full bg-gradient-to-l from-white via-white/70 to-transparent z-20 pointer-events-none" />

      <div className="container mx-auto px-4 mb-10 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-sans font-black text-zinc-900 mb-4 tracking-tighter">
          ثقة عملائنا
        </h2>
        <p className="text-zinc-500 font-sans text-sm md:text-base max-w-xl mx-auto">
          آراء واقعية من أشخاص حقيقيين قاموا بتطوير مهاراتهم الإبداعية وإنتاج محتوى استثنائي معنا بنجاح
        </p>
      </div>

      {/* Single Row Infinite Scrolling Marquee - Left to Right */}
      <div className="flex flex-col relative w-full overflow-hidden" dir="ltr">
        
        {/* ROW 1: Scrolling Right */}
        <div className="overflow-hidden w-full">
          <div className="flex flex-row flex-nowrap w-max gap-6 animate-marquee-right">
            {marqueeReviews.map((review, idx) => (
              <ReviewCard key={`marquee-${idx}`} review={review} />
            ))}
          </div>
        </div>

      </div>

      {/* Premium Bottom Ambient Line */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}

// Sub-component: Optimized Memoized Review Card
const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      className="w-[310px] h-[210px] md:w-[380px] md:h-[230px] flex-shrink-0 bg-white border border-zinc-200/60 p-5 md:p-6 rounded-[24px] relative group hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 shadow-[0_4px_20px_-2px_rgba(17,24,39,0.015)] hover:border-zinc-200/60 hover:shadow-[0_10px_30px_-5px_rgba(17,24,39,0.03)] flex flex-col justify-between"
      dir="rtl"
    >
      {/* Header Info */}
      <div className="flex items-center gap-3">
        <div className="shrink-0 relative">
          {review.avatarUrl ? (
            <img 
              src={review.avatarUrl} 
              className="w-10 h-10 rounded-full object-cover border border-zinc-200 shadow-inner" 
              alt={review.name} 
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500/20 to-orange-500/10 flex items-center justify-center border border-zinc-200/60 text-yellow-500 font-sans font-bold text-sm shadow-inner">
              {review.name.trim().replace(/^\./, "").charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-sans font-bold text-zinc-900 text-xs md:text-sm truncate">
              {review.name.trim().replace(/^\./, "")}
            </h4>
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-medium font-sans bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              مشتري موثق
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {renderFractionalStars(review.stars)}
          </div>
        </div>
      </div>

      {/* Review text */}
      <p className="text-zinc-700 font-sans text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 italic relative z-10 mt-2">
        "{review.text}"
      </p>

      {/* Footer course title */}
      <div className="flex items-center justify-between border-t border-zinc-200/60 pt-3 relative z-10">
        {review.isCourse && review.courseTitle ? (
          <div 
            className="flex items-center gap-1.5 text-zinc-500 bg-zinc-50/70 border border-zinc-200/60 px-2.5 py-1 rounded-full text-[10px] font-bold font-sans w-fit max-w-full" 
            title={review.courseTitle}
          >
            <BookOpen className="w-3 h-3 text-yellow-500 shrink-0" />
            <span className="truncate max-w-[220px]">{review.courseTitle}</span>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Subtle Radial Glow & Testimonial Quote Mark */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-4 left-4 text-zinc-900/[0.02] font-serif text-6xl pointer-events-none">
        ”
      </div>
    </div>
  );
});
