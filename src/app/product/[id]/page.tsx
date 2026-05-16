"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, FileText, Zap, ChevronRight, Lock, Star, 
  ShieldCheck, Download, Users, Infinity as InfinityIcon, Target, Sparkles, 
  MonitorPlay, ArrowLeft, Rocket, HeartHandshake,
  Clock, ShoppingCart, Play, FileJson, Link as LinkIcon, Archive,
  Volume2, VolumeX, Pause, Maximize, RotateCcw
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProductReviews } from "@/components/ProductReviews";

import { supabase } from "@/lib/supabase";
import { type Product, calcDiscount } from "@/lib/products";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

// ── Helper: Unpack Tags ───────────────────────────────────────────────
function unpackProduct(p: Product) {
  const video_url = p.tags?.find(t => t.startsWith("video:"))?.replace("video:", "") || "";
  const gallery = p.tags?.filter(t => t.startsWith("gallery:"))?.map(t => t.replace("gallery:", "")) || [];
  const file_type = p.tags?.find(t => t.startsWith("type:"))?.replace("type:", "") || "zip";
  
  return {
    ...p,
    video_url,
    gallery: gallery.length > 0 ? gallery : [],
    file_type
  };
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<string | null>(null); // URL of image or 'video'
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { addToCart } = useCart();

  useEffect(() => {
    fetchProduct();
  }, [resolvedParams.id]); // eslint-disable-line

  async function fetchProduct() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error) throw error;
      const unpacked = unpackProduct(data as Product);
      setProduct(unpacked);
      
      // LOGIC: Video is primary.
      if (unpacked.video_url) {
        setActiveMedia('video');
      } else {
        setActiveMedia(unpacked.image_url);
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
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("حدث خطأ أثناء تحميل المنتج");
    } finally {
      setIsLoading(false);
    }
  }

  const handleUnmuteAndStart = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsMuted(false);
      setHasInteracted(true);
    }
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

  const savings = product.original_price ? product.original_price - product.price : 0;
  const discountPct = calcDiscount(product.price, product.original_price);
  
  // FILTER: Only real images.
  const isPlaceholder = (url: string) => !url || url.includes("unsplash.com") || url.includes("placeholder");
  const mainImage = isPlaceholder(product.image_url) ? null : product.image_url;
  const galleryImages = product.gallery.filter((url: string) => !isPlaceholder(url));
  const allRealImages = [mainImage, ...galleryImages].filter(Boolean) as string[];

  // File type icon helper
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return FileText;
      case 'json': return FileJson;
      case 'video': return Play;
      case 'link': return LinkIcon;
      default: return Archive;
    }
  };
  const FileIcon = getFileIcon(product.file_type);

  const isYouTube = product.video_url?.includes('youtube.com') || product.video_url?.includes('youtu.be');

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo selection:bg-rose-500/30">
      <Navbar />
      
      <main className="pt-24 md:pt-32 pb-24">
        <section className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            
            {/* Left Column: Visuals & Description */}
            <div className="w-full lg:w-[62%] space-y-8">
              {/* Main Viewer */}
              <div className="relative aspect-video bg-[#08080c] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {activeMedia === 'video' && product.video_url ? (
                    <motion.div 
                      key="video"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black"
                    >
                      {isYouTube ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${product.video_url.split('v=')[1]?.split('&')[0] || product.video_url.split('/').pop()}?autoplay=1&mute=1&controls=1`}
                          className="w-full h-full border-none"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        />
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <video 
                            ref={videoRef}
                            src={product.video_url} 
                            muted={isMuted}
                            autoPlay 
                            playsInline
                            loop={!hasInteracted}
                            controls={hasInteracted}
                            preload="metadata"
                            controlsList="nodownload"
                            onContextMenu={(e) => e.preventDefault()}
                            className="max-w-full max-h-full object-contain"
                          />
                          
                          {!hasInteracted && (
                            <div 
                              onClick={handleUnmuteAndStart}
                              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer group/unmute transition-all hover:bg-black/20 z-30"
                            >
                               <motion.div 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-20 h-20 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl"
                               >
                                  <VolumeX className="w-8 h-8 text-white" />
                               </motion.div>
                               <span className="font-alexandria font-black text-xl text-white tracking-widest bg-rose-600 px-8 py-3 rounded-2xl shadow-[0_15px_40px_rgba(214,0,75,0.4)]">
                                  اضغط لفتح الصوت
                               </span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ) : activeMedia ? (
                    <motion.div
                      key={activeMedia}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Image 
                        src={activeMedia} 
                        alt={product.title} 
                        fill
                        className="object-contain p-4 md:p-8"
                        priority
                      />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 text-zinc-800">
                      <MonitorPlay className="w-20 h-20 opacity-20" />
                    </div>
                  )}
                </AnimatePresence>

                {/* Badges */}
                <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 pointer-events-none">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    <span className="font-alexandria text-[9px] font-black text-white uppercase tracking-widest">Premium Content</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Horizontal Gallery (Slides) */}
              {(allRealImages.length > 0 || product.video_url) && (
                <div className="w-full overflow-hidden">
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {/* Video Slide */}
                    {product.video_url && (
                      <button 
                        onClick={() => { setActiveMedia('video'); setHasInteracted(false); setIsMuted(true); }}
                        className={cn(
                          "relative aspect-video h-20 md:h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-500 snap-start",
                          activeMedia === 'video' 
                            ? "border-rose-600 ring-4 ring-rose-600/20 scale-105 shadow-[0_0_20px_rgba(214,0,75,0.3)]" 
                            : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                        )}
                      >
                         <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                            {mainImage && <Image src={mainImage} alt="video" fill className="object-cover blur-[1px] opacity-30" />}
                            <div className="relative z-10 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center">
                               <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                            </div>
                         </div>
                      </button>
                    )}
                    {/* Image Slides */}
                    {allRealImages.map((img, i) => (
                      <button 
                        key={i}
                        onClick={() => setActiveMedia(img)}
                        className={cn(
                          "relative aspect-video h-20 md:h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all duration-500 snap-start",
                          activeMedia === img 
                            ? "border-rose-600 ring-4 ring-rose-600/20 scale-105 shadow-[0_0_20px_rgba(214,0,75,0.3)]" 
                            : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                        )}
                      >
                        <Image src={img} alt={`Gallery ${i}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Section (Now directly below images) */}
              <div className="bg-[#0c0c12] rounded-[3rem] p-10 md:p-14 border border-white/5 shadow-xl space-y-10">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-rose-500" />
                  </div>
                  <h2 className="text-3xl font-alexandria font-black text-white tracking-tighter">وصف المنتج الكامل</h2>
                </div>
                
                <div className="prose prose-invert prose-rose max-w-none">
                  {product.description ? (
                    <div className="text-zinc-400 font-cairo text-lg leading-[1.8] space-y-6" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className="text-zinc-500 font-cairo text-lg">هذا المنتج الرقمي مصمم لمساعدتك في أتمتة أعمالك وتوفير مئات الساعات من الجهد اليدوي.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                   {[
                     { title: "جاهز للاستخدام", desc: "بمجرد الشراء ستحصل على روابط التحميل فوراً.", icon: Zap },
                     { title: "دعم فني متميز", desc: "نحن معك خطوة بخطوة في حال واجهت أي استفسار.", icon: ShieldCheck }
                   ].map((feature, idx) => (
                     <div key={idx} className="bg-white/5 p-6 rounded-3xl border border-white/5 group hover:bg-white/10 transition-colors">
                        <feature.icon className="w-8 h-8 text-rose-500 mb-4" />
                        <h4 className="text-xl font-alexandria font-bold text-white mb-2">{feature.title}</h4>
                        <p className="text-zinc-500 font-cairo text-sm leading-relaxed">{feature.desc}</p>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Conversion */}
            <div className="w-full lg:w-[38%] sticky top-32 space-y-8">
              <div className="bg-[#0c0c12] p-10 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-rose-600/5 to-transparent opacity-50" />
                
                <div className="relative z-10 space-y-8">
                  <div className="space-y-4">
                    {discountPct && (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-alexandria px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        🔥 عرض خاص لفترة محدودة
                      </Badge>
                    )}
                    <h1 className="text-4xl md:text-5xl font-alexandria font-black text-white leading-tight tracking-tighter">
                      {product.title}
                    </h1>
                  </div>

                  <div className="flex items-center justify-between py-6 border-y border-white/5">
                    <div className="flex flex-col">
                      {product.original_price && (
                        <span className="text-zinc-600 font-alexandria text-xl line-through decoration-rose-500/30 mb-1">
                          {product.original_price} <span className="text-xs">ج.م</span>
                        </span>
                      )}
                      <div className="flex items-baseline gap-3">
                        <span className="text-6xl font-alexandria font-black text-white tracking-tighter">{product.price}</span>
                        <span className="text-xl font-alexandria font-black text-rose-500 uppercase">ج.م</span>
                      </div>
                    </div>
                    {discountPct && (
                      <div className="bg-rose-600 text-white font-alexandria font-black px-4 py-2 rounded-xl text-sm shadow-xl shadow-rose-600/20">
                        -{discountPct}%
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4">
                    <Link
                      href={`/checkout/${product.id}`}
                      className="w-full h-20 inline-flex items-center justify-center gap-4 bg-[#D6004B] hover:bg-[#ff0059] text-white font-alexandria font-black text-2xl rounded-[2rem] transition-all shadow-[0_20px_50px_rgba(214,0,75,0.4)] hover:shadow-[0_25px_60px_rgba(214,0,75,0.6)] active:scale-95 group"
                    >
                      شراء الآن (تحميل فوري)
                      <ArrowLeft className="w-7 h-7 rtl:rotate-180 group-hover:-translate-x-2 transition-transform" />
                    </Link>

                    <button
                      onClick={() => addToCart(product)}
                      className="w-full h-16 inline-flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white font-alexandria font-black text-lg rounded-[1.5rem] border border-white/10 transition-all active:scale-95"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      إضافة إلى السلة
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-6 text-zinc-500">
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-emerald-500" />
                       <span className="text-[9px] font-alexandria font-black uppercase tracking-widest">آمن 100%</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Lock className="w-4 h-4" />
                       <span className="text-[9px] font-alexandria font-black uppercase tracking-widest">تشفير SSL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 flex items-center justify-between">
                 <div className="flex -space-x-3 rtl:space-x-reverse">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden relative">
                        <Image src={`https://i.pravatar.cc/100?img=${i+20}`} alt="user" fill />
                     </div>
                   ))}
                 </div>
                 <div className="text-right">
                    <p className="text-white font-alexandria font-black text-sm">+{product.sales + 150} مبيعات</p>
                    <div className="flex text-yellow-400 gap-0.5 justify-end">
                       {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <ProductReviews productId={product.id} />

        {/* Mobile Sticky Bar - Professional & Compact */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-3xl border-t border-white/10 p-5 z-50 flex items-center justify-between gap-4 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.9)]">
          <div className="flex flex-col pl-2">
            <span className="text-2xl font-alexandria font-black text-white leading-none tracking-tighter">
              {product.price} <span className="text-[10px] text-zinc-500 font-black">ج.م</span>
            </span>
            {product.original_price && <span className="text-[10px] text-zinc-600 line-through">توفير {savings}ج.م</span>}
          </div>
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => addToCart(product)}
              className="h-12 w-12 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center active:scale-90 shrink-0"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            <Link
              href={`/checkout/${product.id}`}
              className="flex-1 h-12 bg-[#D6004B] text-white font-alexandria font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-rose-600/20"
            >
              شراء الآن
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
