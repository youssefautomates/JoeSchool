"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Star, CheckCircle2, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Review {
  name: string;
  title: string;
  text: string;
  stars: number;
  avatarUrl?: string;
  gender?: "male" | "female";
  isCourse?: boolean;
  courseTitle?: string;
  isFeatured?: boolean;
  featuredPosition?: number;
  createdAt?: string;
}

interface StarSVGProps {
  fillPercent: number;
}

// Highly optimized memoized individual fractional star SVG component
export const MemoizedStarSVG = memo(function StarSVG({ fillPercent }: StarSVGProps) {
  if (fillPercent <= 0) {
    return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-transparent" style={{ color: "#6b0020" }} />;
  }
  if (fillPercent >= 100) {
    return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current" style={{ color: "#D6004B" }} />;
  }
  
  return (
    <div className="relative w-3 h-3 md:w-3.5 md:h-3.5">
      <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-transparent absolute inset-0" style={{ color: "#6b0020" }} />
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fillPercent}%` }}
      >
        <div className="w-3 h-3 md:w-3.5 md:h-3.5">
          <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current" style={{ color: "#D6004B" }} />
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

  if (reviews.length === 0) {
    return null;
  }

  // Splits reviews into two balanced lists and triples them to ensure seamless infinite loops
  const getRowReviews = (items: Review[], isAlternate: boolean) => {
    if (items.length === 0) return [];
    
    // Distribute reviews between rows
    const split = items.filter((_, idx) => (idx % 2 === 0) === isAlternate);
    const base = split.length > 0 ? split : items;
    
    let list = [...base];
    while (list.length < 8) {
      list = [...list, ...list];
    }
    
    return [...list, ...list, ...list];
  };

  const row1Reviews = getRowReviews(reviews, false);
  const row2Reviews = getRowReviews(reviews, true);

  return (
    <section id="reviews" className="py-24 md:py-32 bg-[#050505] overflow-hidden relative select-none">
      
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Cinematic Vignette Overlays for seamless edge fade-out */}
      <div className="absolute top-0 left-0 w-20 md:w-56 h-full bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent z-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-20 md:w-56 h-full bg-gradient-to-l from-[#050505] via-[#050505]/70 to-transparent z-20 pointer-events-none" />

      <div className="container mx-auto px-4 mb-20 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-4 tracking-tighter">
          ثقة عملائنا
        </h2>
        <p className="text-zinc-500 font-cairo text-sm md:text-base max-w-xl mx-auto">
          آراء واقعية من أشخاص حقيقيين قاموا بتطوير مهاراتهم الإبداعية وإنتاج محتوى استثنائي معنا بنجاح
        </p>
      </div>

      {/* Double Row Infinite Scrolling Marquee */}
      <div className="flex flex-col gap-6 md:gap-8 relative w-full overflow-hidden" dir="ltr">
        
        {/* ROW 1: Scrolling Left */}
        <div className="overflow-hidden w-full">
          <div className="flex flex-row flex-nowrap w-max gap-6 animate-marquee-left">
            {row1Reviews.map((review, idx) => (
              <ReviewCard key={`row1-${idx}`} review={review} />
            ))}
          </div>
        </div>

        {/* ROW 2: Scrolling Right */}
        <div className="overflow-hidden w-full">
          <div className="flex flex-row flex-nowrap w-max gap-6 animate-marquee-right">
            {row2Reviews.map((review, idx) => (
              <ReviewCard key={`row2-${idx}`} review={review} />
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
      className="w-[310px] h-[210px] md:w-[380px] md:h-[230px] flex-shrink-0 bg-white/[0.01] hover:bg-white/[0.03] backdrop-blur-md border border-white/5 hover:border-rose-500/20 p-5 md:p-6 rounded-[24px] relative group hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-500 shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between"
      dir="rtl"
    >
      {/* Header Info */}
      <div className="flex items-center gap-3">
        <div className="shrink-0 relative">
          {review.avatarUrl ? (
            <img 
              src={review.avatarUrl} 
              className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-inner" 
              alt={review.name} 
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/10 flex items-center justify-center border border-white/5 text-rose-400 font-alexandria font-bold text-sm shadow-inner">
              {review.name.trim().replace(/^\./, "").charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-alexandria font-bold text-white text-xs md:text-sm truncate">
              {review.name.trim().replace(/^\./, "")}
            </h4>
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-medium font-cairo bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
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
      <p className="text-zinc-300 font-cairo text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 italic relative z-10 mt-2">
        "{review.text}"
      </p>

      {/* Footer course title */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 relative z-10">
        {review.isCourse && review.courseTitle ? (
          <div 
            className="flex items-center gap-1.5 text-zinc-500 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold font-cairo w-fit max-w-full" 
            title={review.courseTitle}
          >
            <BookOpen className="w-3 h-3 text-rose-500 shrink-0" />
            <span className="truncate max-w-[220px]">{review.courseTitle}</span>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Subtle Radial Glow & Testimonial Quote Mark */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-4 left-4 text-white/[0.02] font-serif text-6xl pointer-events-none">
        ”
      </div>
    </div>
  );
});
