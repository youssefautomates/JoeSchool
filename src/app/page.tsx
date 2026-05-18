"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Zap, Shield, Clock, CheckCircle2, ChevronDown, ChevronLeft, Sparkles, ShieldCheck, Download, PlayCircle, Play, Star, ArrowLeft, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchActiveProducts, type Product } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

import { ReviewsMarquee } from "@/components/ReviewsMarquee";
import { FAQSection } from "@/components/FAQSection";
import { ProductMedia } from "@/components/ProductMedia";

// ── Helper: Unpack Tags ───────────────────────────────────────────────
function unpackProduct(p: any) {
  const mediaTags = p.tags?.filter((t: string) => t.startsWith("media:")) || [];
  const slides = Array(4).fill(null).map((_, i) => {
    const tag = mediaTags.find((t: string) => t.startsWith(`media:${i}:`));
    if (tag) {
      const parts = tag.split(":");
      return { type: parts[2] as 'image' | 'video', url: parts.slice(3).join(":") };
    }
    return null;
  }).filter(Boolean) as { type: 'image' | 'video', url: string }[];

  // Fallback for legacy
  if (slides.length === 0) {
    const video_url = p.tags?.find((t: string) => t.startsWith("video:"))?.replace("video:", "");
    if (video_url) slides.push({ type: 'video', url: video_url });
    if (p.image_url) slides.push({ type: 'image', url: p.image_url });
  }

  return { ...p, slides };
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ count: 1200, averageRating: 5.0, avatars: [] });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const router = useRouter();
  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;
    
    // Fetch products
    fetchActiveProducts({ limit: 6 }).then(({ products: p }) => {
      if (!cancelled) { setProducts(p); setIsLoading(false); }
    });

    // Fetch stats
    fetch("/api/stats").then(res => res.json()).then(data => {
      if (!cancelled) setStats(data);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-16">
        {/* Premium Cinematic Hero Section */}
        <section className="relative min-h-[90vh] md:min-h-[95vh] flex items-center justify-center overflow-hidden pt-12 pb-12 md:pt-24 md:pb-24">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 w-full h-full pointer-events-none bg-[#050505]">
            <div className="absolute inset-0 w-full h-full bg-grid-lines mask-radial-faded opacity-60 md:opacity-100"></div>
            
            {/* Center Top Glow */}
            <motion.div 
              animate={{ opacity: [0.3, 0.4, 0.3] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] md:w-[800px] h-[300px] sm:h-[600px] md:h-[800px] bg-rose-500/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen" 
            />
          </div>
          
          <div className="container relative mx-auto px-4 z-10">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-3.5 py-1.5 md:px-5 md:py-2.5 rounded-full mb-6 md:mb-8 shadow-[0_0_30px_rgba(239,0,85,0.2)]"
              >
                <span className="relative flex h-1.5 w-1.5 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-3 md:w-3 bg-rose-500"></span>
                </span>
                <span className="font-cairo text-[10px] md:text-sm font-bold text-rose-300 tracking-wide">أدوات أتمتة حصرية جاهزة للعمل</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="mb-6 md:mb-10 px-2"
              >
                <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-alexandria font-black text-white leading-[1.3] md:leading-tight tracking-tighter block mb-1 md:mb-2">
                  ضاعف إنتاجيتك مع
                </h1>
                <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-alexandria font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff0f53] via-[#ff2d6b] to-[#ff00b3] leading-[1.3] md:leading-tight tracking-tighter block pb-2">
                  حلول الأتمتة الذكية
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-sm md:text-2xl text-zinc-400 font-cairo max-w-3xl mx-auto mb-8 md:mb-14 leading-relaxed"
              >
                احصل على تدفقات عمل <span className="text-white font-bold">n8n</span> وأنظمة ذكاء اصطناعي جاهزة للاستخدام الفوري. وفّر مئات الساعات وابدأ بالتركيز على نمو أعمالك الحقيقي.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6"
              >
                <Link
                  href="#products"
                  className="group relative h-12 md:h-20 px-6 md:px-12 inline-flex items-center justify-center gap-2 md:gap-3 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-[1.25rem] md:rounded-2xl font-cairo text-base md:text-xl font-bold shadow-[0_0_30px_rgba(214,0,75,0.3)] hover:shadow-[0_0_60px_rgba(214,0,75,0.6)] transition-all hover:-translate-y-1 active:scale-95 w-full md:w-auto"
                >
                  <span className="relative z-10">تصفح الحزم الآن</span>
                  <ArrowLeft className="w-4 h-4 md:w-6 md:h-6 relative z-10 group-hover:-translate-x-2 transition-transform rtl:rotate-180" />
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[1.25rem] md:rounded-2xl" />
                </Link>
                
                <div className="flex items-center justify-between md:justify-start gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[1.25rem] md:rounded-2xl p-2.5 md:p-4 md:pr-6 w-full md:w-auto">
                  <div className="flex -space-x-2 md:-space-x-3 rtl:space-x-reverse ml-2 md:ml-0">
                    {["felix","sara","mia","alex"].map(seed => (
                      <div key={seed} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden">
                        <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`} alt="customer" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-start border-r border-white/10 pr-3 md:pr-4 flex-1 md:flex-none">
                    <div className="flex text-yellow-400 mb-0.5 md:mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-current" />)}
                    </div>
                    <span className="font-cairo text-[9px] md:text-xs text-zinc-400 font-bold">تقييم {stats.averageRating} من <span className="text-white">{stats.count}+ عميل</span></span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Value Props / Social Proof */}
        <section className="border-y border-white/5 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent py-12 md:py-24 relative overflow-hidden">
          {/* Subtle Background Accent Glows */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[250px] h-[250px] bg-[#D6004B]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[250px] h-[250px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {[
                { number: "+2000", label: "تدفق عمل جاهز", subLabel: "أدوات أتمتة مبرمجة وجاهزة", icon: Zap },
                { number: "100%", label: "تنزيل فوري", subLabel: "رابط تحميل مباشر بعد الدفع", icon: Download },
                { number: "24/7", label: "أتمتة مستمرة", subLabel: "تعمل وتدر عليك الدخل تلقائياً", icon: Clock },
                { number: "آمن وموثق", subLabel: "حماية كاملة لبياناتك ومدفوعاتك", label: "دفع مشفر", icon: ShieldCheck }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
                  className="group relative flex flex-col items-center text-center p-5 md:p-8 rounded-2xl md:rounded-3xl bg-white/[0.01] backdrop-blur-xl border border-white/5 hover:border-[#D6004B]/20 hover:bg-white/[0.02] shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_50px_rgba(214,0,75,0.08)] transition-colors duration-300 select-none cursor-default overflow-hidden"
                >
                  {/* Glowing background card element */}
                  <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#D6004B]/10 to-transparent rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Icon with circular neon wrapper */}
                  <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-[#D6004B] group-hover:bg-[#D6004B]/10 group-hover:border-[#D6004B]/20 shadow-[0_0_20px_rgba(0,0,0,0.2)] group-hover:shadow-[0_0_30px_rgba(214,0,75,0.25)] transition-all duration-500 mb-3 md:mb-6 group-hover:scale-110">
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6 transform transition-transform duration-500 group-hover:rotate-6" />
                  </div>
                  
                  {/* Number / Main highlight */}
                  <p className="text-xl md:text-4xl font-alexandria font-black text-white tracking-tight mb-1 md:mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-rose-200 transition-all duration-300">
                    {stat.number}
                  </p>
                  
                  {/* Label */}
                  <p className="text-white font-cairo text-xs md:text-base font-bold mb-0.5 md:mb-1 transition-colors duration-300 group-hover:text-[#D6004B]">
                    {stat.label}
                  </p>

                  {/* SubLabel description */}
                  <p className="text-zinc-500 font-cairo text-[9px] md:text-xs leading-relaxed group-hover:text-zinc-400 transition-colors duration-300 hidden sm:block">
                    {stat.subLabel}
                  </p>

                  {/* Decorative glowing border accent at the bottom */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products Showcase */}
        <section id="products" className="py-16 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 md:mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-cairo text-xs md:text-sm font-bold mb-4 md:mb-6 border border-rose-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                الأكثر مبيعاً
              </motion.div>
              <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 md:mb-6 tracking-tight">الحزم الجاهزة للأتمتة</h2>
              <p className="text-zinc-400 font-cairo text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                استثمر في أدوات توفر لك مئات الساعات شهرياً. تم تصميم هذه الحزم لتعمل بكفاءة عالية وبدون تعقيدات برمجية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-10">
              {isLoading ? (
                Array.from({length: 3}).map((_, i) => (
                  <div key={i} className="h-[400px] md:h-[500px] rounded-[2rem] md:rounded-[2.5rem] bg-white/5 animate-pulse" />
                ))
              ) : products.length === 0 ? (
                <div className="col-span-full text-center py-16 md:py-20">
                  <Package className="w-12 h-12 md:w-16 md:h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-cairo text-lg md:text-xl">لا توجد منتجات حالياً.</p>
                </div>
              ) : (
                products.map((product: any, idx: number) => {
                  const unpacked = unpackProduct(product);
                  const primaryVideo = unpacked.slides.find((s: any) => s.type === 'video')?.url;
                  const primaryImage = unpacked.slides.find((s: any) => s.type === 'image')?.url || product.image_url;

                  return (
                    <motion.div 
                      key={product.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1, duration: 0.5 }}
                      className="group h-full"
                    >
                      <div 
                        onClick={() => router.push(`/product/${product.slug}`)}
                        onMouseEnter={() => setHoveredId(product.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="block relative h-full flex flex-col bg-[#0a0a0f] border border-white/5 hover:border-rose-500/30 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden group-hover:-translate-y-2 transition-all duration-500 shadow-2xl hover:shadow-[0_20px_40px_rgba(239,0,85,0.1)] cursor-pointer"
                      >
                        {/* Media Area */}
                        <div className="relative h-48 md:h-64 border-b border-white/5">
                          <ProductMedia 
                            image_url={primaryImage}
                            video_url={primaryVideo}
                            title={product.title}
                            isHovered={hoveredId === product.id}
                            className="h-full"
                            staticOnly={true}
                          />
                          
                          {/* Badges */}
                          <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-2 z-20">
                            {product.is_featured && (
                              <Badge className="bg-rose-600 text-white border-none font-cairo text-[9px] md:text-[10px] py-0.5 px-2 md:py-1 md:px-2.5 shadow-lg rounded-md md:rounded-lg">الأكثر مبيعاً</Badge>
                            )}
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 md:p-8 flex-1 flex flex-col relative z-10 -mt-6 md:-mt-8">
                          <div className="flex items-center gap-2 mb-3 md:mb-4">
                            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-white/10">
                              <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-rose-400" />
                              <span className="text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest">تنزيل فوري</span>
                            </div>
                          </div>

                          <h3 className="text-lg md:text-2xl font-alexandria font-bold text-white mb-2 md:mb-3 leading-tight group-hover:text-rose-400 transition-colors line-clamp-2">
                            {product.title}
                          </h3>
                          
                          <p className="text-zinc-400 font-cairo text-xs md:text-sm mb-6 md:mb-8 leading-relaxed line-clamp-2">
                            {product.short_description || product.description || "أداة احترافية مصممة لزيادة إنتاجيتك بشكل فوري."}
                          </p>

                          <div className="mt-auto flex items-end justify-between">
                            <div className="flex flex-col">
                              {product.original_price && (
                                <span className="text-[10px] md:text-xs font-cairo line-through text-zinc-500 mb-0.5 md:mb-1">
                                  {product.original_price} ج.م
                                </span>
                              )}
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl md:text-3xl font-alexandria font-black text-white">{product.price}</span>
                                <span className="text-[10px] md:text-sm font-cairo text-zinc-400">ج.م</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                  toast.success("تمت الإضافة للسلة");
                                }}
                                className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-rose-600 transition-colors"
                              >
                                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                              <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 group-hover:scale-110 transition-transform">
                                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <ReviewsMarquee />

        {/* FAQ Section */}
        <FAQSection />

      </main>

      {/* Mobile Sticky Bar - Homepage specific */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-white/10 p-3 z-40 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.8)] supports-[backdrop-filter]:bg-black/60">
        <Link
          href="#products"
          className="w-full h-12 bg-[#D6004B] text-white font-alexandria font-black text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 shadow-[0_10px_30px_rgba(214,0,75,0.3)] transition-transform"
        >
          شراء الحزم الآن
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>

      <Footer />
    </div>
  );
}
