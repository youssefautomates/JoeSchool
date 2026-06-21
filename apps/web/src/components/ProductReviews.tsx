"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Star, MessageSquareQuote, Quote } from "lucide-react";

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

export const MemoizedStarSVG = memo(function StarSVG({ fillPercent }: StarSVGProps) {
  if (fillPercent <= 0) {
    return <Star className="w-3.5 h-3.5 fill-transparent" style={{ color: "#6b0020" }} />;
  }
  if (fillPercent >= 100) {
    return <Star className="w-3.5 h-3.5 fill-current" style={{ color: "#D6004B" }} />;
  }
  return (
    <div className="relative w-3.5 h-3.5">
      <Star className="w-3.5 h-3.5 fill-transparent absolute inset-0" style={{ color: "#6b0020" }} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
        <Star className="w-3.5 h-3.5 fill-current" style={{ color: "#D6004B" }} />
      </div>
    </div>
  );
});

function renderFractionalStars(rating: number) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {Array.from({ length: 5 }).map((_, i) => {
        const starVal = i + 1;
        const isFilled = starVal <= Math.floor(rating);
        const isHalf = !isFilled && starVal - 0.5 <= rating;
        let fillPercent = 0;
        if (isFilled) fillPercent = 100;
        else if (isHalf) fillPercent = (rating - (starVal - 1)) * 100;
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
  animation: pr-marquee-ltr 180s linear infinite;
}
.pr-marquee-track:hover {
  animation-play-state: paused;
}
`;

/* Gradient palettes cycling per card index */
const AVATAR_GRADIENTS = [
  "from-rose-500/30 via-pink-500/20 to-rose-900/10",
  "from-violet-500/30 via-purple-500/20 to-indigo-900/10",
  "from-amber-500/30 via-orange-500/20 to-rose-900/10",
  "from-cyan-500/30 via-sky-500/20 to-blue-900/10",
  "from-emerald-500/30 via-teal-500/20 to-green-900/10",
  "from-fuchsia-500/30 via-pink-500/20 to-purple-900/10",
];
const AVATAR_TEXT_COLORS = [
  "text-rose-300",
  "text-violet-300",
  "text-amber-300",
  "text-cyan-300",
  "text-emerald-300",
  "text-fuchsia-300",
];
const GLOW_COLORS = [
  "bg-rose-500/15",
  "bg-violet-500/15",
  "bg-amber-500/15",
  "bg-cyan-500/15",
  "bg-emerald-500/15",
  "bg-fuchsia-500/15",
];
const BORDER_HOVER_COLORS = [
  "hover:border-rose-500/30",
  "hover:border-violet-500/30",
  "hover:border-amber-500/30",
  "hover:border-cyan-500/30",
  "hover:border-emerald-500/30",
  "hover:border-fuchsia-500/30",
];

export function ProductReviews({ productId, initialReviews, courseTitle, productTitle, title }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(initialReviews === undefined);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isIntersecting) return;
    if (initialReviews !== undefined) {
      setReviews(initialReviews);
      setLoading(false);
      return;
    }
    fetch(`/api/admin/reviews?productId=${productId}&_t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setReviews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, initialReviews, isIntersecting]);

  if (!isIntersecting) {
    return <div ref={containerRef} className="min-h-[280px] w-full" />;
  }
  if (loading || reviews.length === 0) return null;

  const sortedReviews = [...reviews].sort((a, b) => {
    const aF = a.isFeatured === true, bF = b.isFeatured === true;
    if (aF && !bF) return -1;
    if (!aF && bF) return 1;
    if (aF && bF) {
      const aP = typeof a.featuredPosition === "number" ? a.featuredPosition : 999;
      const bP = typeof b.featuredPosition === "number" ? b.featuredPosition : 999;
      if (aP !== bP) return aP - bP;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  let base: Review[] = [...sortedReviews];
  while (base.length < 12) base = [...base, ...sortedReviews];
  const marqueeReviews = [...base, ...base];

  return (
    <section ref={containerRef} className="container mx-auto px-4 max-w-6xl mt-16 mb-8 select-none">
      <style dangerouslySetInnerHTML={{ __html: MARQUEE_CSS }} />

      {/* Section header */}
      <div className="flex items-center gap-3 mb-10" dir="rtl">
        <div className="w-11 h-11 md:w-13 md:h-13 bg-gradient-to-br from-rose-600/20 to-rose-900/10 rounded-2xl flex items-center justify-center border border-rose-500/10 shadow-lg shadow-rose-500/5">
          <MessageSquareQuote className="w-5 h-5 md:w-6 md:h-6 text-rose-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-alexandria font-black text-white tracking-tight leading-none">
          {title || "آراء الطلاب"}
        </h2>
      </div>

      {/* Marquee viewport */}
      <div className="relative w-full overflow-hidden" dir="ltr">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-10 md:w-14 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 md:w-14 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

        {/* Animated track */}
        <div className="pr-marquee-track gap-4 md:gap-5 py-3">
          {marqueeReviews.map((review, idx) => {
            const colorIdx = idx % AVATAR_GRADIENTS.length;
            const fullName = `${review.firstName} ${review.lastName ? review.lastName.trim().charAt(0) + "." : ""}`;
            const displayName = fullName.trim().replace(/^\./, "");
            const fallbackLetter = displayName.replace(/^\./, "").charAt(0).toUpperCase();

            return (
              <div
                key={idx}
                className={`
                  w-[290px] md:w-[340px] flex-shrink-0
                  relative group flex flex-col gap-4 p-5 md:p-6
                  rounded-[20px] overflow-hidden
                  bg-gradient-to-br from-white/[0.045] to-white/[0.015]
                  border border-white/[0.07]
                  ${BORDER_HOVER_COLORS[colorIdx]}
                  transition-all duration-500
                  shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                  hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]
                  hover:-translate-y-0.5
                `}
                dir="rtl"
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Large decorative quote */}
                <Quote
                  className="absolute bottom-3 left-3 w-16 h-16 opacity-[0.04] rotate-180 pointer-events-none"
                  strokeWidth={1}
                />

                {/* Glow blob on hover */}
                <div className={`absolute -top-8 -right-8 w-36 h-36 ${GLOW_COLORS[colorIdx]} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

                {/* Header: Avatar + Name & Stars */}
                <div className="flex items-center gap-3 relative z-10">
                  {/* Avatar */}
                  <div className="shrink-0 relative">
                    {review.avatarUrl ? (
                      <img
                        src={review.avatarUrl}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 shadow-md"
                        alt={displayName}
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[colorIdx]} flex items-center justify-center ring-1 ring-white/10 shadow-md`}>
                        <span className={`font-alexandria font-bold text-base ${AVATAR_TEXT_COLORS[colorIdx]}`}>
                          {fallbackLetter}
                        </span>
                      </div>
                    )}
                    {/* Online dot */}
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a0a0f] shadow-sm shadow-emerald-400/50" />
                  </div>

                  {/* Name + Stars */}
                  <div className="min-w-0 flex-1">
                    <p className="font-alexandria font-bold text-white text-[13px] md:text-sm truncate leading-tight">
                      {displayName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {renderFractionalStars(review.rating)}
                    </div>
                  </div>

                  {/* Verified badge */}
                  {review.isVerified && (
                    <div className="shrink-0 text-[9px] font-bold text-emerald-400/80 bg-emerald-400/8 border border-emerald-400/15 rounded-full px-2 py-0.5 font-cairo whitespace-nowrap">
                      ✓ مُتحقق
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent relative z-10" />

                {/* Review text */}
                <div className="relative z-10 flex-1 flex items-center">
                  <p className="text-zinc-300 font-cairo text-[13px] md:text-[14px] leading-[1.75] line-clamp-3 w-full text-right">
                    {review.text}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
