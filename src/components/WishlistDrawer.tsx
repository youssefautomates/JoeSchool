"use client";

import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";
import { fetchUserWishlist, fetchLocalHydratedWishlist, removeFromWishlist, type WishlistItem } from "@/lib/wishlist";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function WishlistDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  const { addToCart } = useCart();

  // 1. Listen for toggle event to open the drawer
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener("wishlist-open", handleOpen);
    window.addEventListener("wishlist-close", handleClose);
    return () => {
      window.removeEventListener("wishlist-open", handleOpen);
      window.removeEventListener("wishlist-close", handleClose);
    };
  }, []);

  // 2. Auth state setup
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Resolve user currency
  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  // 4. Fetch wishlist items (guest or auth)
  const loadItems = async () => {
    setLoading(true);
    try {
      if (user) {
        const { items: dbItems, error } = await fetchUserWishlist(user.id);
        if (!error && dbItems) {
          setItems(dbItems);
        }
      } else {
        const localItems = await fetchLocalHydratedWishlist();
        setItems(localItems);
      }
    } catch (e) {
      console.error("Failed to load wishlist items:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, user]);

  // 5. Listen for wishlist changes (when liked/unliked elsewhere) to reload
  useEffect(() => {
    const handleUpdate = () => {
      loadItems();
    };
    window.addEventListener("wishlist-updated", handleUpdate);
    return () => window.removeEventListener("wishlist-updated", handleUpdate);
  }, [user]);

  // 6. Remove item from wishlist
  const handleRemove = async (item: WishlistItem) => {
    const itemId = item.course_id || item.product_id || item.bundle_id;
    if (!itemId) return;
    
    setIsRemovingId(itemId);
    try {
      const { success, error } = await removeFromWishlist(item.item_type, itemId, user?.id);
      if (success) {
        setItems((prev) => prev.filter((i) => (i.course_id || i.product_id || i.bundle_id) !== itemId));
        toast.success("تمت الإزالة من المفضلة");
        // Dispatch event so liked state is updated in listing buttons
        window.dispatchEvent(new Event("wishlist-updated"));
      } else {
        toast.error(error || "حدث خطأ أثناء الإزالة");
      }
    } catch (e) {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setIsRemovingId(null);
    }
  };

  // 7. Add item to cart
  const handleAddToCart = (item: WishlistItem) => {
    const innerItem = item.course || item.product || item.bundle;
    if (!innerItem) return;

    const pricing = resolveProductPrice(innerItem, currency);

    addToCart({
      id: innerItem.id,
      title: innerItem.title,
      price: pricing.price,
      original_price: pricing.original_price,
      image_url: innerItem.image_url || "/placeholder.png",
      category: innerItem.category || item.item_type,
    } as any);

    toast.success("تمت الإضافة إلى السلة بنجاح");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed top-0 left-0 h-full w-[90%] md:w-[400px] bg-[#0a0a0f] border-r border-white/10 z-[101] shadow-2xl flex flex-col font-cairo text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-500">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <h2 className="text-xl font-alexandria font-bold text-white">المفضلة</h2>
                <span className="bg-white/10 text-white text-xs px-2 py-1 rounded-md">{items.length}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <Heart className="w-16 h-16 text-zinc-500" />
                  <p className="text-zinc-400 font-bold">لا توجد عناصر بالمفضلة حالياً</p>
                </div>
              ) : (
                items.map((item) => {
                  const innerItem = item.course || item.product || item.bundle;
                  if (!innerItem) return null;

                  const itemId = innerItem.id;
                  const typeBadge =
                    item.item_type === "course"
                      ? "دورة تعليمية"
                      : item.item_type === "bundle"
                      ? "حزمة عروض"
                      : "منتج رقمي";

                  const badgeColor =
                    item.item_type === "course"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      : item.item_type === "bundle"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20";

                  const pricing = resolveProductPrice(innerItem, currency);
                  const isFree = pricing.price === 0;

                  const itemLink =
                    item.item_type === "course"
                      ? `/courses/${innerItem.slug}`
                      : item.item_type === "bundle"
                      ? `/bundles/${innerItem.slug}`
                      : `/product/${innerItem.slug}`;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 group relative"
                    >
                      <Link
                        href={itemLink}
                        onClick={() => setIsOpen(false)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#050505] shrink-0 border border-white/5 block"
                      >
                        <img
                          src={innerItem.image_url || "/placeholder.png"}
                          alt={innerItem.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={itemLink}
                              onClick={() => setIsOpen(false)}
                              className="text-sm font-bold text-white hover:text-[#D6004B] transition-colors line-clamp-1 block"
                            >
                              {innerItem.title}
                            </Link>
                            <span
                              className={`inline-block px-2 py-0.5 mt-1 rounded-md text-[8px] font-alexandria font-bold border ${badgeColor}`}
                            >
                              {typeBadge}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemove(item)}
                            disabled={isRemovingId === itemId}
                            className="text-zinc-500 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer disabled:opacity-50"
                            title="إزالة من المفضلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <span className="text-sm font-alexandria font-black text-rose-400">
                            {isFree ? "مجاني" : formatPrice(pricing.price, currency)}
                          </span>

                          <button
                            onClick={() => handleAddToCart(item)}
                            className="h-8 px-3 rounded-lg bg-[#D6004B] hover:bg-[#b0003d] text-white text-[10px] font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 hover:shadow-rose-600/20 transition-all duration-300 cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>شراء</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-white/10 bg-white/[0.02]">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-cairo font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  إغلاق المفضلة
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
