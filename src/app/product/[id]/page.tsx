"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, FileText, Zap, ChevronRight, Lock, PlayCircle, Star, 
  ShieldCheck, Download, Users, Infinity, Target, Sparkles, 
  MonitorPlay, ArrowLeft, Rocket, HeartHandshake,
  Clock, ShoppingCart, Play, FileJson, Link as LinkIcon, Archive
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"details" | "previews" | "reviews">("details");
  const [activeMedia, setActiveMedia] = useState<string | null>(null); // URL of active image or 'video'
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
      setActiveMedia(unpacked.image_url);
      
      // Update views non-blocking
      if (data) {
        supabase.rpc('increment_product_views', { product_id: data.id }).then(() => {});
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("حدث خطأ أثناء تحميل المنتج");
    } finally {
      setIsLoading(false);
    }
  }

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
  const allImages = [product.image_url, ...product.gallery].filter(Boolean);

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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo selection:bg-rose-500/30">
      <Navbar />
      
      <main className="pt-24 md:pt-32 pb-24">
        {/* Cinematic Header Section */}
        <section className="container mx-auto px-4 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-12 items-start"
          >
            {/* Left: Product Visuals */}
            <div className="w-full lg:w-[55%] space-y-6">
              <div className="relative aspect-[16/10] bg-[#0a0a0f] rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(214,0,75,0.1)] group border border-white/5">
                
                <AnimatePresence mode="wait">
                  {activeMedia === 'video' ? (
                    <motion.div 
                      key="video"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-20 bg-black"
                    >
                      {product.video_url.includes('youtube.com') || product.video_url.includes('youtu.be') ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${product.video_url.split('v=')[1]?.split('&')[0] || product.video_url.split('/').pop()}?autoplay=1&mute=0`}
                          className="w-full h-full border-none"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        />
                      ) : (
                        <video 
                          src={product.video_url} 
                          controls 
                          autoPlay 
                          className="w-full h-full object-contain"
                        />
                      )}
                      <button 
                        onClick={() => setActiveMedia(product.image_url)}
                        className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-rose-600 transition-colors z-30"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={activeMedia}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      <Image 
                        src={activeMedia || product.image_url} 
                        alt={product.title} 
                        fill
                        className="object-cover opacity-90 transition-all duration-700"
                        priority
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60 pointer-events-none" />
                
                {/* Badges */}
                <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="font-cairo text-xs font-bold text-white uppercase tracking-widest">Premium Asset</span>
                  </motion.div>
                  {product.file_type && (
                     <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 self-start">
                        <FileIcon className="w-4 h-4 text-emerald-400" />
                        <span className="font-cairo text-xs font-bold text-emerald-400 uppercase tracking-widest">{product.file_type}</span>
                     </div>
                  )}
                </div>
                
                {product.is_featured && (
                  <div className="absolute top-6 right-6 bg-[#D6004B] px-4 py-2 rounded-2xl flex items-center gap-2 shadow-[0_0_30px_rgba(214,0,75,0.4)] z-10">
                    <span className="font-cairo text-xs font-bold text-white uppercase">الأكثر مبيعاً</span>
                  </div>
                )}

                {/* Video Play Trigger Over Image */}
                {product.video_url && activeMedia !== 'video' && (
                  <button 
                    onClick={() => setActiveMedia('video')}
                    className="absolute inset-0 flex items-center justify-center group/play z-10"
                  >
                    <div className="w-20 h-20 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover/play:scale-110">
                      <Play className="w-8 h-8 text-white fill-current ml-1" />
                    </div>
                  </button>
                )}
              </div>

              {/* Gallery / Slider under main media */}
              {allImages.length > 1 || product.video_url ? (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {/* Video Thumbnail */}
                  {product.video_url && (
                    <button 
                      onClick={() => setActiveMedia('video')}
                      className={cn(
                        "relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                        activeMedia === 'video' ? "border-rose-600 scale-105 shadow-lg shadow-rose-600/20" : "border-white/5 opacity-60 hover:opacity-100"
                      )}
                    >
                       <Image src={product.image_url} alt="video" fill className="object-cover blur-[1px]" />
                       <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Play className="w-6 h-6 text-white" />
                       </div>
                    </button>
                  )}
                  {/* Images */}
                  {allImages.map((img, i) => (
                    <button 
                      key={i}
                      onClick={() => setActiveMedia(img)}
                      className={cn(
                        "relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
                        activeMedia === img ? "border-rose-600 scale-105 shadow-lg shadow-rose-600/20" : "border-white/5 opacity-60 hover:opacity-100"
                      )}
                    >
                      <Image src={img} alt={`Gallery ${i}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Quick Benefits Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Download, label: "تسليم فوري", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
                  { icon: Clock, label: "توفير وقت", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                  { icon: ShieldCheck, label: "دفع آمن", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                  { icon: HeartHandshake, label: "دعم فني", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
                ].map((item, i) => (
                  <div key={i} className={cn("p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border transition-all hover:bg-white/5", item.bg, item.border)}>
                    <item.icon className={cn("w-6 h-6", item.color)} />
                    <span className="font-cairo text-[11px] font-bold text-zinc-300 tracking-wide">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Persuasive Copy */}
            <div className="w-full lg:w-[45%] space-y-8">
              <div className="space-y-4">
                {discountPct && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-cairo px-4 py-1.5 rounded-full text-xs font-bold">
                    🔥 خصم لفترة محدودة
                  </Badge>
                )}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-alexandria font-black text-white leading-[1.2] tracking-tighter">
                  {product.title}
                </h1>
                
                <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                  <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <span className="font-cairo text-xs font-bold text-zinc-300">5.0 (124 تقييم)</span>
                  </div>
                  <span className="font-cairo text-sm text-zinc-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {product.sales + 100} مشتري
                  </span>
                </div>
              </div>

              <p className="text-lg text-zinc-400 font-cairo leading-relaxed">
                {product.short_description || product.description || "أداة متقدمة تضمن لك توفير مئات الساعات وتعظيم نتائجك بأقل مجهود."}
              </p>

              {/* Desktop Checkout Box */}
              <div className="hidden lg:block bg-[#0a0a0f] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex flex-col">
                    {product.original_price && (
                      <span className="text-zinc-500 font-cairo text-lg line-through decoration-red-500/50 mb-1">
                        {product.original_price} ج.م
                      </span>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-alexandria font-black text-white">{product.price}</span>
                      <span className="text-xl font-cairo text-zinc-400">ج.م</span>
                    </div>
                  </div>
                  {discountPct && (
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl border-none text-sm">
                        توفير {savings} ج.م
                      </Badge>
                      <span className="text-[10px] text-zinc-500">خصم {discountPct}%</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-3 relative z-10">
                  <Link
                    href={`/checkout/${product.id}`}
                    className="w-full h-16 inline-flex items-center justify-center gap-3 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo text-xl font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(214,0,75,0.3)] hover:shadow-[0_0_40px_rgba(214,0,75,0.5)] active:scale-95"
                  >
                    شراء الآن والتنزيل الفوري
                    <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                  </Link>

                  <button
                    onClick={() => addToCart(product)}
                    className="w-full h-14 inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white font-cairo text-lg font-bold rounded-2xl border border-white/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 group/addcart"
                  >
                    <ShoppingCart className="w-5 h-5 group-hover/addcart:scale-110 transition-transform duration-300" />
                    إضافة إلى السلة
                  </button>
                </div>
                
                <div className="mt-6 flex flex-col gap-3 relative z-10">
                  <p className="text-center font-cairo text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3" /> دفع إلكتروني آمن 100%
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Value Stacking Section */}
        <section className="bg-[#0a0a0f] border-y border-white/5 py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-alexandria font-black text-white mb-6 tracking-tight">ماذا ستحصل عليه <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0f53] to-[#ff00b3]">بالضبط؟</span></h2>
              <p className="text-zinc-400 font-cairo text-lg md:text-xl">نحن لا نبيعك ملفات فقط، بل نبيعك "الوقت" والحرية.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { 
                  title: `ملف الـ ${product.file_type?.toUpperCase() || "أصلي"}`, 
                  desc: `ستحصل على الملف بصيغة ${product.file_type || "رقمية"} جاهزاً للاستخدام المباشر.`,
                  icon: FileIcon,
                  color: "text-rose-400", bg: "bg-rose-500/10"
                },
                { 
                  title: "دليل الإعداد السريع", 
                  desc: "خطوات واضحة وبسيطة لضمان تفعيل الحزمة في أقل من 5 دقائق.",
                  icon: Rocket,
                  color: "text-sky-400", bg: "bg-sky-500/10"
                },
                { 
                  title: "تحديثات مجانية", 
                  desc: "أي تطوير أو تحسين نجريه على هذا المنتج مستقبلاً ستحصل عليه مجاناً.",
                  icon: Infinity,
                  color: "text-emerald-400", bg: "bg-emerald-500/10"
                },
                { 
                  title: "دعم فني متخصص", 
                  desc: "فريق الدعم متواجد للرد على استفساراتك وحل أي مشكلة قد تواجهك.",
                  icon: HeartHandshake,
                  color: "text-amber-400", bg: "bg-amber-500/10"
                }
              ].map((item, i) => (
                <div key={i} className="relative group overflow-hidden bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-10 hover:bg-white/10 transition-all duration-500">
                  <div className="flex items-start justify-between mb-8">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg", item.bg)}>
                      <item.icon className={cn("w-8 h-8", item.color)} />
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <h3 className="text-2xl font-alexandria font-black text-white mb-4">{item.title}</h3>
                  <p className="text-zinc-400 font-cairo leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Tabs Section */}
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            <div className="w-full lg:w-1/3">
              <div className="sticky top-32 space-y-6">
                <h2 className="text-3xl md:text-4xl font-alexandria font-black text-white mb-8 leading-tight">تعرف أكثر على المنتج</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { id: "details", label: "تفاصيل المنتج", icon: Target },
                    { id: "previews", label: "معاينة الوسائط", icon: MonitorPlay },
                    { id: "reviews", label: "آراء العملاء", icon: Star },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center justify-between px-6 py-5 rounded-2xl font-cairo font-bold text-lg transition-all duration-300",
                        activeTab === tab.id 
                          ? "bg-[#D6004B] text-white shadow-lg shadow-[#D6004B]/20" 
                          : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                      </span>
                      <ChevronRight className={cn("w-5 h-5 transition-transform", activeTab === tab.id ? "rotate-90" : "")} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-2/3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#0a0a0f] rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-xl min-h-[500px]"
                >
                  {activeTab === "details" && (
                    <div className="space-y-10">
                      <div className="prose prose-invert prose-zinc max-w-none font-cairo leading-relaxed">
                        <h3 className="text-2xl font-alexandria font-black text-white mb-6">الوصف الكامل</h3>
                        {product.description ? (
                          <div className="text-zinc-300 space-y-4" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
                        ) : (
                          <p className="text-zinc-400">
                            هذا المنتج مصمم بعناية فائقة ليلبي احتياجاتك الاحترافية. يتضمن كل ما تحتاجه للبدء فوراً دون تعقيدات تقنية.
                          </p>
                        )}
                        
                        <div className="mt-12">
                          <h4 className="text-xl font-bold text-white mb-6">مميزات إضافية:</h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                            {[
                              "تصميم جاهز للاستخدام الفوري",
                              "متوافق مع أحدث المعايير",
                              `بصيغة ${product.file_type || "عالمية"} مرنة`,
                              "سهولة التخصيص والتعديل"
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                                <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                <span className="text-zinc-300">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "previews" && (
                    <div className="grid gap-4">
                      {product.video_url && (
                        <div className="space-y-4">
                           <h4 className="text-lg font-bold text-white font-alexandria">الفيديو التعريفي</h4>
                           <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black">
                              {product.video_url.includes('youtube.com') || product.video_url.includes('youtu.be') ? (
                                <iframe src={`https://www.youtube.com/embed/${product.video_url.split('v=')[1]?.split('&')[0] || product.video_url.split('/').pop()}`} className="w-full h-full border-none" allowFullScreen />
                              ) : <video src={product.video_url} controls className="w-full h-full" />}
                           </div>
                        </div>
                      )}
                      
                      {product.gallery.length > 0 && (
                        <div className="space-y-4 mt-8">
                           <h4 className="text-lg font-bold text-white font-alexandria">معرض الصور</h4>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {product.gallery.map((img: string, i: number) => (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group">
                                   <Image src={img} alt={`Gallery ${i}`} fill className="object-cover group-hover:scale-110 transition-all duration-700" />
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                      {!product.video_url && product.gallery.length === 0 && (
                        <div className="py-20 text-center space-y-4">
                           <MonitorPlay className="w-12 h-12 text-zinc-700 mx-auto" />
                           <p className="text-zinc-500 font-cairo">لا توجد وسائط إضافية لهذا المنتج.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "reviews" && (
                    <div className="space-y-8">
                      <div className="flex flex-col md:flex-row items-center gap-10 p-8 bg-white/5 rounded-[2rem] border border-white/10">
                        <div className="text-center">
                          <p className="text-6xl font-alexandria font-black text-white">5.0</p>
                          <div className="flex justify-center text-yellow-400 my-3">
                            {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-current" />)}
                          </div>
                          <p className="text-zinc-500 font-cairo text-sm">متوسط التقييم</p>
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                          {[5,4,3,2,1].map(s => (
                            <div key={s} className="flex items-center gap-4">
                              <span className="w-4 font-bold text-zinc-400 text-sm">{s}</span>
                              <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-400" style={{ width: s === 5 ? '98%' : s===4 ? '12%' : '0%' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Mobile Sticky CTA */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-2xl border-t border-white/10 p-4 z-50 flex items-center justify-between gap-4 pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col pl-4">
            {product.original_price && (
              <span className="text-zinc-500 font-cairo text-[10px] line-through">{product.original_price} ج.م</span>
            )}
            <span className="text-2xl font-alexandria font-black text-white leading-none">{product.price} <span className="text-[10px] font-cairo text-zinc-500 font-normal">ج.م</span></span>
          </div>
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => addToCart(product)}
              className="h-12 w-12 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shrink-0"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            <Link
              href={`/checkout/${product.id}`}
              className="flex-1 h-12 bg-[#D6004B] text-white font-cairo font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-rose-600/20"
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

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
