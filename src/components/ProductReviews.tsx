"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, MessageSquareQuote, User } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

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

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/reviews?productId=${productId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReviews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading || reviews.length === 0) return null;

  return (
    <section className="container mx-auto px-4 mt-16 mb-8">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center">
          <MessageSquareQuote className="w-6 h-6 text-rose-500" />
        </div>
        <h2 className="text-3xl font-alexandria font-black text-white tracking-tighter">آراء العملاء</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review, idx) => (
          <motion.div 
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#0c0c12] p-8 rounded-[2rem] border border-white/5 hover:border-rose-500/30 transition-all group flex flex-col"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-800 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 border-white/5 group-hover:border-rose-500/50 transition-colors relative">
                  {review.avatarUrl && !review.avatarUrl.includes("pravatar") ? (
                    <img src={review.avatarUrl} alt={review.firstName} className="w-full h-full object-cover" />
                  ) : (
                    <img src={getAvatarUrl(review.firstName, review.gender)} alt={review.firstName} className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-alexandria font-bold text-lg">
                    {review.firstName} {review.lastName ? review.lastName.charAt(0) + "." : ""}
                  </h4>
                  {review.isVerified && (
                    <div className="flex items-center gap-1 mt-1 bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">مشترٍ موثوق</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1 mb-4 text-yellow-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-zinc-800 fill-transparent'}`} />
              ))}
            </div>

            <p className="text-zinc-400 font-cairo text-base leading-relaxed flex-1 italic">
              "{review.text}"
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
