"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Star, CheckCircle2, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── CSS Keyframes (injected at runtime — never stripped by any build tool) ──
// Direction: left to right (content slides from left side toward right side)
// Achieved by moving the track from -33.3334% back to 0% (positive direction)
const MARQUEE_CSS = `
  @keyframes __mq_ltr {
    0%   { transform: translateX(-33.3334%); }
    100% { transform: translateX(0%); }
  }
`;

function useInjectMarqueeStyles() {
  useEffect(() => {
    if (document.getElementById("__mq_styles")) return;
    const el = document.createElement("style");
    el.id = "__mq_styles";
    el.textContent = MARQUEE_CSS;
    document.head.appendChild(el);
    return () => {
      const existing = document.getElementById("__mq_styles");
      if (existing) document.head.removeChild(existing);
    };
  }, []);
}

// ─── Star rendering ───────────────────────────────────────────────────────────
const StarIcon = memo(function StarIcon({ fill }: { fill: number }) {
  const id = `star-${Math.round(fill)}`;
  if (fill <= 0) return (
    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "#3f3f46" }}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
  if (fill >= 100) return (
    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" strokeWidth="0.5">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
  return (
    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" viewBox="0 0 24 24">
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${fill}%`} stopColor="#facc15" />
          <stop offset={`${fill}%`} stopColor="#3f3f46" />
        </linearGradient>
      </defs>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={`url(#${id})`} stroke="#facc15" strokeWidth="0.3" />
    </svg>
  );
});

function renderStars(rating: number) {
  return (
    <div style={{ display: "flex", gap: 2, direction: "ltr" }}>
      {[1, 2, 3, 4, 5].map((v) => {
        const pct = Math.min(100, Math.max(0, (rating - (v - 1)) * 100));
        return <StarIcon key={v} fill={pct} />;
      })}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const initial = review.name.trim().replace(/^\./, "").charAt(0).toUpperCase();
  return (
    <div
      dir="rtl"
      style={{
        width: 330,
        flexShrink: 0,
        marginRight: 24,
        background: "rgba(255,255,255,0.018)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        transition: "border-color 0.4s, background 0.4s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(244,63,94,0.22)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.018)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {review.avatarUrl ? (
          <img
            src={review.avatarUrl}
            alt={review.name}
            loading="lazy"
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(244,63,94,0.25), rgba(251,146,60,0.1))",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#f43f5e", fontWeight: 700, fontSize: 14, flexShrink: 0,
            fontFamily: "Alexandria, sans-serif"
          }}>
            {initial}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Alexandria, sans-serif", fontWeight: 700, color: "#fff", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
              {review.name.trim().replace(/^\./, "")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#34d399", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)", padding: "2px 6px", borderRadius: 100, whiteSpace: "nowrap", fontFamily: "Cairo, sans-serif" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
              موثق
            </span>
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
            {renderStars(review.stars)}
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#71717a" }}>{review.stars.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Review text */}
      <p style={{ color: "#d4d4d8", fontFamily: "Cairo, sans-serif", fontSize: 13, lineHeight: 1.7, fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 }}>
        "{review.text}"
      </p>

      {/* Course badge */}
      {review.isCourse && review.courseTitle && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 100, fontSize: 10, color: "#71717a", fontFamily: "Cairo, sans-serif", fontWeight: 700, maxWidth: "100%", overflow: "hidden" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{review.courseTitle}</span>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Marquee Track ────────────────────────────────────────────────────────────
// Renders 3 identical copies. Animates -33.3334% → 0% (left-to-right).
// Loop restart is invisible because copy 1 end === copy 2 start.
function MarqueeTrack({ reviews, durationSeconds = 90 }: { reviews: Review[]; durationSeconds?: number }) {
  const [paused, setPaused] = useState(false);

  // Pad to minimum 12 cards per copy
  let padded = [...reviews];
  while (padded.length < 12) padded = [...padded, ...reviews];

  // Triple for seamless -33.3334% loop
  const tripled = [...padded, ...padded, ...padded];

  return (
    <div
      style={{ overflow: "hidden", width: "100%" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          width: "max-content",
          willChange: "transform",
          animationName: "__mq_ltr",
          animationDuration: `${durationSeconds}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {tripled.map((review, idx) => (
          <ReviewCard key={idx} review={review} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function ReviewsMarquee() {
  useInjectMarqueeStyles();

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
      <section
        id="reviews"
        style={{ padding: "96px 0", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}
      >
        <div style={{ width: 40, height: 40, border: "3px solid rgba(244,63,94,0.2)", borderTopColor: "#f43f5e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section
      id="reviews"
      style={{ padding: "96px 0 112px", background: "#050505", overflow: "hidden", position: "relative", userSelect: "none" }}
    >
      {/* Ambient background glows */}
      <div style={{ position: "absolute", top: 0, left: "20%", width: 600, height: 600, background: "radial-gradient(circle, rgba(244,63,94,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, right: "20%", width: 600, height: 600, background: "radial-gradient(circle, rgba(244,63,94,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Left + right fade vignettes */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #050505 0%, transparent 8%, transparent 92%, #050505 100%)", pointerEvents: "none", zIndex: 10 }} />

      {/* Section heading */}
      <div style={{ textAlign: "center", padding: "0 16px", marginBottom: 56, position: "relative", zIndex: 5 }}>
        <h2 style={{ fontFamily: "Alexandria, sans-serif", fontWeight: 900, fontSize: "clamp(28px, 5vw, 48px)", color: "#fff", letterSpacing: "-0.03em", margin: "0 0 14px" }}>
          ثقة عملائنا
        </h2>
        <p style={{ fontFamily: "Cairo, sans-serif", color: "#71717a", fontSize: "clamp(13px, 2vw, 15px)", maxWidth: 500, margin: "0 auto", lineHeight: 1.75 }}>
          آراء واقعية من أشخاص حقيقيين قاموا بتطوير مهاراتهم الإبداعية معنا بنجاح
        </p>
      </div>

      {/* Single continuous left-to-right marquee row */}
      <MarqueeTrack reviews={reviews} durationSeconds={90} />

      {/* Bottom rule */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)" }} />
    </section>
  );
}
