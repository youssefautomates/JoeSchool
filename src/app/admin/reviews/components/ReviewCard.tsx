import React, { useState, useMemo } from "react";
import { Star, ShieldCheck, Sparkles, Edit3, Trash2, Eye, EyeOff } from "lucide-react";
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
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-cairo">نشط</span>;
      case "hidden":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-cairo">مخفي</span>;
      case "pending":
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-cairo">معلق</span>;
      case "archived":
        return <span className="bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-2 py-0.5 rounded-full text-[9px] font-black font-cairo">مؤرشف</span>;
      default:
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-black font-cairo">نشط</span>;
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case "manual_admin":
        return <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full text-[8px] font-bold font-cairo">لوحة المسؤول</span>;
      case "imported":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[8px] font-bold font-cairo">مستورد</span>;
      case "customer_submitted":
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[8px] font-bold font-cairo font-sans">رأي عميل</span>;
      default:
        return <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded-full text-[8px] font-bold font-cairo">لوحة المسؤول</span>;
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

  return (
    <div 
      className={`bg-[#09090e] p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
        review.status === "hidden"
          ? "border-red-500/20 opacity-55 hover:opacity-100"
          : review.status === "pending"
          ? "border-amber-500/20 shadow-md"
          : review.status === "archived"
          ? "border-zinc-800 opacity-40"
          : "border-white/5 hover:border-rose-500/30"
      }`}
      dir="rtl"
    >
      <div className="space-y-4">
        {/* Header section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="text-white font-bold text-xs font-alexandria">
                {review.firstName} {review.lastName ? review.lastName.charAt(0) + "." : ""}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {review.isFeatured && (
                  <div className="flex items-center gap-0.5 text-rose-500">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span className="text-[8px] font-bold font-cairo">مميز ({review.featuredPosition || 0})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {getStatusBadge(review.status)}
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-2">
          {renderedStarsBlock}
          <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
            {review.rating.toFixed(1)}
          </span>
        </div>

        {/* Review testimonial with expand/collapse */}
        <div className="space-y-1">
          <p className="text-zinc-400 font-cairo text-xs leading-relaxed italic">
            &ldquo;{displayedText}&rdquo;
          </p>
          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[#D6004B] hover:text-[#ff0059] text-[10px] font-bold font-cairo underline cursor-pointer self-start animate-pulse"
            >
              {isExpanded ? "عرض أقل" : "عرض المزيد"}
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-white/5 space-y-4">

        {/* Quick action controls */}
        <div className="flex items-center gap-2">
          {review.status !== "visible" && review.status !== "archived" && (
            <button
              onClick={() => onStatusChange(review, "visible")}
              className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold font-cairo transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="تفعيل ونشر التقييم"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>موافقة</span>
            </button>
          )}
          {review.status !== "hidden" && review.status !== "archived" && (
            <button
              onClick={() => onStatusChange(review, "hidden")}
              className="flex-1 py-2 bg-zinc-800 text-zinc-400 hover:bg-red-500/15 hover:text-red-400 rounded-lg text-[10px] font-bold font-cairo transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="إخفاء وحجب التقييم"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>حجب</span>
            </button>
          )}

          {review.status === "archived" && (
            <button
              onClick={() => onStatusChange(review, "pending")}
              className="flex-1 py-2 bg-[#D6004B]/10 text-rose-500 hover:bg-[#D6004B]/20 rounded-lg text-[10px] font-bold font-cairo transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="استعادة من الأرشيف"
            >
              <span>استعادة</span>
            </button>
          )}

          {/* Edit / Delete Icon triggers */}
          <button
            onClick={() => onEdit(review)}
            className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
            title="تعديل تفاصيل التقييم"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (review.status === "archived") {
                if (confirm("هل أنت متأكد من حذف هذا التقييم نهائيًا؟")) {
                  onDelete(review.id);
                }
              } else {
                const reason = prompt("يرجى كتابة سبب الأرشفة (اختياري):") || undefined;
                onDelete(review.id, reason);
              }
            }}
            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            title={review.status === "archived" ? "حذف نهائي" : "أرشفة التقييم"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
