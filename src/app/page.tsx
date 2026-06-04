"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Shield, Clock, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
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
import { CertificateSection } from "@/components/CertificateSection";
import { ContactSection } from "@/components/ContactSection";
import { ProductMedia } from "@/components/ProductMedia";
import { getCoursesList, type LmsCourse } from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";
import WishlistButton from "@/components/WishlistButton";
import { fetchActiveBundles, type HydratedBundle } from "@/lib/bundles";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";

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

// ── Helper: Match Product to Course Category ───────────────────────────────────────
function isProductMatchingCourseCategory(product: any, courseCategory: string): boolean {
  if (!courseCategory || courseCategory === "الكل" || courseCategory === "الدورات المجانية") {
    return false;
  }
  
  const courseCatLower = courseCategory.toLowerCase();
  const productCat = (product.category || "").toLowerCase();
  const productTitle = (product.title || "").toLowerCase();
  const productDesc = (product.description || "").toLowerCase();
  const productTags = (product.tags || []).map((t: string) => t.toLowerCase());

  // 1. Direct match or substring match on product category
  if (productCat === courseCatLower) return true;
  if (courseCatLower.includes(productCat) || productCat.includes(courseCatLower)) return true;

  // 2. Keyword-based matching
  const hasKeyword = (keywords: string[]) => {
    return keywords.some(kw => 
      productCat.includes(kw) || 
      productTitle.includes(kw) || 
      productDesc.includes(kw) || 
      productTags.some((t: string) => t.includes(kw))
    );
  };

  // Case A: AI / الذكاء الاصطناعي
  if (courseCatLower.includes("ذكاء") || courseCatLower.includes("ai")) {
    return hasKeyword(["ذكاء", "ai", "artificial", "tpt", "توليدي", "generation"]);
  }

  // Case B: Automation / الأتمتة
  if (courseCatLower.includes("أتمتة") || courseCatLower.includes("automation") || courseCatLower.includes("n8n")) {
    return hasKeyword(["أتمتة", "automation", "n8n", "productivity", "إنتاجية", "سير العمل"]);
  }

  // Case C: Animation / الرسوم المتحركة
  if (courseCatLower.includes("رسوم") || courseCatLower.includes("متحركة") || courseCatLower.includes("animation")) {
    return hasKeyword(["رسوم", "متحركة", "تحريك", "animation", "motion"]);
  }

  // Case D: Content Creation / صناعة المحتوى
  if (courseCatLower.includes("محتوى") || courseCatLower.includes("content") || courseCatLower.includes("فيديو") || courseCatLower.includes("video")) {
    return hasKeyword(["محتوى", "content", "سوشيال", "فيديو", "video", "صناعة"]);
  }

  return false;
}

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { duration: 0.01 }
  }
};

const cardVariants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.01 }
  }
};

