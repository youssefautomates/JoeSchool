"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Lock, Star, ShieldCheck, Target, 
  MonitorPlay, ArrowLeft, ShoppingCart, Play, VolumeX
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProductReviews } from "@/components/ProductReviews";

import RelatedCarousel from "@/components/RelatedCarousel";

import { supabase } from "@/lib/supabase";
import { type Product, calcDiscount } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";

// ── Helper: Unpack Tags ───────────────────────────────────────────────
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

  // Fallback for legacy data if no media tags exist
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

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const [product, setProduct] = useState<(Product & { slides: { type: "image" | "video"; url: string }[]; file_type: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  
  const { addToCart } = useCart();

  const productPricing = product ? resolveProductPrice(product as any, currency) : null;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    const rawSlug = resolvedParams.slug;
    const decodedSlug = decodeURIComponent(rawSlug);
    
    try {
      console.log("[PRODUCT_PAGE] Fetching product for slug:", decodedSlug);
      
      // 1. Try to fetch by slug
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", decodedSlug)
        .single();

      // 2. If not found, try to fetch by ID (legacy support)
      if (error || !data) {
        // Only try to fetch by ID if the slug looks like a UUID to avoid Postgres cast errors
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSlug);
        
        if (isUUID) {
          console.log("[PRODUCT_PAGE] Slug is UUID, trying ID lookup...");
          const { data: idData, error: idError } = await supabase
            .from("products")
            .select("*")
            .eq("id", decodedSlug)
            .single();
          
          if (!idError && idData) {
            console.log("[PRODUCT_PAGE] Found by ID, redirecting to slug:", idData.slug);
            router.replace(`/product/${idData.slug}`);
            return;
          }
        }
        
        // If it's a "No rows found" error, just stop loading and show "Product not found"
        if (error && (error.code === 'PGRST116' || error.message?.includes('no rows'))) {
          console.log("[PRODUCT_PAGE] Product not found in database.");
          setProduct(null);
          return;
        }

        if (error) throw error;
      }

      const unpacked = unpackProduct(data as Product);
      setProduct(unpacked);
      
      // LOGIC: First slide (rightmost in RTL) is primary cover
      if (unpacked.slides.length > 0) {
        setActiveMedia(unpacked.slides[0]);
      } else if (unpacked.image_url) {
        setActiveMedia({ type: 'image', url: unpacked.image_url });
      } else {
        setActiveMedia(null);
      }
      
      // Update views non-blocking
      if (data) {
        supabase.rpc('increment_product_views', { product_id: data.id }).then(() => {});
        
        // Pixel Tracking
        if (typeof window !== "undefined") {
          if (window.fbq) {
            window.fbq('track', 'ViewContent', {
              content_name: unpacked.title,
              content_ids: [unpacked.id],
              content_type: 'product',
              value: unpacked.price,
              currency: 'EGP'
            });
          }
          if (window.ttq) {
            window.ttq.track('ViewContent', {
              contents: [{ content_id: unpacked.id, content_name: unpacked.title, price: unpacked.price, quantity: 1 }],
              content_type: 'product',
              value: unpacked.price,
              currency: 'EGP'
            });
          }
        }
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("[PRODUCT_PAGE] Fetch Error Details:", {
        message: err.message,
        code: err.code,
        details: err.details
      });
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.slug, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProduct();
  }, [fetchProduct]);

  const handleUnmuteAndStart = () => {
    setHasInteracted(true);
    setIsMuted(false);
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
        <div className="w-12 h-12 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
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

  const discountPct = productPricing ? calcDiscount(productPricing.price, productPricing.original_price) : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo selection:bg-rose-500/30" style={{ isolation: 'isolate' }}>
      <Navbar />
      
      <main className="pt-20 md:pt-32 pb-32 md:pb-24 relative z-0">
        <section className="container mx-auto px-4 md:px-6">
          {isMobile ? (
            /* Mobile Layout (lg:hidden) */
            <div className="flex flex-col gap-5">
              
              {/* 1. Product Name First */}
              <div className="space-y-2">
                {discountPct && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-alexandria px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    🔥 عرض خاص لفترة محدودة
                  </Badge>
                )}
                <h1 className="text-2xl sm:text-3xl font-alexandria font-black text-white leading-tight tracking-tight">
                  {product.title}
                </h1>
              </div>

              {/* 2. Video/Active Media Second */}
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
                          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group/play overflow-hidden"
                          style={{ zIndex: 25 }}
                        >
                          {product.image_url ? (
                            <Image 
                              src={product.image_url} 
                              alt={product.title}
                              fill
                              className="object-cover transition-transform duration-700 group-hover/play:scale-105"
                              priority
                            />
                          ) : (
                            <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center">
                              <div className="absolute inset-0 bg-gradient-to-tr from-[#D6004B]/20 to-[#ff1d6b]/5 opacity-30" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all group-hover/play:bg-black/20" style={{ zIndex: 20 }}>
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-20 h-20 bg-[#D6004B]/90 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-pulse"
                            >
                               <Play className="w-8 h-8 text-white fill-current ml-1" />
                            </motion.div>
                            <span className="font-alexandria font-black text-xl text-white tracking-widest bg-black/50 px-8 py-3 rounded-2xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
                               تشغيل الفيديو
                            </span>
                          </div>
                        </div>
                      ) : activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${activeMedia.url.split('v=')[1]?.split('&')[0] || activeMedia.url.split('/').pop()}?autoplay=1&mute=0&controls=1`}
                          className="w-full h-full border-none"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        />
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <video 
                            ref={videoRef}
                            src={activeMedia.url} 
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
                    <div className="flex flex-col items-center justify-center gap-4 text-zinc-800">
                      <MonitorPlay className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Slides/Gallery Third (16:9 aspect ratio, close margins, small corners) */}
              {product.slides.length > 0 && (
                <div className="w-full relative group/gallery select-none">
                  <div 
                    className="gap-2 pt-1 pb-3 snap-x custom-scrollbar-premium flex overflow-x-auto justify-start"
                    style={{ scrollbarWidth: 'thin', msOverflowStyle: 'none' }}
                  >
                    <style jsx>{`
                      .custom-scrollbar-premium::-webkit-scrollbar {
                        height: 5px;
                        display: block;
                      }
                      .custom-scrollbar-premium::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.01);
                        border-radius: 20px;
                      }
                      .custom-scrollbar-premium::-webkit-scrollbar-thumb {
                        background: rgba(214, 0, 75, 0.3);
                        border-radius: 20px;
                      }
                    `}</style>

                    {product.slides.map((slide: { type: "image" | "video"; url: string }, i: number) => {
                      const isYT = slide.type === 'video' && (slide.url.includes('youtube.com') || slide.url.includes('youtu.be'));
                      const ytId = isYT ? (slide.url.split('v=')[1]?.split('&')[0] || slide.url.split('/').pop()) : null;
                      const isActive = activeMedia?.url === slide.url;

                      return (
                        <button 
                          key={i}
                          onClick={() => { setActiveMedia(slide); setHasInteracted(false); setIsMuted(true); }}
                          className={cn(
                            "relative aspect-video rounded-xl overflow-hidden shrink-0 transition-all duration-300 snap-center border-2",
                            "w-[24%] md:w-[24%]",
                            "bg-white/[0.03] backdrop-blur-xl",
                            isActive 
                              ? "border-[#D6004B] shadow-[0_0_20px_rgba(214,0,75,0.3)] z-10 scale-102" 
                              : "border-white/5 opacity-60 hover:opacity-100 hover:border-white/20"
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
                                  
                                  {/* Compact Play Overlay */}
                                  <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                                     <div className="relative">
                                        <div className="w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl border border-white/20">
                                          <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
                                        </div>
                                     </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Image src={slide.url} alt={`Gallery ${i}`} fill className="object-cover" />
                                </>
                              )}

                              {/* Active Indicator */}
                              {isActive && (
                                <motion.div 
                                  layoutId="activeGlowMobile"
                                  className="absolute inset-0 border-2 border-rose-500 rounded-xl pointer-events-none"
                                  initial={false}
                                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                              )}
                           </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Strong CTA Fourth */}
              <div className="bg-[#0c0c12] p-5 sm:p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-rose-600/5 to-transparent opacity-50" />
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex flex-col">
                      {productPricing && productPricing.original_price > 0 && (
                        <span className="text-zinc-550 font-alexandria text-xs sm:text-base line-through decoration-rose-500/30 mb-0">
                          {formatPrice(productPricing.original_price, currency)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-alexandria font-black text-white tracking-tighter">
                          {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                        </span>
                      </div>
                    </div>
                    {discountPct && (
                      <div className="bg-rose-600 text-white font-alexandria font-black px-2.5 py-1.5 rounded-lg text-xs shadow-lg shadow-rose-600/20">
                        -{discountPct}%
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Link
                      href={`/checkout/${product.id}`}
                      className="w-full h-14 inline-flex items-center justify-center gap-2 bg-[#D6004B] hover:bg-[#ff0059] text-white font-alexandria font-black text-sm sm:text-base rounded-xl transition-all shadow-[0_12px_30px_rgba(214,0,75,0.35)] active:scale-95 group"
                    >
                      شراء الآن (تحميل فوري)
                      <ArrowLeft className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </Link>

                    <button
                      onClick={() => addToCart({
                        ...product,
                        price: productPricing?.price ?? product.price,
                        original_price: productPricing?.original_price ?? product.original_price,
                      } as any)}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-alexandria font-black text-xs sm:text-sm rounded-xl border border-white/10 transition-all active:scale-95"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      إضافة إلى السلة
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-4 pt-2 text-zinc-500">
                    <div className="flex items-center gap-1.5">
                       <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                       <span className="text-[8px] font-alexandria font-black uppercase tracking-widest">آمن 100%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Lock className="w-3 h-3" />
                       <span className="text-[8px] font-alexandria font-black uppercase tracking-widest">تشفير SSL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-3">
                 <div className="flex -space-x-2 rtl:space-x-reverse">
                   {["felix","sara","mia","alex"].map((seed) => (
                     <div key={seed} className="w-8 h-8 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden relative">
                        <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`} alt="avatar" className="w-full h-full object-cover" />
                     </div>
                   ))}
                 </div>
                 <div className="text-right">
                    <div className="flex text-yellow-400 gap-0.5 justify-end mb-0.5">
                       {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                    <p className="text-white font-alexandria font-bold text-xs">تقييم 5 من +500 عميل</p>
                 </div>
              </div>

              {/* 5. Product Description Box Fifth */}
              <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl space-y-5">
                <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                    <Target className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-base font-alexandria font-black text-white leading-tight">وصف المنتج الكامل</h2>
                    <span className="font-cairo text-[10px] text-zinc-500 font-medium">كل ما تحتاجه للبدء والنجاح الفوري</span>
                  </div>
                </div>
                
                <div className="prose prose-invert prose-rose max-w-none">
                  {product.description ? (
                    <div className="text-zinc-300 font-cairo text-sm leading-[1.7] space-y-4" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className="text-zinc-400 font-cairo text-sm leading-[1.7]">هذا المنتج الرقمي مصمم لمساعدتك في أتمتة أعمالك وتوفير مئات الساعات من الجهد اليدوي.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                   {[
                     { title: "جاهز للاستخدام الفوري", desc: "ستحصل على روابط التحميل مباشرة.", icon: Zap },
                     { title: "دعم فني متميز ومستمر", desc: "نحن بجانبك للإجابة عن أي استفسار.", icon: ShieldCheck }
                   ].map((feature, idx) => (
                     <div 
                       key={idx} 
                       className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-rose-500/20 hover:bg-white/[0.03] transition-all duration-300 group"
                     >
                       <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/10 transition-colors group-hover:bg-[#D6004B]/20 group-hover:text-[#D6004B] group-hover:border-[#D6004B]/20">
                          <feature.icon className="w-4.5 h-4.5 transition-transform group-hover:scale-110" />
                       </div>
                       <div className="flex flex-col gap-0.5">
                          <h4 className="text-xs font-alexandria font-bold text-white transition-colors group-hover:text-rose-400">{feature.title}</h4>
                          <p className="text-zinc-400 font-cairo text-[10px] leading-relaxed">{feature.desc}</p>
                       </div>
                     </div>
                   ))}
                </div>
              </div>

            </div>
          ) : (
            /* Desktop Layout (flex-row layout) */
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-12 items-start">
              
              {/* Left Column: Visuals & Description */}
              <div className="w-full lg:w-[62%] space-y-8">
                {/* Main Viewer */}
                <div className="relative aspect-video bg-[#08080c] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
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
                            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group/play overflow-hidden"
                            style={{ zIndex: 25 }}
                          >
                            {product.image_url ? (
                              <Image 
                                src={product.image_url} 
                                alt={product.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover/play:scale-105"
                                priority
                              />
                            ) : (
                              <div className="absolute inset-0 bg-[#0a0a0f] flex items-center justify-center">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#D6004B]/20 to-[#ff1d6b]/5 opacity-30" />
                              </div>
                            )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all group-hover/play:bg-black/20" style={{ zIndex: 20 }}>
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-20 h-20 bg-[#D6004B]/90 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-pulse"
                            >
                               <Play className="w-8 h-8 text-white fill-current ml-1" />
                            </motion.div>
                            <span className="font-alexandria font-black text-xl text-white tracking-widest bg-black/50 px-8 py-3 rounded-2xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.4)]">
                               تشغيل الفيديو
                            </span>
                          </div>
                        </div>
                        ) : activeMedia.url.includes('youtube.com') || activeMedia.url.includes('youtu.be') ? (
                          <iframe 
                            src={`https://www.youtube.com/embed/${activeMedia.url.split('v=')[1]?.split('&')[0] || activeMedia.url.split('/').pop()}?autoplay=1&mute=0&controls=1`}
                            className="w-full h-full border-none"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                          />
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <video 
                              ref={videoRef}
                              src={activeMedia.url} 
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
                      <div className="flex flex-col items-center justify-center gap-4 text-zinc-800">
                        <MonitorPlay className="w-20 h-20 opacity-20" />
                      </div>
                    )}
                  </AnimatePresence>

                </div>

                {/* Premium Cinematic Media Slider */}
                {product.slides.length > 0 && (
                  <div className="w-full relative group/gallery !mt-3 pt-1 pb-4 select-none">
                    <div 
                      className={cn(
                        "gap-4 pt-1 pb-3 px-1 snap-x custom-scrollbar-premium",
                        product.slides.length <= 4 
                          ? "grid grid-cols-4" 
                          : "flex overflow-x-auto justify-start"
                      )}
                      style={{ scrollbarWidth: 'thin', msOverflowStyle: 'none' }}
                    >
                      <style jsx>{`
                        .custom-scrollbar-premium::-webkit-scrollbar {
                          height: 5px;
                          display: ${product.slides.length > 4 ? 'block' : 'none'};
                        }
                        .custom-scrollbar-premium::-webkit-scrollbar-track {
                          background: rgba(255, 255, 255, 0.01);
                          border-radius: 20px;
                        }
                        .custom-scrollbar-premium::-webkit-scrollbar-thumb {
                          background: rgba(214, 0, 75, 0.3);
                          border-radius: 20px;
                          transition: all 0.3s ease;
                        }
                        .group\/gallery:hover .custom-scrollbar-premium::-webkit-scrollbar-thumb {
                          background: #D6004B;
                          box-shadow: 0 0 15px rgba(214, 0, 75, 0.5);
                        }
                      `}</style>

                      {product.slides.map((slide: { type: "image" | "video"; url: string }, i: number) => {
                        const isYT = slide.type === 'video' && (slide.url.includes('youtube.com') || slide.url.includes('youtu.be'));
                        const ytId = isYT ? (slide.url.split('v=')[1]?.split('&')[0] || slide.url.split('/').pop()) : null;
                        const isActive = activeMedia?.url === slide.url;

                        return (
                          <button 
                            key={i}
                            onClick={() => { setActiveMedia(slide); setHasInteracted(false); setIsMuted(true); }}
                            className={cn(
                              "relative aspect-video rounded-3xl overflow-hidden shrink-0 transition-all duration-300 snap-center border-2",
                              product.slides.length > 4 ? "w-[22.5%] md:w-[23.5%]" : "w-full",
                              "bg-white/[0.03] backdrop-blur-xl",
                              isActive 
                                ? "border-[#D6004B] shadow-[0_0_20px_rgba(214,0,75,0.3)] z-10 scale-102" 
                                : "border-white/5 opacity-60 hover:opacity-100 hover:border-white/20"
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
                                    
                                    {/* Compact Play Overlay */}
                                    <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                                       <div className="relative">
                                          <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl border border-white/20">
                                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                                          </div>
                                       </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Image src={slide.url} alt={`Gallery ${i}`} fill className="object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </>
                                )}

                                {/* Active Indicator */}
                                {isActive && (
                                  <motion.div 
                                    layoutId="activeGlow"
                                    className="absolute inset-0 border-2 border-rose-500 rounded-3xl pointer-events-none"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  />
                                )}
                             </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Description Section (Now directly below images) */}
                <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 border border-white/5 shadow-2xl space-y-6 md:space-y-8">
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 md:gap-4 border-b border-white/5 pb-4 md:pb-6">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                      <Target className="w-4 h-4 md:w-5.5 md:h-5.5" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-xl md:text-3xl font-alexandria font-black text-white leading-tight">وصف المنتج الكامل</h2>
                      <span className="font-cairo text-[10px] md:text-xs text-zinc-500 font-medium">كل ما تحتاجه للبدء والنجاح الفوري</span>
                    </div>
                  </div>
                  
                  {/* Description Body */}
                  <div className="prose prose-invert prose-rose max-w-none">
                    {product.description ? (
                      <div className="text-zinc-300 font-cairo text-[15px] md:text-base leading-[1.8] space-y-5" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                    ) : (
                      <p className="text-zinc-400 font-cairo text-[15px] md:text-base leading-[1.8]">هذا المنتج الرقمي مصمم لمساعدتك في أتمتة أعمالك وتوفير مئات الساعات من الجهد اليدوي.</p>
                    )}
                  </div>

                  {/* Benefits / Trust Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-2 md:pt-4">
                     {[
                       { title: "جاهز للاستخدام الفوري", desc: "ستحصل على روابط التحميل مباشرة.", icon: Zap },
                       { title: "دعم فني متميز ومستمر", desc: "نحن بجانبك للإجابة عن أي استفسار.", icon: ShieldCheck }
                     ].map((feature, idx) => (
                       <div 
                         key={idx} 
                         className="flex items-center md:items-start gap-3 md:gap-4 p-4 md:p-5 rounded-[1.25rem] md:rounded-2xl bg-white/[0.01] border border-white/5 hover:border-rose-500/20 hover:bg-white/[0.03] transition-all duration-300 group"
                       >
                         <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/10 transition-colors group-hover:bg-[#D6004B]/20 group-hover:text-[#D6004B] group-hover:border-[#D6004B]/20">
                            <feature.icon className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
                         </div>
                         <div className="flex flex-col gap-0.5 md:gap-1">
                            <h4 className="text-sm md:text-[15px] font-alexandria font-bold text-white transition-colors group-hover:text-rose-400">{feature.title}</h4>
                            <p className="text-zinc-400 font-cairo text-[10px] md:text-xs leading-relaxed">{feature.desc}</p>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing & Conversion */}
              <div className="w-full lg:w-[38%] lg:sticky lg:top-32 space-y-6 md:space-y-8">
                <div className="bg-[#0c0c12] p-5 sm:p-8 md:p-10 lg:p-12 rounded-3xl md:rounded-[2.5rem] lg:rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-rose-600/5 to-transparent opacity-50" />
                  
                  <div className="relative z-10 space-y-5 md:space-y-8">
                    <div className="space-y-2 md:space-y-4">
                      {discountPct && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-alexandria px-2.5 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                          🔥 عرض خاص لفترة محدودة
                        </Badge>
                      )}
                      <h1 className="text-[22px] leading-[1.3] sm:text-3xl md:text-4xl lg:text-5xl font-alexandria font-black text-white md:leading-tight tracking-tighter">
                        {product.title}
                      </h1>
                    </div>

                    <div className="flex items-center justify-between py-3 md:py-6 border-y border-white/5">
                      <div className="flex flex-col">
                        {productPricing && productPricing.original_price > 0 && (
                          <span className="text-zinc-600 font-alexandria text-xs sm:text-base md:text-xl line-through decoration-rose-500/30 mb-0">
                            {formatPrice(productPricing.original_price, currency)}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1.5 md:gap-3">
                          <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-alexandria font-black text-white tracking-tighter">
                            {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
                          </span>
                        </div>
                      </div>
                      {discountPct && (
                        <div className="bg-rose-600 text-white font-alexandria font-black px-2.5 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm shadow-lg shadow-rose-600/20">
                          -{discountPct}%
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5 md:space-y-4 pt-1 md:pt-4">
                      <Link
                        href={`/checkout/${product.id}`}
                        className="w-full h-12 sm:h-16 md:h-20 inline-flex items-center justify-center gap-2 md:gap-4 bg-[#D6004B] hover:bg-[#ff0059] text-white font-alexandria font-black text-sm sm:text-lg md:text-2xl rounded-xl md:rounded-[2rem] transition-all shadow-[0_15px_40px_rgba(214,0,75,0.35)] hover:shadow-[0_20px_50px_rgba(214,0,75,0.5)] active:scale-95 group"
                      >
                        شراء الآن (تحميل فوري)
                        <ArrowLeft className="w-4 h-4 md:w-7 md:h-7 rtl:rotate-180 group-hover:-translate-x-2 transition-transform" />
                      </Link>

                      <button
                        onClick={() => addToCart({
                          ...product,
                          price: productPricing?.price ?? product.price,
                          original_price: productPricing?.original_price ?? product.original_price,
                        } as any)}
                        className="w-full h-10 sm:h-14 md:h-16 inline-flex items-center justify-center gap-2 md:gap-3 bg-white/5 hover:bg-white/10 text-white font-alexandria font-black text-xs sm:text-base md:text-lg rounded-xl md:rounded-[1.5rem] border border-white/10 transition-all active:scale-95"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        إضافة إلى السلة
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-4 md:gap-6 pt-2 md:pt-6 text-zinc-500">
                      <div className="flex items-center gap-1.5 md:gap-2">
                         <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" />
                         <span className="text-[8px] md:text-[9px] font-alexandria font-black uppercase tracking-widest">آمن 100%</span>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2">
                         <Lock className="w-3 h-3 md:w-4 md:h-4" />
                         <span className="text-[8px] md:text-[9px] font-alexandria font-black uppercase tracking-widest">تشفير SSL</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Proof */}
                <div className="bg-white/5 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 border border-white/5 flex items-center justify-between gap-3 md:gap-4">
                   <div className="flex -space-x-2 md:-space-x-3 rtl:space-x-reverse">
                     {["felix","sara","mia","alex"].map((seed) => (
                       <div key={seed} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden relative">
                          <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`} alt="avatar" className="w-full h-full object-cover" />
                       </div>
                     ))}
                   </div>
                   <div className="text-right">
                      <div className="flex text-yellow-400 gap-0.5 justify-end mb-0.5 md:mb-1">
                         {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current" />)}
                      </div>
                      <p className="text-white font-alexandria font-bold text-xs md:text-sm">تقييم 5 من +500 عميل</p>
                   </div>
                </div>
              </div>

            </div>
          )}
        </section>

        {/* Reviews Section */}
        <ProductReviews productId={product.id} />

        {/* Smart Related Recommendations */}
        <div className="container mx-auto px-4 md:px-6 max-w-7xl mt-16 border-t border-white/5 pt-16">
          <RelatedCarousel sourceType="digital_product" sourceId={product.id} />
        </div>

        {/* Mobile Sticky Bar - Premium & Ultra-Compact */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-white/10 p-3 z-50 flex items-center justify-between gap-3 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.8)] supports-[backdrop-filter]:bg-black/60">
          <div className="flex flex-col pl-2">
            <span className="text-lg font-alexandria font-black text-white leading-none tracking-tighter">
              {productPricing ? (productPricing.price === 0 ? "مجاني" : formatPrice(productPricing.price, currency)) : ""}
            </span>
            {productPricing && productPricing.original_price > 0 && <span className="text-[9px] text-zinc-400 line-through mt-0.5">بدلاً من {formatPrice(productPricing.original_price, currency)}</span>}
          </div>
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => addToCart({
                ...product,
                price: productPricing?.price ?? product.price,
                original_price: productPricing?.original_price ?? product.original_price,
              } as any)}
              className="h-11 w-11 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center active:scale-90 shrink-0 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
            <Link
              href={`/checkout/${product.id}`}
              className="flex-1 h-11 bg-[#D6004B] text-white font-alexandria font-black text-sm rounded-xl flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_10px_30px_rgba(214,0,75,0.3)]"
            >
              شراء فوري
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </main>


      <Footer />
    </div>
  );
}
