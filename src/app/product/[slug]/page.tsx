"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Lock, Star, ShieldCheck, Target, 
  MonitorPlay, ArrowLeft, ShoppingCart, Play, CheckCircle2, ChevronLeft
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

// Fallback reviews to maintain conversion and trust
const FALLBACK_REVIEWS = [
  { id: "rev-1", firstName: "أنس", lastName: "م.", rating: 5, text: "حزمة المؤثرات الإبداعية خرافية وتضيف طابعاً سينمائياً للفيديو مباشرة.", isVerified: true, gender: "male" },
  { id: "rev-2", firstName: "سارة", lastName: "ع.", rating: 5, text: "الدليل مفصل للغاية، صياغة الأفكار بالذكاء الاصطناعي اختصرت علي أياماً من البحث.", isVerified: true, gender: "female" },
  { id: "rev-3", firstName: "كريم", lastName: "ح.", rating: 5, text: "قوالب الرسوم المتحركة ممتازة وسهلة الاستخدام، أضافت حيوية لحساباتي.", isVerified: true, gender: "male" },
  { id: "rev-4", firstName: "ياسمين", lastName: "س.", rating: 5, text: "أفضل استثمار إبداعي قمت به لتطوير وتعديل فيديوهاتي الفيرالية.", isVerified: true, gender: "female" }
];

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

  // Reviews list states
  const [reviews, setReviews] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const productPricing = product ? resolveProductPrice(product as any, currency) : null;
  const discountPct = productPricing ? calcDiscount(productPricing.price, productPricing.original_price) : null;

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
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data.slice(0, 6)); // Keep reviews concise
        } else {
          setReviews(FALLBACK_REVIEWS);
        }
      })
      .catch(() => {
        setReviews(FALLBACK_REVIEWS);
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
            
            {/* A. Product Title & Pricing */}
            <div className="space-y-3 text-right">
              {discountPct && (
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-alexandria px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  🔥 عرض خاص لفترة محدودة
                </Badge>
              )}
              <h1 className="text-xl sm:text-2xl font-alexandria font-black text-white leading-tight">
                {product.title}
              </h1>
              {product.arabic_title && (
                <p className="text-xs sm:text-sm text-zinc-400 font-bold font-cairo" dir="rtl">
                  {product.arabic_title}
                </p>
              )}
              
              {/* Price display row */}
              <div className="flex items-center gap-2 justify-start pt-1">
                <span className="text-2xl font-alexandria font-black text-rose-500">
                  {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                </span>
                {productPricing && productPricing.original_price > 0 && (
                  <span className="text-xs text-zinc-550 line-through">
                    {formatPrice(productPricing.original_price, currency)}
                  </span>
                )}
              </div>
            </div>

            {/* B. Main Media Preview Viewer (16:9 ratio) */}
            <div className="relative aspect-video bg-[#08080c] rounded-2xl overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
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
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                        style={{ zIndex: 25 }}
                      >
                        {product.image_url ? (
                          <Image 
                            src={product.image_url} 
                            alt={product.title}
                            fill
                            className="object-cover"
                            priority
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center" />
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                          <motion.div 
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-14 h-14 bg-[#D6004B] border border-white/20 rounded-full flex items-center justify-center mb-3 shadow-2xl"
                          >
                             <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                          </motion.div>
                          <span className="font-alexandria font-black text-xs text-white tracking-widest bg-black/55 px-4 py-2 rounded-xl border border-white/10">
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
                    <MonitorPlay className="w-14 h-14 opacity-20" />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* C. Horizontal Media Thumbnails Slider (Slightly sharp corners rounded-xl) */}
            {product.slides.length > 1 && (
              <div className="w-full select-none -mt-2">
                <div className="flex gap-2.5 snap-x overflow-x-auto custom-scrollbar-premium pb-2">
                  {product.slides.map((slide, i) => {
                    const isYT = slide.type === 'video' && (slide.url.includes('youtube.com') || slide.url.includes('youtu.be'));
                    const ytId = isYT ? (slide.url.split('v=')[1]?.split('&')[0] || slide.url.split('/').pop()) : null;
                    const isActive = activeMedia?.url === slide.url;

                    return (
                      <button 
                        key={i}
                        onClick={() => { setActiveMedia(slide); setHasInteracted(false); }}
                        className={cn(
                          "relative aspect-video w-[26%] rounded-xl overflow-hidden shrink-0 snap-center border-2 bg-white/[0.02] transition-all",
                          isActive 
                            ? "border-[#D6004B] shadow-[0_0_10px_rgba(214,0,75,0.3)] scale-102" 
                            : "border-white/5 opacity-60"
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
                                  <Play className="w-4 h-4 text-white fill-current" />
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

            {/* D. Description Container (Glass card, premium RTL typographies) */}
            <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Target className="w-4.5 h-4.5 text-rose-500" />
                <h2 className="text-sm font-alexandria font-black text-white leading-tight">تفاصيل وأصول المنتج</h2>
              </div>
              
              <div className="prose prose-invert prose-rose max-w-none text-zinc-300 leading-[1.9] text-xs font-cairo">
                {product.description ? (
                  <div className="text-zinc-300 font-cairo text-sm sm:text-base leading-[2.2] space-y-6 [&_p]:mb-6 [&_p]:leading-[2.2] [&_li]:mb-4 [&_li]:leading-[2.2] [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-lg [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_span]:leading-[2.2]" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p>هذا المنتج الرقمي مصمم لمساعدتك في تسريع صناعة المحتوى ورفع جودة إنتاجك الإبداعي بالذكاء الاصطناعي.</p>
                )}
              </div>

              {/* Mobile benefits check list */}
              <div className="grid grid-cols-1 gap-2.5 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-zinc-400 font-bold">وصول آمن وتحميل فوري للحقيبة بالكامل</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  <span className="text-[10px] text-zinc-400 font-bold">تحديثات حصرية مجانية للعملاء مدى الحياة</span>
                </div>
              </div>
            </div>

          </div>

          {/* =========================================================================
              E. CUSTOM CUSTOMER REVIEWS SECTION (Verified purchase tags, concise text)
              ========================================================================= */}
          <div className="mt-16 border-t border-white/5 pt-12 space-y-8 select-none">
            <div className="flex items-center gap-2.5 justify-start mb-6">
              <div className="w-9 h-9 rounded-lg bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Star className="w-4.5 h-4.5 fill-current" />
              </div>
              <h2 className="text-lg sm:text-xl font-alexandria font-black text-white tracking-tighter">آراء وتقييمات المبدعين</h2>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 font-bold text-xs">لا توجد تقييمات مسجلة حالياً.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reviews.slice(0, 4).map((rev, idx) => {
                  const avatar = rev.avatarUrl && !rev.avatarUrl.includes("pravatar")
                    ? rev.avatarUrl
                    : getAvatarUrl(rev.firstName, rev.gender);

                  return (
                    <div 
                      key={rev.id || idx}
                      className="bg-[#08080c]/60 border border-white/5 hover:border-rose-500/20 p-5 rounded-2xl flex flex-col justify-between h-[150px] relative transition-all group overflow-hidden"
                    >
                      <div className="space-y-2.5">
                        
                        {/* Header card info */}
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden relative shrink-0">
                              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <h4 className="font-alexandria font-bold text-white text-[11px] truncate">
                              {rev.firstName} {rev.lastName ? rev.lastName.charAt(0) + "." : ""}
                            </h4>
                          </div>

                          {rev.isVerified !== false && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[8px] font-black font-cairo shrink-0">
                              شراء موثق
                            </span>
                          )}
                        </div>

                        {/* Stars */}
                        <div className="flex text-yellow-500 gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} className={`w-3 h-3 ${i <= rev.rating ? 'fill-current' : 'text-zinc-800 fill-transparent'}`} />
                          ))}
                        </div>

                        {/* Description (Concise testimonial) */}
                        <p className="text-zinc-400 font-cairo text-[11px] sm:text-xs leading-relaxed line-clamp-2">
                          &ldquo;{rev.text}&rdquo;
                        </p>

                      </div>

                      {/* Ambient hover gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
              F. ADDITIONAL URGENCY CTA SECTION (Value proposition, premium button)
              ========================================================================= */}
          <div className="mt-16">
            <div className="relative bg-gradient-to-br from-zinc-900 via-[#0a0a0f] to-zinc-950 border border-white/10 rounded-3xl md:rounded-[2.5rem] p-8 sm:p-12 overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Background blurs */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#D6004B]/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="space-y-3 max-w-xl text-right z-10">
                <span className="bg-[#D6004B]/15 border border-[#D6004B]/20 text-[#D6004B] px-3 py-1 rounded-full text-[10px] font-black font-alexandria uppercase tracking-wider inline-block">
                  🔥 فرصة اقتناء الأصول الفنية
                </span>
                <h3 className="text-xl sm:text-2xl font-alexandria font-black text-white leading-tight">
                  ابدأ بإنتاج محتوى بصري احترافي فوراً اليوم!
                </h3>
                <p className="text-zinc-400 text-xs font-cairo leading-relaxed">
                  احصل على الحزمة والملفات الإبداعية الكاملة الآن ووفر مئات الساعات من البحث والتصميم اليدوي. روابط التحميل تسلم فورا.
                </p>
              </div>

              <div className="z-10 shrink-0 w-full md:w-auto flex flex-col items-center justify-center bg-white/[0.01] border border-white/5 rounded-2xl p-6 text-center min-w-[240px]">
                {productPricing && productPricing.original_price > 0 && (
                  <span className="text-[10px] text-zinc-500 line-through mb-0.5 font-alexandria">
                    {formatPrice(productPricing.original_price, currency)}
                  </span>
                )}
                <span className="text-2xl font-alexandria font-black text-white mb-4">
                  {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                </span>
                
                <Link
                  href={`/checkout/${product.id}`}
                  onClick={() => trackInitiateCheckout(product.id, product.title, productPricing?.price ?? product.price, currency, "product")}
                  className="h-12 px-6 bg-[#D6004B] hover:bg-[#ff0059] text-white rounded-xl font-bold text-xs transition-all w-full flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer font-alexandria"
                >
                  <span>شراء وتنزيل فوري</span>
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>

            </div>
          </div>

          {/* =========================================================================
              G. NICHE-PRIORITIZED RELATED DIGITAL PRODUCTS (Only products)
              ========================================================================= */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 border-t border-white/5 pt-12 space-y-6">
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider font-alexandria">أصول رقمية مقترحة</span>
                <h3 className="text-lg sm:text-xl font-alexandria font-black text-white">منتجات رقمية قد تثير اهتمامك</h3>
              </div>

              {/* Horizontal scroll container on mobile, grid on desktop */}
              <div className="flex gap-4 overflow-x-auto snap-x lg:grid lg:grid-cols-4 lg:overflow-x-visible pb-4 custom-scrollbar-premium">
                {relatedProducts.map((item) => {
                  const pricing = resolveProductPrice(item, currency);
                  const discount = calcDiscount(pricing.price, pricing.original_price);

                  return (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/product/${item.slug}`)}
                      className="w-[260px] lg:w-full shrink-0 snap-center bg-[#09090e] border border-white/5 hover:border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(214,0,75,0.15)] transition-all duration-300 cursor-pointer group"
                    >
                      <div className="space-y-3">
                        
                        {/* Thumbnail aspect-video */}
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-102 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center font-bold text-[10px] text-zinc-500">
                              JoeSchool
                            </div>
                          )}
                          {discount && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-rose-600 text-white font-alexandria font-black text-[9px]">
                              -{discount}%
                            </span>
                          )}
                        </div>

                        {/* Meta Category */}
                        <span className="text-[9px] text-rose-500 font-bold font-alexandria block uppercase tracking-wider">
                          {item.category || "حزم وأصول المبدعين"}
                        </span>

                        {/* Title */}
                        <h4 className="text-white text-xs sm:text-sm font-alexandria font-black line-clamp-1 group-hover:text-rose-400 transition-colors">
                          {item.title}
                        </h4>

                        {/* Description */}
                        <p className="text-zinc-500 font-cairo text-[10px] leading-relaxed line-clamp-2 h-9">
                          {item.short_description || item.description}
                        </p>

                      </div>

                      {/* Pricing Footer */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4">
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-alexandria font-black text-rose-500 leading-none">
                            {pricing.price === 0 ? "مجاني" : formatPrice(pricing.price, currency)}
                          </span>
                          {pricing.original_price && pricing.original_price > pricing.price && (
                            <span className="text-[10px] text-zinc-650 line-through mt-0.5">
                              {formatPrice(pricing.original_price, currency)}
                            </span>
                          )}
                        </div>

                        <span className="w-7 h-7 bg-white/5 border border-white/10 hover:bg-[#D6004B] hover:border-rose-500 text-white rounded-lg flex items-center justify-center transition-colors shrink-0">
                          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </section>

        {/* =========================================================================
            MINIMAL STICKY MOBILE ACTIONS BAR (price, cart icon, buy now button)
            ========================================================================= */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/10 p-3 z-50 flex items-center justify-between gap-3 pb-safe shadow-[0_-15px_40px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col pl-2 shrink-0 justify-center">
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
              className="h-10 px-5 bg-[#D6004B] text-white font-alexandria font-black text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_8px_20px_rgba(214,0,75,0.3)] shrink-0"
            >
              <span>شراء الآن</span>
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
