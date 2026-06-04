"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useMotionValue, useAnimationFrame, motion } from "framer-motion";
import { Star, CheckCircle2, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Review {
  name: string;
  text: string;
  stars: number;
  avatarUrl?: string;
  isCourse?: boolean;
  courseTitle?: string;
  isFeatured?: boolean;
  featuredPosition?: number;
  createdAt?: string;
}

interface StarSVGProps { fillPercent: number; }

export const MemoizedStarSVG = memo(function StarSVG({ fillPercent }: StarSVGProps) {
  if (fillPercent <= 0) return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-700 fill-transparent" />;
  if (fillPercent >= 100) return <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-400" />;
  return (
    <div className="relative w-3 h-3 md:w-3.5 md:h-3.5">
      <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-700 fill-transparent absolute inset-0" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
        <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current text-yellow-400" />
      </div>
    </div>
  );
});

function renderStars(rating: number) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        const filled = v <= Math.floor(rating);
        const half = !filled && v - 0.5 <= rating;
        let pct = 0;
        if (filled) pct = 100;
        else if (half) pct = (rating - (v - 1)) * 100;
        return <MemoizedStarSVG key={i} fillPercent={pct} />;
      })}
    </div>
  );
}

// ─── Infinite Marquee Track ───────────────────────────────────────────────────
// Renders cards list duplicated 3× so there's always content to loop back into.
// Uses Framer Motion's useMotionValue + useAnimationFrame for native 60fps motion.
function MarqueeTrack({
  reviews,
  direction = 1,   // 1 = left, -1 = right
  speed = 60,      // pixels per second
}: {
  reviews: Review[];
  direction?: 1 | -1;
  speed?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [isPaused, setIsPaused] = useState(false);

  useAnimationFrame((_, delta) => {
    if (isPaused) return;
    const track = trackRef.current;
    if (!track) return;

    // One "loop unit" = 1/3 of the total width (since we tripled the content)
    const loopWidth = track.scrollWidth / 3;
    if (loopWidth === 0) return;

    const current = x.get();
    // Move by speed * seconds elapsed
    const step = (delta / 1000) * speed * direction;
    let next = current - step;   // subtracting moves left

    // Seamless reset: when we've scrolled one full copy's width, snap back
    if (direction === 1 && next <= -loopWidth) next += loopWidth;
    if (direction === -1 && next >= 0) next -= loopWidth;

    x.set(next);
  });

  // Pad the reviews list so we always have at least 12 items per copy
  const padded = (() => {
    let list = [...reviews];
    while (list.length < 12) list = [...list, ...list];
    return list;
  })();

  // Triple the padded list for seamless looping
  const tripled = [...padded, ...padded, ...padded];

  return (
    <div
      className="overflow-hidden w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        ref={trackRef}
        style={{ x }}
        className="flex flex-row flex-nowrap gap-6 w-max will-change-transform"
      >
        {tripled.map((review, idx) => (
          <ReviewCard key={idx} review={review} />
        ))}
      </motion.div>
    </div>
  );
}

// ─── Review Card ─────────────────────────────────────────────────────────────
const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const initial = review.name.trim().replace(/^\./, "").charAt(0);
  return (
    <div
      className="w-[310px] md:w-[370px] flex-shrink-0 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-rose-500/20 p-5 md:p-6 rounded-3xl relative group transition-all duration-500 shadow-[0_15px_35px_rgba(0,0,0,0.35)] flex flex-col gap-3"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {review.avatarUrl ? (
            <img
              src={review.avatarUrl}
              alt={review.name}
              loading="lazy"
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-white/5 flex items-center justify-center text-rose-400 font-bold text-sm font-alexandria">
              {initial}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-alexandria font-bold text-white text-xs md:text-sm truncate max-w-[130px]">
              {review.name.trim().replace(/^\./, "")}
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-cairo bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.5 rounded-full shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5" />
              موثق
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {renderStars(review.stars)}
            <span className="text-[9px] font-mono text-zinc-500">{review.stars.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Review text */}
      <p className="text-zinc-300 font-cairo text-xs md:text-sm leading-relaxed line-clamp-3 italic">
        "{review.text}"
      </p>

      {/* Course badge */}
      {review.isCourse && review.courseTitle && (
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-3">
          <div
            className="flex items-center gap-1.5 text-zinc-500 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold font-cairo w-fit"
            title={review.courseTitle}
          >
            <BookOpen className="w-3 h-3 text-rose-500 shrink-0" />
            <span className="truncate max-w-[220px]">{review.courseTitle}</span>
          </div>
        </div>
      )}

      {/* Hover glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
});

// ─── Main Section ─────────────────────────────────────────────────────────────
export function ReviewsMarquee() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [reviewsRes, { data: products }, { data: courses }, { data: bundles }] =
          await Promise.all([
            fetch("/api/admin/reviews").then((r) => r.json()),
            supabase.from("products").select("id, title"),
            supabase.from("courses").select("id, title"),
            supabase.from("bundles").select("id, title"),
          ]);

        if (!Array.isArray(reviewsRes)) return;

        const mapped: Review[] = reviewsRes
          .filter((r: any) => r.status === "visible")
          .map((r: any) => {
            const course = courses?.find((c: any) => c.id === r.productId);
            const product = products?.find((p: any) => p.id === r.productId);
            const bundle = bundles?.find((b: any) => b.id === r.productId);
            return {
              name: `${r.firstName} ${r.lastName ? r.lastName.trim().charAt(0) + "." : ""}`,
              text: r.text,
              stars: r.rating || 5,
              avatarUrl: r.avatarUrl,
              isCourse: !!course,
              courseTitle: course?.title,
              isFeatured: r.isFeatured === true,
              featuredPosition: typeof r.featuredPosition === "number" ? r.featuredPosition : 999,
              createdAt: r.createdAt,
            };
          });

        const featured = mapped
          .filter((r) => r.isFeatured)
          .sort((a, b) =>
            a.featuredPosition !== b.featuredPosition
              ? a.featuredPosition! - b.featuredPosition!
              : new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
          );
        const normal = mapped
          .filter((r) => !r.isFeatured)
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

        setReviews(featured.length > 0 ? featured : normal);
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <section id="reviews" className="py-24 bg-[#050505] flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
      </section>
    );
  }

  if (reviews.length === 0) return null;

  // Split reviews into two offset rows for visual richness
  const row1 = reviews.filter((_, i) => i % 2 === 0);
  const row2 = reviews.filter((_, i) => i % 2 === 1).length > 0
    ? reviews.filter((_, i) => i % 2 === 1)
    : reviews;

  return (
    <section id="reviews" className="py-24 md:py-32 bg-[#050505] overflow-hidden relative select-none">

      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-600/4 rounded-full blur-[140px] pointer-events-none" />

      {/* Vignette overlays */}
      <div className="absolute inset-y-0 left-0 w-16 md:w-48 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 md:w-48 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />

      {/* Section heading */}
      <div className="container mx-auto px-4 mb-16 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-4 tracking-tighter">
          ثقة عملائنا
        </h2>
        <p className="text-zinc-500 font-cairo text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          آراء واقعية من أشخاص حقيقيين قاموا بتطوير مهاراتهم الإبداعية وإنتاج محتوى استثنائي معنا بنجاح
        </p>
      </div>

      {/* Marquee rows */}
      <div className="flex flex-col gap-6 md:gap-8">
        <MarqueeTrack reviews={row1} direction={1} speed={55} />
        <MarqueeTrack reviews={row2} direction={-1} speed={45} />
      </div>

      {/* Bottom divider */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
