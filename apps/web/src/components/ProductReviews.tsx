"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Star, MessageSquareQuote } from "lucide-react";

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

// Memoized individual fractional star SVG component
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

const MARQUEE_CSS = `
@keyframes pr-marquee-ltr {
  0%   { transform: translateX(-50%); }
  100% { transform: translateX(0%); }
}
.pr-marquee-track {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  width: max-content;
  will-change: transform;
  animation: pr-marquee-ltr 80s linear infinite;
}
.pr-marquee-track:hover {
  animation-play-state: paused;
}
`;

export function ProductReviews({ productId, initialReviews, courseTitle, productTitle, title }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(initialReviews === undefined);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy hydration
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch reviews when component enters viewport
  useEffect(() => {
    if (!isIntersecting) return;

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

  // Lazy placeholder
  if (!isIntersecting) {
    return <div ref={containerRef} className="min-h-[250px] w-full" />;
  }

  if (loading || reviews.length === 0) return null;

  // Sorting: Featured first (by position), then newest
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

  // Ensure we have enough cards for a seamless loop (min 12 before duplication)
  let base: Review[] = [...sortedReviews];
  while (base.length < 12) {
    base = [...base, ...sortedReviews];
  }
  // Duplicate for infinite LTR loop — animation scrolls first half, loops back
  const marqueeReviews = [...base, ...base];

  return (
    <section
      ref={containerRef}
      className="container mx-auto px-4 max-w-6xl mt-16 mb-8 select-none"
    >
      {/* Inject keyframes globally */}
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_CSS }} />

      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-10" dir="rtl">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-600/10 rounded-xl md:rounded-2xl flex items-center justify-center">
          <MessageSquareQuote className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-alexandria font-black text-white tracking-tighter">
          {title || "آراء الطلاب"}
        </h2>
      </div>

      {/* Marquee viewport — clips overflow */}
      <div className="relative w-full overflow-hidden" dir="ltr">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

        {/* Animated track */}
        <div className="pr-marquee-track gap-4 md:gap-6 py-2">
          {marqueeReviews.map((review, idx) => {
            const fullName = `${review.firstName} ${review.lastName ? review.lastName.trim().charAt(0) + "." : ""}`;
            const displayName = fullName.trim().replace(/^\./, "");
            const fallbackLetter = displayName.replace(/^\./, "").charAt(0);

            return (
              <div
                key={idx}
                className="w-[300px] h-[170px] md:w-[360px] md:h-[185px] flex-shrink-0 bg-white/[0.03] border border-white/5 p-4 md:p-5 rounded-3xl relative group hover:border-rose-500/20 transition-all duration-500 shadow-2xl flex flex-col justify-between"
                dir="rtl"
              >
                {/* Header: Avatar + Name & Stars */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="shrink-0">
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

                {/* Review text — centered vertically in remaining space */}
                <div className="flex-1 flex items-center relative z-10">
                  <p className="text-zinc-200 font-cairo text-[13px] md:text-[14.5px] leading-relaxed px-1 line-clamp-3 italic w-full text-center">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>

                {/* Ambient hover glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                {/* Decorative quote mark */}
                <div className="absolute top-4 left-4 text-white/[0.025] font-serif text-6xl pointer-events-none select-none">
                  &ldquo;
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
