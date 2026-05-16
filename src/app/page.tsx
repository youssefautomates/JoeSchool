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

import { FeaturesSection } from "@/components/FeaturesSection";
import { ReviewsMarquee } from "@/components/ReviewsMarquee";
import { FAQSection } from "@/components/FAQSection";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ count: 1200, averageRating: 5.0, avatars: [] });
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
                className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 md:px-5 md:py-2.5 rounded-full mb-8 shadow-[0_0_30px_rgba(239,0,85,0.2)]"
              >
                <span className="relative flex h-2 w-2 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-rose-500"></span>
                </span>
                <span className="font-cairo text-xs md:text-sm font-bold text-rose-300 tracking-wide">أدوات أتمتة حصرية جاهزة للعمل</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="mb-8 md:mb-10 px-2"
              >
                <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-alexandria font-black text-white leading-tight md:leading-tight tracking-tighter block mb-2">
                  ضاعف إنتاجيتك مع
                </h1>
                <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-alexandria font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff0f53] via-[#ff2d6b] to-[#ff00b3] leading-tight md:leading-tight tracking-tighter block pb-2">
                  حلول الأتمتة الذكية
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-base md:text-2xl text-zinc-400 font-cairo max-w-3xl mx-auto mb-10 md:mb-14 leading-relaxed"
              >
                احصل على تدفقات عمل <span className="text-white font-bold">n8n</span> وأنظمة ذكاء اصطناعي جاهزة للاستخدام الفوري. وفّر مئات الساعات وابدأ بالتركيز على نمو أعمالك الحقيقي.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col md:flex-row items-center justify-center gap-6"
              >
                <Link
                  href="#products"
                  className="group relative h-14 md:h-20 px-8 md:px-12 inline-flex items-center justify-center gap-3 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-cairo text-lg md:text-xl font-bold shadow-[0_0_40px_rgba(214,0,75,0.4)] hover:shadow-[0_0_60px_rgba(214,0,75,0.6)] transition-all hover:-translate-y-1 active:scale-95 w-full md:w-auto"
                >
                  <span className="relative z-10">تصفح الحزم الآن</span>
                  <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:-translate-x-2 transition-transform rtl:rotate-180" />
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                </Link>
                
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 md:p-4 pr-6 w-full md:w-auto">
                  <div className="flex flex-col items-start">
                    <div className="flex text-yellow-400 mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 md:w-4 md:h-4 ${i <= Math.round(stats.averageRating) ? 'fill-current' : 'opacity-30'}`} />)}
                    </div>
                    <span className="font-cairo text-[10px] md:text-xs text-zinc-400 font-bold">تقييم {stats.averageRating} من <span className="text-white">{stats.count}+ عميل</span></span>
                  </div>
                  <div className="flex -space-x-2 md:-space-x-3 rtl:space-x-reverse border-r border-white/10 pr-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden relative">
                        <Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="customer" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Value Props / Social Proof */}
        <section className="border-y border-white/5 bg-white/[0.02] py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { number: "+2000", label: "تدفق عمل جاهز", icon: Zap },
                { number: "100%", label: "تنزيل فوري", icon: Download },
                { number: "24/7", label: "أتمتة مستمرة", icon: Clock },
                { number: "آمن", label: "دفع مشفر", icon: ShieldCheck }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-2 md:gap-3"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-2">
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <p className="text-2xl md:text-4xl font-alexandria font-black text-white">{stat.number}</p>
                  <p className="text-zinc-500 font-cairo text-xs md:text-sm font-bold">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />

        {/* Featured Products Showcase */}
        <section id="products" className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 md:mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-full font-cairo text-sm font-bold mb-6 border border-rose-500/20"
              >
                <Sparkles className="w-4 h-4" />
                الأكثر مبيعاً
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-6 tracking-tight">الحزم الجاهزة للأتمتة</h2>
              <p className="text-zinc-400 font-cairo text-lg max-w-2xl mx-auto leading-relaxed">
                استثمر في أدوات توفر لك مئات الساعات شهرياً. تم تصميم هذه الحزم لتعمل بكفاءة عالية وبدون تعقيدات برمجية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              {isLoading ? (
                Array.from({length: 3}).map((_, i) => (
                  <div key={i} className="h-[500px] rounded-[2.5rem] bg-white/5 animate-pulse" />
                ))
              ) : products.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-cairo text-xl">لا توجد منتجات حالياً.</p>
                </div>
              ) : (
                products.map((product, idx) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="group h-full"
                  >
                    <div 
                      onClick={() => router.push(`/product/${product.id}`)}
                      className="block relative h-full flex flex-col bg-[#0a0a0f] border border-white/5 hover:border-rose-500/30 rounded-[2.5rem] overflow-hidden group-hover:-translate-y-2 transition-all duration-500 shadow-2xl hover:shadow-[0_20px_40px_rgba(239,0,85,0.1)] cursor-pointer"
                    >
                      {/* Image Area */}
                      <div className="relative h-56 md:h-64 overflow-hidden bg-zinc-950 flex items-center justify-center border-b border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent z-0" />
                        
                        {product.image_url ? (
                          <Image 
                            src={product.image_url} 
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
                            <PlayCircle className="w-12 h-12 text-zinc-800 group-hover:text-rose-500 transition-colors" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-80" />
                        
                        {/* Badges */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                          {product.is_featured && (
                            <Badge className="bg-rose-600 text-white border-none font-cairo text-[10px] py-1 px-2.5 shadow-lg rounded-lg">الأكثر مبيعاً</Badge>
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-6 md:p-8 flex-1 flex flex-col relative z-10 -mt-8">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                            <Zap className="w-3 h-3 text-rose-400" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">تنزيل فوري</span>
                          </div>
                        </div>

                        <h3 className="text-xl md:text-2xl font-alexandria font-bold text-white mb-3 leading-tight group-hover:text-rose-400 transition-colors line-clamp-2">
                          {product.title}
                        </h3>
                        
                        <p className="text-zinc-400 font-cairo text-sm mb-8 leading-relaxed line-clamp-2">
                          {product.short_description || product.description || "أداة احترافية مصممة لزيادة إنتاجيتك بشكل فوري."}
                        </p>

                        <div className="mt-auto flex items-end justify-between">
                          <div className="flex flex-col">
                            {product.original_price && (
                              <span className="text-xs font-cairo line-through text-zinc-500 mb-1">
                                {product.original_price} ج.م
                              </span>
                            )}
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl md:text-3xl font-alexandria font-black text-white">{product.price}</span>
                              <span className="text-xs md:text-sm font-cairo text-zinc-400">ج.م</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                                toast.success("تمت الإضافة للسلة");
                              }}
                              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center hover:bg-rose-600 transition-all duration-300 border border-white/10 hover:border-rose-500 hover:shadow-[0_0_15px_rgba(239,0,85,0.5)] z-20 group/cart"
                            >
                              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-zinc-300 group-hover/cart:text-white" />
                            </button>
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-rose-600 transition-colors border border-white/10">
                              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-white transform group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <ReviewsMarquee />

        {/* FAQ Section */}
        <FAQSection />

      </main>
      <Footer />
    </div>
  );
}

