"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, FileText, Zap, ChevronRight, Lock, Star, 
  ShieldCheck, Download, Users, Target, Sparkles, 
  ArrowLeft, Rocket, HeartHandshake, BookOpen, Layers,
  Clock, ShoppingCart, Play, Archive, Mail
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { WhatsAppPopup } from "@/components/WhatsAppPopup";
import WishlistButton from "@/components/WishlistButton";
import RelatedCarousel from "@/components/RelatedCarousel";

import { fetchBundleBySlug, HydratedBundle } from "@/lib/bundles";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/products";
import { ProductReviews } from "@/components/ProductReviews";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";

export default function BundlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const [bundle, setBundle] = useState<HydratedBundle | null>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { addToCart } = useCart();

  const bundlePricing = bundle ? resolveProductPrice(bundle as any, currency) : null;

  useEffect(() => {
    async function loadBundle() {
      setIsLoading(true);
      try {
        const decodedSlug = decodeURIComponent(resolvedParams.slug);
        const { bundle: data, error } = await fetchBundleBySlug(decodedSlug);
        if (error) {
          toast.error("فشل تحميل تفاصيل العرض");
          return;
        }
        setBundle(data);
        if (data) {
          // Pre-fetch reviews concurrently to ensure instant display on load
          try {
            const reviewsRes = await fetch(`/api/admin/reviews?productId=${data.id}`);
            if (reviewsRes.ok) {
              const rData = await reviewsRes.json();
              if (Array.isArray(rData)) {
                setAllReviews(rData);
              }
            }
          } catch (e) {
            console.error("Failed to load reviews for bundle:", e);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadBundle();
  }, [resolvedParams.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-zinc-900 font-sans">
        <h1 className="text-4xl font-cairo font-bold mb-4 font-black">العرض غير موجود</h1>
        <p className="text-zinc-500 mb-6 text-sm">عذراً، يبدو أن هذه الحزمة لم تعد متوفرة أو تم تغيير الرابط الخاص بها.</p>
        <Link href="/" className="text-yellow-500 hover:text-brand-300 underline font-bold">العودة للرئيسية</Link>
      </div>
    );
  }

  // Count items by type
  const coursesCount = bundle.items.filter(it => it.item_type === "course").length;
  const productsCount = bundle.items.filter(it => it.item_type === "digital_product").length;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-brand-500/30" style={{ isolation: 'isolate' }}>
      <Navbar />
      
      <main className="pt-20 md:pt-32 pb-32 md:pb-24 relative z-0">
        <section className="container mx-auto px-4 md:px-6 max-w-7xl">
          
          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-6 text-xs font-bold group">
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            <span>العودة لجميع العروض والمنتجات</span>
          </Link>

          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Visuals & Included Contents */}
            <div className="w-full lg:w-[62%] space-y-8">
              
              {/* Main Banner Media Container */}
              <div className="relative aspect-video bg-[#08080c] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-sm border border-zinc-200/60 border border-zinc-200/60 flex items-center justify-center group/banner">
                {bundle.banner_url || bundle.image_url ? (
                  <Image 
                    src={bundle.banner_url || bundle.image_url || ""} 
                    alt={bundle.title} 
                    fill
                    className="object-cover transition-transform duration-700 group-hover/banner:scale-105"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {/* Floating Tags */}
                <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-3 z-20">
                  <div className="bg-brand-600 text-white font-sans font-black px-4 py-2 rounded-2xl text-xs md:text-sm shadow-[0_0_30px_rgba(29, 78, 216,0.4)] flex items-center gap-1.5 border border-zinc-200/60">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>حزمة عروض سوبر حصرية</span>
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 left-6 z-20">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {coursesCount > 0 && (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-[10px] font-black backdrop-blur-md">
                        {coursesCount} دورات تدريبية
                      </span>
                    )}
                    {productsCount > 0 && (
                      <span className="bg-brand-500/20 text-brand-300 border border-zinc-200/60 px-3 py-1 rounded-full text-[10px] font-black backdrop-blur-md">
                        {productsCount} ملفات وأدوات رقمية
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl md:text-4xl font-sans font-black text-zinc-900 leading-tight drop-shadow-sm border border-zinc-200/60">
                    {bundle.title}
                  </h2>
                </div>
              </div>

              {/* Description Body */}
              <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 border border-zinc-200/60 shadow-sm border border-zinc-200/60 space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 border-b border-zinc-200/60 pb-4 md:pb-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-2xl bg-brand-500/10 flex items-center justify-center border border-zinc-200/60 text-yellow-500 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                    <Target className="w-4 h-4 md:w-5.5 md:h-5.5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xl md:text-3xl font-sans font-black text-zinc-900 leading-tight">تفاصيل الحزمة الكبرى</h2>
                    <span className="font-alexandria text-[10px] md:text-xs text-zinc-500 font-medium">ما ستحصل عليه فور الاشتراك</span>
                  </div>
                </div>

                <div className="prose prose-invert prose-rose max-w-none">
                  {bundle.description ? (
                    <div className="text-zinc-700 font-sans text-[15px] md:text-base leading-[1.8] space-y-5" dangerouslySetInnerHTML={{ __html: bundle.description.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className="text-zinc-500 font-sans text-[15px] md:text-base leading-[1.8]">هذه الحزمة مصممة خصيصاً لتمنحك حلاً متكاملاً يجمع بين المعرفة الفنية المساراتية والأدوات الرقمية الجاهزة للتثبيت الفوري بأعلى كفاءة ممكنة وسعر موفر لا يصدق.</p>
                  )}
                </div>
              </div>

              {/* Bundle Contents List */}
              <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 border border-zinc-200/60 shadow-sm border border-zinc-200/60 space-y-6 md:space-y-8">
                <div className="flex items-center gap-3 md:gap-4 border-b border-zinc-200/60 pb-4 md:pb-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl md:rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                    <Layers className="w-4 h-4 md:w-5.5 md:h-5.5" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xl md:text-3xl font-sans font-black text-zinc-900 leading-tight">محتويات الحزمة المشمولة ({bundle.items.length})</h2>
                    <span className="font-alexandria text-[10px] md:text-xs text-zinc-500 font-medium">اضغط لعرض تفاصيل أي عنصر</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {bundle.items.map((item, idx) => {
                    const isCourse = item.item_type === "course";
                    const title = isCourse ? item.course?.title : item.product?.title;
                    const desc = isCourse ? item.course?.short_description : (item.product?.short_description || item.product?.description);
                    const image = isCourse ? item.course?.image_url : item.product?.image_url;
                    const resolvedItem = isCourse ? item.course : item.product;
                    const itemPricing = resolvedItem ? resolveProductPrice(resolvedItem, currency) : null;
                    const price = itemPricing?.price ?? 0;
                    const originalPrice = itemPricing?.original_price ?? 0;
                    const slug = isCourse ? item.course?.slug : item.product?.slug;

                    const typeBadge = isCourse ? "دورة تعليمية" : "منتج رقمي";
                    const badgeColor = isCourse 
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                      : "bg-brand-500/10 text-yellow-500 border-zinc-200/60";

                    const itemLink = isCourse ? `/courses/${slug}` : `/product/${slug}`;

                    return (
                      <div 
                        key={idx}
                        className="bg-zinc-50/40 border border-zinc-200/60 hover:border-zinc-200 p-5 rounded-3xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-all duration-300 group"
                      >
                        <div className="flex gap-4 items-center min-w-0 w-full md:w-auto">
                          <div className="w-24 aspect-video rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-zinc-200/60 relative">
                            {image ? (
                              <img src={image} alt={title} className="w-full h-full object-cover object-center" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-900/20">YA</div>
                            )}
                            <span className={cn("absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-[7px] font-black border backdrop-blur-sm", badgeColor)}>
                              {typeBadge}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm md:text-base font-bold text-zinc-900 group-hover:text-yellow-500 transition-colors truncate">
                              {title}
                            </h4>
                            <p className="text-zinc-500 text-xs line-clamp-2 mt-1 leading-relaxed">
                              {desc}
                            </p>
                            
                            {/* Extra stats */}
                            <div className="flex gap-4 mt-2 text-[10px] text-zinc-500 font-bold items-center">
                              {isCourse ? (
                                <>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-purple-400" />
                                    {item.course?.duration_hours} ساعة
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 text-purple-400" />
                                    {item.course?.lessons_count} محاضرة
                                  </span>
                                </>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Download className="w-3 h-3 text-yellow-500" />
                                  تنزيل فوري
                                </span>
                              )}
                              <span className="flex items-center gap-0.5 text-yellow-400">
                                <Star className="w-3 h-3 fill-current" />
                                5.0
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 border-t border-zinc-200/60 md:border-none pt-4 md:pt-0">
                          <div className="flex flex-col text-right md:text-left">
                            {originalPrice > 0 && (
                              <span className="text-[10px] text-zinc-600 line-through">
                                {formatPrice(originalPrice, currency)}
                              </span>
                            )}
                            <span className="text-xs font-black text-zinc-500 font-mono">
                              {price === 0 ? "مجاني" : formatPrice(price, currency)} (مشمول مجاناً)
                            </span>
                          </div>
                          
                          <Link 
                            href={itemLink}
                            className="h-9 px-4 bg-zinc-100/40 hover:bg-zinc-100/80 border border-zinc-200 text-zinc-900 text-[10px] font-bold rounded-2xl flex items-center justify-center gap-1 transition-all"
                          >
                            <span>التفاصيل</span>
                            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery and Guarantee Badges */}
              <div className="bg-[#0b0b10]/60 backdrop-blur-xl rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 border border-zinc-200/60 shadow-sm border border-zinc-200/60 space-y-6">
                <h3 className="text-lg font-sans font-black text-zinc-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>الضمان الثلاثي الأقوى</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "حساب فوري فائق الحماية", desc: "يتم إنشاء حسابك وتأمين دوراتك بداخل بورتال الطالب فور إتمام الدفع.", icon: Lock },
                    { title: "رسائل بريدية مزدوجة منفصلة", desc: "سنرسل لك إيميلين منفصلين فوريين: الأول لتفعيل مسارك التعليمي، والثاني يحتوي على الملفات البرمجية مباشرة.", icon: Mail },
                    { title: "تحديثات مجانية مدى الحياة", desc: "أي تدفق عمل أو درس إضافي يتم نشره في هذه الحزمة ستحصل عليه مجاناً بدون دفع فلس إضافي.", icon: Zap }
                  ].map((x, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                        <x.icon className="w-4.5 h-4.5" />
                      </div>
                      <h4 className="text-xs font-sans font-black text-zinc-900">{x.title}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">{x.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Column: Pricing & Checkout Conversion */}
            <div className="w-full lg:w-[38%] lg:sticky lg:top-32 space-y-6 md:space-y-8">
              <div className="bg-[#0c0c12] p-5 sm:p-8 md:p-10 lg:p-12 rounded-3xl md:rounded-[2.5rem] lg:rounded-[3rem] border border-zinc-200 shadow-sm border border-zinc-200/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-brand-600/5 to-transparent opacity-50" />
                
                {/* Wishlist Button float inside absolute */}
                <div className="absolute top-4 left-4 z-20">
                  <WishlistButton itemId={bundle.id} itemType="bundle" size={16} />
                </div>

                <div className="relative z-10 space-y-5 md:space-y-8">
                  <div className="space-y-2 md:space-y-4">
                    {bundle.discount_pct && bundle.discount_pct > 0 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-sans px-2.5 py-1 md:px-4 md:py-2 rounded-2xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                        🎉 وفر {bundle.discount_pct}% بالكامل حالياً
                      </Badge>
                    ) : null}
                    <h1 className="text-[22px] leading-[1.3] sm:text-3xl md:text-4xl lg:text-5xl font-sans font-black text-zinc-900 md:leading-tight tracking-tighter">
                      {bundle.title}
                    </h1>
                    <p className="text-zinc-500 font-sans text-xs leading-relaxed">
                      {bundle.short_description || "احصل على جميع مكونات هذه الحزمة ووفر مئات الدولارات مقارنة بشرائها بشكل منفصل."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between py-3 md:py-6 border-y border-zinc-200/60">
                    <div className="flex flex-col">
                      {bundlePricing && bundlePricing.original_price > 0 && (
                        <span className="text-zinc-600 font-sans text-xs sm:text-base md:text-xl line-through decoration-brand-500/30 mb-0">
                          {formatPrice(bundlePricing.original_price, currency)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1.5 md:gap-3">
                        <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-sans font-black text-zinc-900 tracking-tighter">
                          {bundlePricing ? (bundlePricing.price === 0 ? "مجاني" : formatPrice(bundlePricing.price, currency)) : ""}
                        </span>
                      </div>
                    </div>
                    {bundlePricing && bundlePricing.discount_pct > 0 ? (
                      <div className="bg-brand-600 text-white font-sans font-black px-2.5 py-1 md:px-4 md:py-2 rounded-2xl md:rounded-2xl text-xs md:text-sm shadow-sm border border-zinc-200/60 shadow-brand-600/20">
                        خصم {bundlePricing.discount_pct}%
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2.5 md:space-y-4 pt-1 md:pt-4">
                    <Link
                      href={`/checkout/${bundle.id}`}
                      className="w-full h-12 sm:h-16 md:h-20 inline-flex items-center justify-center gap-2 md:gap-4 bg-[#1D4ED8] hover:bg-[#3B82F6] text-white font-sans font-black text-sm sm:text-lg md:text-2xl rounded-2xl md:rounded-[2rem] transition-all shadow-[0_15px_40px_rgba(29, 78, 216,0.35)] hover:shadow-[0_20px_50px_rgba(29, 78, 216,0.5)] active:scale-95 group"
                    >
                      شراء الحزمة بالكامل
                      <ArrowLeft className="w-4 h-4 md:w-7 md:h-7 rtl:rotate-180 group-hover:-translate-x-2 transition-transform" />
                    </Link>

                    <button
                      onClick={() => {
                        addToCart({
                          id: bundle.id,
                          title: bundle.title,
                          price: bundlePricing?.price ?? bundle.price,
                          original_price: bundlePricing?.original_price ?? bundle.original_price,
                          image_url: bundle.image_url || "",
                          slug: bundle.slug,
                          category: "حزم العروض",
                          description: bundle.short_description || bundle.description
                        } as any as Product);
                        toast.success("تمت إضافة حزمة العروض للسلة بنجاح!");
                      }}
                      className="w-full h-10 sm:h-14 md:h-16 inline-flex items-center justify-center gap-2 md:gap-3 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 font-sans font-black text-xs sm:text-base md:text-lg rounded-2xl md:rounded-[1.5rem] border border-zinc-200 transition-all active:scale-95"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      إضافة الحزمة للسلة
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-4 md:gap-6 pt-2 md:pt-6 text-zinc-500">
                    <div className="flex items-center gap-1.5 md:gap-2">
                       <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" />
                       <span className="text-[8px] md:text-[9px] font-sans font-black uppercase tracking-widest">آمن 100%</span>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                       <Lock className="w-3 h-3 md:w-4 md:h-4" />
                       <span className="text-[8px] md:text-[9px] font-sans font-black uppercase tracking-widest">تشفير SSL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="bg-zinc-100/40 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 border border-zinc-200/60 flex items-center justify-between gap-3 md:gap-4">
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
                    <p className="text-zinc-900 font-sans font-bold text-xs md:text-sm">وفر أكثر من 1500+ ريال</p>
                 </div>
              </div>
            </div>

          </div>

          {/* Reviews Section */}
          <ProductReviews productId={bundle.id} initialReviews={allReviews} productTitle={bundle.title} />

          {/* Related engine Carousel */}
          <div className="mt-20 border-t border-zinc-200/60 pt-16">
            <RelatedCarousel sourceType="bundle" sourceId={bundle.id} />
          </div>

        </section>
      </main>

      {/* Mobile Sticky Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-zinc-200 p-3 z-50 flex items-center justify-between gap-3 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.8)] supports-[backdrop-filter]:bg-black/60">
        <div className="flex flex-col pl-2">
          <span className="text-lg font-sans font-black text-zinc-900 leading-none tracking-tighter">
            {bundlePricing ? (bundlePricing.price === 0 ? "مجاني" : formatPrice(bundlePricing.price, currency)) : ""}
          </span>
          {bundlePricing && bundlePricing.original_price > 0 && <span className="text-[9px] text-zinc-500 line-through mt-0.5">بدلاً من {formatPrice(bundlePricing.original_price, currency)}</span>}
        </div>
        <div className="flex gap-2 flex-1">
          <button
            onClick={() => addToCart({
              id: bundle.id,
              title: bundle.title,
              price: bundlePricing?.price ?? bundle.price,
              original_price: bundlePricing?.original_price ?? bundle.original_price,
              image_url: bundle.image_url || "",
              slug: bundle.slug,
              category: "حزم العروض",
              description: bundle.short_description || bundle.description
            } as any as Product)}
            className="h-11 w-11 bg-zinc-100/40 hover:bg-zinc-100/80 border border-zinc-200 text-zinc-900 rounded-2xl flex items-center justify-center active:scale-90 shrink-0 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
          <Link
            href={`/checkout/${bundle.id}`}
            className="flex-1 h-11 bg-[#1D4ED8] text-white font-sans font-black text-sm rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_10px_30px_rgba(29, 78, 216,0.3)]"
          >
            شراء فوري للحزمة
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <WhatsAppPopup />
      <Footer />
    </div>
  );
}
