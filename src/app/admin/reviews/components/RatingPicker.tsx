import React, { useState } from "react";
import { Star } from "lucide-react";

interface RatingPickerProps {
  rating: number;
  onChange: (rating: number) => void;
}

export function RatingPicker({ rating, onChange }: RatingPickerProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const activeRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div 
      className="flex items-center gap-1 bg-white/5 p-3 rounded-xl border border-white/10 w-fit select-none"
      dir="ltr"
      onMouseLeave={() => setHoverRating(null)}
    >
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const starIndex = i + 1; // 1 to 5
          const isFull = activeRating >= starIndex;
          const isHalf = !isFull && activeRating > starIndex - 1;
          const fillPercent = isHalf ? (activeRating - (starIndex - 1)) * 100 : 0;

          return (
            <div key={i} className="relative w-6 h-6 select-none cursor-pointer">
              {/* Empty Star Background */}
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                <Star className="w-5 h-5 text-zinc-600 fill-transparent" />
              </div>

              {/* Full Star Overlay */}
              {isFull && (
                <div className="absolute inset-0 flex items-center justify-center text-yellow-400">
                  <Star className="w-5 h-5 fill-current text-yellow-400" />
                </div>
              )}
              
              {/* Fractional Star Overlay */}
              {isHalf && (
                <div 
                  className="absolute inset-0 flex items-center justify-start text-yellow-400 overflow-hidden"
                  style={{ width: `${fillPercent}%` }}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Star className="w-5 h-5 fill-current text-yellow-400" />
                  </div>
                </div>
              )}

              {/* Click Areas: Left Half (e.g. 0.5) */}
              <div 
                className="absolute top-0 left-0 w-1/2 h-full z-10"
                onMouseEnter={() => setHoverRating(starIndex - 0.5)}
                onClick={() => onChange(starIndex - 0.5)}
              />
              {/* Click Areas: Right Half (e.g. 1.0) */}
              <div 
                className="absolute top-0 right-0 w-1/2 h-full z-10"
                onMouseEnter={() => setHoverRating(starIndex)}
                onClick={() => onChange(starIndex)}
              />
            </div>
          );
        })}
      </div>
      
      <span className="text-white text-xs font-bold font-mono ml-3 bg-white/10 px-2 py-0.5 rounded-md min-w-[28px] text-center">
        {activeRating.toFixed(1)}
      </span>
    </div>
  );
}
