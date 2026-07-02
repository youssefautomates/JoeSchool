"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SocialLinks } from "@/components/SocialLinks";
import { CustomVideoPlayer } from "@/components/CustomVideoPlayer";
import { 
  Zap, Lock, Star, ShieldCheck, Target, 
  MonitorPlay, ArrowLeft, ShoppingCart, Play, CheckCircle2, ChevronLeft,
  Clock, Award, PlayCircle, HelpCircle, AlertCircle, Users, VolumeX, MessageSquareQuote,
  Check, Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { supabase, type Product, calcDiscount, fetchActiveProducts } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";
import { trackViewContent, trackAddToCart, trackInitiateCheckout } from "@/lib/metaPixel";
import { trackTiktokViewContent, trackTiktokAddToCart, trackTiktokInitiateCheckout } from "@/lib/tiktokPixel";
import { trackEvent } from "@/lib/analytics";
import { ProductReviews } from "@/components/ProductReviews";

// ── Helper: Unpack Media and Tags ──────────────────────────────────────
function unpackProduct(p: Product) {
  const mediaTags = p.tags?.filter(t => t.startsWith("media:")) || [];
  const slides = Array(5).fill(null).map((_, i) => {
    const tag = mediaTags.find(t => t.startsWith(`media:${i}:`));
    if (tag) {
      const parts = tag.split(":");
      return { type: parts[2] as 'image' | 'video', url: parts.slice(3).join(":") };
    }
    return null;
  }).filter(Boolean) as { type: 'image' | 'video', url: string }[];

  // Fallback for legacy database records
  if (slides.length === 0) {
    const video_url = p.tags?.find(t => t.startsWith("video:"))?.replace("video:", "");
    if (video_url) slides.push({ type: 'video', url: video_url });
    if (p.image_url) slides.push({ type: 'image', url: p.image_url });
    const legacyGallery = p.tags?.filter(t => t.startsWith("gallery:"))?.map(t => t.replace("gallery:", "")) || [];
    legacyGallery.forEach(url => slides.push({ type: 'image', url }));
  }

  const file_type = p.tags?.find(t => t.startsWith("type:"))?.replace("type:", "") || "zip";
  
  return {
    ...p,
    slides,
    file_type
  };
}

// Proven Dicebear adventurer seeds for creative user avatars
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

// Client-side HTML sanitizer to prevent XSS
function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+(?=\s|>))/gi, "");
}

