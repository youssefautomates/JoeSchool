"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Sparkles, BookOpen, Clock, Zap, ArrowLeft, Star, PlayCircle, Loader2, Layers, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getCoursesList, type LmsCourse } from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";

function stripHtml(html: string) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function CoursesPage() {
  const { addToCart } = useCart();
  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const [coursesList, setCoursesList] = useState<LmsCourse[]>([]);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);

  useEffect(() => {
    getCoursesList().then((data) => {
      // Show only published courses
      setCoursesList(data.filter(c => c.status === "published"));
      setIsLoading(false);
    });
    // Load dynamic categories from Supabase
    supabaseClient
      .from("course_categories")
      .select("name")
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDynamicCategories(data.map((c: { name: string }) => c.name));
        }
      });
    // Fetch reviews
    fetch("/api/admin/reviews")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllReviews(data);
        }
      })
      .catch(() => {});
  }, []);

  const courseCategories = [
    "الكل",
    ...(dynamicCategories.length > 0
      ? dynamicCategories
      : ["دورات الأتمتة", "دورات صناعة المحتوى", "الدورات المجانية"])
  ];

  const filteredCourses = coursesList.filter((course) => {
    if (activeCategory === "الكل") return true;
    if (activeCategory === "الدورات المجانية") return course.is_free || course.price === 0;
    if (course.category === activeCategory) return true;
    const legacyMap: Record<string, string[]> = {
      "دورات الأتمتة": ["الأتمتة", "أتمتة"],
      "دورات صناعة المحتوى": ["صناعة المحتوى", "المحتوى"],
      "دورات الذكاء الاصطناعي": ["الذكاء الاصطناعي", "AI"],
      "دورات التسويق": ["التسويق", "marketing"],
    };
    const aliases = legacyMap[activeCategory] || [];
    return aliases.some(alias => course.category === alias || course.category?.toLowerCase().includes(alias.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col pt-24 pb-16">
        {/* Header Hero Section */}
        <section className="relative py-12 md:py-20 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[#050505] z-0">
            <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-50"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-500/10 rounded-full blur-[80px]" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-1.5 rounded-full mb-6 font-bold text-xs md:text-sm"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>أكاديمية JoeSchool للتعليم الرقمي</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl font-alexandria font-black leading-tight tracking-tight text-white mb-6"
            >
              انطلق نحو الاحتراف مع <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0f53] to-[#ff00b3]">
                أرقى دورات الأتمتة والذكاء الاصطناعي
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed"
            >
              اختر مسارك التعليمي من بين حزم الدروس الاحترافية المصممة بعناية فائقة لتأهيلك لبناء وكلاء ومشاريع الأتمتة والذكاء الاصطناعي وتطوير مهاراتك التقنية.
            </motion.p>
          </div>
        </section>

        {/* Category Filters Tabs */}
        <section className="container mx-auto px-4 max-w-6xl mb-12">
          <div className="flex items-center justify-start md:justify-center overflow-x-auto pb-4 gap-2 scrollbar-none snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {courseCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-2.5 rounded-full font-cairo text-xs md:text-sm font-bold transition-all duration-300 shrink-0 select-none cursor-pointer border snap-align-start",
                  activeCategory === cat
                    ? "bg-[#D6004B] text-white border-[#D6004B] shadow-[0_4px_15px_rgba(214,0,75,0.3)] scale-105"
                    : "bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Courses Cards Grid */}
        <section className="container mx-auto px-4 max-w-6xl flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
              <p className="text-zinc-400 text-sm font-medium">جاري تحميل الأقسام التدريبية الفنية...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-md mx-auto">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="font-alexandria font-bold text-white text-base">لا توجد أقسام تدريبية متاحة حالياً</h3>
              <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                تتوفر أقسام جديدة قريباً جداً في هذه الصفحة. تابع قنواتنا للحصول على التحديثات!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredCourses.map((course, idx) => {
                const coursePricing = resolveProductPrice(course as any, currency);
                const courseReviews = allReviews.filter((r: any) => r.productId === course.id && !r.isHidden);
                const reviewsCount = courseReviews.length;
                const averageRating = reviewsCount > 0 
                  ? (courseReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviewsCount).toFixed(1)
                  : "5.0";
                return (
                  <motion.div
                    key={course.slug}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.05 }}
                    className="group bg-gradient-to-b from-[#0e0e16] to-[#07070c] border border-white/5 hover:border-[#D6004B]/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:-translate-y-3 transition-all duration-300 h-full relative cursor-pointer hover:shadow-[0_30px_60px_-15px_rgba(214,0,75,0.25)]"
                    onClick={() => window.location.href = `/courses/${course.slug}`}
                  >
                    {/* Glow Light Sweep Shimmer Effect */}
                    <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none z-10" />
                    {/* Visual Header */}
                    <div className="relative h-56 bg-zinc-955 overflow-hidden flex items-center justify-center border-b border-white/5">
                      {course.image_url ? (
                        <img src={course.image_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:scale-112 transition-transform duration-700 ease-out" />
                      ) : (
                        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-transparent to-black/30" />
                      
                      {/* Left Badge (Category) */}
                      {course.category && (
                        <div className="absolute top-4 left-4 z-20">
                          <span className="bg-black/50 backdrop-blur-md text-white border border-white/10 font-cairo text-[9px] font-bold py-1 px-3 rounded-lg shadow-lg">
                            {course.category}
                          </span>
                        </div>
                      )}

                      {/* Discount Badge on Image */}
                      {coursePricing && coursePricing.original_price > coursePricing.price && (
                        <div className="absolute bottom-3 right-3 z-20">
                          <span className="bg-emerald-500 text-white font-black text-[9px] font-alexandria py-1 px-2.5 rounded-lg shadow-md animate-pulse">
                            وفر {coursePricing.discount_pct}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Info Bar */}
                        <div className="flex items-center justify-between text-xs text-zinc-400 font-bold bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-[#D6004B] transition-transform duration-300 ease-out group-hover/item:scale-120 group-hover/item:-rotate-6" />
                              <span>{course.lessons_count} محاضرة</span>
                            </div>
                            <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                              <Clock className="w-4 h-4 text-[#FF7A00] transition-transform duration-300 ease-out group-hover/item:scale-120 group-hover/item:rotate-6" />
                              <span>{course.duration_hours} ساعة</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-current transition-transform duration-300 ease-out group-hover:scale-120 group-hover:rotate-12" />
                            <span className="text-white text-xs">{averageRating}</span>
                            <span className="text-zinc-500 font-normal text-[10px]">({reviewsCount})</span>
                          </div>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white leading-tight group-hover:text-[#D6004B] transition-colors line-clamp-2">
                          {course.title}
                        </h2>

                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed line-clamp-2">
                          {stripHtml(course.short_description || course.description)}
                        </p>
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        {/* Price display */}
                        <div className="flex flex-col">
                          {coursePricing.original_price > coursePricing.price && (
                            <span className="text-xs sm:text-sm text-zinc-500 line-through mb-0.5 font-alexandria">
                              {formatPrice(coursePricing.original_price, currency)}
                            </span>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-alexandria font-black text-white">
                              {coursePricing.price === 0 ? "مجاني" : formatPrice(coursePricing.price, currency)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart({
                                id: course.id,
                                title: course.title,
                                price: coursePricing.price,
                                original_price: coursePricing.original_price,
                                image_url: course.image_url,
                                category: course.category || "courses"
                              } as any);
                              toast.success("تم إضافة الكورس للسلة بنجاح");
                            }}
                            className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-[#D6004B] hover:border-[#D6004B] hover:shadow-[0_0_15px_rgba(214,0,75,0.4)] transition-all shrink-0 group/cart duration-300"
                          >
                            <ShoppingCart className="w-5 h-5 group-hover/cart:scale-110 transition-transform" />
                          </button>
                          <div className="h-12 px-6 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-[0_4px_15px_rgba(214,0,75,0.2)] group-hover:scale-[1.02] group-hover:shadow-[0_0_20px_rgba(214,0,75,0.4)] active:scale-98 transition-all shrink-0 duration-300">
                            <span>احصل على الكورس</span>
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
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
