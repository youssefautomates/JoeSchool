import React, { useState, useMemo } from "react";
import { Star, ShieldCheck, Sparkles, Edit3, Trash2, Eye, EyeOff, BookOpen, ShoppingBag } from "lucide-react";
import { Review } from "@/app/api/admin/reviews/route";

interface StarSVGProps {
  fillPercent: number;
}

// Highly optimized memoized individual fractional star SVG component
export const MemoizedStarSVG = React.memo(function StarSVG({ fillPercent }: StarSVGProps) {
  if (fillPercent <= 0) {
    return <Star className="w-3.5 h-3.5 text-zinc-700 fill-transparent" />;
  }
  if (fillPercent >= 100) {
    return <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />;
  }
  
  return (
    <div className="relative w-3.5 h-3.5">
      <Star className="w-3.5 h-3.5 text-zinc-700 fill-transparent absolute inset-0" />
      <div 
        className="absolute inset-0 overflow-hidden text-yellow-500"
        style={{ width: `${fillPercent}%` }}
      >
        <div className="w-3.5 h-3.5">
          <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
        </div>
      </div>
    </div>
  );
});

export function renderStars(rating: number) {
  return (
    <div className="flex gap-0.5" dir="ltr">
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

// React.memo wrapper for high performance star renders in marquees/lists
export const MemoizedStars = React.memo(function StarRating({ rating }: { rating: number }) {
  return renderStars(rating);
});

interface ReviewCardProps {
  review: Review;
  productName: string;
  onEdit: (review: Review) => void;
  onDelete: (id: string, archiveReason?: string) => void;
  onStatusChange: (review: Review, status: "visible" | "hidden" | "pending" | "archived") => void;
}

export function ReviewCard({ review, productName, onEdit, onDelete, onStatusChange }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "visible":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-sans">Active</span>;
      case "hidden":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-sans">Hidden</span>;
      case "pending":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-sans">Pending</span>;
      case "archived":
        return <span className="bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2 py-0.5 rounded-full text-[9px] font-black font-sans">Archived</span>;
      default:
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-sans">Active</span>;
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case "manual_admin":
        return <span className="bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2 py-0.5 rounded-full text-[8px] font-bold font-sans">Admin Console</span>;
      case "imported":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[8px] font-bold font-sans">Imported</span>;
      case "customer_submitted":
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[8px] font-bold font-sans">Customer Submitted</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2 py-0.5 rounded-full text-[8px] font-bold font-sans">Admin Console</span>;
    }
  };

  const isLongText = (review.text || "").length > 120;
  const displayedText = isExpanded 
    ? review.text 
    : isLongText 
    ? `${review.text.substring(0, 120)}...` 
    : review.text;

  const renderedStarsBlock = useMemo(() => {
    return <MemoizedStars rating={review.rating} />;
  }, [review.rating]);

  const fullName = `${review.firstName} ${review.lastName ? review.lastName.trim().charAt(0) + "." : ""}`;
  const displayName = fullName.trim().replace(/^\./, "");
  const fallbackLetter = displayName.replace(/^\./, "").charAt(0);

  return (
    <div 
      className={`bg-slate-50 p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between group relative overflow-hidden font-sans ${
        review.status === "hidden"
          ? "border-red-500/20 opacity-55 hover:opacity-100"
          : review.status === "pending"
          ? "border-amber-500/20 shadow-md"
          : review.status === "archived"
          ? "border-zinc-200/60 opacity-40"
          : "border-zinc-200/60 hover:border-zinc-200/60"
      }`}
      dir="ltr"
    >
      <div className="space-y-4 relative z-10">
        {/* Header section (Avatar + Name & Stars Stacked) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 relative">
              {review.avatarUrl ? (
                <img 
                  src={review.avatarUrl} 
                  className="w-10 h-10 rounded-full object-cover border border-zinc-200 shadow-inner" 
                  alt={displayName} 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500/20 to-orange-500/10 flex items-center justify-center border border-zinc-200/60 text-yellow-500 font-sans font-bold text-sm shadow-inner">
                  {fallbackLetter}
                </div>
              )}
            </div>
            <div className="min-w-0 text-left">
              <h4 className="text-zinc-900 font-bold text-xs md:text-sm font-sans truncate">
                {displayName}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {renderedStarsBlock}
                <span className="text-[9px] font-mono text-zinc-500 bg-zinc-100/30 px-1 rounded border border-zinc-200/60">
                  {review.rating.toFixed(1)}
                </span>
                {review.isFeatured && (
                  <div className="flex items-center gap-0.5 text-yellow-500 ml-1.5 shrink-0">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span className="text-[8px] font-bold font-sans">Featured ({review.featuredPosition || 0})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {getStatusBadge(review.status)}
          </div>
        </div>

        {/* Review testimonial with expand/collapse */}
        <div className="space-y-1 text-left">
          <p className="text-zinc-350 font-sans text-xs leading-relaxed italic">
            &ldquo;{displayedText}&rdquo;
          </p>
          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#1D4ED8] hover:text-[#3B82F6] text-[10px] font-bold font-sans underline cursor-pointer self-start animate-pulse"
            >
              {isExpanded ? "Show Less" : "Show More"}
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-zinc-200/60 space-y-4 relative z-10">
        {/* Product/Course pill badge */}
        {productName && (
          <div className="flex items-center gap-1.5 text-zinc-500 bg-zinc-50/70 border border-zinc-200/60 px-2.5 py-1 rounded-full text-[10px] font-bold font-sans w-fit max-w-full" title={productName}>
            {review.sourceType === "course" ? (
              <BookOpen className="w-3 h-3 text-[#1D4ED8] shrink-0" />
            ) : (
              <ShoppingBag className="w-3 h-3 text-[#1D4ED8] shrink-0" />
            )}
            <span className="truncate max-w-[220px]">{productName}</span>
          </div>
        )}

        {/* Quick action controls */}
        <div className="flex items-center gap-2">
          {review.status !== "visible" && review.status !== "archived" && (
            <button
              onClick={() => onStatusChange(review, "visible")}
              className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-2xl text-[10px] font-bold font-sans transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Publish Review"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>
          )}
          {review.status !== "hidden" && review.status !== "archived" && (
            <button
              onClick={() => onStatusChange(review, "hidden")}
              className="flex-1 py-2 bg-zinc-800 text-zinc-500 hover:bg-red-500/15 hover:text-red-400 rounded-2xl text-[10px] font-bold font-sans transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Hide Review"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide</span>
            </button>
          )}

          {review.status === "archived" && (
            <button
              onClick={() => onStatusChange(review, "pending")}
              className="flex-1 py-2 bg-[#1D4ED8]/10 text-yellow-500 hover:bg-[#1D4ED8]/20 rounded-2xl text-[10px] font-bold font-sans transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Restore from Archive"
            >
              <span>Restore</span>
            </button>
          )}

          {/* Edit / Delete Icon triggers */}
          <button
            onClick={() => onEdit(review)}
            className="p-2 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 text-zinc-500 hover:text-zinc-900 hover:border-zinc-200 transition-all cursor-pointer"
            title="Edit Review Details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (review.status === "archived") {
                if (confirm("Are you sure you want to permanently delete this review?")) {
                  onDelete(review.id);
                }
              } else {
                const reason = prompt("Please write the reason for archiving (optional):") || undefined;
                onDelete(review.id, reason);
              }
            }}
            className="p-2 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            title={review.status === "archived" ? "Delete Permanently" : "Archive Review"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtle Ambient Hover Glow & Testimonial Quote Mark */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#1D4ED8]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute top-4 left-4 text-zinc-900/[0.02] font-serif text-6xl pointer-events-none">
        ”
      </div>
    </div>
  );
}