// Deterministic pseudo-random sales count generator based on product ID
function getPseudoRandomSalesCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 50 + (Math.abs(hash) % 25);
}

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [product, setProduct] = useState<(Product & { slides: { type: "image" | "video"; url: string }[]; file_type: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Media system states
  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  
  const { addToCart } = useCart();

  // Floating CTA visibility tracking
  const [isHeroCtaVisible, setIsHeroCtaVisible] = useState(true);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [isOwned, setIsOwned] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const visibilityMap = new Map<Element, boolean>();
    const observedElements = new Set<Element>();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        visibilityMap.set(entry.target, entry.isIntersecting);
      });
      const anyVisible = Array.from(visibilityMap.values()).some(v => v);
      setIsHeroCtaVisible(anyVisible);
    }, { threshold: 0 });

    const updateObservations = () => {
      const currentElements = document.querySelectorAll('.primary-hero-cta');
      
      // Stop observing elements that are no longer in the DOM
      observedElements.forEach(el => {
        if (!document.body.contains(el)) {
          observer.unobserve(el);
          visibilityMap.delete(el);
          observedElements.delete(el);
        }
      });

      // Observe new elements
      currentElements.forEach(el => {
        if (!observedElements.has(el)) {
          visibilityMap.set(el, false);
          observer.observe(el);
          observedElements.add(el);
        }
      });

      // Update visibility state in case some elements were removed
      const anyVisible = Array.from(visibilityMap.values()).some(v => v);
      setIsHeroCtaVisible(anyVisible);
    };

    updateObservations();

    const mutationObserver = new MutationObserver(() => {
      updateObservations();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [isLoading]);

  useEffect(() => {
    const checkModals = () => {
      if (typeof document === 'undefined') return;
      const modalElements = document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"], .modal, .dialog, [class*="modal"], [class*="dialog"]'
      );
      let isOpen = false;
      modalElements.forEach(el => {
        const role = el.getAttribute('role');
        if (role === 'dialog' || role === 'alertdialog') {
          isOpen = true;
        }
      });
      setIsAnyModalOpen(isOpen);
    };

    checkModals();

    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function checkOwnership() {
      if (!product) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const { data, error } = await supabase
            .from("orders")
            .select("id")
            .eq("customer_email", session.user.email)
            .eq("product_id", product.id)
            .eq("status", "completed")
            .limit(1);
          
          if (!error && data && data.length > 0) {
            setIsOwned(true);
          }
        }
      } catch (err) {
        console.error("Error checking product ownership:", err);
      }
    }
    checkOwnership();
  }, [product]);

  // Swipe gesture coords
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reviews list states
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Conversion animations and countdown states
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [salesCount, setSalesCount] = useState(0);
  const [ratingVal, setRatingVal] = useState(0.0);

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const productPricing = product ? resolveProductPrice(product as any, currency) : null;
  const discountPct = productPricing ? calcDiscount(productPricing.price, productPricing.original_price) : null;

  const handleInitiateCheckout = () => {
    if (!product) return;
    const price = productPricing ? productPricing.price : (product.price || 0);
    if (price === 0) {
      console.log('[CTA_CLICKED] Product resolved price is 0, skipping InitiateCheckout tracking');
      return;
    }
    console.log('[CTA_CLICKED] Product CTA clicked. Dispatching tracking...');
    console.log(`[META_INITIATE_CHECKOUT]\n${product.id}\n${product.title}\n${price}`);
    try {
      trackInitiateCheckout(
        String(product.id),
        product.title,
        price,
        currency,
        "product"
      );
      trackTiktokInitiateCheckout(
        String(product.id),
        product.title,
        price,
        currency,
        "product"
      );
    } catch (e) {
      console.error("Error tracking InitiateCheckout:", e);
    }
  };

  const reviewsCount = reviews.length;
  const averageRating = reviewsCount > 0 
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewsCount).toFixed(1)
    : "5.0";

  // Pseudo-session 30m countdown timer
  useEffect(() => {
    if (discountPct && discountPct > 0) {
      let targetTime = Number(sessionStorage.getItem("product-urgency-timer"));
      if (!targetTime || isNaN(targetTime)) {
        targetTime = Date.now() + 30 * 60 * 1000;
        sessionStorage.setItem("product-urgency-timer", String(targetTime));
      }

      const updateTimer = () => {
        const now = Date.now();
        const diff = targetTime - now;
        if (diff <= 0) {
          const nextTarget = Date.now() + 30 * 60 * 1000;
          sessionStorage.setItem("product-urgency-timer", String(nextTarget));
          setTimeLeft("30:00");
        } else {
          const mins = Math.floor(diff / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          setTimeLeft(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [discountPct]);

  // Dynamic animated sales & rating count-up logic
  useEffect(() => {
    if (!product) return;
    const targetSales = getPseudoRandomSalesCount(product.id);
    const targetRating = Number(averageRating);

    let salesStart = 0;
    const salesStep = Math.max(Math.floor(targetSales / 30), 1);
    const salesInterval = setInterval(() => {
      salesStart += salesStep;
      if (salesStart >= targetSales) {
        setSalesCount(targetSales);
        clearInterval(salesInterval);
      } else {
        setSalesCount(salesStart);
      }
    }, 20);

    let ratingStart = 0.0;
    const ratingInterval = setInterval(() => {
      ratingStart += 0.2;
      if (ratingStart >= targetRating) {
        setRatingVal(targetRating);
        clearInterval(ratingInterval);
      } else {
        setRatingVal(Number(ratingStart.toFixed(1)));
      }
    }, 30);

    return () => {
      clearInterval(salesInterval);
      clearInterval(ratingInterval);
    };
  }, [product, averageRating]);

  // 1. Fetch Product Data
  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    const decodedSlug = decodeURIComponent(resolvedParams.slug);
    
    try {
      // Primary fetch by slug
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", decodedSlug)
        .single();

      if (error || !data) {
        // Fallback for UUID lookups
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSlug);
        if (isUUID) {
          const { data: idData, error: idError } = await supabase
            .from("products")
            .select("*")
            .eq("id", decodedSlug)
            .single();
          
          if (!idError && idData) {
            router.replace(`/product/${idData.slug}`);
            return;
          }
        }
        
        if (error && (error.code === 'PGRST116' || error.message?.includes('no rows'))) {
          setProduct(null);
          return;
        }
        if (error) throw error;
      }

      const unpacked = unpackProduct(data as Product);
      setProduct(unpacked);
      
      // Load primary media slide
      if (unpacked.slides.length > 0) {
        setActiveMedia(unpacked.slides[0]);
      } else if (unpacked.image_url) {
        setActiveMedia({ type: 'image', url: unpacked.image_url });
      } else {
        setActiveMedia(null);
      }
      
      // Increment views count asynchronously
      if (data) {
        supabase.rpc('increment_product_views', { product_id: data.id }).then(() => {});
        
        // Pixel Tracking
        const pricing = resolveProductPrice(data as any, currency);
        const price = pricing ? pricing.price : unpacked.price;
        trackViewContent(unpacked.id, unpacked.title, price, currency, "product");
        trackTiktokViewContent(unpacked.id, unpacked.title, price, currency, "product");
        // Track product view in Supabase analytics database
        trackEvent("product_view", unpacked.id, unpacked.title, { price, currency });
      }
    } catch (err) {
      console.error("[PRODUCT_PAGE] Fetch Error Details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.slug, router, currency]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // 2. Fetch Concise Reviews
  useEffect(() => {
    if (!product) return;
    fetch(`/api/admin/reviews?productId=${product.id}&_t=${Date.now()}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReviews(data);
        } else {
          setReviews([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch product reviews:", err);
        setReviews([]);
      });
  }, [product]);

  // 3. Fetch Scored & Priority-Ranked Related Products
  useEffect(() => {
    if (!product) return;
    fetchActiveProducts({ limit: 40 }).then(({ products: allProducts }) => {
      if (!allProducts) return;
      
      // Filter out current product and calculate similarity scores
      const scored = allProducts
        .filter(p => p.id !== product.id)
        .map(p => {
          let score = 0;
          // Priority A: same category
          if (p.category === product.category) score += 5;
          
          // Priority B: overlapping tags (niche tags)
          const currentTags = product.tags || [];
          const pTags = p.tags || [];
          const overlap = pTags.filter(t => currentTags.includes(t)).length;
          score += overlap * 2;
          
          // Priority C: featured assets
          if (p.is_featured) score += 1;
          
          return { product: p, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(x => x.product);
      
      setRelatedProducts(scored.slice(0, 4));
    });
  }, [product]);

  const handleUnmuteAndStart = () => {
    setHasInteracted(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (slidesList: any[]) => {
    if (!touchStartX.current || !touchEndX.current || slidesList.length === 0) return;
    const diffX = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50;
    
    if (Math.abs(diffX) > swipeThreshold) {
      const currentIndex = slidesList.findIndex(s => s.url === activeMedia?.url);
      if (currentIndex !== -1) {
        if (diffX > 0) {
          const nextIndex = (currentIndex + 1) % slidesList.length;
          setActiveMedia(slidesList[nextIndex]);
          setHasInteracted(false);
        } else {
          const prevIndex = (currentIndex - 1 + slidesList.length) % slidesList.length;
          setActiveMedia(slidesList[prevIndex]);
          setHasInteracted(false);
        }
      } else if (slidesList.length > 0) {
        setActiveMedia(slidesList[0]);
        setHasInteracted(false);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
          <span className="text-zinc-500 font-bold text-xs font-sans">جاري تحميل الأصول الرقمية...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 font-sans">
        <h1 className="text-4xl font-cairo font-bold mb-4">المنتج غير موجود</h1>
        <Link href="/" className="text-yellow-500 hover:text-brand-300 underline font-bold">العودة للرئيسية</Link>
      </div>
    );
  }

  const renderVideoPlayer = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const ytId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return (
        <iframe 
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&controls=1`}
          className="w-full h-full border-none"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );
    }
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <video 
          ref={videoRef}
          src={url} 
          muted={false}
          autoPlay 
          playsInline
          controls={true}
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-brand-500/30" style={{ isolation: 'isolate' }}>
      <Navbar />
      
      <main className="pt-20 md:pt-32 pb-24 md:pb-20 relative z-0">
        
        {/* Decorative Grid and Ambient Vector Glow */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-20" />
          <div className="absolute top-40 left-1/4 w-[500px] h-[500px] bg-brand-600/5 rounded-full blur-[140px]" />
          <div className="absolute bottom-40 right-1/4 w-[600px] h-[600px] bg-orange-600/5 rounded-full blur-[160px]" />
        </div>

        <section className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
          
          {/* =========================================================================
              DESKTOP VIEWPORT LAYOUT (hidden md:block)
              ========================================================================= */}
          <div className="hidden lg:grid grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Visual Assets & Description */}
            <div className="col-span-7 space-y-8">
              
              {/* Media viewer */}
              <div className="relative aspect-video bg-[#08080c] rounded-[2.5rem] overflow-hidden shadow-sm border border-zinc-200/60 border border-zinc-200/60 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {activeMedia?.type === 'video' ? (
                    <motion.div 
                      key="video"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-black"
                    >
                      {activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') ? (
                        !hasInteracted ? (
                          <div 
                            onClick={handleUnmuteAndStart}
                            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group/play"
                            style={{ zIndex: 25 }}
                          >
                            {product.image_url ? (
                              <Image 
                                src={product.image_url} 
                                alt={product.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover/play:scale-102"
                                priority
                              />
                            ) : (
                              <div className="absolute inset-0 bg-slate-50 flex items-center justify-center" />
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all group-hover/play:bg-black/20" style={{ zIndex: 20 }}>
                              <motion.div 
                                animate={{ scale: [1, 1.08, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-16 h-16 bg-[#1D4ED8] border border-zinc-200 rounded-full flex items-center justify-center mb-4 shadow-sm border border-zinc-200/60"
                              >
                                 <Play className="w-6 h-6 text-zinc-900 fill-current ml-0.5" />
                              </motion.div>
                              <span className="font-sans font-black text-sm text-zinc-900 tracking-widest bg-black/50 px-5 py-2.5 rounded-2xl border border-zinc-200 shadow-sm border border-zinc-200/60">
                                 تشغيل العرض الترويجي
                              </span>
                            </div>
                          </div>
                        ) : (
                          renderVideoPlayer(activeMedia.url)
                        )
                      ) : (
                        <CustomVideoPlayer 
                          src={activeMedia.url}
                          className="w-full h-full"
                        />
                      )}
                    </motion.div>
                  ) : activeMedia?.url ? (
                    <motion.div
                      key={activeMedia.url}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      <Image 
                        src={activeMedia.url} 
                        alt={product.title} 
                        fill
                        className="object-cover"
                        priority
                      />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-800">
                      <MonitorPlay className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* 16:9 Thumbnail Strips (Sharp borders rounded-2xl) */}
              {product.slides.length > 1 && (
                <div className="w-full select-none !mt-4">
                  <div className="flex gap-3 snap-x overflow-x-auto custom-scrollbar-premium pb-2">
                    {product.slides.map((slide, i) => {
                      const isYT = slide.type === 'video' && (slide.url.includes('youtube.com') || slide.url.includes('youtu.be'));
                      const ytId = isYT ? (slide.url.split('v=')[1]?.split('&')[0] || slide.url.split('/').pop()) : null;
                      const isActive = activeMedia?.url === slide.url;

                      return (
                        <button 
                          key={i}
                          onClick={() => { setActiveMedia(slide); setHasInteracted(false); }}
                          className={cn(
                            "relative aspect-video w-[20%] rounded-2xl overflow-hidden shrink-0 transition-all duration-300 snap-center border-2 bg-zinc-50/70",
                            isActive 
                              ? "border-[#1D4ED8] shadow-[0_0_15px_rgba(29, 78, 216,0.4)] scale-102" 
                              : "border-zinc-200/60 opacity-55 hover:opacity-100 hover:border-zinc-200"
                          )}
                        >
                           <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                              {slide.type === 'video' ? (
                                <>
                                  {isYT ? (
                                    <Image 
                                      src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                                      alt="video thumb" 
                                      fill 
                                      className="object-cover" 
                                    />
                                  ) : (
                                    <video 
                                      src={`${slide.url}#t=0.1`} 
                                      className="w-full h-full object-cover" 
                                      muted 
                                      playsInline 
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center shadow-sm border border-zinc-200/60">
                                      <Play className="w-3.5 h-3.5 text-zinc-900 fill-current ml-0.5" />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <Image src={slide.url} alt={`Gallery ${i}`} fill className="object-cover" />
                              )}
                           </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description container */}
              <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-zinc-200/60 shadow-sm border border-zinc-200/60 space-y-6">
                <div className="flex items-center gap-3 border-b border-zinc-200/60 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-zinc-200/60 text-yellow-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-sans font-black text-zinc-900 leading-tight">تفاصيل وأصول المنتج</h2>
                    <span className="font-alexandria text-[10px] text-zinc-500 font-medium">كل ما تحتويه هذه الحزمة الإبداعية بالتفصيل</span>
                  </div>
                </div>

                <div className="prose prose-invert prose-rose max-w-none text-zinc-350 leading-[2.1] font-sans">
                  {product.description ? (
                    <div className="text-zinc-700 font-sans text-sm sm:text-base leading-[1.8] [&_p]:mb-4 [&_p]:leading-[1.8] [&_li]:mb-3 [&_li]:leading-[1.8] [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-lg [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_span]:leading-[1.8]" dangerouslySetInnerHTML={{ __html: product.description }} />
                  ) : (
                    <p>هذا المنتج الرقمي مصمم لمساعدتك في تسريع صناعة المحتوى ورفع جودة إنتاجك الإبداعي بالذكاء الاصطناعي.</p>
                  )}
                </div>

                {/* Benefits trust list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-200/60">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50/40 border border-zinc-200/60 hover:border-zinc-200/60 hover:bg-zinc-50/70 transition-all duration-300">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-yellow-500 flex items-center justify-center shrink-0 border border-zinc-200/60">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-sans font-bold text-zinc-900 mb-0.5">تسليم وتحميل فوري</h4>
                      <p className="text-zinc-500 font-alexandria text-[10px] leading-relaxed">ستحصل على روابط تنزيل الملفات الإبداعية في حسابك والبريد مباشرة بعد الدفع.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-50/40 border border-zinc-200/60 hover:border-zinc-200/60 hover:bg-zinc-50/70 transition-all duration-300">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-yellow-500 flex items-center justify-center shrink-0 border border-zinc-200/60">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-sans font-bold text-zinc-900 mb-0.5">تحديثات أصول مجانية</h4>
                      <p className="text-zinc-500 font-alexandria text-[10px] leading-relaxed">أي إضافات أو تعديلات مستقبلية على هذه الحقيبة الإبداعية ستحصل عليها مجاناً بالكامل.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Dynamic Sticky Purchase Panel */}
            <div className="col-span-5 lg:sticky lg:top-32 space-y-6">
              
              <div className="bg-[#0c0c12] p-8 lg:p-10 rounded-[2.5rem] border border-zinc-200 shadow-sm border border-zinc-200/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-brand-600/5 to-transparent opacity-40 pointer-events-none" />
                
                <div className="relative z-10 space-y-6">
                  
                  {/* Category and Title */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-sans block">
                      {product.category || "صناعة المحتوى البصري"}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-sans font-black text-zinc-900 leading-tight tracking-tight">
                      {product.title}
                    </h1>
                    {product.arabic_title && (
                      <p className="text-sm text-zinc-500 font-bold font-sans leading-relaxed" dir="rtl">
                        {product.arabic_title}
                      </p>
                    )}
                  </div>

                  {/* Pricing row */}
                  <div className="flex items-center justify-between py-4 border-y border-zinc-200/60">
                    <div className="flex flex-col">
                      {productPricing && productPricing.original_price > 0 && (
                        <span className="text-zinc-500 font-sans text-sm line-through decoration-brand-500/30">
                          {formatPrice(productPricing.original_price, currency)}
                        </span>
                      )}
                      <span className="text-3xl sm:text-4xl font-sans font-black text-zinc-900 tracking-tighter">
                        {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                      </span>
                    </div>
                    {discountPct && (
                      <div className="bg-brand-600 text-white font-sans font-black px-3 py-1.5 rounded-2xl text-xs shadow-sm border border-zinc-200/60 shadow-brand-600/20 animate-pulse">
                        -{discountPct}% لفترة محدودة
                      </div>
                    )}
                  </div>
                  {product.price > 0 && product.enable_gateway_fee !== false && (
                    <p className="text-[10px] text-zinc-500 text-right leading-relaxed font-sans -mt-3">
                      * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                    </p>
                  )}


                  {/* Actions CTA buttons */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href={`/checkout/${product.id}`}
                      onClick={(e) => {
                        console.log('[CTA_CLICKED]');
                        handleInitiateCheckout();
                      }}
                      className="primary-hero-cta w-full h-16 inline-flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-[#3B82F6] text-white font-sans font-black text-base rounded-[1.5rem] transition-all shadow-[0_12px_30px_rgba(29, 78, 216,0.35)] active:scale-95 group"
                    >
                      <span>تحميل وشراء فوري</span>
                      <ArrowLeft className="w-5 h-5 rtl:rotate-180 group-hover:-translate-x-1.5 transition-transform" />
                    </Link>

                    <button
                      onClick={() => {
                        const price = productPricing?.price ?? product.price;
                        addToCart({
                          ...product,
                          price: price,
                          original_price: productPricing?.original_price ?? product.original_price,
                        } as any);
                        trackAddToCart(product.id, product.title, price, currency, "product");
                        trackTiktokAddToCart(product.id, product.title, price, currency, "product");
                      }}
                      className="primary-hero-cta w-full h-14 inline-flex items-center justify-center gap-2.5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 font-sans font-black text-sm rounded-[1.25rem] border border-zinc-200 transition-all active:scale-95"
                    >
                      <ShoppingCart className="w-4 h-4 text-zinc-700" />
                      <span>إضافة إلى السلة</span>
                    </button>
                  </div>

                  {/* Trust indicator badges */}
                  <div className="flex items-center justify-center gap-4 text-zinc-500 pt-2 border-t border-zinc-200/60">
                    <div className="flex items-center gap-1.5">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-[9px] font-sans font-black uppercase tracking-widest">آمن 100%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Lock className="w-3.5 h-3.5" />
                       <span className="text-[9px] font-sans font-black uppercase tracking-widest">تشفير SSL</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Social Stars & Avatars Proof */}
              <div className="bg-zinc-100/40 rounded-3xl p-6 border border-zinc-200/60 flex items-center justify-between gap-4">
                 <div className="flex -space-x-2.5 rtl:space-x-reverse shrink-0">
                   {["felix", "sara", "mia", "alex"].map((seed) => (
                     <div key={seed} className="w-9 h-9 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden relative">
                        <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`} alt="avatar" className="w-full h-full object-cover" />
                     </div>
                   ))}
                 </div>
                 <div className="text-right">
                    <div className="flex text-yellow-400 gap-0.5 justify-end mb-1">
                       {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <p className="text-zinc-900 font-sans font-bold text-xs">حاصل على تقييم 4.9 من مبدعي الأكاديمية</p>
                 </div>
              </div>

            </div>

          </div>

          {/* =========================================================================
              MOBILE HANDCRAFTED LAYOUT (lg:hidden)
              ========================================================================= */}
          <div className="lg:hidden flex flex-col gap-6">
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes bounce-subtle {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
              }
              .animate-bounce-subtle {
                animation: bounce-subtle 3s ease-in-out infinite;
              }
              @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 15px rgba(29, 78, 216, 0.4); }
                50% { box-shadow: 0 0 30px rgba(29, 78, 216, 0.7); }
              }
              .animate-pulse-glow {
                animation: pulse-glow 2s infinite;
              }
              @keyframes shimmer-sweep {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              .animate-shimmer-sweep {
                background: linear-gradient(90deg, rgba(29, 78, 216,0.15) 25%, rgba(29, 78, 216,0.35) 50%, rgba(29, 78, 216,0.15) 75%);
                background-size: 200% 100%;
                animation: shimmer-sweep 2.5s infinite linear;
              }
              @keyframes border-pulse {
                0%, 100% { border-color: rgba(255, 255, 255, 0.1); }
                50% { border-color: rgba(29, 78, 216, 0.45); }
              }
              .animate-border-pulse {
                animation: border-pulse 3s infinite ease-in-out;
              }
              @keyframes fade-in-up {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-up {
                animation: fade-in-up 0.5s ease-out forwards;
              }
              @media (prefers-reduced-motion: reduce) {
                .animate-bounce-subtle, .animate-pulse-glow, .animate-shimmer-sweep, .animate-border-pulse, .animate-fade-in-up {
                  animation: none !important;
                  transition: none !important;
                }
              }
            `}} />


            {/* Title Section & Badges */}
            <div className="text-center pt-2 space-y-3">
              <h1 className="text-xl sm:text-2xl font-sans font-black text-zinc-900 leading-tight">
                {product.title}
              </h1>
              {product.arabic_title && (
                <p className="text-xs sm:text-sm text-zinc-500 font-bold font-sans">
                  {product.arabic_title}
                </p>
              )}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="bg-[#1D4ED8]/10 border border-[#1D4ED8]/20 text-[#1D4ED8] text-[9px] font-black px-2 py-0.5 rounded-full font-sans">الأكثر مبيعاً 🔥</span>
                <span className="bg-zinc-100/40 border border-zinc-200 text-zinc-700 text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">تفعيل تلقائي وفوري ⚡</span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">منتج موثوق ✅</span>
              </div>

              {/* Social Proof Bar */}
              <div className="flex items-center justify-center gap-3 text-[10.5px] text-zinc-500 pt-1 font-sans select-none font-bold">
                <span className="flex items-center gap-1">
                  🔥 <span className="text-yellow-500 font-sans">{salesCount || getPseudoRandomSalesCount(product.id)}+</span> عميل اقتنى هذا المنتج
                </span>
                {reviews.length > 0 && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1">
                      ⭐ <span className="text-yellow-500 font-sans">{ratingVal.toFixed(1)}</span> تقييم متوسط
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Main Media Preview Viewer (16:9 ratio) */}
            {(() => {
              const slides = (() => {
                if (product.slides && product.slides.length > 0) return product.slides;
                if (process.env.NODE_ENV === "development") {
                  return [
                    { type: 'image' as const, url: 'placeholder-slide-1' },
                    { type: 'image' as const, url: 'placeholder-slide-2' },
                    { type: 'image' as const, url: 'placeholder-slide-3' }
                  ];
                }
                return [];
              })();

              return (
                <>
                  <div 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => handleTouchEnd(slides)}
                    className="relative aspect-video bg-[#08080c] rounded-2xl overflow-hidden shadow-sm border border-zinc-200/60 border border-zinc-200/60 flex items-center justify-center group w-full"
                  >
                    {activeMedia?.url === 'placeholder-slide-1' ? (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-purple-900 to-brand-950 flex items-center justify-center p-6 text-center">
                        <span className="text-zinc-900 text-sm sm:text-base font-sans font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{product.title}</span>
                      </div>
                    ) : activeMedia?.url === 'placeholder-slide-2' ? (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-stone-900 to-zinc-900 flex items-center justify-center p-6 text-center">
                        <span className="text-yellow-500 text-sm sm:text-base font-sans font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">محتوى حصري 💎</span>
                      </div>
                    ) : activeMedia?.url === 'placeholder-slide-3' ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#1D4ED8]/60 via-[#ff1d6b]/40 to-indigo-950 flex items-center justify-center p-6 text-center">
                        <span className="text-zinc-900 text-sm sm:text-base font-sans font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">أصول إبداعية ⚡</span>
                      </div>
                    ) : activeMedia?.type === 'video' ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                        {activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') ? (
                          !hasInteracted ? (
                            <div 
                              onClick={handleUnmuteAndStart}
                              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/45 backdrop-blur-[2px] z-20"
                            >
                              {product.image_url ? (
                                <Image 
                                  src={product.image_url} 
                                  alt={product.title}
                                  fill
                                  className="object-cover opacity-60 pointer-events-none"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-slate-50 opacity-60" />
                              )}
                              <motion.div 
                                animate={{ scale: [1, 1.06, 1] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                className="relative w-[52px] h-[52px] bg-[#1D4ED8]/95 border border-zinc-200 rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(29, 78, 216,0.4)]"
                              >
                                <Play className="w-5 h-5 text-zinc-900 fill-current ml-0.5" />
                              </motion.div>
                              <span className="relative text-[10px] font-sans font-bold text-zinc-900/95 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-zinc-200 flex items-center gap-1.5">
                                <VolumeX className="w-3 h-3" />
                                اضغط لتشغيل الصوت
                              </span>
                            </div>
                          ) : (
                            renderVideoPlayer(activeMedia.url)
                          )
                        ) : (
                          <CustomVideoPlayer 
                            src={activeMedia.url}
                            className="w-full h-full"
                          />
                        )}
                      </div>
                    ) : activeMedia?.url ? (
                      <div className="relative w-full h-full">
                        <Image 
                          src={activeMedia.url} 
                          alt={product.title} 
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : product.image_url ? (
                      <div className="relative w-full h-full">
                        <Image 
                          src={product.image_url} 
                          alt={product.title} 
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-white flex items-center justify-center">
                        <MonitorPlay className="w-10 h-10 text-zinc-700" />
                      </div>
                    )}
                  </div>

                  {/* Horizontal Media Thumbnails Slider */}
                  {slides.length >= 2 && (
                    <div className="w-full select-none -mt-2">
                      <div className="flex gap-2.5 snap-x overflow-x-auto custom-scrollbar-premium pb-2" dir="rtl">
                        {slides.map((slide, i) => {
                          const isYT = slide.type === 'video' && (slide.url.includes('youtube.com') || slide.url.includes('youtu.be'));
                          const ytId = isYT ? (slide.url.split('v=')[1]?.split('&')[0] || slide.url.split('/').pop()) : null;
                          const isActive = activeMedia?.url === slide.url;

                          return (
                            <button 
                              key={i}
                              onClick={() => { setActiveMedia(slide); setHasInteracted(false); }}
                              className={cn(
                                "relative aspect-video w-[28%] rounded-2xl overflow-hidden shrink-0 snap-center border-2 bg-zinc-50/70 transition-all duration-300",
                                isActive 
                                  ? "border-[#1D4ED8] shadow-[0_0_12px_rgba(29, 78, 216,0.45)] scale-102" 
                                  : "border-zinc-200/60 opacity-60"
                              )}
                            >
                              <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                                {slide.url === 'placeholder-slide-1' ? (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-brand-950 flex items-center justify-center text-[7px] text-zinc-900 p-1 text-center font-bold font-sans leading-tight">
                                    {product.title.slice(0, 15)}..
                                  </div>
                                ) : slide.url === 'placeholder-slide-2' ? (
                                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center text-[7px] text-yellow-500 p-1 text-center font-bold font-sans leading-tight">
                                    محتوى حصري
                                  </div>
                                ) : slide.url === 'placeholder-slide-3' ? (
                                  <div className="w-full h-full bg-gradient-to-br from-[#1D4ED8]/60 to-indigo-950 flex items-center justify-center text-[7px] text-zinc-900 p-1 text-center font-bold font-sans leading-tight">
                                    أصول إبداعية
                                  </div>
                                ) : slide.type === 'video' ? (
                                  <>
                                    {isYT ? (
                                      <Image 
                                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} 
                                        alt="video thumb" 
                                        fill 
                                        loading="lazy"
                                        className="object-cover" 
                                      />
                                    ) : (
                                      <video 
                                        src={`${slide.url}#t=0.1`} 
                                        className="w-full h-full object-cover" 
                                        muted 
                                        playsInline 
                                        preload="metadata"
                                      />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <Play className="w-3.5 h-3.5 text-zinc-900 fill-current" />
                                    </div>
                                  </>
                                ) : (
                                  <Image src={slide.url} alt={`Gallery ${i}`} fill loading="lazy" className="object-cover" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Price Card Container */}
            <div className="bg-gradient-to-br from-white to-slate-50/60 border border-zinc-200/60 border border-zinc-200 rounded-2xl p-5 shadow-[0_15px_50px_rgba(0,0,0,0.04)] relative overflow-hidden animate-border-pulse">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#1D4ED8] to-transparent animate-pulse" />
              
              <div className="space-y-5">
                <div className="flex items-center justify-between font-sans">
                  <span className="text-[10px] text-zinc-500 font-bold font-cairo uppercase tracking-wider">سعر الاستثمار الحالي</span>
                  {productPricing && productPricing.original_price > productPricing.price && (
                    <span className="text-xs text-zinc-550 line-through font-sans">بدلاً من {formatPrice(productPricing.original_price, currency)}</span>
                  )}
                </div>
                
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-sans font-black text-zinc-900">
                      {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                    </span>
                    {productPricing && productPricing.original_price > productPricing.price && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-xl animate-pulse font-sans">
                        وفر {discountPct}%
                      </span>
                    )}
                  </div>
                  <span className="text-[8.5px] text-zinc-500 font-sans">تحميل وتنزيل فوري</span>
                </div>
                {product.price > 0 && product.enable_gateway_fee !== false && (
                  <p className="text-[10px] text-zinc-500 text-right leading-relaxed font-sans -mt-2">
                    * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                  </p>
                )}

                {/* Scarcity Indicator */}
                <div className="text-[10.5px] font-bold font-sans text-right animate-pulse transition-all">
                  {discountPct && discountPct > 0 ? (
                    <span className="text-amber-400">⏰ هذا السعر المخفض لن يستمر طويلاً — اقتنِه الآن بخصم {discountPct}%</span>
                  ) : (
                    <span className="text-emerald-400">✅ منتج رقمي — وصول فوري بعد الشراء مباشرة</span>
                  )}
                </div>

                {/* Compact Micro Trust Row */}
                <div className="flex justify-around py-1.5 border-y border-zinc-200/60 text-[9px] text-zinc-500 font-bold font-sans bg-zinc-50/40 rounded-2xl">
                  <span className="flex items-center gap-1">🔒 دفع آمن</span>
                  <span className="flex items-center gap-1">⚡ تسليم فوري</span>
                  <span className="flex items-center gap-1">🔄 وصول مدى الحياة</span>
                </div>

                {/* CTA Buy Buttons */}
                <Link
                  href={`/checkout/${product.id}`}
                  onClick={(e) => {
                    console.log('[CTA_CLICKED]');
                    handleInitiateCheckout();
                  }}
                  className="primary-hero-cta w-full h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-black text-sm sm:text-base shadow-[0_10px_30px_rgba(29, 78, 216,0.4)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-sans animate-pulse-glow"
                >
                  <span>{discountPct && discountPct > 0 ? `اقتنِه الآن ← خصم ${discountPct}%` : "اقتنِه الآن ←"}</span>
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                </Link>

                <button
                  onClick={() => {
                    const price = productPricing?.price ?? product.price;
                    addToCart({
                      ...product,
                      price: price,
                      original_price: productPricing?.original_price ?? product.original_price,
                    } as any);
                    trackAddToCart(product.id, product.title, price, currency, "product");
                    trackTiktokAddToCart(product.id, product.title, price, currency, "product");
                  }}
                  className="primary-hero-cta w-full h-11 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 rounded-2xl font-bold text-xs border border-zinc-200 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-sans"
                >
                  <span>أضف إلى السلة 🛒</span>
                </button>

                {/* Trust Signals */}
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200/60 text-[9.5px] text-zinc-500 font-bold font-sans">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                    <span>⚡ تسليم فوري بعد الدفع مباشرة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                    <span>🔄 تحديثات حرة ومجانية مدى الحياة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                    <span>✅ منتج موثوق ومدعوم من JoeSchool</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section — No Tabs */}
            <div className="bg-slate-50 border border-zinc-200/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-200/60 pb-2">
                <Target className="w-4 h-4 text-[#1D4ED8]" />
                <h3 className="text-xs font-sans font-bold text-zinc-900">تفاصيل وأصول المنتج</h3>
              </div>
              
              {product.description ? (
                <div 
                  className="text-zinc-700 font-sans text-xs leading-[1.7] prose prose-invert prose-rose max-w-none [&_p]:mb-3 [&_p]:leading-[1.7]" 
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} 
                />
              ) : (
                <p className="text-zinc-500 font-sans text-xs leading-[1.8]">هذا المنتج الرقمي مصمم لمساعدتك في تسريع صناعة المحتوى ورفع جودة إنتاجك الإبداعي بالذكاء الاصطناعي.</p>
              )}

              {/* Benefits Checklist with emerald checkmarks */}
              <div className="bg-zinc-50/70 backdrop-blur-md border border-zinc-200 rounded-2xl p-4 space-y-3 mt-4 relative overflow-hidden font-sans">
                <div className="absolute -top-5 -right-5 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-[11px] font-sans font-bold text-zinc-900 flex items-center gap-2 relative z-10">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                  أبرز مزايا الاقتناء المباشر:
                </h4>
                <div className="flex flex-col gap-2.5 relative z-10 text-[10px] text-zinc-700">
                  <div className="flex items-start gap-2 bg-zinc-50/40 border border-white/[0.03] p-2.5 rounded-2xl">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>وصول آمن وتحميل فوري للحقيبة بالكامل بعد الدفع مباشرة</span>
                  </div>
                  <div className="flex items-start gap-2 bg-zinc-50/40 border border-white/[0.03] p-2.5 rounded-2xl">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>تحديثات حصرية مجانية للعملاء مدى الحياة في حسابك</span>
                  </div>
                  <div className="flex items-start gap-2 bg-zinc-50/40 border border-white/[0.03] p-2.5 rounded-2xl">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>أصول وتصاميم بجودة عالية جاهزة للمشاريع التجارية والخاصة</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Reviews Marquee */}
            {reviews.length > 0 ? (
              <div className="space-y-2 select-none">
                <ProductReviews productId={product.id} initialReviews={reviews} productTitle={product.title} title="آراء عملائنا ⭐" />
              </div>
            ) : (
              <div className="mt-16 mb-8 text-center bg-[#08080c]/60 border border-zinc-200/60 p-8 rounded-3xl max-w-xl mx-auto backdrop-blur-xl relative group overflow-hidden select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.02] to-transparent opacity-100 rounded-3xl pointer-events-none" />
                <span className="text-3xl block mb-3">⭐</span>
                <h3 className="text-sm font-bold text-zinc-900 font-sans mb-1">لا توجد تقييمات بعد</h3>
                <p className="text-zinc-500 text-xs font-alexandria mb-4 leading-relaxed">كن أول من يشارك تجربته ويقيم هذا المنتج المتميز!</p>
              </div>
            )}

            {/* Related Products Section */}
            {(() => {
              const defaultRelated = process.env.NODE_ENV === "development" ? [
                {
                  id: "seeded-product-1",
                  title: "حزمة قوالب الذكاء الاصطناعي",
                  slug: "seeded-product-1",
                  category: "قوالب وأدوات",
                  short_description: "حزمة شاملة جاهزة للاستخدام لتسريع كتابة وإنجاز المحتوى بالذكاء الاصطناعي.",
                  description: "حزمة شاملة جاهزة للاستخدام لتسريع كتابة وإنجاز المحتوى بالذكاء الاصطناعي.",
                  price: 199,
                  original_price: 299,
                  image_url: "",
                  features: []
                },
                {
                  id: "seeded-product-2",
                  title: "دليل أتمتة المحتوى",
                  slug: "seeded-product-2",
                  category: "كتب رقمية",
                  short_description: "دليل شامل خطوة بخطوة لأتمتة صناعة المحتوى على منصات التواصل الاجتماعي.",
                  description: "دليل شامل خطوة بخطوة لأتمتة صناعة المحتوى على منصات التواصل الاجتماعي.",
                  price: 149,
                  original_price: 199,
                  image_url: "",
                  features: []
                }
              ] : [];

              const relatedList = relatedProducts.length > 0 ? relatedProducts : defaultRelated;

              return relatedList.length > 0 ? (
                <div className="space-y-4 overflow-hidden py-4 font-sans">
                  <h3 className="text-base font-cairo font-black text-center text-zinc-900 flex items-center gap-2 justify-center">
                    منتجات قد تعجبك 🔥
                  </h3>
                  
                  <div className="w-full overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
                    
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 custom-scrollbar-premium" dir="rtl">
                      {relatedList.map((item) => {
                        const pricing = resolveProductPrice(item as any, currency);
                        const discount = calcDiscount(pricing.price, pricing.original_price);

                        return (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/product/${item.slug}`)}
                            className="w-[240px] shrink-0 snap-center bg-slate-50 border border-zinc-200/60 hover:border-zinc-200/60 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(29, 78, 216,0.15)] transition-all duration-300 cursor-pointer group active:scale-98"
                          >
                            <div className="space-y-3">
                              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 to-[#12080c] border border-zinc-200/60 flex items-center justify-center">
                                {item.image_url ? (
                                  <Image
                                    src={item.image_url}
                                    alt={item.title}
                                    fill
                                    className="object-cover group-hover:scale-102 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-indigo-950/40 flex items-center justify-center font-sans font-bold text-[8px] text-zinc-500 p-2 text-center">
                                    {item.title}
                                  </div>
                                )}
                                {discount && discount > 0 && (
                                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-brand-600 text-white font-sans font-black text-[9px]">
                                    -{discount}%
                                  </span>
                                )}
                              </div>

                              <span className="text-[9px] text-yellow-500 font-bold font-sans block uppercase tracking-wider">
                                {item.category || "حزم وأصول المبدعين"}
                              </span>

                              <h4 className="text-zinc-900 text-xs font-sans font-black line-clamp-1 group-hover:text-yellow-500 transition-colors text-right">
                                {item.title}
                              </h4>

                              <p className="text-zinc-500 font-sans text-[10px] leading-relaxed line-clamp-2 h-9 text-right">
                                {item.short_description || item.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-200/60 pt-3 mt-4" dir="rtl">
                              <div className="flex flex-col text-right">
                                <span className="text-xs font-sans font-black text-yellow-500 leading-none">
                                  {pricing.price === 0 ? "مجاني" : formatPrice(pricing.price, currency)}
                                </span>
                                {pricing.original_price && pricing.original_price > pricing.price && (
                                  <span className="text-[10px] text-zinc-650 line-through mt-0.5 font-sans">
                                    {formatPrice(pricing.original_price, currency)}
                                  </span>
                                )}
                              </div>

                              <span className="h-8 px-3 bg-zinc-100/40 border border-zinc-200 hover:bg-[#1D4ED8] hover:border-brand-500 text-white rounded-2xl flex items-center justify-center text-[10px] font-bold transition-all shrink-0">
                                <span>اقتنِه الآن</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Custom Footer */}
            <footer className="border-t border-zinc-200/60 pt-6 pb-24 flex flex-col items-center gap-4 text-center text-zinc-500 text-[9px] w-full">
              <Link href="/" className="flex items-center group">
                <img src="/logo-text.png" alt="JoeSchool" className="h-20 object-contain" />
              </Link>
              
              <div className="flex flex-wrap justify-center gap-3 font-bold font-sans">
                <Link href="/privacy?tab=privacy" className="hover:text-zinc-900 transition-colors">سياسة الخصوصية</Link>
                <span>·</span>
                <Link href="/privacy?tab=refund" className="hover:text-zinc-900 transition-colors">سياسة الإسترجاع</Link>
                <span>·</span>
                <Link href="/privacy?tab=terms" className="hover:text-zinc-900 transition-colors">الشروط والأحكام</Link>
                <span>·</span>
                <a href="mailto:support@joeschool.com" className="hover:text-zinc-900 transition-colors">الدعم الفني</a>
              </div>

              <div className="flex justify-center scale-90">
                <SocialLinks />
              </div>

              <div className="text-zinc-600 font-sans">
                جميع الحقوق محفوظة © {new Date().getFullYear()} JoeSchool
              </div>
            </footer>
          </div>

        </section>

        {!isOwned && (
          <AnimatePresence>
            {(!isHeroCtaVisible && !isAnyModalOpen) && (
              <motion.div
                initial={{ opacity: 0, y: 15, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 15, x: "-50%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed bottom-6 left-1/2 w-[92%] max-w-[420px] bg-zinc-950/85 backdrop-blur-xl border border-white/[0.08] py-2.5 pl-3.5 pr-5 z-50 flex items-center justify-between lg:hidden gap-4 shadow-[0_0_30px_rgba(29, 78, 216,0.12),0_12px_40px_rgba(0,0,0,0.65)] rounded-full"
              >
                <div className="flex flex-col shrink-0 text-right">
                  <span className="text-[10px] text-zinc-500 font-bold font-sans leading-none mb-1">استثمار الحصول عليه</span>
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-base font-sans font-black text-[#1D4ED8]">
                      {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                    </span>
                    {productPricing && productPricing.original_price > productPricing.price && (
                      <span className="text-[10px] text-zinc-500 line-through font-normal">
                        {formatPrice(productPricing.original_price, currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 items-center justify-end gap-2">
                  <Link
                    href={`/checkout/${product.id}`}
                    onClick={(e) => {
                      console.log('[CTA_CLICKED]');
                      handleInitiateCheckout();
                    }}
                    className="h-11 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] hover:from-[#ff1d6b] hover:to-[#1D4ED8] text-white rounded-full text-xs font-sans font-black flex items-center justify-center active:scale-95 shadow-[0_4px_16px_rgba(29, 78, 216,0.35)] flex-1 animate-pulse-glow"
                  >
                    <span>{discountPct && discountPct > 0 ? "أحصل على الخصم" : "اقتنِه الآن"}</span>
                  </Link>
                  {product.price > 0 && (
                    <button
                      onClick={() => {
                        const price = productPricing?.price ?? product.price;
                        addToCart({
                          ...product,
                          price: price,
                          original_price: productPricing?.original_price ?? product.original_price,
                        } as any);
                        trackAddToCart(product.id, product.title, price, currency, "product");
                        trackTiktokAddToCart(product.id, product.title, price, currency, "product");
                      }}
                      className="h-11 w-11 shrink-0 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 rounded-full border border-zinc-200 transition-all flex items-center justify-center active:scale-95 hover:border-[#1D4ED8]/30 cursor-pointer"
                      title="إضافة إلى السلة"
                    >
                      <ShoppingCart className="w-4 h-4 text-zinc-700" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

      </main>

      <Footer />
    </div>
  );
}
