"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SocialLinks } from "@/components/SocialLinks";
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

  // Floating CTA visibility scroll states
  const [showFloatingBar, setShowFloatingBar] = useState(true);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowFloatingBar(false);
      } else {
        setShowFloatingBar(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
          <span className="text-zinc-500 font-bold text-xs font-cairo">جاري تحميل الأصول الرقمية...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-cairo">
        <h1 className="text-4xl font-alexandria font-bold mb-4">المنتج غير موجود</h1>
        <Link href="/" className="text-rose-400 hover:text-rose-300 underline font-bold">العودة للرئيسية</Link>
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
    <div className="min-h-screen bg-[#050505] text-white font-cairo selection:bg-rose-500/30" style={{ isolation: 'isolate' }}>
      <Navbar />
      
      <main className="pt-20 md:pt-32 pb-24 md:pb-20 relative z-0">
        
        {/* Decorative Grid and Ambient Vector Glow */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-20" />
          <div className="absolute top-40 left-1/4 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[140px]" />
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
              <div className="relative aspect-video bg-[#08080c] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {activeMedia?.type === 'video' ? (
                    <motion.div 
                      key="video"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-black"
                    >
                      {!hasInteracted ? (
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
                            <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center" />
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all group-hover/play:bg-black/20" style={{ zIndex: 20 }}>
                            <motion.div 
                              animate={{ scale: [1, 1.08, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-16 h-16 bg-[#D6004B] border border-white/20 rounded-full flex items-center justify-center mb-4 shadow-2xl"
                            >
                               <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                            </motion.div>
                            <span className="font-alexandria font-black text-sm text-white tracking-widest bg-black/50 px-5 py-2.5 rounded-xl border border-white/10 shadow-lg">
                               تشغيل العرض الترويجي
                            </span>
                          </div>
                        </div>
                      ) : (
                        renderVideoPlayer(activeMedia.url)
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

              {/* 16:9 Thumbnail Strips (Sharp borders rounded-xl) */}
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
                            "relative aspect-video w-[20%] rounded-xl overflow-hidden shrink-0 transition-all duration-300 snap-center border-2 bg-white/[0.02]",
                            isActive 
                              ? "border-[#D6004B] shadow-[0_0_15px_rgba(214,0,75,0.4)] scale-102" 
                              : "border-white/5 opacity-55 hover:opacity-100 hover:border-white/20"
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
                                    <div className="w-7 h-7 bg-rose-600 rounded-full flex items-center justify-center shadow-lg">
                                      <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
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
              <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-white/5 shadow-2xl space-y-6">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-alexandria font-black text-white leading-tight">تفاصيل وأصول المنتج</h2>
                    <span className="font-cairo text-[10px] text-zinc-500 font-medium">كل ما تحتويه هذه الحزمة الإبداعية بالتفصيل</span>
                  </div>
                </div>

                <div className="prose prose-invert prose-rose max-w-none text-zinc-350 leading-[2.1] font-cairo">
                  {product.description ? (
                    <div className="text-zinc-300 font-cairo text-sm sm:text-base leading-[2.2] space-y-6 [&_p]:mb-6 [&_p]:leading-[2.2] [&_li]:mb-4 [&_li]:leading-[2.2] [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-lg [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_span]:leading-[2.2]" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>هذا المنتج الرقمي مصمم لمساعدتك في تسريع صناعة المحتوى ورفع جودة إنتاجك الإبداعي بالذكاء الاصطناعي.</p>
                  )}
                </div>

                {/* Benefits trust list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-rose-500/20 hover:bg-white/[0.02] transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/10">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-alexandria font-bold text-white mb-0.5">تسليم وتحميل فوري</h4>
                      <p className="text-zinc-500 font-cairo text-[10px] leading-relaxed">ستحصل على روابط تنزيل الملفات الإبداعية في حسابك والبريد مباشرة بعد الدفع.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-rose-500/20 hover:bg-white/[0.02] transition-all duration-300">
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/10">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-alexandria font-bold text-white mb-0.5">تحديثات أصول مجانية</h4>
                      <p className="text-zinc-500 font-cairo text-[10px] leading-relaxed">أي إضافات أو تعديلات مستقبلية على هذه الحقيبة الإبداعية ستحصل عليها مجاناً بالكامل.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Dynamic Sticky Purchase Panel */}
            <div className="col-span-5 lg:sticky lg:top-32 space-y-6">
              
              <div className="bg-[#0c0c12] p-8 lg:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-rose-600/5 to-transparent opacity-40 pointer-events-none" />
                
                <div className="relative z-10 space-y-6">
                  
                  {/* Category and Title */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-alexandria block">
                      {product.category || "صناعة المحتوى البصري"}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-alexandria font-black text-white leading-tight tracking-tight">
                      {product.title}
                    </h1>
                    {product.arabic_title && (
                      <p className="text-sm text-zinc-400 font-bold font-cairo leading-relaxed" dir="rtl">
                        {product.arabic_title}
                      </p>
                    )}
                  </div>

                  {/* Pricing row */}
                  <div className="flex items-center justify-between py-4 border-y border-white/5">
                    <div className="flex flex-col">
                      {productPricing && productPricing.original_price > 0 && (
                        <span className="text-zinc-500 font-alexandria text-sm line-through decoration-rose-500/30">
                          {formatPrice(productPricing.original_price, currency)}
                        </span>
                      )}
                      <span className="text-3xl sm:text-4xl font-alexandria font-black text-white tracking-tighter">
                        {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                      </span>
                    </div>
                    {discountPct && (
                      <div className="bg-rose-600 text-white font-alexandria font-black px-3 py-1.5 rounded-xl text-xs shadow-lg shadow-rose-600/20 animate-pulse">
                        -{discountPct}% لفترة محدودة
                      </div>
                    )}
                  </div>
                  {product.price > 0 && product.enable_gateway_fee !== false && (
                    <p className="text-[10px] text-zinc-500 text-right leading-relaxed font-cairo -mt-3">
                      * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                    </p>
                  )}


                  {/* Actions CTA buttons */}
                  <div className="space-y-3 pt-2">
                    <Link
                      href={`/checkout/${product.id}`}
                      onClick={() => trackInitiateCheckout(product.id, product.title, productPricing?.price ?? product.price, currency, "product")}
                      className="w-full h-16 inline-flex items-center justify-center gap-2 bg-[#D6004B] hover:bg-[#ff0059] text-white font-alexandria font-black text-base rounded-[1.5rem] transition-all shadow-[0_12px_30px_rgba(214,0,75,0.35)] active:scale-95 group"
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
                      }}
                      className="w-full h-14 inline-flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 text-white font-alexandria font-black text-sm rounded-[1.25rem] border border-white/10 transition-all active:scale-95"
                    >
                      <ShoppingCart className="w-4 h-4 text-zinc-300" />
                      <span>إضافة إلى السلة</span>
                    </button>
                  </div>

                  {/* Trust indicator badges */}
                  <div className="flex items-center justify-center gap-4 text-zinc-500 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-[9px] font-alexandria font-black uppercase tracking-widest">آمن 100%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Lock className="w-3.5 h-3.5" />
                       <span className="text-[9px] font-alexandria font-black uppercase tracking-widest">تشفير SSL</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Social Stars & Avatars Proof */}
              <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center justify-between gap-4">
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
                    <p className="text-white font-alexandria font-bold text-xs">حاصل على تقييم 4.9 من مبدعي الأكاديمية</p>
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
                0%, 100% { box-shadow: 0 0 15px rgba(214, 0, 75, 0.4); }
                50% { box-shadow: 0 0 30px rgba(214, 0, 75, 0.7); }
              }
              .animate-pulse-glow {
                animation: pulse-glow 2s infinite;
              }
              @keyframes shimmer-sweep {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              .animate-shimmer-sweep {
                background: linear-gradient(90deg, rgba(214,0,75,0.15) 25%, rgba(214,0,75,0.35) 50%, rgba(214,0,75,0.15) 75%);
                background-size: 200% 100%;
                animation: shimmer-sweep 2.5s infinite linear;
              }
              @keyframes border-pulse {
                0%, 100% { border-color: rgba(255, 255, 255, 0.1); }
                50% { border-color: rgba(214, 0, 75, 0.45); }
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

            {/* Urgency / Discount Banner */}
            {discountPct && discountPct > 0 && (
              <div className="animate-shimmer-sweep border border-[#D6004B]/35 rounded-2xl p-3 flex items-center justify-between text-right text-xs text-white gap-2 shadow-[0_0_25px_rgba(214,0,75,0.2)] mt-2 animate-bounce-subtle">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="font-bold text-[10px] sm:text-xs">
                    عرض لفترة محدودة: خصم {discountPct}% مفعل حالياً! ({timeLeft})
                  </span>
                </div>
                <div className="bg-[#D6004B] text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider animate-pulse shrink-0">
                  سارع بالاقتناء
                </div>
              </div>
            )}

            {/* Title Section & Badges */}
            <div className="text-center pt-2 space-y-3">
              <h1 className="text-xl sm:text-2xl font-alexandria font-black text-white leading-tight">
                {product.title}
              </h1>
              {product.arabic_title && (
                <p className="text-xs sm:text-sm text-zinc-400 font-bold font-cairo">
                  {product.arabic_title}
                </p>
              )}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="bg-[#D6004B]/10 border border-[#D6004B]/20 text-[#D6004B] text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">الأكثر مبيعاً 🔥</span>
                <span className="bg-white/5 border border-white/10 text-zinc-300 text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">تفعيل تلقائي وفوري ⚡</span>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">منتج موثوق ✅</span>
              </div>

              {/* Social Proof Bar */}
              <div className="flex items-center justify-center gap-3 text-[10.5px] text-zinc-400 pt-1 font-cairo select-none font-bold">
                <span className="flex items-center gap-1">
                  🔥 <span className="text-rose-500 font-alexandria">{salesCount || getPseudoRandomSalesCount(product.id)}+</span> عميل اقتنى هذا المنتج
                </span>
                {reviews.length > 0 && (
                  <>
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1">
                      ⭐ <span className="text-yellow-500 font-alexandria">{ratingVal.toFixed(1)}</span> تقييم متوسط
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
                    className="relative aspect-video bg-[#08080c] rounded-2xl overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group w-full"
                  >
                    {activeMedia?.url === 'placeholder-slide-1' ? (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-purple-900 to-rose-950 flex items-center justify-center p-6 text-center">
                        <span className="text-white text-sm sm:text-base font-alexandria font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">{product.title}</span>
                      </div>
                    ) : activeMedia?.url === 'placeholder-slide-2' ? (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-stone-900 to-zinc-900 flex items-center justify-center p-6 text-center">
                        <span className="text-rose-400 text-sm sm:text-base font-alexandria font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">محتوى حصري 💎</span>
                      </div>
                    ) : activeMedia?.url === 'placeholder-slide-3' ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#D6004B]/60 via-[#ff1d6b]/40 to-indigo-950 flex items-center justify-center p-6 text-center">
                        <span className="text-white text-sm sm:text-base font-alexandria font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">أصول إبداعية ⚡</span>
                      </div>
                    ) : activeMedia?.type === 'video' ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                        {!hasInteracted ? (
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
                              <div className="absolute inset-0 bg-[#0a0a0f] opacity-60" />
                            )}
                            <motion.div 
                              animate={{ scale: [1, 1.06, 1] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                              className="relative w-14 h-14 bg-[#D6004B]/95 border border-white/20 rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(214,0,75,0.4)]"
                            >
                              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                            </motion.div>
                            <span className="relative text-[10px] font-cairo font-bold text-white/95 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
                              <VolumeX className="w-3 h-3" />
                              اضغط لتشغيل الصوت
                            </span>
                          </div>
                        ) : (
                          renderVideoPlayer(activeMedia.url)
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
                      <div className="absolute inset-0 bg-[#050508] flex items-center justify-center">
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
                                "relative aspect-video w-[28%] rounded-xl overflow-hidden shrink-0 snap-center border-2 bg-white/[0.02] transition-all duration-300",
                                isActive 
                                  ? "border-[#D6004B] shadow-[0_0_12px_rgba(214,0,75,0.45)] scale-102" 
                                  : "border-white/5 opacity-60"
                              )}
                            >
                              <div className="absolute inset-0 bg-zinc-950 flex items-center justify-center">
                                {slide.url === 'placeholder-slide-1' ? (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-rose-950 flex items-center justify-center text-[7px] text-white p-1 text-center font-bold font-alexandria leading-tight">
                                    {product.title.slice(0, 15)}..
                                  </div>
                                ) : slide.url === 'placeholder-slide-2' ? (
                                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center text-[7px] text-rose-400 p-1 text-center font-bold font-alexandria leading-tight">
                                    محتوى حصري
                                  </div>
                                ) : slide.url === 'placeholder-slide-3' ? (
                                  <div className="w-full h-full bg-gradient-to-br from-[#D6004B]/60 to-indigo-950 flex items-center justify-center text-[7px] text-white p-1 text-center font-bold font-alexandria leading-tight">
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
                                      <Play className="w-3.5 h-3.5 text-white fill-current" />
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
            <div className="bg-gradient-to-br from-[#0e0e1a] to-[#07070d] border border-white/10 rounded-2xl p-5 shadow-[0_15px_50px_rgba(0,0,0,0.5)] relative overflow-hidden animate-border-pulse">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent animate-pulse" />
              
              <div className="space-y-5">
                <div className="flex items-center justify-between font-cairo">
                  <span className="text-[10px] text-zinc-400 font-bold font-alexandria uppercase tracking-wider">سعر الاستثمار الحالي</span>
                  {productPricing && productPricing.original_price > productPricing.price && (
                    <span className="text-xs text-zinc-550 line-through font-alexandria">بدلاً من {formatPrice(productPricing.original_price, currency)}</span>
                  )}
                </div>
                
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-alexandria font-black text-white">
                      {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                    </span>
                    {productPricing && productPricing.original_price > productPricing.price && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md animate-pulse font-alexandria">
                        وفر {discountPct}%
                      </span>
                    )}
                  </div>
                  <span className="text-[8.5px] text-zinc-400 font-cairo">تحميل وتنزيل فوري</span>
                </div>
                {product.price > 0 && product.enable_gateway_fee !== false && (
                  <p className="text-[10px] text-zinc-500 text-right leading-relaxed font-cairo -mt-2">
                    * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                  </p>
                )}

                {/* Scarcity Indicator */}
                <div className="text-[10.5px] font-bold font-cairo text-right animate-pulse transition-all">
                  {discountPct && discountPct > 0 ? (
                    <span className="text-amber-400">⏰ هذا السعر المخفض لن يستمر طويلاً — اقتنِه الآن بخصم {discountPct}%</span>
                  ) : (
                    <span className="text-emerald-400">✅ منتج رقمي — وصول فوري بعد الشراء مباشرة</span>
                  )}
                </div>

                {/* Compact Micro Trust Row */}
                <div className="flex justify-around py-1.5 border-y border-white/5 text-[9px] text-zinc-400 font-bold font-cairo bg-white/[0.01] rounded-lg">
                  <span className="flex items-center gap-1">🔒 دفع آمن</span>
                  <span className="flex items-center gap-1">⚡ تسليم فوري</span>
                  <span className="flex items-center gap-1">🔄 وصول مدى الحياة</span>
                </div>

                {/* CTA Buy Buttons */}
                <Link
                  href={`/checkout/${product.id}`}
                  onClick={() => trackInitiateCheckout(product.id, product.title, productPricing?.price ?? product.price, currency, "product")}
                  className="w-full h-14 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-xl font-black text-sm sm:text-base shadow-[0_10px_30px_rgba(214,0,75,0.4)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo animate-pulse-glow"
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
                  }}
                  className="w-full h-11 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
                >
                  <span>أضف إلى السلة 🛒</span>
                </button>

                {/* Trust Signals */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/5 text-[9.5px] text-zinc-400 font-bold font-cairo">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D6004B] shrink-0" />
                    <span>⚡ تسليم فوري بعد الدفع مباشرة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D6004B] shrink-0" />
                    <span>🔄 تحديثات حرة ومجانية مدى الحياة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D6004B] shrink-0" />
                    <span>✅ منتج موثوق ومدعوم من JoeSchool</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section — No Tabs */}
            <div className="bg-[#09090e] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Target className="w-4 h-4 text-[#D6004B]" />
                <h3 className="text-xs font-alexandria font-bold text-white">تفاصيل وأصول المنتج</h3>
              </div>
              
              {product.description ? (
                <div 
                  className="text-zinc-300 font-cairo text-xs leading-[1.8] space-y-4 prose prose-invert prose-rose max-w-none [&_p]:mb-4 [&_p]:leading-[1.8]" 
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description.replace(/\n/g, '<br/>')) }} 
                />
              ) : (
                <p className="text-zinc-400 font-cairo text-xs leading-[1.8]">هذا المنتج الرقمي مصمم لمساعدتك في تسريع صناعة المحتوى ورفع جودة إنتاجك الإبداعي بالذكاء الاصطناعي.</p>
              )}

              {/* Benefits Checklist with emerald checkmarks */}
              <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-3 mt-4 relative overflow-hidden font-cairo">
                <div className="absolute -top-5 -right-5 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-[11px] font-alexandria font-bold text-white flex items-center gap-2 relative z-10">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                  أبرز مزايا الاقتناء المباشر:
                </h4>
                <div className="flex flex-col gap-2.5 relative z-10 text-[10px] text-zinc-300">
                  <div className="flex items-start gap-2 bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>وصول آمن وتحميل فوري للحقيبة بالكامل بعد الدفع مباشرة</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>تحديثات حصرية مجانية للعملاء مدى الحياة في حسابك</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>أصول وتصاميم بجودة عالية جاهزة للمشاريع التجارية والخاصة</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Reviews Marquee */}
            {reviews.length > 0 ? (
              <div className="space-y-2 select-none">
                <ProductReviews productId={product.id} initialReviews={reviews} title="آراء عملائنا ⭐" />
              </div>
            ) : (
              <div className="mt-16 mb-8 text-center bg-[#08080c]/60 border border-white/5 p-8 rounded-3xl max-w-xl mx-auto backdrop-blur-xl relative group overflow-hidden select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.02] to-transparent opacity-100 rounded-3xl pointer-events-none" />
                <span className="text-3xl block mb-3">⭐</span>
                <h3 className="text-sm font-bold text-white font-alexandria mb-1">لا توجد تقييمات بعد</h3>
                <p className="text-zinc-500 text-xs font-cairo mb-4 leading-relaxed">كن أول من يشارك تجربته ويقيم هذا المنتج المتميز!</p>
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
                <div className="space-y-4 overflow-hidden py-4 font-cairo">
                  <h3 className="text-base font-alexandria font-black text-center text-white flex items-center gap-2 justify-center">
                    منتجات قد تعجبك 🔥
                  </h3>
                  
                  <div className="w-full overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#050505] to-transparent z-20 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#050505] to-transparent z-20 pointer-events-none" />
                    
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 custom-scrollbar-premium" dir="rtl">
                      {relatedList.map((item) => {
                        const pricing = resolveProductPrice(item as any, currency);
                        const discount = calcDiscount(pricing.price, pricing.original_price);

                        return (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/product/${item.slug}`)}
                            className="w-[240px] shrink-0 snap-center bg-[#09090e] border border-white/5 hover:border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(214,0,75,0.15)] transition-all duration-300 cursor-pointer group active:scale-98"
                          >
                            <div className="space-y-3">
                              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900 to-[#12080c] border border-white/5 flex items-center justify-center">
                                {item.image_url ? (
                                  <Image
                                    src={item.image_url}
                                    alt={item.title}
                                    fill
                                    className="object-cover group-hover:scale-102 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-indigo-950/40 flex items-center justify-center font-alexandria font-bold text-[8px] text-zinc-500 p-2 text-center">
                                    {item.title}
                                  </div>
                                )}
                                {discount && discount > 0 && (
                                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-600 text-white font-alexandria font-black text-[9px]">
                                    -{discount}%
                                  </span>
                                )}
                              </div>

                              <span className="text-[9px] text-rose-500 font-bold font-alexandria block uppercase tracking-wider">
                                {item.category || "حزم وأصول المبدعين"}
                              </span>

                              <h4 className="text-white text-xs font-alexandria font-black line-clamp-1 group-hover:text-rose-400 transition-colors text-right">
                                {item.title}
                              </h4>

                              <p className="text-zinc-500 font-cairo text-[10px] leading-relaxed line-clamp-2 h-9 text-right">
                                {item.short_description || item.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4" dir="rtl">
                              <div className="flex flex-col text-right">
                                <span className="text-xs font-alexandria font-black text-rose-500 leading-none">
                                  {pricing.price === 0 ? "مجاني" : formatPrice(pricing.price, currency)}
                                </span>
                                {pricing.original_price && pricing.original_price > pricing.price && (
                                  <span className="text-[10px] text-zinc-650 line-through mt-0.5 font-sans">
                                    {formatPrice(pricing.original_price, currency)}
                                  </span>
                                )}
                              </div>

                              <span className="h-8 px-3 bg-white/5 border border-white/10 hover:bg-[#D6004B] hover:border-rose-500 text-white rounded-xl flex items-center justify-center text-[10px] font-bold transition-all shrink-0">
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
            <footer className="border-t border-white/5 pt-6 pb-24 flex flex-col items-center gap-4 text-center text-zinc-500 text-[9px] w-full">
              <Link href="/" className="flex items-center gap-2 group">
                <img src="/logo.png" alt="JoeSchool" className="w-5 h-5 object-contain" />
                <span className="font-alexandria font-bold text-xs tracking-tight text-white" dir="ltr">
                  Joe <span className="text-[#D6004B]">School</span>
                </span>
              </Link>
              
              <div className="flex flex-wrap justify-center gap-3 font-bold font-cairo">
                <Link href="/privacy?tab=privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
                <span>·</span>
                <Link href="/privacy?tab=refund" className="hover:text-white transition-colors">سياسة الإسترجاع</Link>
                <span>·</span>
                <Link href="/privacy?tab=terms" className="hover:text-white transition-colors">الشروط والاستخدام</Link>
                <span>·</span>
                <a href="mailto:support@joeschool.com" className="hover:text-white transition-colors">الدعم الفني</a>
              </div>

              <div className="flex justify-center scale-90">
                <SocialLinks />
              </div>

              <div className="text-zinc-600 font-cairo">
                جميع الحقوق محفوظة © {new Date().getFullYear()} JoeSchool
              </div>
            </footer>
          </div>

        </section>

        {/* Floating Bottom CTA Bar */}
        <div 
          style={{ 
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          }}
          className={cn(
            "lg:hidden fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 p-3 z-50 flex items-center justify-between gap-3 shadow-[0_-15px_40px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-in-out will-change-transform",
            showFloatingBar ? "translate-y-0" : "translate-y-full"
          )}
        >
          <div className="flex flex-col pl-2 shrink-0 justify-center text-right">
            <span className="text-base font-alexandria font-black text-white leading-none tracking-tight">
              {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
            </span>
            {productPricing && productPricing.original_price > 0 && (
              <span className="text-[9px] text-zinc-400 line-through mt-1">بدلاً من {formatPrice(productPricing.original_price, currency)}</span>
            )}
          </div>

          <div className="flex gap-2 flex-1 items-center justify-end">
            <button
              onClick={() => {
                const price = productPricing?.price ?? product.price;
                addToCart({
                  ...product,
                  price: price,
                  original_price: productPricing?.original_price ?? product.original_price,
                } as any);
                trackAddToCart(product.id, product.title, price, currency, "product");
              }}
              className="h-10 w-10 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center active:scale-90 shrink-0 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-zinc-300" />
            </button>
            <Link
              href={`/checkout/${product.id}`}
              onClick={() => trackInitiateCheckout(product.id, product.title, productPricing?.price ?? product.price, currency, "product")}
              className="h-10 px-5 bg-[#D6004B] text-white font-alexandria font-black text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_8px_20px_rgba(214,0,75,0.3)] shrink-0 animate-pulse-glow"
            >
              <span>{discountPct && discountPct > 0 ? `اقتنِه الآن ← خصم ${discountPct}%` : "اقتنِه الآن ←"}</span>
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
