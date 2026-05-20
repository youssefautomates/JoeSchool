"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Shield, Clock, CheckCircle2, ChevronDown, ChevronLeft, 
  Sparkles, ShieldCheck, Download, PlayCircle, Play, Star, 
  ArrowLeft, Package, ShoppingCart, BookOpen, Layers, Filter
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchActiveProducts, type Product } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ReviewsMarquee } from "@/components/ReviewsMarquee";
import { FAQSection } from "@/components/FAQSection";
import { ProductMedia } from "@/components/ProductMedia";
import { getCoursesList, type LmsCourse } from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";
import WishlistButton from "@/components/WishlistButton";
import { fetchActiveBundles, type HydratedBundle } from "@/lib/bundles";

// ── Helper: Unpack Product Media Tags ───────────────────────────────────────────────
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

function stripHtml(html: string) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export default function Home() {
  const router = useRouter();
  const { addToCart } = useCart();

  // State Management
  const [products, setProducts] = useState<Product[]>([]);
  const [coursesList, setCoursesList] = useState<LmsCourse[]>([]);
  const [bundles, setBundles] = useState<HydratedBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ count: 1200, averageRating: 5.0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [allReviews, setAllReviews] = useState<any[]>([]);

  // Active Category Tabs
  const [activeCourseCategory, setActiveCourseCategory] = useState("الكل");
  const [activeProductCategory, setActiveProductCategory] = useState("الكل");
  
  // Dynamic categories from Supabase
  const [dynamicCourseCategories, setDynamicCourseCategories] = useState<string[]>([]);
  const [dynamicProductCategories, setDynamicProductCategories] = useState<string[]>([]);

  // Fetch initial data
  useEffect(() => {
    let cancelled = false;
    
    // Fetch products
    fetchActiveProducts({ limit: 50 }).then(({ products: p }) => {
      if (!cancelled) {
        setProducts(p);
        setIsLoading(false);
      }
    });

    // Fetch bundles
    fetchActiveBundles().then(({ bundles: b }) => {
      if (!cancelled) {
        setBundles(b);
      }
    });

    // Fetch courses from DB
    getCoursesList().then((data) => {
      if (!cancelled) {
        setCoursesList(data.filter(c => c.status === "published"));
      }
    });

    // Fetch reviews
    fetch("/api/admin/reviews")
      .then(res => res.json())
      .then(data => {
        if (!cancelled && Array.isArray(data)) {
          setAllReviews(data);
        }
      })
      .catch(() => {});

    // Fetch stats
    fetch("/api/stats")
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {});

    // Fetch course categories from Supabase (dynamic)
    supabaseClient
      .from("course_categories")
      .select("name")
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data && data.length > 0) {
          setDynamicCourseCategories(data.map((c: {name: string}) => c.name));
        }
      });

    // Fetch product categories from Supabase (dynamic)
    supabaseClient
      .from("product_categories")
      .select("name")
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data && data.length > 0) {
          setDynamicProductCategories(data.map((c: {name: string}) => c.name));
        }
      });

    return () => { cancelled = true; };
  }, []);

  // Course categories filter list — dynamic from Supabase, fallback to static
  const courseCategories = [
    "الكل",
    ...(dynamicCourseCategories.length > 0
      ? dynamicCourseCategories
      : ["دورات الأتمتة", "دورات صناعة المحتوى", "الدورات المجانية"])
  ];

  // Digital product categories filter list
  const productCategories = [
    "الكل",
    ...(dynamicProductCategories.length > 0
      ? dynamicProductCategories
      : ["الأتمتة", "الذكاء الاصطناعي", "صناعة المحتوى"])
  ];

  // Smart product categorizer
  const getProductCategory = (product: Product) => {
    const categoryField = product.category || "";
    
    // Prioritize exact match from dynamic categories fetched from DB
    if (dynamicProductCategories.includes(categoryField)) {
      return categoryField;
    }

    if (categoryField === "الأتمتة" || categoryField === "الذكاء الاصطناعي" || categoryField === "صناعة المحتوى") {
      return categoryField;
    }
    
    // Fallback/Legacy mapping based on category value or tags
    const title = (product.title || "").toLowerCase();
    const desc = (product.description || "").toLowerCase();
    const tags = (product.tags || []).map(t => t.toLowerCase());
    
    if (categoryField.includes("n8n") || tags.includes("n8n") || title.includes("n8n") || desc.includes("n8n") || categoryField.includes("أتمتة") || categoryField.includes("productivity") || categoryField.includes("إنتاجية")) {
      return "الأتمتة";
    }
    if (categoryField.includes("ai") || categoryField.includes("ذكاء") || tags.includes("ai") || tags.includes("ذكاء") || title.includes("ai") || title.includes("ذكاء") || desc.includes("ai") || desc.includes("ذكاء")) {
      return "الذكاء الاصطناعي";
    }
    if (categoryField.includes("content") || categoryField.includes("صناعة") || categoryField.includes("ميديا") || categoryField.includes("سوشيال") || tags.includes("social") || tags.includes("ميديا") || title.includes("content") || desc.includes("content")) {
      return "صناعة المحتوى";
    }
    
    return "الأتمتة"; // Default fallback
  };

  // Filter computations
  const filteredCourses = coursesList.filter((course) => {
    if (activeCourseCategory === "الكل") return true;
    if (activeCourseCategory === "الدورات المجانية") return course.is_free || course.price === 0;
    // Direct match against DB category field
    if (course.category === activeCourseCategory) return true;
    // Legacy mappings for older DB values
    const legacyMap: Record<string, string[]> = {
      "دورات الأتمتة": ["الأتمتة", "أتمتة"],
      "دورات صناعة المحتوى": ["صناعة المحتوى", "المحتوى"],
      "دورات الذكاء الاصطناعي": ["الذكاء الاصطناعي", "AI"],
      "دورات التسويق": ["التسويق", "marketing"],
    };
    const aliases = legacyMap[activeCourseCategory] || [];
    return aliases.some(alias => course.category === alias || course.category?.toLowerCase().includes(alias.toLowerCase()));
  });

  const filteredProducts = products.filter((product) => {
    if (activeProductCategory === "الكل") return true;
    const cat = getProductCategory(product);
    return cat === activeProductCategory;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-16">
        
        {/* ── 1. HERO SECTION (Cinematic Premium) ────────────────────────────────── */}
        <section className="relative min-h-[90vh] md:min-h-[95vh] flex items-center justify-center overflow-hidden pt-12 pb-12 md:pt-24 md:pb-24">
          <div className="absolute inset-0 w-full h-full pointer-events-none bg-[#050505]">
            <div className="absolute inset-0 w-full h-full bg-grid-lines mask-radial-faded opacity-60 md:opacity-100"></div>
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
                <span className="font-cairo text-[10px] md:text-sm font-bold text-rose-300 tracking-wide">أكاديمية ودورات وحلول أتمتة حصرية جاهزة للعمل</span>
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
                  يوسف أوتوميتس
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-sm md:text-2xl text-zinc-400 font-cairo max-w-3xl mx-auto mb-8 md:mb-14 leading-relaxed"
              >
                احصل على أرقى <span className="text-white font-bold">الدورات التدريبية</span>، وحزم تدفقات عمل <span className="text-white font-bold">n8n</span> المتكاملة، وتطبيقات الذكاء الاصطناعي لتوفير مئات الساعات في أعمالك.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6"
              >
                <Link
                  href="#courses"
                  className="group relative h-12 md:h-20 px-6 md:px-12 inline-flex items-center justify-center gap-2 md:gap-3 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-[1.25rem] md:rounded-2xl font-cairo text-base md:text-xl font-bold shadow-[0_0_30px_rgba(214,0,75,0.3)] hover:shadow-[0_0_60px_rgba(214,0,75,0.6)] transition-all hover:-translate-y-1 active:scale-95 w-full md:w-auto cursor-pointer"
                >
                  <span className="relative z-10">تصفح الأكاديمية والمنتجات</span>
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

        {/* ── Value Props / Social Proof ────────────────────────────────────────── */}
        <section className="hidden md:block border-y border-white/5 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent py-12 md:py-24 relative overflow-hidden">
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
                  <div className="absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#D6004B]/10 to-transparent rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-[#D6004B] group-hover:bg-[#D6004B]/10 group-hover:border-[#D6004B]/20 shadow-[0_0_20px_rgba(0,0,0,0.2)] group-hover:shadow-[0_0_30px_rgba(214,0,75,0.25)] transition-all duration-500 mb-3 md:mb-6 group-hover:scale-110">
                    <stat.icon className="w-5 h-5 md:w-6 md:h-6 transform transition-transform duration-500 group-hover:rotate-6" />
                  </div>
                  <p className="text-xl md:text-4xl font-alexandria font-black text-white tracking-tight mb-1 md:mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-rose-200 transition-all duration-300">
                    {stat.number}
                  </p>
                  <p className="text-white font-cairo text-xs md:text-base font-bold mb-0.5 md:mb-1 transition-colors duration-300 group-hover:text-[#D6004B]">
                    {stat.label}
                  </p>
                  <p className="text-zinc-500 font-cairo text-[9px] md:text-xs leading-relaxed group-hover:text-zinc-400 transition-colors duration-300 hidden sm:block">
                    {stat.subLabel}
                  </p>
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. قسم الدورات التعليمية (COURSES SECTION) ──────────────────────────────── */}
        <section id="courses" className="py-16 md:py-32 relative border-b border-white/5">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-10 md:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-cairo text-xs md:text-sm font-bold mb-4 border border-rose-500/20"
              >
                <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" />
                الأكاديمية التعليمية المتميزة
              </motion.div>
              <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 md:mb-6 tracking-tight">دورات الأتمتة والذكاء الاصطناعي</h2>
              <p className="text-zinc-400 font-cairo text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                انتقل من المبتدئ إلى الاحتراف المطلق ببناء وكلاء ذكاء اصطناعي وتدفقات عمل متكاملة لحل مشاكل عملك وعملائك.
              </p>
            </div>

            {/* Courses Filters tabs list */}
            <div className="mb-10 flex items-center justify-start md:justify-center overflow-x-auto pb-4 gap-2 scrollbar-none snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {courseCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCourseCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-full font-cairo text-xs md:text-sm font-bold transition-all duration-300 shrink-0 select-none cursor-pointer border snap-align-start",
                    activeCourseCategory === cat
                      ? "bg-[#D6004B] text-white border-[#D6004B] shadow-[0_4px_15px_rgba(214,0,75,0.3)] scale-105"
                      : "bg-white/5 text-zinc-400 border-white/5 hover:border-white/10 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Courses Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredCourses.map((course) => {
                const courseReviews = allReviews.filter((r: any) => r.productId === course.id && !r.isHidden);
                const reviewsCount = courseReviews.length;
                const averageRating = reviewsCount > 0 
                  ? (courseReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviewsCount).toFixed(1)
                  : "5.0";
                return (
                  <div
                    key={course.slug}
                    className="group bg-[#09090e] border border-[#1b1b24]/60 hover:border-[#D6004B]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 h-full relative cursor-pointer"
                    onClick={() => router.push(`/courses/${course.slug}`)}
                  >
                    {/* Visual header */}
                    <div className="relative h-48 bg-zinc-950 overflow-hidden flex items-center justify-center border-b border-white/5">
                      {course.image_url ? (
                        <img src={course.image_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:scale-102 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35"></div>
                      )}

                      {/* Wishlist Heart Button */}
                      <div className="absolute top-4 right-4 z-30">
                        <WishlistButton itemId={course.id} itemType="course" size={16} />
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#FF7A00]" />
                              <span>{course.duration_hours} ساعة</span>
                            </div>
                            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                              <BookOpen className="w-3.5 h-3.5 text-[#D6004B]" />
                              <span>{course.lessons_count} محاضرة</span>
                            </div>

                            {course.category && (
                              <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                                <Layers className="w-3.5 h-3.5 text-[#D6004B]" />
                                <span>{course.category}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-white text-xs">{averageRating}</span>
                            <span className="text-zinc-500 font-normal text-[9px]">({reviewsCount})</span>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-alexandria font-bold text-white leading-snug group-hover:text-[#D6004B] transition-colors line-clamp-2">
                          {course.title}
                        </h3>

                        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
                          {stripHtml(course.short_description || course.description)}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          {course.original_price > 0 && (
                            <span className="text-[10px] text-zinc-500 line-through mb-0.5">
                              {course.original_price} ج.م
                            </span>
                          )}
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xl font-alexandria font-black text-[#D6004B]">
                              {course.price === 0 ? "مجاني" : `${course.price} ج.م`}
                            </span>
                          </div>
                        </div>

                        <div className="h-10 px-4 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(214,0,75,0.15)] group-hover:scale-[1.02] active:scale-98 shrink-0">
                          <span>احصل على الكورس</span>
                          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 2.5. قسم حزم العروض المميزة (BUNDLES SECTION) ───────────────────────────── */}
        {bundles.length > 0 && (
          <section id="bundles" className="py-16 md:py-32 relative border-b border-white/5 bg-white/[0.01]">
            <div className="absolute inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-20"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-purple-600/5 rounded-full blur-[80px]" />
            </div>

            <div className="container relative z-10 mx-auto px-4 max-w-7xl">
              <div className="text-center mb-10 md:mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-cairo text-xs md:text-sm font-bold mb-4 border border-purple-500/20"
                >
                  <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                  عروض التوفير الكبرى والحلول المتكاملة
                </motion.div>
                <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 md:mb-6 tracking-tight">حزم العروض المميزة</h2>
                <p className="text-zinc-400 font-cairo text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                  وفر أكثر من 60% مع حزم العروض الكبرى التي تجمع بين الأقسام التدريبية التطبيقية والأدوات الجاهزة للتثبيت المباشر.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {bundles.map((bundle) => {
                  const coursesCount = bundle.items.filter(it => it.item_type === "course").length;
                  const productsCount = bundle.items.filter(it => it.item_type === "digital_product").length;

                  return (
                    <motion.div
                      key={bundle.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="group bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300 h-full relative cursor-pointer"
                      onClick={() => router.push(`/bundles/${bundle.slug}`)}
                    >
                      {/* Visual header */}
                      <div className="relative h-48 bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-white/5">
                        {bundle.banner_url || bundle.image_url ? (
                          <img src={bundle.banner_url || bundle.image_url} alt={bundle.title} className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35"></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent"></div>
                        <div className="absolute w-24 h-24 bg-purple-600/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
                        
                        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                          <Badge className="bg-purple-600 text-white border-none font-cairo text-[9px] py-0.5 px-2.5 rounded shadow-lg uppercase tracking-wider font-black">
                            حزمة سوبر
                          </Badge>
                        </div>

                        {/* Wishlist Heart Button */}
                        <div className="absolute top-4 right-4 z-30">
                          <WishlistButton itemId={bundle.id} itemType="bundle" size={16} />
                        </div>

                        {/* Save Discount Percentage Badge */}
                        {bundle.discount_pct && bundle.discount_pct > 0 ? (
                          <div className="absolute bottom-3 left-4 z-20">
                            <span className="text-[9px] font-black bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-400">
                              وفر {bundle.discount_pct}% بالكامل
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Content area */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold">
                            {coursesCount > 0 && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                                {coursesCount} دورات
                              </span>
                            )}
                            {productsCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Download className="w-3.5 h-3.5 text-rose-400" />
                                {productsCount} أدوات رقمية
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-yellow-400">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>5.0</span>
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-alexandria font-bold text-white leading-snug group-hover:text-purple-400 transition-colors line-clamp-2">
                            {bundle.title}
                          </h3>

                          <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
                            {bundle.short_description || bundle.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                          <div className="flex flex-col">
                            {bundle.original_price && bundle.original_price > 0 && (
                              <span className="text-[9px] text-zinc-500 line-through mb-0.5 font-mono">
                                ${bundle.original_price}
                              </span>
                            )}
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-2xl font-alexandria font-black text-white font-mono">
                                ${bundle.price}
                              </span>
                              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-black mr-1">USD</span>
                            </div>
                          </div>

                          <div className="h-10 px-4 bg-white/5 hover:bg-purple-600 border border-white/5 hover:border-purple-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0">
                            <span>عرض العرض</span>
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── 3. قسم المنتجات الرقمية (DIGITAL PRODUCTS SECTION) ────────────────────────── */}
        <section id="products" className="py-16 md:py-32 relative">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-10 md:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-cairo text-xs md:text-sm font-bold mb-4 border border-rose-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" />
                متجر المنتجات الرقمية والحزم الحصرية
              </motion.div>
              <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 md:mb-6 tracking-tight">مكتبة المنتجات الرقمية</h2>
              <p className="text-zinc-400 font-cairo text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                استثمر في حزم وتدفقات جاهزة تضمن توفير مئات ساعات العمل الفنية والشفرات البرمجية. اختر ما يناسب مشروعك الآن.
              </p>
            </div>

            {/* Products Filters tabs list */}
            <div className="mb-10 flex items-center justify-start md:justify-center overflow-x-auto pb-4 gap-2 scrollbar-none snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {productCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveProductCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-full font-cairo text-xs md:text-sm font-bold transition-all duration-300 shrink-0 select-none cursor-pointer border snap-align-start",
                    activeProductCategory === cat
                      ? "bg-[#D6004B] text-white border-[#D6004B] shadow-[0_0_20px_rgba(214,0,75,0.45)] scale-105"
                      : "bg-[#0c0c14] text-zinc-400 border-white/5 hover:border-[#D6004B]/30 hover:text-white hover:shadow-[0_0_15px_rgba(214,0,75,0.15)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="relative h-[450px] rounded-[2rem] bg-[#0a0a0f] border border-white/5 overflow-hidden p-6 flex flex-col justify-between animate-pulse">
                    <div className="h-48 bg-white/5 rounded-2xl mb-4 w-full" />
                    <div className="space-y-3">
                      <div className="h-4 bg-white/5 rounded-md w-1/3" />
                      <div className="h-6 bg-white/5 rounded-md w-3/4" />
                      <div className="h-4 bg-white/5 rounded-md w-full" />
                      <div className="h-4 bg-white/5 rounded-md w-5/6" />
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div className="h-8 bg-white/5 rounded-md w-1/4" />
                      <div className="h-10 bg-white/5 rounded-xl w-1/3" />
                    </div>
                  </div>
                ))
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-16 md:py-20">
                  <Package className="w-12 h-12 md:w-16 md:h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-cairo text-lg md:text-xl">لا توجد منتجات متطابقة في هذا التصنيف حالياً.</p>
                </div>
              ) : (
                filteredProducts.map((product: any, idx: number) => {
                  const unpacked = unpackProduct(product);
                  const primaryVideo = unpacked.slides.find((s: any) => s.type === 'video')?.url;
                  const primaryImage = unpacked.slides.find((s: any) => s.type === 'image')?.url || product.image_url;
                  const isFree = product.price === 0;

                  return (
                    <div 
                      key={product.id}
                      className="group h-full"
                    >
                      <div 
                        onClick={() => router.push(`/product/${product.slug}`)}
                        onMouseEnter={() => setHoveredId(product.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="block relative h-full flex flex-col bg-[#09090e] border border-[#1b1b24]/60 hover:border-[#D6004B]/40 rounded-[2rem] overflow-hidden group-hover:-translate-y-1 transition-all duration-300 shadow-2xl hover:shadow-[0_20px_40px_-12px_rgba(214,0,75,0.15)] cursor-pointer"
                      >
                        {/* Media Area */}
                        <div className="relative w-full aspect-video overflow-hidden border-b border-white/5">
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
                              <Badge className="bg-emerald-600 text-white border-none font-cairo text-[9px] md:text-[10px] py-0.5 px-2.5 shadow-lg rounded-md font-bold">هدية مجانية</Badge>
                            ) : product.is_featured ? (
                              <Badge className="bg-[#D6004B] text-white border-none font-cairo text-[9px] md:text-[10px] py-0.5 px-2.5 shadow-lg rounded-md font-bold">الأكثر مبيعاً</Badge>
                            ) : null}
                          </div>

                          {/* Category Badge */}
                          <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
                            <span className="bg-[#D6004B]/15 text-[#D6004B] border border-[#D6004B]/30 font-cairo text-[9px] md:text-[10px] font-black py-1 px-3 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(214,0,75,0.2)] tracking-wide">
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
                            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                              <Zap className="w-2.5 h-2.5 text-rose-400" />
                              <span className="text-[9px] font-bold text-white uppercase tracking-widest">تنزيل فوري</span>
                            </div>
                          </div>

                          <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mb-2 leading-snug group-hover:text-[#D6004B] transition-colors line-clamp-2">
                            {product.title}
                          </h3>
                          
                          <p className="text-zinc-400 font-cairo text-xs mb-6 leading-relaxed line-clamp-2">
                            {product.short_description || product.description || "أداة احترافية مصممة لزيادة إنتاجيتك بشكل فوري."}
                          </p>

                          <div className="mt-auto flex items-end justify-between">
                            <div className="flex flex-col">
                              {product.original_price && (
                                <span className="text-[9px] font-cairo line-through text-zinc-500 mb-0.5">
                                  {product.original_price} ج.م
                                </span>
                              )}
                              <div className="flex items-baseline gap-0.5">
                                {isFree ? (
                                  <span className="text-2xl font-alexandria font-black text-emerald-400">مجاني</span>
                                ) : (
                                  <>
                                    <span className="text-2xl font-alexandria font-black text-white">{product.price}</span>
                                    <span className="text-[10px] font-cairo text-zinc-400">ج.م</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                  toast.success("تمت الإضافة للسلة");
                                }}
                                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-[#D6004B] hover:border-[#D6004B] hover:shadow-[0_0_15px_rgba(214,0,75,0.4)] transition-all duration-300"
                                title="إضافة إلى السلة"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                              <div className="h-10 px-4 rounded-xl bg-[#D6004B] flex items-center justify-center text-white font-bold text-xs gap-1.5 shadow-lg shadow-rose-600/30 group-hover:bg-rose-600 group-hover:shadow-[0_0_20px_rgba(214,0,75,0.5)] transition-all duration-300">
                                <span>شراء الآن</span>
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ── 4. قسم آراء العملاء (REVIEWS SECTION) ──────────────────────────────── */}
        <ReviewsMarquee />

        {/* ── 5. قسم الأسئلة الشائعة (FAQ SECTION) ────────────────────────────────── */}
        <FAQSection />

      </main>



      <Footer />
    </div>
  );
}
