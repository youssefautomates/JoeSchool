"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Star, MessageSquareQuote, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface ProductReviewsProps {
  productId: string;
  initialReviews?: Review[];
  courseTitle?: string;
  productTitle?: string;
  title?: string;
}

// ─── CSS (runtime-injected, never stripped by any build tool) ─────────────────
const MARQUEE_CSS = `
  @keyframes __pr_mq_ltr {
    0%   { transform: translateX(-33.3334%); }
    100% { transform: translateX(0%); }
  }
`;

function useInjectCSS() {
  useEffect(() => {
    if (document.getElementById("__pr_mq_css")) return;
    const el = document.createElement("style");
    el.id = "__pr_mq_css";
    el.textContent = MARQUEE_CSS;
    document.head.appendChild(el);
    return () => {
      const s = document.getElementById("__pr_mq_css");
      if (s) document.head.removeChild(s);
    };
  }, []);
}

// ─── Star rendering ───────────────────────────────────────────────────────────
export const MemoizedStarSVG = memo(function StarSVG({ fillPercent }: { fillPercent: number }) {
  if (fillPercent <= 0) return (
    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-800 fill-transparent" />
  );
  if (fillPercent >= 100) return (
    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-500" />
  );
  return (
    <div className="relative w-3 h-3 md:w-3.5 md:h-3.5">
      <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-800 fill-transparent absolute inset-0" />
      <div className="absolute inset-0 overflow-hidden text-yellow-500" style={{ width: `${fillPercent}%` }}>
        <div className="w-3 h-3 md:w-3.5 md:h-3.5">
          <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-500" />
        </div>
      </div>
    </div>
  );
});

function renderStars(rating: number) {
  return (
    <div className="flex gap-0.5 text-yellow-500" dir="ltr">
      {[1, 2, 3, 4, 5].map((v) => {
        const pct = Math.min(100, Math.max(0, (rating - (v - 1)) * 100));
        return <MemoizedStarSVG key={v} fillPercent={pct} />;
      })}
    </div>
  );
}

// ─── Single Card ──────────────────────────────────────────────────────────────
const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const fullName = `${review.firstName} ${review.lastName ? review.lastName.trim().charAt(0) + "." : ""}`.trim().replace(/^\./, "");
  const initial = fullName.charAt(0).toUpperCase();
  return (
    <div
      dir="rtl"
      className="w-[300px] md:w-[360px] flex-shrink-0 bg-white/[0.02] border border-white/5 hover:border-rose-500/20 p-4 md:p-5 rounded-3xl relative group transition-all duration-500 shadow-2xl flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {review.avatarUrl ? (
            <img src={review.avatarUrl} alt={fullName} loading="lazy"
              className="w-10 h-10 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-white/5 flex items-center justify-center text-rose-400 font-alexandria font-bold text-sm">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-alexandria font-bold text-white text-xs md:text-sm truncate max-w-[140px]">{fullName}</h4>
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.5 rounded-full shrink-0 font-cairo">
              <CheckCircle2 className="w-2.5 h-2.5" />موثق
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {renderStars(review.rating)}
            <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.03] px-1 rounded border border-white/5">{review.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Text */}
      <p className="text-zinc-300 font-cairo text-xs md:text-[13px] leading-relaxed line-clamp-3 italic">
        "{review.text}"
      </p>

      {/* Hover glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-4 left-4 text-white/[0.02] font-serif text-6xl pointer-events-none select-none">"</div>
    </div>
  );
});

// ─── Main Export ──────────────────────────────────────────────────────────────
export function ProductReviews({ productId, initialReviews, courseTitle, productTitle, title }: ProductReviewsProps) {
  useInjectCSS();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(initialReviews === undefined);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer — lazy load until visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsIntersecting(true); },
      { rootMargin: "120px", threshold: 0.01 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch reviews
  useEffect(() => {
    if (!isIntersecting) return;
    if (initialReviews !== undefined) {
      setReviews(initialReviews);
      setLoading(false);
      return;
    }
    fetch(`/api/admin/reviews?productId=${productId}&_t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setReviews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [productId, initialReviews, isIntersecting]);

  // Placeholder until visible
  if (!isIntersecting) return <div ref={containerRef} className="min-h-[250px] w-full" />;
  if (loading || reviews.length === 0) return null;

  // Sort: featured first, then by date
  const sorted = [...reviews].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    if (a.isFeatured && b.isFeatured) {
      const ap = typeof a.featuredPosition === "number" ? a.featuredPosition : 999;
      const bp = typeof b.featuredPosition === "number" ? b.featuredPosition : 999;
      if (ap !== bp) return ap - bp;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Pad to minimum 12 per copy, then triple for seamless -33.333% loop
  let padded = [...sorted];
  while (padded.length < 12) padded = [...padded, ...sorted];
  const tripled = [...padded, ...padded, ...padded];

  return (
    <section ref={containerRef} className="container mx-auto px-4 max-w-6xl mt-16 mb-8 overflow-hidden relative select-none">
      {/* Section heading */}
      <div className="flex items-center gap-2.5 mb-10" dir="rtl">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-rose-600/10 rounded-xl md:rounded-2xl flex items-center justify-center">
          <MessageSquareQuote className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-alexandria font-black text-white tracking-tighter">
          {title || "آراء الطلاب"}
        </h2>
      </div>

      {/* Marquee */}
      <div className="relative w-full overflow-hidden">
        {/* Fade vignettes */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-20 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

        {/* Animated track
            Keyframe __pr_mq_ltr: -33.3334% → 0%  (moves RIGHT = left-to-right)
            With 3 identical copies, when x wraps from 0% back to -33.3334%,
            the user sees the same content → ZERO visible seam.
        */}
        <div
          className="flex flex-nowrap gap-4 md:gap-6 py-2"
          style={{
            width: "max-content",
            willChange: "transform",
            animationName: "__pr_mq_ltr",
            animationDuration: "90s",
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
          } as React.CSSProperties}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {tripled.map((review, idx) => (
            <ReviewCard key={idx} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