export default function Home() {
  const router = useRouter();
  const { addToCart } = useCart();

  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

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

  const [showAllCoursesMobile, setShowAllCoursesMobile] = useState(false);
  const [showAllProductsMobile, setShowAllProductsMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch initial data
  useEffect(() => {
    let cancelled = false;
    
    // Fetch products
    fetchActiveProducts({ limit: 50 }).then(({ products: p }) => {
      console.log("[HOMEPAGE DEBUG] Fetched products:", p);
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
      console.log("[HOMEPAGE DEBUG] Fetched courses:", data);
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
      : ["دورات صناعة المحتوى", "دورات الرسوم المتحركة", "الدورات المجانية"])
  ];

  // Digital product categories filter list
  const productCategories = [
    "الكل",
    ...(dynamicProductCategories.length > 0
      ? dynamicProductCategories
      : ["صناعة المحتوى البصري", "الذكاء الاصطناعي التوليدي", "الرسوم المتحركة"])
  ];

  // Smart product categorizer
  const getProductCategory = (product: Product) => {
    const categoryField = product.category || "";
    
    // Prioritize exact match from dynamic categories fetched from DB
    if (dynamicProductCategories.includes(categoryField)) {
      return categoryField;
    }

    if (categoryField === "صناعة المحتوى البصري" || categoryField === "الذكاء الاصطناعي التوليدي" || categoryField === "الرسوم المتحركة") {
      return categoryField;
    }
    
    // Fallback/Legacy mapping based on category value or tags
    const title = (product.title || "").toLowerCase();
    const desc = (product.description || "").toLowerCase();
    const tags = (product.tags || []).map(t => t.toLowerCase());
    
    if (categoryField.includes("n8n") || tags.includes("n8n") || title.includes("n8n") || desc.includes("n8n") || categoryField.includes("أتمتة") || categoryField.includes("productivity") || categoryField.includes("إنتاجية") || categoryField.includes("automation") || categoryField.includes("فيديو") || categoryField.includes("video") || title.includes("فيديو")) {
      return "صناعة المحتوى البصري";
    }
    if (categoryField.includes("ai") || categoryField.includes("ذكاء") || tags.includes("ai") || tags.includes("ذكاء") || title.includes("ai") || title.includes("ذكاء") || desc.includes("ai") || desc.includes("ذكاء")) {
      return "الذكاء الاصطناعي";
    }
    if (categoryField.includes("content") || categoryField.includes("صناعة") || categoryField.includes("ميديا") || categoryField.includes("سوشيال") || tags.includes("social") || tags.includes("ميديا") || title.includes("content") || desc.includes("content")) {
      return "صناعة المحتوى";
    }
    
    return "صناعة المحتوى البصري"; // Default fallback
  };

  // Filter computations
  const filteredCourses = coursesList.filter((course) => {
    if (activeCourseCategory === "الكل") return true;
    if (activeCourseCategory === "الدورات المجانية") return course.is_free || course.price === 0;
    // Direct match against DB category field
    if (course.category === activeCourseCategory) return true;
    // Legacy mappings for older DB values
    const legacyMap: Record<string, string[]> = {
      "دورات صناعة المحتوى": ["صناعة المحتوى", "المحتوى", "الأتمتة", "أتمتة"],
      "دورات الرسوم المتحركة": ["الرسوم المتحركة", "تحريك", "الذكاء الاصطناعي", "AI"],
      "الذكاء الاصطناعي التوليدي": ["الذكاء الاصطناعي التوليدي", "الذكاء الاصطناعي", "AI"],
    };
    const aliases = legacyMap[activeCourseCategory] || [];
    return aliases.some(alias => course.category === alias || course.category?.toLowerCase().includes(alias.toLowerCase()));
  });

  const filteredProducts = products.filter((product) => {
    if (activeProductCategory === "الكل") return true;
    const cat = getProductCategory(product);
    return cat === activeProductCategory;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => (b.sales || 0) - (a.sales || 0));
  const sortedProducts = [...filteredProducts].sort((a, b) => (b.sales || 0) - (a.sales || 0));

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-16">
        
        {/* ── 1. HERO SECTION (Cinematic Premium) ────────────────────────────────── */}
        <section className="relative min-h-0 md:min-h-[85vh] flex items-center justify-center overflow-hidden pt-24 pb-12 md:pt-28 md:pb-24">
          <div className="absolute inset-0 w-full h-full pointer-events-none bg-[#050505]">
            <div className="absolute inset-0 w-full h-full bg-grid-lines mask-radial-faded opacity-60 md:opacity-100"></div>
            {/* Ambient Blob 1: Rose (Center-Top) */}
            <motion.div 
              animate={{ 
                x: ["-50%", "-48%", "-52%", "-50%"],
                y: [0, -15, 15, 0],
                scale: [1, 1.04, 0.96, 1],
                opacity: [0.35, 0.45, 0.38, 0.35]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] md:w-[800px] h-[300px] sm:h-[600px] md:h-[800px] bg-rose-500/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen" 
            />
            {/* Ambient Blob 2: Purple (Left-Center) */}
            <motion.div 
              animate={{ 
                x: [-30, 15, -10, -30],
                y: [-40, 30, -15, -40],
                scale: [0.95, 1.05, 0.98, 0.95],
                opacity: [0.15, 0.22, 0.18, 0.15]
              }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[20%] left-[10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-purple-600/15 rounded-full blur-[60px] md:blur-[100px] mix-blend-screen" 
            />
            {/* Ambient Blob 3: Pink-Orange (Right-Center) */}
            <motion.div 
              animate={{ 
                x: [20, -20, 10, 20],
                y: [30, -30, 15, 30],
                scale: [1.05, 0.95, 1.02, 1.05],
                opacity: [0.15, 0.22, 0.18, 0.15]
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] right-[10%] w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-pink-500/10 rounded-full blur-[70px] md:blur-[110px] mix-blend-screen" 
            />
          </div>
          
          <div className="container relative mx-auto px-4 z-10">
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(239,0,85,0.3)" }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 bg-rose-950/20 backdrop-blur-xl border border-rose-500/20 px-4 py-2 rounded-full mb-5 md:mb-8 shadow-[0_0_20px_rgba(239,0,85,0.15)] select-none hover:border-rose-500/40 transition-all duration-300 cursor-pointer"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="font-space-grotesk text-[11px] md:text-xs font-bold text-rose-300 tracking-widest uppercase">WELCOME TO JOESCHOOL - UP TO 50% OFF</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="mb-5 md:mb-10 px-4"
              >
                <h1 className="text-[30px] xs:text-[36px] sm:text-5xl md:text-6xl lg:text-[75px] xl:text-[85px] font-pixel font-bold text-white leading-[1.3] md:leading-tight tracking-normal flex flex-col items-center mb-2 uppercase text-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] select-none" dir="ltr">
                  <span className="whitespace-nowrap">The Future Of AI Content</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0f53] via-[#ff2d6b] to-[#ff00b3] bg-[length:200%_auto] animate-text-gradient drop-shadow-[0_0_30px_rgba(255,15,83,0.4)] whitespace-nowrap">Starts Here!</span>
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-sm sm:text-base md:text-lg lg:text-xl text-zinc-400 font-space-grotesk max-w-3xl mx-auto mb-6 md:mb-12 leading-relaxed text-center" dir="ltr"
              >
                Master AI content creation, cinematic videos, and next-generation creative tools with JoeSchool.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col md:flex-row items-center justify-center gap-5 md:gap-8"
              >
                <Link
                  href="#courses"
                  className="group relative h-14 md:h-20 px-8 md:px-12 inline-flex items-center justify-center gap-2.5 md:gap-3 bg-[#D6004B] hover:bg-[#ff0055] text-white rounded-2xl font-space-grotesk text-sm md:text-lg font-bold shadow-[0_0_35px_rgba(214,0,75,0.4)] hover:shadow-[0_0_60px_rgba(214,0,75,0.7)] transition-all duration-300 hover:-translate-y-1 active:scale-95 w-full md:w-auto cursor-pointer"
                >
                  <span className="relative z-10 tracking-wide">Explore Courses & Digital Products</span>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                </Link>
                
                <div className="flex items-center justify-between md:justify-start gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 md:p-4.5 md:pr-6 w-full md:w-auto shadow-2xl hover:border-white/20 transition-all duration-300">
                  <div className="flex -space-x-2 md:-space-x-3 rtl:space-x-reverse ml-2 md:ml-0">
                    {["felix","sara","mia","alex"].map(seed => (
                      <div key={seed} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-[#050505] bg-zinc-800 overflow-hidden shadow-inner">
                        <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`} alt="customer" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-start border-r border-white/10 pr-3 md:pr-5 flex-1 md:flex-none">
                    <div className="flex text-amber-400 mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <span className="font-space-grotesk text-[10px] md:text-xs text-zinc-400 font-bold tracking-wider">Trusted by <span className="text-white">500+ AI Creators</span></span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          {/* Subtle Bottom Section Divider */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* ── 2. قسم الدورات التعليمية (COURSES SECTION) ──────────────────────────────── */}
        <section id="courses" className="py-16 md:py-32 relative">
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
              <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 md:mb-6 tracking-tight">دورات صناعة المحتوى والذكاء الاصطناعي</h2>
              <p className="text-zinc-400 font-cairo text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                انطلق نحو الاحتراف بإنتاج الفيديو، الرسوم المتحركة، وسرد قصص جذابة باستخدام أقوى أدوات الذكاء الاصطناعي التوليدي.
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
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            >
              {sortedCourses.slice(0, 3).map((course, idx) => {
                const courseReviews = allReviews.filter((r: any) => r.productId === course.id && !r.isHidden);
                const reviewsCount = courseReviews.length;
                const averageRating = reviewsCount > 0 
                  ? (courseReviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviewsCount).toFixed(1)
                  : "5.0";
                
                const coursePricing = resolveProductPrice(course as any, currency);

                return (
                  <motion.div
                    key={course.slug}
                    variants={cardVariants}
                    whileHover={{ y: -8, scale: 1.015, boxShadow: "0 25px 50px -12px rgba(214,0,75,0.25)" }}
                    className="group bg-gradient-to-b from-[#0e0e16] to-[#07070c] border border-white/5 hover:border-[#D6004B]/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 h-full relative cursor-pointer hover:shadow-[0_30px_60px_-15px_rgba(214,0,75,0.25)]"
                    onClick={() => router.push(`/courses/${course.slug}`)}
                  >
                    {/* Glow Light Sweep Shimmer Effect */}
                    <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none z-10" />
                    {/* Course Card Top Banner */}
                    <div className="relative h-48 bg-zinc-950 overflow-hidden border-b border-white/5">
                      {course.image_url && (
                        <img 
                          src={course.image_url} 
                          alt={course.title} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-112 transition-transform duration-700 ease-out"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-transparent to-black/30" />
                      
                      {/* Left Badge (Category) */}
                      <div className="absolute top-4 left-4 z-20">
                        <span className="bg-black/50 backdrop-blur-md text-white border border-white/10 font-cairo text-[9px] font-bold py-1 px-3 rounded-lg shadow-lg">
                          {course.category}
                        </span>
                      </div>

                      {/* Discount Badge on Image */}
                      {coursePricing && coursePricing.original_price > coursePricing.price && (
                        <div className="absolute bottom-3 right-3 z-20">
                          <span className="bg-emerald-500 text-white font-black text-[9px] font-alexandria py-1 px-2.5 rounded-lg shadow-md animate-pulse">
                            وفر {coursePricing.discount_pct}%
                          </span>
                        </div>
                      )}

                      {/* Right Wishlist Button */}
                      <div className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md rounded-lg p-1.5 border border-white/10 hover:bg-black/60 transition-colors">
                        <WishlistButton itemId={course.id} itemType="course" size={16} />
                      </div>
                    </div>

                    {/* Course Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Info Bar */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-[#D6004B]" />
                              {course.lessons_count || 0} دروس
                            </span>
                            <span className="flex items-center gap-1 border-r border-white/10 pr-3">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              {course.duration_hours || 0} ساعة
                            </span>
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

                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        {/* Price Display */}
                        <div className="flex flex-col">
                          {coursePricing.original_price > coursePricing.price && (
                            <span className="text-[10px] text-zinc-500 line-through mb-0.5 font-alexandria">
                              {formatPrice(coursePricing.original_price, currency)}
                            </span>
                          )}
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-lg sm:text-xl font-alexandria font-black text-white">
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
                                ...course,
                                price: coursePricing.price,
                                original_price: coursePricing.original_price,
                                category: course.category || "courses"
                              } as any);
                              toast.success("تم إضافة الكورس للسلة بنجاح");
                            }}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-[#D6004B] hover:border-[#D6004B] hover:shadow-[0_0_15px_rgba(214,0,75,0.4)] transition-all shrink-0 group/cart duration-300"
                          >
                            <ShoppingCart className="w-4 h-4 group-hover/cart:scale-110 transition-transform" />
                          </button>
                          <div className="h-10 px-4 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(214,0,75,0.15)] group-hover:scale-[1.02] group-hover:shadow-[0_0_20px_rgba(214,0,75,0.4)] active:scale-98 shrink-0 duration-300">
                            <span>احصل على الكورس</span>
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* All Courses CTA Button */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/courses"
                className="group h-12 md:h-14 px-8 inline-flex items-center justify-center gap-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-cairo text-sm font-bold shadow-lg transition-all hover:bg-[#D6004B] hover:border-[#D6004B] hover:shadow-[0_0_25px_rgba(214,0,75,0.45)] hover:-translate-y-0.5 active:scale-98"
              >
                <span>جميع الدورات</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
              </Link>
            </div>
          </div>
          {/* Subtle Bottom Section Divider */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* ── 2.5. قسم حزم العروض المميزة (BUNDLES SECTION) ───────────────────────────── */}
        {bundles.length > 0 && (
          <section id="bundles" className="py-16 md:py-32 relative bg-white/[0.01]">
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

              <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
              >
                {bundles.map((bundle) => {
                  const coursesCount = bundle.items.filter(it => it.item_type === "course").length;
                  const productsCount = bundle.items.filter(it => it.item_type === "digital_product").length;
                  const bundlePricing = resolveProductPrice(bundle as any, currency);

                  return (
                    <motion.div
                      key={bundle.id}
                      variants={cardVariants}
                      whileHover={{ y: -8, scale: 1.015, boxShadow: "0 25px 50px -12px rgba(147,51,234,0.2)" }}
                      className="group bg-[#0a0a0f] border border-white/5 hover:border-purple-500/30 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 h-full relative cursor-pointer"
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
                            {bundlePricing.original_price > 0 && (
                              <span className="text-[9px] text-zinc-500 line-through mb-0.5">
                                {formatPrice(bundlePricing.original_price, currency)}
                              </span>
                            )}
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-2xl font-alexandria font-black text-white">
                                {formatPrice(bundlePricing.price, currency)}
                              </span>
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
              </motion.div>
            </div>
            {/* Subtle Bottom Section Divider */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
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
                متجر المنتجات الرقمية
              </motion.div>
              <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 md:mb-6 tracking-tight">مكتبة المنتجات الرقمية</h2>
              <p className="text-zinc-400 font-cairo text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
                استكشف مجموعتنا المتنوعة من المنتجات الرقمية المميزة والمصممة لمساعدتك في مشروعك الإبداعي والمهني.
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
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            >
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
                sortedProducts
                  .slice(0, 3)
                  .map((product: any, idx: number) => {
                    const unpacked = unpackProduct(product);
                    const primaryVideo = unpacked.slides.find((s: any) => s.type === 'video')?.url;
                    const primaryImage = unpacked.slides.find((s: any) => s.type === 'image')?.url || product.image_url;
                    const productPricing = resolveProductPrice(product, currency);
                    const isFree = productPricing.price === 0;

                    return (
                      <motion.div 
                        key={product.id}
                        initial={{ opacity: 1, y: 0 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.01 }}
                        className="group h-full"
                      >
                        <div 
                          onClick={() => router.push(`/product/${product.slug}`)}
                          onMouseEnter={() => setHoveredId(product.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className="block relative h-full flex flex-col bg-[#09090e] border border-[#1b1b24]/60 hover:border-[#D6004B]/50 rounded-[2rem] overflow-hidden group-hover:-translate-y-3 transition-all duration-300 shadow-2xl hover:shadow-[0_30px_60px_-15px_rgba(214,0,75,0.25)] cursor-pointer"
                        >
                          {/* Glow Light Sweep Shimmer Effect */}
                          <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none z-10" />
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
                                {productPricing.original_price && productPricing.original_price > 0 ? (
                                  <span className="text-[9px] font-cairo line-through text-zinc-500 mb-0.5">
                                    {formatPrice(productPricing.original_price, currency)}
                                  </span>
                                ) : null}
                                <div className="flex items-baseline gap-0.5">
                                  {isFree ? (
                                    <span className="text-2xl font-alexandria font-black text-emerald-400">مجاني</span>
                                  ) : (
                                    <span className="text-2xl font-alexandria font-black text-white">
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
                      </motion.div>
                    );
                  })
              )}
            </motion.div>

            {/* All Products CTA Button */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/products"
                className="group h-12 md:h-14 px-8 inline-flex items-center justify-center gap-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-cairo text-sm font-bold shadow-lg transition-all hover:bg-[#D6004B] hover:border-[#D6004B] hover:shadow-[0_0_25px_rgba(214,0,75,0.45)] hover:-translate-y-0.5 active:scale-98"
              >
                <span>جميع المنتجات</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
              </Link>
            </div>
          </div>
          {/* Subtle Bottom Section Divider */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* ── 4. قسم آراء العملاء (REVIEWS SECTION) ──────────────────────────────── */}
        <ReviewsMarquee />

        {/* ── 4.5. قسم شهادة الإتمام والضمان (CERTIFICATE & GUARANTEE SECTION) ─────────────────── */}
        <CertificateSection />

        {/* ── 5. قسم الأسئلة الشائعة (FAQ SECTION) ────────────────────────────────── */}
        <FAQSection />

        {/* ── 6. قسم تواصل معنا (CONTACT SECTION) ────────────────────────────────── */}
        <ContactSection />

      </main>



      <Footer />
    </div>
  );
}
