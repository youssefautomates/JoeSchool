"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, FileText, Zap, ChevronRight, Lock, PlayCircle, Star, 
  ShieldCheck, Download, Users, Infinity, Target, Sparkles, 
  MonitorPlay, ArrowLeft, Rocket, HeartHandshake,
  Clock, ChevronDown, ShoppingCart
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

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "previews" | "reviews">("details");
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
      setProduct(data as Product);
      
      // Update views non-blocking
      if (data) {
        supabase.rpc('increment_product_views', { product_id: data.id }).then();
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
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-cairo">
        <h1 className="text-4xl font-alexandria font-bold mb-4">المنتج غير موجود</h1>
        <Link href="/" className="text-blue-400 hover:text-blue-300 underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const savings = product.original_price ? product.original_price - product.price : 0;
  const discountPct = calcDiscount(product.price, product.original_price);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo selection:bg-blue-500/30">
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
              <div className="relative aspect-[16/10] bg-[#0a0a0f] rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.1)] group border border-white/5">
                <Image 
                  src={product.image_url || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop"} 
                  alt={product.title} 
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-1000 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent opacity-80" />
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute top-6 left-6 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-cairo text-xs font-bold text-white uppercase tracking-widest">Premium Asset</span>
                </motion.div>
                
                {product.is_featured && (
                  <div className="absolute top-6 right-6 bg-blue-600 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-lg">
                    <span className="font-cairo text-xs font-bold text-white uppercase">الأكثر مبيعاً</span>
                  </div>
                )}
              </div>

              {/* Quick Benefits Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Download, label: "تسليم فوري", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                  { icon: Clock, label: "توفير وقت", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                  { icon: ShieldCheck, label: "دفع آمن", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                  { icon: HeartHandshake, label: "دعم فني", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
                ].map((item, i) => (
                  <div key={i} className={cn("p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 border", item.bg, item.border)}>
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
                {product.short_description || product.description || "أداة متقدمة تضمن لك توفير مئات الساعات وتعظيم نتائجك بأقل مجهود. صُممت لرواد الأعمال والمحترفين."}
              </p>

              {/* Desktop Checkout Box */}
              <div className="hidden lg:block bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
                
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
                <div className="flex flex-col gap-3">
                  <Link
                    href={`/checkout/${product.id}`}
                    className="w-full h-16 inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-cairo text-xl font-black rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] active:scale-95 relative z-10"
                  >
                    شراء الآن والتنزيل الفوري
                    <ArrowLeft className="w-6 h-6 rtl:rotate-180" />
                  </Link>

                  <button
                    onClick={() => addToCart(product)}
                    className="w-full h-14 inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white font-cairo text-lg font-bold rounded-2xl border border-white/10 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:-translate-y-1 active:scale-95 relative z-10 group/addcart"
                  >
                    <ShoppingCart className="w-5 h-5 group-hover/addcart:scale-110 group-hover/addcart:-translate-y-0.5 transition-transform duration-300" />
                    إضافة إلى السلة
                  </button>
                </div>
                
                <div className="mt-6 flex flex-col gap-3 relative z-10">
                  <p className="text-center font-cairo text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <Lock className="w-3 h-3" /> دفع إلكتروني آمن 100%
                  </p>
                  <div className="flex items-center justify-center gap-2 opacity-50 grayscale">
                    {/* Placeholder for payment methods logos if needed */}
                    <span className="text-[10px] font-bold tracking-widest uppercase">Paymob Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Value Stacking Section */}
        <section className="bg-[#0a0a0f] border-y border-white/5 py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-alexandria font-black text-white mb-6 tracking-tight">ماذا ستحصل عليه <span className="text-blue-500">بالضبط؟</span></h2>
              <p className="text-zinc-400 font-cairo text-lg md:text-xl">نحن لا نبيعك ملفات فقط، بل نبيعك "الوقت" والحرية.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { 
                  title: "الملفات الأصلية", 
                  desc: "ملفات النظام كاملة جاهزة للاستيراد والاستخدام المباشر في بيئتك.",
                  icon: Rocket,
                  color: "text-blue-400", bg: "bg-blue-500/10"
                },
                { 
                  title: "دليل الإعداد السريع", 
                  desc: "خطوات واضحة وبسيطة لضمان تفعيل الحزمة في أقل من 5 دقائق.",
                  icon: FileText,
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
                    { id: "previews", label: "معاينة سريعة", icon: MonitorPlay },
                    { id: "reviews", label: "آراء العملاء", icon: Star },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center justify-between px-6 py-5 rounded-2xl font-cairo font-bold text-lg transition-all duration-300",
                        activeTab === tab.id 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
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
                          <div dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, '<br/>') }} />
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
                              "كود نظيف وموثق (إن وجد)",
                              "سهولة التخصيص والتعديل"
                            ].map((item, i) => (
                              <li key={i} className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <span className="text-zinc-300">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "previews" && (
                    <div className="space-y-8 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                        <PlayCircle className="w-10 h-10 text-blue-500" />
                      </div>
                      <h3 className="text-2xl font-alexandria font-black text-white">معاينة الفيديو قريباً</h3>
                      <p className="text-zinc-400 font-cairo">نعمل حالياً على إضافة فيديوهات توضيحية لجميع المنتجات.</p>
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
                      
                      <div className="grid gap-4">
                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <div className="flex text-yellow-400 mb-3 gap-1">
                            {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                          </div>
                          <p className="text-zinc-300 font-cairo mb-4 leading-relaxed">"تجربة رائعة ومنتج ممتاز جداً، وفر علي الكثير من الوقت والجهد. الدعم الفني كان متجاوباً للغاية."</p>
                          <p className="font-cairo font-bold text-zinc-500 text-sm">أحمد س. <span className="mx-2 opacity-50">•</span> <span className="text-emerald-400 text-xs">مشتري مؤكد</span></p>
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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/90 backdrop-blur-xl border-t border-white/10 p-4 z-50 flex items-center justify-between gap-4 pb-safe shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col">
            {product.original_price && (
              <span className="text-zinc-500 font-cairo text-xs line-through">{product.original_price} ج.م</span>
            )}
            <span className="text-2xl font-alexandria font-black text-white">{product.price} <span className="text-xs font-cairo text-zinc-400 font-normal">ج.م</span></span>
          </div>
          <div className="flex gap-2 w-[60%]">
            <button
              onClick={() => addToCart(product)}
              className="h-12 w-12 bg-white/10 border border-white/10 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0"
              aria-label="إضافة للسلة"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            <Link
              href={`/checkout/${product.id}`}
              className="flex-1 h-12 bg-blue-600 text-white font-cairo font-black text-sm md:text-lg rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
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
