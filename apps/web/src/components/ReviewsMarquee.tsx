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

  const finalReviews = reviews;

  // Helper to ensure the row has enough elements for perfect, seamless loop animation transitions
  const duplicateRowReviews = (items: Review[]) => {
    let list = [...items];
    while (list.length < 10) {
      list = [...list, ...list];
    }
    // Duplicate three times to cover full viewport width and support seamless loop
    return [...list, ...list, ...list];
  };

  const rowReviews = duplicateRowReviews(finalReviews);

  return (
    <section ref={containerRef} id="reviews" className="py-24 md:py-32 bg-[#050505] overflow-hidden relative select-none">
      
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

      {/* Endless Single-Row Marquee Slider */}
      <div className="relative w-full overflow-hidden" dir="ltr">
        
        {/* CSS Keyframes for perfectly seamless looping slide leftward */}
        <style jsx global>{`
          @keyframes marquee-scroll-left {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-33.333%, 0, 0); }
          }
          .animate-marquee-endless-left {
            display: flex;
            width: max-content;
            animation: marquee-scroll-left 70s linear infinite;
          }
          .animate-marquee-endless-left > div {
            margin-right: 1.5rem;
          }
          .animate-marquee-endless-left:hover {
            animation-play-state: paused;
          }
          
          /* Reduced Motion Support for Accessibility */
          @media (prefers-reduced-motion: reduce) {
            .animate-marquee-endless-left {
              animation-play-state: paused !important;
            }
          }
        `}</style>

        {/* SINGLE ROW: Left-Scrolling Track */}
        <div className="animate-marquee-endless-left" style={{ animationPlayState: isIntersecting ? undefined : "paused" }}>
          {rowReviews.map((review, idx) => (
            <div
              key={`row-${idx}`}
              className="w-[320px] h-[220px] md:w-[360px] md:h-[240px] flex-shrink-0 bg-white/[0.02] border border-white/5 p-5 md:p-6 rounded-3xl relative group hover:border-rose-500/20 transition-all duration-500 shadow-2xl flex flex-col justify-between"
              dir="rtl"
            >
              {/* Card Header (Avatar + Name & Stars Stacked) */}
              <div className="flex items-center gap-3">
                <div className="shrink-0 relative">
                  {review.avatarUrl ? (
                    <img src={review.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-inner" alt={review.name} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/10 flex items-center justify-center border border-white/5 text-rose-400 font-alexandria font-bold text-sm shadow-inner">
                      {review.name.trim().replace(/^\./, "").charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-alexandria font-bold text-white text-xs md:text-sm truncate">
                    {review.name.trim().replace(/^\./, "")}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {renderFractionalStars(review.stars)}
                    <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.03] px-1 rounded border border-white/5">
                      {review.stars.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Text */}
              <p className="text-zinc-300 font-cairo text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 italic relative z-10">
                "{review.text}"
              </p>

              {/* Card Footer: Displays Course Title badge */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3 relative z-10">
                {review.isCourse && review.courseTitle ? (
                  <div className="flex items-center gap-1.5 text-zinc-500 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold font-cairo w-fit max-w-full" title={review.courseTitle}>
                    <BookOpen className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="truncate max-w-[200px]">{review.courseTitle}</span>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* Subtle Ambient Hover Glow & Testimonial Quote Mark */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="absolute top-4 left-4 text-white/[0.02] font-serif text-6xl pointer-events-none">
                ”
              </div>
            </div>
          ))}
        </div>

      </div>
      {/* Subtle Bottom Section Divider */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}

