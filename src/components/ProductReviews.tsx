"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, MessageSquareQuote, CheckCircle2 } from "lucide-react";

interface Review {
  id: string;
  productId: string;
  firstName: string;
  lastName: string;
  rating: number;
  text: string;
  avatarUrl: string;
  gender?: string;
  isVerified: boolean;
  createdAt: string;
}

// Proven Dicebear adventurer seeds that produce clearly gendered avatars
const MALE_SEEDS = ["Felix", "Oliver", "Charlie", "Jack", "Liam", "Noah", "James", "Ethan"];
const FEMALE_SEEDS = ["Mia", "Lily", "Emma", "Sara", "Luna", "Aria", "Zoe", "Chloe"];

const getAvatarUrl = (firstName: string, gender?: string) => {
  const seeds = gender === "female" ? FEMALE_SEEDS : MALE_SEEDS;
  let hash = 0;
  for (let i = 0; i < firstName.length; i++) {
    hash = firstName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chosen = seeds[Math.abs(hash) % seeds.length];
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${chosen}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
};

export function ProductReviews({ productId, initialReviews }: { productId: string, initialReviews?: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
  const [loading, setLoading] = useState(initialReviews === undefined);

  useEffect(() => {
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
  }, [productId, initialReviews]);

  if (loading || reviews.length === 0) return null;

  // Build a long list of reviews for the marquee to prevent any empty space on wider screens
  let marqueeReviews: Review[] = [];
  let repeated = [...reviews];
  while (repeated.length < 12) {
    repeated = [...repeated, ...reviews];
  }
  marqueeReviews = [...repeated, ...repeated];

  return (
    <section className="mt-16 mb-8 overflow-hidden relative select-none">
      <div className="container mx-auto px-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center">
            <MessageSquareQuote className="w-6 h-6 text-rose-500" />
          </div>
          <h2 className="text-3xl font-alexandria font-black text-white tracking-tighter">آراء الطلاب</h2>
        </div>
      </div>

      {/* Infinite Marquee */}
      <div className="relative w-full overflow-hidden" dir="ltr">
        
        {/* CSS Keyframes for seamless left-to-right scroll (matching showcase videos) */}
        <style jsx global>{`
          @keyframes product-reviews-marquee-ltr {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0%); }
          }
          .animate-product-reviews-marquee-ltr {
            display: flex;
            width: max-content;
            animation: product-reviews-marquee-ltr 70s linear infinite;
          }
          .animate-product-reviews-marquee-ltr:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-16 bg-gradient-to-r from-[#050505] md:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-16 bg-gradient-to-l from-[#050505] md:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 md:gap-6 animate-product-reviews-marquee-ltr py-2">
          {marqueeReviews.map((review, idx) => {
            const avatarSrc = review.avatarUrl && !review.avatarUrl.includes("pravatar")
              ? review.avatarUrl
              : getAvatarUrl(review.firstName, review.gender);

            return (
              <div
                key={idx}
                className="w-[300px] h-[220px] md:w-[360px] md:h-[250px] flex-shrink-0 bg-[#08080c]/60 border border-white/5 p-5 md:p-6 rounded-3xl relative group hover:border-rose-500/30 transition-all duration-500 shadow-2xl flex flex-col justify-between"
                dir="rtl"
              >
                <div className="space-y-3">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-zinc-800 overflow-hidden shadow-lg border border-white/10 shrink-0 relative">
                      <img 
                        src={avatarSrc} 
                        alt={review.firstName} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-alexandria font-bold text-white text-xs md:text-sm truncate">
                        {review.firstName} {review.lastName ? review.lastName.charAt(0) + "." : ""}
                      </h4>
                    </div>
                    {review.isVerified && (
                      <div className="shrink-0">
                        <div className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span className="text-[8px] md:text-[9px] font-black font-cairo">موثق</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rating Stars */}
                  <div className="flex text-yellow-500 gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 md:w-3.5 md:h-3.5 ${i < review.rating ? 'fill-current' : 'text-zinc-800 fill-transparent'}`} />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-zinc-400 font-cairo text-xs md:text-sm leading-relaxed whitespace-normal pl-2 line-clamp-3 md:line-clamp-4">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>
                
                {/* Subtle Ambient Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
