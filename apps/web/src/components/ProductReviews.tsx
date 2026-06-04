"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Star, ShieldCheck, MessageSquareQuote, CheckCircle2, BookOpen, ShoppingBag, Sparkles } from "lucide-react";

interface Review {
  id: string;
  productId: string;
  firstName: string;
  lastName: string;
  rating: number;
  text: string;
  avatarUrl?: string;
  gender?: string;
  isVerified: boolean;
  isHidden: boolean;
  status?: string;
  isFeatured?: boolean;
  featuredPosition?: number;
  createdAt: string;
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

interface ProductReviewsProps {
  productId: string;
  initialReviews?: Review[];
  courseTitle?: string;
  productTitle?: string;
  title?: string;
}

export function ProductReviews({ productId, initialReviews, courseTitle, productTitle, title }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(initialReviews === undefined);
  
  // Lazy Hydration & Viewport visibility states
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isCurrentlyVisible, setIsCurrentlyVisible] = useState(false);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Intersection Observer for Lazy Hydration & Animation Pausing
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCurrentlyVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      },
      { rootMargin: "100px", threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // 2. Fetch reviews when productId is updated
  useEffect(() => {
    if (!isIntersecting) return; // Wait until component enters viewport to fetch

    if (initialReviews !== undefined) {
      setReviews(initialReviews);
      setLoading(false);
      return;
    }

    fetch(`/api/admin/reviews?productId=${productId}&_t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId, initialReviews, isIntersecting]);

  if (!isIntersecting) {
    // Empty placeholder placeholder to maintain page heights during scroll
    return <div ref={containerRef} className="min-h-[250px] w-full" />;
  }

  if (loading || reviews.length === 0) return null;

  // 3. Sorting: Featured reviews first (sorted by priority), then by date
  const sortedReviews = [...reviews].sort((a, b) => {
    const aFeatured = a.isFeatured === true;
    const bFeatured = b.isFeatured === true;
    
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;
    
    if (aFeatured && bFeatured) {
      const aPos = typeof a.featuredPosition === "number" ? a.featuredPosition : 999;
      const bPos = typeof b.featuredPosition === "number" ? b.featuredPosition : 999;
      if (aPos !== bPos) return aPos - bPos;
    }
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Build marquee items list ensuring loop contains at least 12 cards to prevent visual gaps
  let marqueeReviews: Review[] = [];
  let repeated = [...sortedReviews];
  while (repeated.length < 12) {
    repeated = [...repeated, ...sortedReviews];
  }
  marqueeReviews = [...repeated, ...repeated];

  return (
    <section ref={containerRef} className="container mx-auto px-4 max-w-6xl mt-16 mb-8 overflow-hidden relative select-none">
      <div className="flex items-center gap-2.5 mb-10" dir="rtl">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-600/10 rounded-xl md:rounded-2xl flex items-center justify-center">
          <MessageSquareQuote className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-alexandria font-black text-white tracking-tighter">{title || "آراء الطلاب"}</h2>
      </div>

      {/* Infinite Marquee */}
      <div className="relative w-full overflow-hidden" dir="ltr">
        
        {/* CSS Keyframes for seamless LTR scroll */}
        <style jsx global>{`
          @keyframes product-reviews-marquee-ltr {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0%); }
          }
          .animate-product-reviews-marquee-ltr {
            display: flex;
            width: max-content;
            animation: product-reviews-marquee-ltr 160s linear infinite;
          }
          .animate-product-reviews-marquee-ltr:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-product-reviews-marquee-ltr {
              animation-play-state: paused !important;
            }
          }
        `}</style>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-16 bg-gradient-to-r from-[#050505] md:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-16 bg-gradient-to-l from-[#050505] md:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

        <div 
          className="flex gap-4 md:gap-6 animate-product-reviews-marquee-ltr py-2 cursor-grab active:cursor-grabbing select-none" 
          style={{ animationPlayState: (isCurrentlyVisible && !isInteractionPaused) ? undefined : "paused" }}
          onTouchStart={() => setIsInteractionPaused(true)}
          onTouchEnd={() => setIsInteractionPaused(false)}
          onMouseEnter={() => setIsInteractionPaused(true)}
          onMouseLeave={() => setIsInteractionPaused(false)}
        >
          {marqueeReviews.map((review, idx) => {
            const fullName = `${review.firstName} ${review.lastName ? review.lastName.trim().charAt(0) + "." : ""}`;
            const displayName = fullName.trim().replace(/^\./, "");
            const fallbackLetter = displayName.replace(/^\./, "").charAt(0);
            
            return (
              <div
                key={idx}
                className="w-[300px] h-[160px] md:w-[360px] md:h-[180px] flex-shrink-0 bg-white/[0.02] border border-white/5 p-4 md:p-5 rounded-3xl relative group hover:border-[#D6004B]/20 transition-all duration-500 shadow-2xl flex flex-col justify-between"
                dir="rtl"
              >
                {/* Header (Avatar + Name & Stars Stacked) */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="shrink-0 relative">
                    {review.avatarUrl ? (
                      <img 
                        src={review.avatarUrl} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-inner" 
                        alt={displayName} 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/10 flex items-center justify-center border border-white/5 text-rose-400 font-alexandria font-bold text-sm shadow-inner">
                        {fallbackLetter}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-alexandria font-bold text-white text-xs md:text-sm truncate">
                      {displayName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {renderFractionalStars(review.rating)}
                      <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.03] px-1 rounded border border-white/5">
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Text */}
                <p className="text-zinc-300 font-cairo text-xs md:text-[13px] leading-relaxed whitespace-normal pl-2 line-clamp-2 md:line-clamp-3 italic relative z-10">
                  "{review.text}"
                </p>

                {/* Empty spacer to maintain balanced flex layout */}
                <div className="h-1 relative z-10" />

                {/* Subtle Ambient Hover Glow & Testimonial Quote Mark */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D6004B]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute top-4 left-4 text-white/[0.02] font-serif text-6xl pointer-events-none">
                  ”
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
