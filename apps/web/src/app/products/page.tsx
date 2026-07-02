"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, ArrowLeft, Star, Loader2, Package, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchActiveProducts, type Product } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProductMedia } from "@/components/ProductMedia";
import WishlistButton from "@/components/WishlistButton";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";
import { supabaseClient } from "@/lib/supabaseClient";

// Helper: Unpack Product Media Tags
function unpackProduct(p: any) {
  const mediaTags = p.tags?.filter((t: string) => t.startsWith("media:")) || [];
  const slides = Array(4).fill(null).map((_, i) => {
    const tag = mediaTags.find((t: string) => t.startsWith(`media:${i}:`));
    if (tag) {
      const parts = tag.split(":");
      const type = parts[2];
      const url = parts.slice(3).join(":");
      return { type, url };
    }
    return null;
  }).filter(Boolean);

  return { slides };
}

export default function ProductsPage() {
  const { addToCart } = useCart();
  const [currency, setCurrency] = useState<Currency>("EGP");
  const router = useRouter();

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicProductCategories, setDynamicProductCategories] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveProducts({ limit: 100 }).then(({ products }) => {
      setProductsList(products);
      setIsLoading(false);
    });

    // Fetch dynamic product categories from Supabase
    supabaseClient
      .from("product_categories")
      .select("name")
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDynamicProductCategories(data.map((c: { name: string }) => c.name));
        }
      });
  }, []);

  const productCategories = [
    "الكل",
    ...dynamicProductCategories
  ];

  // Smart product categorizer
  const getProductCategory = (product: Product) => {
    return product.category || "";
  };

  const filteredProducts = productsList.filter((product) => {
    if (activeCategory === "الكل") return true;
    const cat = getProductCategory(product);
    return cat === activeCategory;
  });

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-brand-500/30 font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col pt-24 pb-16">
        {/* Header Hero Section */}
        <section className="relative py-12 md:py-20 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-white z-0">
            <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-50"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">


            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl font-sans font-black leading-tight tracking-tight text-zinc-900 mb-6"
            >
              مكتبة المنتجات الرقمية
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-zinc-500 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed"
            >
              استكشف مجموعتنا المتنوعة من المنتجات الرقمية المميزة والمصممة لمساعدتك في مشروعك الإبداعي والمهني.
            </motion.p>
          </div>
        </section>

        {/* Category Filters Tabs */}
        {!isLoading && productsList.length > 0 && (
          <section className="container mx-auto px-4 max-w-6xl mb-12">
            <div className="flex items-center justify-start md:justify-center overflow-x-auto pb-4 gap-2 scrollbar-none snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {productCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-full font-sans text-xs md:text-sm font-bold transition-all duration-300 shrink-0 select-none cursor-pointer border snap-align-start",
                    activeCategory === cat
                      ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-[0_4px_15px_rgba(29, 78, 216,0.3)] scale-105"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-slate-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Products Cards Grid */}
        <section className="container mx-auto px-4 max-w-6xl flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              <p className="text-zinc-500 text-sm font-medium">جاري تحميل المنتجات الرقمية الاحترافية...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-zinc-50/70 border border-zinc-200/60 rounded-3xl p-8 max-w-md mx-auto">
              <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="font-sans font-bold text-zinc-900 text-base">لا توجد منتجات رقمية متاحة حالياً</h3>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                تتوفر منتجات جديدة قريباً جداً في هذه الصفحة. تابع قنواتنا للحصول على التحديثات!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product, idx) => {
                const unpacked = unpackProduct(product);
                const primaryVideo = unpacked.slides.find((s: any) => s.type === 'video')?.url;
                const primaryImage = unpacked.slides.find((s: any) => s.type === 'image')?.url || product.image_url;
                const productPricing = resolveProductPrice(product, currency);
                const isFree = productPricing.price === 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
                    className="group h-full"
                  >
                    <div
                      onClick={() => router.push(`/product/${product.slug}`)}
                      onMouseEnter={() => setHoveredId(product.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="block relative h-full flex flex-col bg-slate-50 border border-[#1b1b24]/60 hover:border-[#1D4ED8]/50 rounded-[2rem] overflow-hidden group-hover:-translate-y-3 transition-all duration-300 shadow-sm border border-zinc-200/60 hover:shadow-[0_30px_60px_-15px_rgba(29, 78, 216,0.25)] cursor-pointer"
                    >
                      {/* Glow Light Sweep Shimmer Effect */}
                      <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none z-10" />
                      
                      {/* Media Area */}
                      <div className="relative w-full aspect-video overflow-hidden border-b border-zinc-200/60">
                        <ProductMedia
                          image_url={primaryImage}
                          video_url={primaryVideo}
                          title={product.title}
                          isHovered={hoveredId === product.id}
                          className="w-full h-full"
                          staticOnly={true}
                          priority={idx < 3}
                        />

                        {/* Badges */}
                        <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-2 z-20">
                          {isFree ? (
                            <Badge className="bg-emerald-600 text-white border-none font-sans text-[9px] md:text-[10px] py-0.5 px-2.5 shadow-sm border border-zinc-200/60 rounded-xl font-bold">هدية مجانية</Badge>
                          ) : product.is_featured ? (
                            <Badge className="bg-[#1D4ED8] text-white border-none font-sans text-[9px] md:text-[10px] py-0.5 px-2.5 shadow-sm border border-zinc-200/60 rounded-xl font-bold">الأكثر مبيعاً</Badge>
                          ) : null}
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
                          <span className="bg-[#1D4ED8]/15 text-[#1D4ED8] border border-[#1D4ED8]/30 font-sans text-[9px] md:text-[10px] font-black py-1 px-3 rounded-full backdrop-blur-md shadow-none tracking-wide">
                            {getProductCategory(product)}
                          </span>
                        </div>

                        {/* Wishlist Heart Button */}
                        <div className="absolute bottom-4 left-4 z-20">
                          <WishlistButton itemId={product.id} itemType="digital_product" size={16} />
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-6 flex-1 flex flex-col relative z-10">
                        <div className="flex items-center gap-2 mb-3 md:mb-4">
                          <div className="flex items-center gap-1.5 bg-zinc-100/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-zinc-200">
                            <Zap className="w-2.5 h-2.5 text-yellow-500" />
                            <span className="text-[9px] font-bold text-zinc-900 uppercase tracking-widest">تنزيل فوري</span>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-900 mb-2 leading-snug group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                          {product.title}
                        </h3>

                        <p className="text-zinc-500 font-sans text-xs mb-6 leading-relaxed line-clamp-2">
                          {product.short_description || product.description || "أداة احترافية مصممة لزيادة إنتاجيتك بشكل فوري."}
                        </p>

                        <div className="mt-auto flex items-end justify-between">
                          <div className="flex flex-col">
                            {productPricing.original_price && productPricing.original_price > 0 ? (
                              <span className="text-[9px] font-sans line-through text-zinc-500 mb-0.5">
                                {formatPrice(productPricing.original_price, currency)}
                              </span>
                            ) : null}
                            <div className="flex items-baseline gap-0.5">
                              {isFree ? (
                                <span className="text-2xl font-sans font-black text-emerald-400">مجاني</span>
                              ) : (
                                <span className="text-2xl font-sans font-black text-zinc-900">
                                  {formatPrice(productPricing.price, currency)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart({
                                  ...product,
                                  price: productPricing.price,
                                  original_price: productPricing.original_price
                                });
                                toast.success("تمت الإضافة للسلة");
                              }}
                              className="w-10 h-10 rounded-2xl bg-zinc-100/40 border border-zinc-200 flex items-center justify-center text-zinc-900 hover:bg-[#1D4ED8] hover:border-[#1D4ED8] hover:shadow-[0_0_15px_rgba(29, 78, 216,0.4)] transition-all duration-300"
                              title="إضافة إلى السلة"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                            <div className="h-10 px-4 rounded-2xl bg-[#1D4ED8] flex items-center justify-center text-white font-bold text-xs gap-1.5 shadow-sm border border-zinc-200/60 shadow-brand-600/30 group-hover:bg-brand-600 group-hover:shadow-[0_0_20px_rgba(29, 78, 216,0.5)] transition-all duration-300">
                              <span>شراء الآن</span>
                              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
