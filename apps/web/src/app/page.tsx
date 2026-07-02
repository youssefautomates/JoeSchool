"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Shield, Clock, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Sparkles, ShieldCheck, Download, PlayCircle, Play, Star, 
  ArrowLeft, Package, ShoppingCart, BookOpen, Layers, Filter, Users
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

  // State for trust indicator count-up animation
  const [trustStudentCount, setTrustStudentCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = 2000;
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad curve
      const easeProgress = progress * (2 - progress);
      setTrustStudentCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      }
    };

    requestAnimationFrame(animateCount);
  }, []);

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
    ...dynamicProductCategories
  ];

  // Smart product categorizer
  const getProductCategory = (product: Product) => {
    return product.category || "";
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
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-brand-500/10 font-sans overflow-x-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-16">
        
        {/* ── 1. HERO SECTION (Cinematic Premium) ────────────────────────────────── */}
        <section className="relative min-h-0 flex items-center justify-center overflow-hidden pt-14 pb-8 md:pt-16 md:pb-12">
          <div className="absolute inset-0 w-full h-full pointer-events-none bg-white">
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
              className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] md:w-[800px] h-[300px] sm:h-[600px] md:h-[800px] bg-brand-500/10 rounded-full blur-[80px] md:blur-[120px] mix-blend-screen" 
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

          {/* ── 3D FLOATING ECOSYSTEM OBJECTS (Mini Feature Cards & Orbit Rings) ── */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-10">
            
            {/* 1. Mini Course Card (Top Left) */}
            <div className="absolute top-[18%] left-[10%] xl:left-[16%] w-[98px] h-[98px] hidden lg:block animate-float-obj-1 z-20">
              {/* Soft Ambient Glow */}
              <div className="absolute w-[90px] h-[90px] bg-[#2563EB] rounded-full blur-[40px] opacity-[0.08] -z-10 top-[4px] left-[4px] pointer-events-none" />
              
              {/* Orbit Ring */}
              <div className="absolute w-[150px] h-[150px] border border-zinc-200/40 rounded-full -top-[26px] -left-[26px] pointer-events-none animate-[spin_25s_linear_infinite] z-0">
                <div className="absolute w-1.5 h-1.5 bg-[#2563EB] rounded-full top-[10px] left-[50%] -translate-x-1/2 shadow-[0_0_8px_#2563EB]" />
              </div>

              {/* Card Base */}
              <div className="w-[98px] h-[98px] bg-white border border-zinc-200/80 rounded-2xl shadow-[0_8px_24px_rgba(17,24,39,0.04)] p-2.5 flex flex-col items-center justify-center gap-1 z-10 relative cursor-pointer select-none hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-[0_12px_30px_rgba(37,99,235,0.08)] transition-all duration-300 group pointer-events-auto">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto">
                  <defs>
                    <linearGradient id="cBase" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF"/>
                      <stop offset="70%" stopColor="#F1F5F9"/>
                      <stop offset="100%" stopColor="#E2E8F0"/>
                    </linearGradient>
                    <linearGradient id="cEdge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E2E8F0"/>
                      <stop offset="100%" stopColor="#CBD5E1"/>
                    </linearGradient>
                    <linearGradient id="cBlueBtn" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60A5FA"/>
                      <stop offset="40%" stopColor="#2563EB"/>
                      <stop offset="100%" stopColor="#1D4ED8"/>
                    </linearGradient>
                    <filter id="cShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#1E3A8A" floodOpacity="0.15"/>
                    </filter>
                  </defs>
                  <rect x="18" y="24" width="64" height="48" rx="10" fill="url(#cEdge)" />
                  <rect x="18" y="20" width="64" height="48" rx="10" fill="url(#cBase)" />
                  <rect x="24" y="26" width="52" height="24" rx="6" fill="#E2E8F0" opacity="0.6" />
                  <circle cx="50" cy="38" r="12" fill="url(#cBlueBtn)" filter="url(#cShadow)" />
                  <path d="M47 33 L57 38 L47 43 Z" fill="#FFFFFF" />
                  <circle cx="46" cy="34" r="3" fill="#FFFFFF" opacity="0.4" />
                  <rect x="26" y="56" width="32" height="4" rx="2" fill="#94A3B8" />
                  <rect x="26" y="62" width="20" height="4" rx="2" fill="#CBD5E1" />
                  <path d="M20 22 H80" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                </svg>
                <span className="font-sans text-[11px] font-bold text-zinc-800 text-center leading-none">دورة تدريبية</span>
              </div>
            </div>

            {/* 2. Mini Prompt Pack Card (Top Right) */}
            <div className="absolute top-[18%] right-[10%] xl:right-[16%] w-[98px] h-[98px] hidden lg:block animate-float-obj-2 z-20">
              {/* Soft Ambient Glow */}
              <div className="absolute w-[90px] h-[90px] bg-[#2563EB] rounded-full blur-[40px] opacity-[0.08] -z-10 top-[4px] left-[4px] pointer-events-none" />
              
              {/* Orbit Ring */}
              <div className="absolute w-[150px] h-[150px] border border-zinc-200/40 rounded-full -top-[26px] -left-[26px] pointer-events-none animate-[spin_30s_linear_infinite] z-0">
                <div className="absolute w-1.5 h-1.5 bg-[#2563EB] rounded-full top-[10px] left-[50%] -translate-x-1/2 shadow-[0_0_8px_#2563EB]" />
              </div>

              {/* Card Base */}
              <div className="w-[98px] h-[98px] bg-white border border-zinc-200/80 rounded-2xl shadow-[0_8px_24px_rgba(17,24,39,0.04)] p-2.5 flex flex-col items-center justify-center gap-1 z-10 relative cursor-pointer select-none hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-[0_12px_30px_rgba(37,99,235,0.08)] transition-all duration-300 group pointer-events-auto">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto">
                  <defs>
                    <linearGradient id="pBubble" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60A5FA"/>
                      <stop offset="50%" stopColor="#2563EB"/>
                      <stop offset="100%" stopColor="#1D4ED8"/>
                    </linearGradient>
                    <linearGradient id="pEdge" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#1D4ED8"/>
                      <stop offset="100%" stopColor="#1E3A8A"/>
                    </linearGradient>
                    <filter id="pShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1D4ED8" floodOpacity="0.25"/>
                    </filter>
                  </defs>
                  <path d="M50 24 C66 24, 78 32, 78 43 C78 54, 66 62, 50 62 C45 62, 40 60, 36 58 L24 62 L28 51 C24 48, 22 45, 22 43 C22 32, 34 24, 50 24 Z" fill="url(#pEdge)" />
                  <path d="M50 20 C66 20, 78 28, 78 39 C78 50, 66 58, 50 58 C45 58, 40 56, 36 54 L24 58 L28 47 C24 44, 22 41, 22 39 C22 28, 34 20, 50 20 Z" fill="url(#pBubble)" filter="url(#pShadow)" />
                  <path d="M38 35 L32 39 L38 43 M62 35 L68 39 L62 43" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="42" y="38" width="16" height="3" rx="1.5" fill="#FFFFFF" opacity="0.8" />
                  <path d="M30 26 C36 22, 45 22, 50 22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                  <circle cx="32" cy="30" r="2" fill="#FFFFFF" opacity="0.5"/>
                </svg>
                <span className="font-sans text-[11px] font-bold text-zinc-800 text-center leading-none">حزمة Prompt</span>
              </div>
            </div>

            {/* 3. Mini Certificate Card (Bottom Left) */}
            <div className="absolute top-[55%] left-[12%] xl:left-[18%] w-[98px] h-[98px] hidden lg:block animate-float-obj-3 z-20">
              {/* Soft Ambient Glow */}
              <div className="absolute w-[90px] h-[90px] bg-[#2563EB] rounded-full blur-[40px] opacity-[0.08] -z-10 top-[4px] left-[4px] pointer-events-none" />
              
              {/* Orbit Ring */}
              <div className="absolute w-[150px] h-[150px] border border-zinc-200/40 rounded-full -top-[26px] -left-[26px] pointer-events-none animate-[spin_22s_linear_infinite] z-0">
                <div className="absolute w-1.5 h-1.5 bg-[#2563EB] rounded-full top-[10px] left-[50%] -translate-x-1/2 shadow-[0_0_8px_#2563EB]" />
              </div>

              {/* Card Base */}
              <div className="w-[98px] h-[98px] bg-white border border-zinc-200/80 rounded-2xl shadow-[0_8px_24px_rgba(17,24,39,0.04)] p-2.5 flex flex-col items-center justify-center gap-1 z-10 relative cursor-pointer select-none hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-[0_12px_30px_rgba(37,99,235,0.08)] transition-all duration-300 group pointer-events-auto">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto">
                  <defs>
                    <linearGradient id="certBase" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF"/>
                      <stop offset="60%" stopColor="#F8FAFC"/>
                      <stop offset="100%" stopColor="#E2E8F0"/>
                    </linearGradient>
                    <linearGradient id="certEdge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E2E8F0"/>
                      <stop offset="100%" stopColor="#CBD5E1"/>
                    </linearGradient>
                    <linearGradient id="waxSeal" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60A5FA"/>
                      <stop offset="100%" stopColor="#2563EB"/>
                    </linearGradient>
                    <filter id="certShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#1E3A8A" floodOpacity="0.15"/>
                    </filter>
                  </defs>
                  <rect x="18" y="24" width="64" height="48" rx="6" fill="url(#certEdge)" />
                  <rect x="18" y="20" width="64" height="48" rx="6" fill="url(#certBase)" />
                  <rect x="22" y="24" width="56" height="40" rx="4" stroke="#CBD5E1" strokeWidth="1" fill="none" />
                  <path d="M50 28 L62 32 L50 36 L38 32 Z" fill="#2563EB" />
                  <path d="M44 34 v4 c0 2 6 2 6 0 v-4" fill="#1D4ED8" />
                  <rect x="30" y="44" width="40" height="3" rx="1.5" fill="#94A3B8" />
                  <rect x="34" y="50" width="32" height="3" rx="1.5" fill="#CBD5E1" />
                  <circle cx="68" cy="56" r="7" fill="url(#waxSeal)" filter="url(#certShadow)" />
                  <path d="M66 61 L64 68 L68 66 L72 68 L70 61 Z" fill="#2563EB" />
                  <path d="M20 22 H80" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                </svg>
                <span className="font-sans text-[11px] font-bold text-zinc-800 text-center leading-none">شهادة إنجاز</span>
              </div>
            </div>

            {/* 4. Mini Digital Product Card (Bottom Right) */}
            <div className="absolute top-[55%] right-[12%] xl:right-[18%] w-[98px] h-[98px] hidden lg:block animate-float-obj-4 z-20">
              {/* Soft Ambient Glow */}
              <div className="absolute w-[90px] h-[90px] bg-[#2563EB] rounded-full blur-[40px] opacity-[0.08] -z-10 top-[4px] left-[4px] pointer-events-none" />
              
              {/* Orbit Ring */}
              <div className="absolute w-[150px] h-[150px] border border-zinc-200/40 rounded-full -top-[26px] -left-[26px] pointer-events-none animate-[spin_28s_linear_infinite] z-0">
                <div className="absolute w-1.5 h-1.5 bg-[#2563EB] rounded-full top-[10px] left-[50%] -translate-x-1/2 shadow-[0_0_8px_#2563EB]" />
              </div>

              {/* Card Base */}
              <div className="w-[98px] h-[98px] bg-white border border-zinc-200/80 rounded-2xl shadow-[0_8px_24px_rgba(17,24,39,0.04)] p-2.5 flex flex-col items-center justify-center gap-1 z-10 relative cursor-pointer select-none hover:-translate-y-1 hover:border-[#2563EB] hover:shadow-[0_12px_30px_rgba(37,99,235,0.08)] transition-all duration-300 group pointer-events-auto">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto">
                  <defs>
                    <linearGradient id="fBack" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#1D4ED8"/>
                      <stop offset="100%" stopColor="#1E3A8A"/>
                    </linearGradient>
                    <linearGradient id="fFront" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60A5FA"/>
                      <stop offset="50%" stopColor="#2563EB"/>
                      <stop offset="100%" stopColor="#1D4ED8"/>
                    </linearGradient>
                    <linearGradient id="fEdge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB"/>
                      <stop offset="100%" stopColor="#1D4ED8"/>
                    </linearGradient>
                    <filter id="fShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1D4ED8" floodOpacity="0.2"/>
                    </filter>
                  </defs>
                  <path d="M16 28 C16 24, 20 22, 24 22 L40 22 C44 22, 46 26, 50 28 L76 28 C80 28, 84 32, 84 36 L84 70 C84 74, 80 76, 76 76 L24 76 C20 76, 16 74, 16 70 Z" fill="url(#fBack)"/>
                  <rect x="24" y="14" width="46" height="42" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" transform="rotate(5 50 35)"/>
                  <rect x="28" y="15" width="42" height="42" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" transform="rotate(-2 50 36)"/>
                  <rect x="36" y="22" width="24" height="3" rx="1.5" fill="#CBD5E1" />
                  <rect x="36" y="28" width="16" height="3" rx="1.5" fill="#E2E8F0" />
                  <path d="M16 38 C16 34, 20 32, 24 32 L76 32 C80 32, 84 34, 84 38 L84 72 C84 76, 80 78, 76 78 L24 78 C20 78, 16 76, 16 72 Z" fill="url(#fEdge)" />
                  <path d="M16 34 C16 30, 20 28, 24 28 L76 28 C80 28, 84 30, 84 34 L84 68 C84 72, 80 74, 76 74 L24 74 C20 74, 16 72, 16 68 Z" fill="url(#fFront)" filter="url(#fShadow)" />
                  <path d="M18 32 H82" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                </svg>
                <span className="font-sans text-[11px] font-bold text-zinc-800 text-center leading-none">منتج رقمي</span>
              </div>
            </div>

          </div>
          
          <div className="container relative mx-auto px-4 z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="animate-float-badge mb-6 md:mb-8 inline-block select-none">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="relative group flex items-center justify-center gap-2.5 bg-white border border-[#E5E7EB] hover:border-[#2563EB] h-11 md:h-12 px-5 md:px-6 rounded-full shadow-[0_2px_8px_-1px_rgba(17,24,39,0.04),0_1px_3px_0_rgba(17,24,39,0.02)] hover:shadow-[0_8px_20px_-4px_rgba(37,99,235,0.12),0_4px_12px_rgba(0,0,0,0.02)] hover:-translate-y-[2px] transition-all duration-250 ease-in-out cursor-pointer"
                  dir="rtl"
                >
                  {/* Status dot */}
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-slow-pulse shrink-0" />
                  
                  {/* People Icon */}
                  <Users className="w-4 h-4 text-[#2563EB] shrink-0" />

                  {/* Text */}
                  <span className="font-sans text-xs md:text-sm font-bold text-[#111827] leading-none">
                    انضم لأكثر من {trustStudentCount.toLocaleString('en-US')} طالب بدأوا رحلتهم معنا
                  </span>

                  {/* Shine overlay */}
                  <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute top-0 w-1/3 h-full bg-gradient-to-r from-transparent via-zinc-950/[0.04] to-transparent -skew-x-12 animate-shine-sweep" />
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="mb-5 md:mb-8 px-4"
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-sans font-extrabold text-zinc-900 leading-[1.25] tracking-tight flex flex-col items-center mb-2 text-center select-none" dir="rtl">
                  <span>ابدأ رحلتك في احتراف الذكاء</span>
                  <span>الإصطناعي مع <span className="text-[#2563EB]">جو سكول</span></span>
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-base sm:text-lg md:text-[20px] text-zinc-600 font-sans font-medium max-w-3xl mx-auto mb-6 md:mb-10 leading-relaxed text-center" dir="rtl"
              >
                كل ما تحتاجه لتعلّم الذكاء الاصطناعي، من دورات احترافية إلى منتجات رقمية جاهزة.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6"
              >
                <Link
                  href="#courses"
                  className="group relative h-14 px-8 inline-flex items-center justify-center gap-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-sans text-sm md:text-base font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-98 w-full md:w-auto cursor-pointer"
                  dir="ltr"
                >
                  <ArrowLeft className="w-5 h-5 relative z-10 group-hover:-translate-x-1.5 transition-transform duration-300" />
                  <span>تصفح الدورات والمنتجات الرقمية</span>
                </Link>
                
                <div className="flex items-center justify-between md:justify-start gap-4 bg-slate-50/50 border border-zinc-200/60 rounded-2xl p-3 md:pr-6 w-full md:w-auto shadow-sm">
                  <div className="flex -space-x-2 md:-space-x-3 rtl:space-x-reverse ml-2 md:ml-0">
                    {["felix","sara","mia","alex"].map(seed => (
                      <div key={seed} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-50 overflow-hidden shadow-inner">
                        <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`} alt="customer" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-start border-r border-zinc-200 pr-3 md:pr-5 flex-1 md:flex-none">
                    <div className="flex text-yellow-500 mb-0.5 gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <span className="font-sans text-[10px] md:text-xs text-zinc-500 font-bold">Trusted by <span className="text-zinc-900">500+ AI Creators</span></span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          {/* Subtle Bottom Section Divider */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* ── 2. قسم الدورات التعليمية (COURSES SECTION) ──────────────────────────────── */}
        <section id="courses" className="py-10 md:py-16 relative">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-10 md:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-brand-500/10 text-yellow-500 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-sans text-xs md:text-sm font-bold mb-4 border border-zinc-200/60"
              >
                <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />
                الأكاديمية التعليمية المتميزة
              </motion.div>
              <h2 className="text-2xl md:text-5xl font-sans font-black text-zinc-900 mb-4 md:mb-6 tracking-tight">دورات صناعة المحتوى والذكاء الاصطناعي</h2>
              <p className="text-zinc-500 font-alexandria text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
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
                    "px-5 py-2.5 rounded-full font-sans text-xs md:text-sm font-bold transition-all duration-300 shrink-0 select-none cursor-pointer border snap-align-start",
                    activeCourseCategory === cat
                      ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-[0_4px_15px_rgba(29, 78, 216,0.3)] scale-105"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-slate-50"
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
                    whileHover={{ y: -8, scale: 1.015, boxShadow: "0 25px 50px -12px rgba(29, 78, 216,0.25)" }}
                    className="group bg-gradient-to-b from-white to-slate-50/60 border border-zinc-200/60 border border-zinc-200/60 hover:border-[#1D4ED8]/50 rounded-3xl overflow-hidden shadow-sm border border-zinc-200/60 flex flex-col justify-between transition-all duration-300 h-full relative cursor-pointer hover:shadow-[0_30px_60px_-15px_rgba(29, 78, 216,0.25)]"
                    onClick={() => router.push(`/courses/${course.slug}`)}
                  >
                    {/* Glow Light Sweep Shimmer Effect */}
                    <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none z-10" />
                    {/* Course Card Top Banner */}
                    <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden border-b border-zinc-200/60">
                      {course.image_url && (
                        <img 
                          src={course.image_url} 
                          alt={course.title} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-112 transition-transform duration-700 ease-out"
                        />
                      )}
                      
                      {/* Discount Badge on Image */}
                      {coursePricing && coursePricing.original_price > coursePricing.price && (
                        <div className="absolute bottom-3 left-3 z-20">
                          <span className="bg-gradient-to-r from-[#ff0f53] to-[#ff00b3] text-white font-black text-[9px] font-sans py-1 px-2.5 rounded-2xl shadow-[0_0_15px_rgba(29, 78, 216,0.5)] animate-pulse border border-zinc-200">
                            خصم {coursePricing.discount_pct}%
                          </span>
                        </div>
                      )}

                      {/* Right Wishlist Button */}
                      <div className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md rounded-2xl p-1.5 border border-zinc-200 hover:bg-black/60 transition-colors">
                        <WishlistButton itemId={course.id} itemType="course" size={16} />
                      </div>
                    </div>

                    {/* Course Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Info Bar */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold bg-zinc-50/70 border border-zinc-200/60 rounded-2xl px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 text-[#1D4ED8]" />
                              {course.lessons_count || 0} دروس
                            </span>
                            <span className="flex items-center gap-1 border-r border-zinc-200 pr-3">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              {course.duration_hours || 0} ساعة
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-zinc-900 text-xs">{averageRating}</span>
                            <span className="text-zinc-500 font-normal text-[9px]">({reviewsCount})</span>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-900 leading-snug group-hover:text-[#1D4ED8] transition-colors line-clamp-2">
                          {course.title}
                        </h3>

                        <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                          {stripHtml(course.short_description || course.description)}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-200/60 flex items-center justify-between">
                        {/* Price Display */}
                        <div className="flex flex-col">
                          {coursePricing.original_price > coursePricing.price && (
                            <span className="text-[10px] text-zinc-500 line-through mb-0.5 font-sans">
                              {formatPrice(coursePricing.original_price, currency)}
                            </span>
                          )}
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-lg sm:text-xl font-sans font-black text-zinc-900">
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
                            className="h-10 w-10 flex items-center justify-center rounded-2xl bg-zinc-100/40 border border-zinc-200 text-zinc-900 hover:bg-[#1D4ED8] hover:border-[#1D4ED8] hover:shadow-[0_0_15px_rgba(29, 78, 216,0.4)] transition-all shrink-0 group/cart duration-300"
                          >
                            <ShoppingCart className="w-4 h-4 group-hover/cart:scale-110 transition-transform" />
                          </button>
                          <div className="h-10 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(29, 78, 216,0.15)] group-hover:scale-[1.02] group-hover:shadow-[0_0_20px_rgba(29, 78, 216,0.4)] active:scale-98 shrink-0 duration-300">
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
                className="group h-12 md:h-14 px-8 inline-flex items-center justify-center gap-2.5 bg-zinc-100/40 border border-zinc-200 text-zinc-900 rounded-2xl font-sans text-sm font-bold shadow-sm border border-zinc-200/60 transition-all hover:bg-[#1D4ED8] hover:border-[#1D4ED8] hover:shadow-[0_0_25px_rgba(29, 78, 216,0.45)] hover:-translate-y-0.5 active:scale-98"
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
          <section id="bundles" className="py-10 md:py-16 relative bg-zinc-50/40">
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
                  className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-sans text-xs md:text-sm font-bold mb-4 border border-purple-500/20"
                >
                  <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                  عروض التوفير الكبرى والحلول المتكاملة
                </motion.div>
                <h2 className="text-2xl md:text-5xl font-sans font-black text-zinc-900 mb-4 md:mb-6 tracking-tight">حزم العروض المميزة</h2>
                <p className="text-zinc-500 font-alexandria text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
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
                      className="group bg-slate-50 border border-zinc-200/60 hover:border-purple-500/30 rounded-[2rem] overflow-hidden shadow-sm border border-zinc-200/60 flex flex-col justify-between transition-all duration-300 h-full relative cursor-pointer"
                      onClick={() => router.push(`/bundles/${bundle.slug}`)}
                    >
                      {/* Visual header */}
                      <div className="relative h-48 bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-zinc-200/60">
                        {bundle.banner_url || bundle.image_url ? (
                          <img src={bundle.banner_url || bundle.image_url} alt={bundle.title} className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35"></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent"></div>
                        <div className="absolute w-24 h-24 bg-purple-600/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
                        
                        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                          <Badge className="bg-purple-600 text-zinc-900 border-none font-sans text-[9px] py-0.5 px-2.5 rounded shadow-sm border border-zinc-200/60 uppercase tracking-wider font-black">
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
                                <Download className="w-3.5 h-3.5 text-yellow-500" />
                                {productsCount} أدوات رقمية
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-yellow-400">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>5.0</span>
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-sans font-bold text-zinc-900 leading-snug group-hover:text-purple-400 transition-colors line-clamp-2">
                            {bundle.title}
                          </h3>

                          <p className="text-zinc-500 text-xs leading-relaxed line-clamp-3">
                            {bundle.short_description || bundle.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-5 border-t border-zinc-200/60 flex items-center justify-between">
                          <div className="flex flex-col">
                            {bundlePricing.original_price > 0 && (
                              <span className="text-[9px] text-zinc-500 line-through mb-0.5">
                                {formatPrice(bundlePricing.original_price, currency)}
                              </span>
                            )}
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-2xl font-sans font-black text-zinc-900">
                                {formatPrice(bundlePricing.price, currency)}
                              </span>
                            </div>
                          </div>

                          <div className="h-10 px-4 bg-zinc-100/40 hover:bg-purple-600 border border-zinc-200/60 hover:border-purple-600 text-zinc-900 rounded-2xl text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0">
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
        {!isLoading && products.length > 0 && (
          <section id="products" className="py-10 md:py-16 relative">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center mb-10 md:mb-16">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 bg-brand-500/10 text-yellow-500 px-3 py-1 md:px-4 md:py-1.5 rounded-full font-sans text-xs md:text-sm font-bold mb-4 border border-zinc-200/60"
              >
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />
                متجر المنتجات الرقمية
              </motion.div>
              <h2 className="text-2xl md:text-5xl font-sans font-black text-zinc-900 mb-4 md:mb-6 tracking-tight">مكتبة المنتجات الرقمية</h2>
              <p className="text-zinc-500 font-alexandria text-sm md:text-lg max-w-2xl mx-auto leading-relaxed">
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
                    "px-5 py-2.5 rounded-full font-sans text-xs md:text-sm font-bold transition-all duration-300 shrink-0 select-none cursor-pointer border snap-align-start",
                    activeProductCategory === cat
                      ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-[0_0_20px_rgba(29, 78, 216,0.45)] scale-105"
                      : "bg-[#0c0c14] text-zinc-500 border-zinc-200/60 hover:border-[#1D4ED8]/30 hover:text-zinc-900 hover:shadow-[0_0_15px_rgba(29, 78, 216,0.15)]"
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
                  <div key={i} className="relative h-[450px] rounded-[2rem] bg-slate-50 border border-zinc-200/60 overflow-hidden p-6 flex flex-col justify-between animate-pulse">
                    <div className="h-48 bg-zinc-100/40 rounded-2xl mb-4 w-full" />
                    <div className="space-y-3">
                      <div className="h-4 bg-zinc-100/40 rounded-xl w-1/3" />
                      <div className="h-6 bg-zinc-100/40 rounded-xl w-3/4" />
                      <div className="h-4 bg-zinc-100/40 rounded-xl w-full" />
                      <div className="h-4 bg-zinc-100/40 rounded-xl w-5/6" />
                    </div>
                    <div className="flex items-center justify-between mt-6">
                      <div className="h-8 bg-zinc-100/40 rounded-xl w-1/4" />
                      <div className="h-10 bg-zinc-100/40 rounded-2xl w-1/3" />
                    </div>
                  </div>
                ))
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-16 md:py-20">
                  <Package className="w-12 h-12 md:w-16 md:h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 font-sans text-lg md:text-xl">لا توجد منتجات متطابقة في هذا التصنيف حالياً.</p>
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
                          className="block relative h-full flex flex-col bg-slate-50 border border-[#1b1b24]/60 hover:border-[#1D4ED8]/50 rounded-[2rem] overflow-hidden group-hover:-translate-y-3 transition-all duration-300 shadow-sm border border-zinc-200/60 hover:shadow-[0_30px_60px_-15px_rgba(29, 78, 216,0.25)] cursor-pointer"
                        >
                          {/* Glow Light Sweep Shimmer Effect */}
                          <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[200%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out pointer-events-none z-10" />
                          {/* Media Area */}
                          <div className="relative aspect-video overflow-hidden border-b border-zinc-200/60">
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
                  })
              )}
            </motion.div>

            {/* All Products CTA Button */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/products"
                className="group h-12 md:h-14 px-8 inline-flex items-center justify-center gap-2.5 bg-zinc-100/40 border border-zinc-200 text-zinc-900 rounded-2xl font-sans text-sm font-bold shadow-sm border border-zinc-200/60 transition-all hover:bg-[#1D4ED8] hover:border-[#1D4ED8] hover:shadow-[0_0_25px_rgba(29, 78, 216,0.45)] hover:-translate-y-0.5 active:scale-98"
              >
                <span>جميع المنتجات</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
              </Link>
            </div>
          </div>
          {/* Subtle Bottom Section Divider */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>
        )}

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
