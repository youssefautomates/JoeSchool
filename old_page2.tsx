"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Zap, Shield, Clock, CheckCircle2, ChevronDown, ChevronLeft, Sparkles, ShieldCheck, Download, PlayCircle, Star, ArrowLeft, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchActiveProducts, type Product } from "@/lib/products";
import { useCart } from "@/context/CartContext";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { addToCart } = useCart();

  useEffect(() => {
    let cancelled = false;
    console.log("[DEBUG] Frontend Home fetchActiveProducts CALLED");
    fetchActiveProducts({ limit: 6 }).then(({ products: p }) => {
      if (!cancelled) { setProducts(p); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-16">
        {/* Premium Cinematic Hero Section */}
        <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 w-full h-full pointer-events-none bg-[#050505]">
            <div className="absolute inset-0 w-full h-full bg-grid-lines mask-radial-faded opacity-100"></div>
            
            {/* Center Top Glow */}
            <motion.div 
              animate={{ opacity: [0.3, 0.4, 0.3] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-rose-500/10 rounded-full blur-[120px] mix-blend-screen" 
            />
            {/* Center Bottom Glow */}
            <motion.div 
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] mix-blend-screen" 
            />
          </div>
          
          <div className="container relative mx-auto px-4 z-10">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full mb-10 shadow-[0_0_30px_rgba(239,0,85,0.2)]"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="font-cairo text-sm font-bold text-rose-300 tracking-wide">╪ú╪»┘ê╪º╪¬ ╪ú╪¬┘à╪¬╪⌐ ╪¡╪╡╪▒┘è╪⌐ ╪¼╪º┘ç╪▓╪⌐ ┘ä┘ä╪╣┘à┘ä</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-5xl md:text-7xl lg:text-8xl font-alexandria font-black text-white mb-8 leading-[1.1] tracking-tighter"
              >
                ╪╢╪º╪╣┘ü ╪Ñ┘å╪¬╪º╪¼┘è╪¬┘â ┘à╪╣ <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300">
                  ╪¡┘ä┘ê┘ä ╪º┘ä╪ú╪¬┘à╪¬╪⌐ ╪º┘ä╪░┘â┘è╪⌐
                </span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg md:text-2xl text-zinc-400 font-cairo max-w-3xl mx-auto mb-14 leading-relaxed"
              >
                ╪º╪¡╪╡┘ä ╪╣┘ä┘ë ╪¬╪»┘ü┘é╪º╪¬ ╪╣┘à┘ä <span className="text-white font-bold">n8n</span> ┘ê╪ú┘å╪╕┘à╪⌐ ╪░┘â╪º╪í ╪º╪╡╪╖┘å╪º╪╣┘è ╪¼╪º┘ç╪▓╪⌐ ┘ä┘ä╪º╪│╪¬╪«╪»╪º┘à ╪º┘ä┘ü┘ê╪▒┘è. ┘ê┘ü┘æ╪▒ ┘à╪ª╪º╪¬ ╪º┘ä╪│╪º╪╣╪º╪¬ ┘ê╪º╪¿╪»╪ú ╪¿╪º┘ä╪¬╪▒┘â┘è╪▓ ╪╣┘ä┘ë ┘å┘à┘ê ╪ú╪╣┘à╪º┘ä┘â ╪º┘ä╪¡┘é┘è┘é┘è.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col md:flex-row items-center justify-center gap-6"
              >
                <Link
                  href="#products"
                  className="group relative h-16 md:h-20 px-8 md:px-12 inline-flex items-center justify-center gap-3 bg-rose-600 text-white rounded-2xl font-cairo text-lg md:text-xl font-bold shadow-[0_0_40px_rgba(239,0,85,0.4)] hover:shadow-[0_0_60px_rgba(239,0,85,0.6)] transition-all hover:-translate-y-1 active:scale-95 w-full md:w-auto"
                >
                  <span className="relative z-10">╪º╪│╪¬┘â╪┤┘ü ╪º┘ä┘à┘å╪¬╪¼╪º╪¬</span>
                  <ArrowLeft className="w-6 h-6 relative z-10 group-hover:-translate-x-2 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                </Link>
                
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 md:p-4 pr-6 w-full md:w-auto">
                  <div className="flex flex-col items-start">
                    <div className="flex text-yellow-400 mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    </div>
                    <span className="font-cairo text-xs text-zinc-400 font-bold">╪¬┘é┘è┘è┘à 5.0 ┘à┘å <span className="text-white">1200+ ╪╣┘à┘è┘ä</span></span>
                  </div>
                  <div className="flex -space-x-3 rtl:space-x-reverse border-r border-white/10 pr-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden">
                        <Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="customer" width={40} height={40} />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Value Props / Social Proof */}
        <section className="border-y border-white/5 bg-white/[0.02] py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: "+2000", label: "╪¬╪»┘ü┘é ╪╣┘à┘ä ╪¼╪º┘ç╪▓", icon: Zap },
                { number: "100%", label: "╪¬┘å╪▓┘è┘ä ┘ü┘ê╪▒┘è", icon: Download },
                { number: "24/7", label: "╪ú╪¬┘à╪¬╪⌐ ┘à╪│╪¬┘à╪▒╪⌐", icon: Clock },
                { number: "╪ó┘à┘å", label: "╪»┘ü╪╣ ┘à╪┤┘ü╪▒", icon: ShieldCheck }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-2">
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-3xl md:text-4xl font-alexandria font-black text-white">{stat.number}</p>
                  <p className="text-zinc-500 font-cairo text-sm font-bold">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products Showcase */}
        <section id="products" className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-full font-cairo text-sm font-bold mb-6 border border-rose-500/20"
              >
                <Sparkles className="w-4 h-4" />
                ╪º┘ä╪ú┘â╪½╪▒ ┘à╪¿┘è╪╣╪º┘ï
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-alexandria font-black text-white mb-6 tracking-tight">╪º┘ä╪¡╪▓┘à ╪º┘ä╪¼╪º┘ç╪▓╪⌐ ┘ä┘ä╪ú╪¬┘à╪¬╪⌐</h2>
              <p className="text-zinc-400 font-cairo text-lg max-w-2xl mx-auto leading-relaxed">
                ╪º╪│╪¬╪½┘à╪▒ ┘ü┘è ╪ú╪»┘ê╪º╪¬ ╪¬┘ê┘ü╪▒ ┘ä┘â ┘à╪ª╪º╪¬ ╪º┘ä╪│╪º╪╣╪º╪¬ ╪┤┘ç╪▒┘è╪º┘ï. ╪¬┘à ╪¬╪╡┘à┘è┘à ┘ç╪░┘ç ╪º┘ä╪¡╪▓┘à ┘ä╪¬╪╣┘à┘ä ╪¿┘â┘ü╪º╪í╪⌐ ╪╣╪º┘ä┘è╪⌐ ┘ê╪¿╪»┘ê┘å ╪¬╪╣┘é┘è╪»╪º╪¬ ╪¿╪▒┘à╪¼┘è╪⌐.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {isLoading ? (
                Array.from({length: 6}).map((_, i) => (
                  <div key={i} className="h-[500px] rounded-[2.5rem] bg-white/5 animate-pulse" />
                ))
              ) : products.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-cairo text-xl">┘ä╪º ╪¬┘ê╪¼╪» ┘à┘å╪¬╪¼╪º╪¬ ╪¡╪º┘ä┘è╪º┘ï.</p>
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
                      <div className="relative h-64 overflow-hidden bg-zinc-900 p-6 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent z-0" />
                        <Image 
                          src={product.image_url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800"} 
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
                        
                        {/* Badges */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                          {product.is_featured && (
                            <Badge className="bg-rose-600 text-white border-none font-cairo text-xs py-1.5 px-3 shadow-lg rounded-lg">╪º┘ä╪ú┘â╪½╪▒ ┘à╪¿┘è╪╣╪º┘ï</Badge>
                          )}
                          {product.discount_pct && (
                            <Badge className="bg-emerald-500 text-white border-none font-cairo text-xs py-1.5 px-3 shadow-lg rounded-lg">
                              ╪«╪╡┘à {product.discount_pct}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-8 flex-1 flex flex-col relative z-10 -mt-10">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                            <Zap className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">╪¬┘å╪▓┘è┘ä ┘ü┘ê╪▒┘è</span>
                          </div>
                        </div>

                        <h3 className="text-2xl font-alexandria font-bold text-white mb-3 leading-tight group-hover:text-rose-400 transition-colors line-clamp-2">
                          {product.title}
                        </h3>
                        
                        <p className="text-zinc-400 font-cairo text-sm mb-8 leading-relaxed line-clamp-2">
                          {product.short_description || product.description || "╪ú╪»╪º╪⌐ ╪º╪¡╪¬╪▒╪º┘ü┘è╪⌐ ┘à╪╡┘à┘à╪⌐ ┘ä╪▓┘è╪º╪»╪⌐ ╪Ñ┘å╪¬╪º╪¼┘è╪¬┘â ╪¿╪┤┘â┘ä ┘ü┘ê╪▒┘è."}
                        </p>

                        <div className="mt-auto flex items-end justify-between">
                          <div className="flex flex-col">
                            {product.original_price && (
                              <span className="text-sm font-cairo line-through text-zinc-500 mb-1">
                                {product.original_price} ╪¼.┘à
                              </span>
                            )}
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-alexandria font-black text-white">{product.price}</span>
                              <span className="text-sm font-cairo text-zinc-400">╪¼.┘à</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-rose-600 transition-all duration-300 border border-white/10 hover:border-rose-500 hover:shadow-[0_0_15px_rgba(239,0,85,0.5)] hover:-translate-y-1 active:scale-90 z-20 group/cart"
                              title="╪ú╪╢┘ü ┘ä┘ä╪│┘ä╪⌐"
                            >
                              <ShoppingCart className="w-5 h-5 text-zinc-300 group-hover/cart:text-white group-hover/cart:scale-110 transition-transform duration-300" />
                            </button>
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-rose-600 transition-colors border border-white/10 group-hover:border-rose-500">
                              <ArrowLeft className="w-5 h-5 text-white transform group-hover:-translate-x-1 transition-transform" />
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

        {/* Why Choose Us */}
        <section className="py-24 bg-white/[0.02] border-y border-white/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-alexandria font-black text-white mb-6">┘ä┘à╪º╪░╪º ╪¬╪«╪¬╪º╪▒ ╪¡┘ä┘ê┘ä┘å╪º╪ƒ</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                { title: "╪¬┘ê┘ü┘è╪▒ ┘à╪ª╪º╪¬ ╪º┘ä╪│╪º╪╣╪º╪¬", desc: "┘ä╪º ╪¬╪╢╪╣ ┘ê┘é╪¬┘â ┘ü┘è ╪¿┘å╪º╪í ╪º┘ä╪ú╪│╪º╪│┘è╪º╪¬. ┘å┘ê┘ü╪▒ ┘ä┘â ╪¬╪»┘ü┘é╪º╪¬ ╪¼╪º┘ç╪▓╪⌐ ┘ê┘à╪«╪¬╪¿╪▒╪⌐ ┘ä╪¬╪¿╪»╪ú ╪º┘ä╪╣┘à┘ä ┘ü┘ê╪▒╪º┘ï.", icon: Clock },
                { title: "╪»╪╣┘à ┘ü┘å┘è ┘à╪¬┘à┘è╪▓", desc: "┘å╪¡┘å ┘å┘é┘ü ╪«┘ä┘ü ┘à┘å╪¬╪¼╪º╪¬┘å╪º. ┘ü╪▒┘è┘é┘å╪º ┘à╪¬┘ê╪º╪¼╪» ┘ä┘à╪│╪º╪╣╪»╪¬┘â ┘ü┘è ╪¡╪º┘ä ┘ê╪º╪¼┘ç╪¬ ╪ú┘è ┘à╪┤┘â┘ä╪⌐ ╪ú╪½┘å╪º╪í ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à.", icon: Shield },
                { title: "╪¬╪¡╪»┘è╪½╪º╪¬ ┘à╪│╪¬┘à╪▒╪⌐", desc: "╪ú╪»┘ê╪º╪¬┘å╪º ╪¬╪¬╪╖┘ê╪▒ ╪¿╪º╪│╪¬┘à╪▒╪º╪▒ ┘ä╪¬┘ê╪º┘â╪¿ ╪ú╪¡╪»╪½ ╪º┘ä╪¬╪¡╪»┘è╪½╪º╪¬ ╪º┘ä╪¬┘é┘å┘è╪⌐ ┘ü┘è ╪╣╪º┘ä┘à ╪º┘ä╪ú╪¬┘à╪¬╪⌐.", icon: Zap }
              ].map((f, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-[#0a0a0f] border border-white/5 text-center hover:border-rose-500/30 transition-colors">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-600/10 flex items-center justify-center mb-6">
                    <f.icon className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-alexandria font-bold text-white mb-4">{f.title}</h3>
                  <p className="text-zinc-400 font-cairo leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
