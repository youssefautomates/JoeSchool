"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabaseClient";
import { isItemInWishlist, addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  itemId: string;
  itemType: "course" | "digital_product" | "bundle";
  className?: string;
  size?: number;
}

export default function WishlistButton({
  itemId,
  itemType,
  className,
  size = 20,
}: WishlistButtonProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);
      
      const liked = await isItemInWishlist(itemType, itemId, currentUserId);
      setIsLiked(liked);
    }
    init();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);
      const liked = await isItemInWishlist(itemType, itemId, currentUserId);
      setIsLiked(liked);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [itemId, itemType]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    try {
      if (isLiked) {
        const { success, error } = await removeFromWishlist(itemType, itemId, userId);
        if (success) {
          setIsLiked(false);
          toast.success("تمت الإزالة من المفضلة");
          window.dispatchEvent(new Event("wishlist-updated"));
        } else {
          toast.error(error || "حدث خطأ أثناء الإزالة");
        }
      } else {
        const { success, error } = await addToWishlist(itemType, itemId, userId);
        if (success) {
          setIsLiked(true);
          toast.success("تمت الإضافة إلى المفضلة");
          window.dispatchEvent(new Event("wishlist-updated"));
        } else {
          toast.error(error || "حدث خطأ أثناء الإضافة");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      onClick={toggleLike}
      className={cn(
        "flex items-center justify-center rounded-full p-2 border transition-all duration-300",
        isLiked
          ? "bg-brand-500/10 border-zinc-200/60 text-yellow-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
          : "bg-black/60 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300",
        className
      )}
      aria-label="Add to wishlist"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isLiked ? "liked" : "unliked"}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Heart
            size={size}
            className={cn("transition-all duration-300", isLiked ? "fill-brand-500" : "")}
          />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
