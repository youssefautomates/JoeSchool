"use client";

import { use, useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CustomVideoPlayer } from "@/components/CustomVideoPlayer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, BookOpen, Clock, ArrowLeft, Star, 
  CheckCircle2, ChevronDown, Award, PlayCircle, ShieldCheck, 
  Loader2, Play, Users, Check, AlertCircle, HelpCircle, Zap, VolumeX, Volume2, X, ShoppingCart, FileText
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCourseBySlug, checkEnrollment, getCoursesList, type LmsCourse, type LmsSection, type LmsLesson } from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";
import { ProductReviews } from "@/components/ProductReviews";
import { SocialLinks } from "@/components/SocialLinks";
import { useCart } from "@/context/CartContext";
import { resolveUserCurrency, resolveProductPrice, formatPrice, type Currency } from "@/lib/pricing";

interface ShowcaseVideo {
  id: string;
  videoId?: string;
  playbackUrl: string;
  thumbnailUrl: string;
  title: string;
}

interface ShowcaseVideoCardProps {
  video: ShowcaseVideo;
  onClick: () => void;
}

function ShowcaseVideoCard({ video, onClick }: ShowcaseVideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div 
      onClick={onClick}
      className="w-full aspect-[9/16] bg-gradient-to-b from-[#09090e] to-[#040406] border border-white/5 hover:border-[#D6004B]/50 rounded-2xl overflow-hidden relative group transition-all duration-500 transform hover:-translate-y-2 shadow-2xl cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image / Gradient Fallback */}
      {!imgFailed && video.thumbnailUrl ? (
        <img 
          src={video.thumbnailUrl}
          alt={video.title || "تطبيق طالب"}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#12121c] via-[#09090e] to-[#050508] flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#D6004B] mb-3 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-[10px] text-zinc-400 font-bold font-alexandria">تطبيق طالب</span>
        </div>
      )}

      {/* Hover overlay details */}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />

      {/* Play Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
        <div className="w-14 h-14 rounded-full bg-[#D6004B]/95 text-white flex items-center justify-center shadow-lg border border-[#D6004B]/30 group-hover:scale-110 transition-transform">
          <Play className="w-6 h-6 fill-current ml-0.5" />
        </div>
      </div>


    </div>
  );
}

function ShowcaseModalPlayer({ video, preFetchedUrl }: { video: ShowcaseVideo; preFetchedUrl?: string }) {
  const [signedUrl, setSignedUrl] = useState<string>(preFetchedUrl || "");
  const [loading, setLoading] = useState(!preFetchedUrl);

  useEffect(() => {
    if (preFetchedUrl) {
      setSignedUrl(preFetchedUrl);
      setLoading(false);
      return;
    }
    const vidId = video.videoId || video.id;
    if (vidId) {
      fetch(`/api/video/showcase?videoId=${vidId}`)
        .then(res => res.json())
        .then(data => {
          if (data.url) setSignedUrl(data.url);
        })
        .catch((err) => {
          console.error("Error fetching showcase signed URL:", err);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [video.id, video.videoId, preFetchedUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#07070a]">
        <Loader2 className="w-8 h-8 text-[#D6004B] animate-spin" />
        <span className="text-xs text-zinc-400 font-cairo">تحميل الفيديو بأمان...</span>
      </div>
    );
  }

  const embedUrl = signedUrl || video.playbackUrl;
  let finalSrc = embedUrl;
  if (finalSrc.includes("autoplay=false")) {
    finalSrc = finalSrc.replace("autoplay=false", "autoplay=true");
  } else {
    finalSrc = `${finalSrc}${finalSrc.includes('?') ? '&' : '?'}autoplay=true`;
  }

  return (
    <iframe 
      src={finalSrc}
      className="w-full h-full border-0 object-cover"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      referrerPolicy="origin"
    />
  );
}

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [currency, setCurrency] = useState<Currency>("EGP");

  useEffect(() => {
    resolveUserCurrency().then(setCurrency);
  }, []);

  const coursePricing = course ? resolveProductPrice(course as any, currency) : null;

  const [sections, setSections] = useState<(LmsSection & { lessons: LmsLesson[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [firstLessonSlug, setFirstLessonSlug] = useState("introduction");
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<LmsCourse[]>([]);
  const [promoVideoSignedUrl, setPromoVideoSignedUrl] = useState<string>("");
  
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { addToCart } = useCart();

  const handleAddToCart = () => {
    if (!course) return;
    const coursePricing = resolveProductPrice(course as any, currency);
    addToCart({
      ...course,
      price: coursePricing.price,
      original_price: coursePricing.original_price,
      category: "courses",
    } as any);
  };

  // Video Player States
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews' | 'faq' | 'certificate'>('overview');
  
  // Accordion curriculum index
  const [openModuleIndex, setOpenModuleIndex] = useState<number | null>(0);

  const [activeShowcaseVideo, setActiveShowcaseVideo] = useState<ShowcaseVideo | null>(null);
  const [activePreviewLesson, setActivePreviewLesson] = useState<LmsLesson | null>(null);
  const [showcaseUrls, setShowcaseUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      const { course: c, sections: s } = await getCourseBySlug(slug);
      if (!c) {
        setIsLoading(false);
        return;
      }
      setCourse(c);
      setSections(s);
      
      const firstSlug = s[0]?.lessons[0]?.slug || "introduction";
      setFirstLessonSlug(firstSlug);
      
      // Stop blocking the page load here so content appears fast
      setIsLoading(false);

      // Pre-fetch all showcase video URLs in parallel for instant synchronous autoplay on click
      if (c.showcase_videos && Array.isArray(c.showcase_videos)) {
        c.showcase_videos.forEach((vid: any) => {
          const vidId = vid.videoId || vid.id;
          if (vidId) {
            fetch(`/api/video/showcase?videoId=${vidId}`)
              .then(res => res.json())
              .then(data => {
                if (data.url) {
                  setShowcaseUrls(prev => ({ ...prev, [vidId]: data.url }));
                }
              })
              .catch(() => {});
          }
        });
      }

      // Fetch all secondary page details in parallel
      const promoVideoPromise = c.promo_video_id
        ? fetch(`/api/video/showcase?videoId=${c.promo_video_id}`)
            .then(res => res.json())
            .then(data => {
              if (data.url) setPromoVideoSignedUrl(data.url);
            })
            .catch(() => {})
        : Promise.resolve();

      const enrollmentPromise = supabaseClient.auth.getSession()
        .then(async ({ data: { session } }) => {
          if (session) {
            const enrolled = await checkEnrollment(session.user.id, c.id);
            setIsEnrolled(enrolled);
          }
        })
        .catch(() => {});

      const reviewsPromise = fetch(`/api/admin/reviews?productId=${c.id}&_t=${Date.now()}`, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAllReviews(data);
          }
        })
        .catch(() => {});

      const recommendationsPromise = getCoursesList({ status: "published" })
        .then(all => {
          let related = all.filter(item => item.category === c.category && item.id !== c.id);
          if (related.length === 0) {
            related = all.filter(item => item.id !== c.id);
          }
          setRecommendedCourses(related.slice(0, 3));
        })
        .catch(() => {});

      await Promise.all([
        promoVideoPromise,
        enrollmentPromise,
        reviewsPromise,
        recommendationsPromise
      ]);
    }
    loadData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#D6004B] animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">جاري تحميل تفاصيل الكورس...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden">
        <Navbar />
        <main className="flex-1 pt-32 pb-20 container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto bg-[#0a0a0f] border border-white/5 rounded-3xl p-8 space-y-6">
            <BookOpen className="w-16 h-16 text-zinc-700 mx-auto" />
            <h1 className="text-xl font-alexandria font-bold">هذا الكورس غير متوفر حالياً</h1>
            <p className="text-zinc-500 text-sm">تأكد من الرابط الصحيح أو تصفح الأكاديمية لمزيد من الأقسام المميزة.</p>
            <Link href="/courses" className="inline-flex h-11 px-6 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-xl text-xs font-bold items-center gap-2">
              العودة لقائمة الأقسام
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Reviews aggregations
  const reviewsCount = allReviews.length;
  const averageRating = reviewsCount > 0 
    ? Number((allReviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviewsCount).toFixed(1))
    : 5.0;

  // Breakdown of ratings
  const ratingCounts = [0, 0, 0, 0, 0];
  allReviews.forEach(r => {
    const star = Math.round(Number(r.rating));
    if (star >= 1 && star <= 5) {
      ratingCounts[5 - star]++;
    }
  });

  const totalLessons = sections.reduce((acc, sec) => acc + (sec.lessons?.length || 0), 0);

  // Video source detection
  const promoVideoTag = course.tags?.find(t => t.startsWith("video:"))?.replace("video:", "");
  const firstPreviewLesson = sections
    .flatMap(sec => sec.lessons)
    .find(les => les.is_preview === true && les.lecture_type === 'video' && (les.playback_url || les.video_url));
  const previewVideoUrl = promoVideoSignedUrl || promoVideoTag;

  const isEmbed = !!(previewVideoUrl?.includes("iframe.mediadelivery.net") || previewVideoUrl?.includes("youtube.com") || previewVideoUrl?.includes("youtu.be"));

  const getEmbedUrl = (url: string, playUnmuted: boolean) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const ytId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      const loopParam = playUnmuted ? "" : `&loop=1&playlist=${ytId}`;
      return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${playUnmuted ? 0 : 1}&controls=1${loopParam}`;
    }
    const delimiter = url.includes("?") ? "&" : "?";
    const loopParam = playUnmuted ? "" : "&loop=true";
    return `${url}${delimiter}autoplay=true&muted=${playUnmuted ? "false" : "true"}${loopParam}`;
  };

  const handleUnmuteAndStart = () => {
    setHasInteracted(true);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    if (mobileVideoRef.current) {
      mobileVideoRef.current.muted = false;
      mobileVideoRef.current.currentTime = 0;
      mobileVideoRef.current.play().catch(() => {});
    }
  };

  // Build a long list of items for the marquee to prevent any empty space on wider screens
  const baseVideos = course.showcase_videos || [];
  let marqueeVideos: any[] = [];
  if (baseVideos.length > 0) {
    let repeated = [...baseVideos];
    while (repeated.length < 12) {
      repeated = [...repeated, ...baseVideos];
    }
    marqueeVideos = [...repeated, ...repeated];
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#D6004B]/30 font-cairo overflow-x-hidden">
      <Navbar />

      <main className="flex-1 pt-24 pb-0 md:pb-20">
        <div className="hidden md:block">
        
        {/* Cinematic Header Section */}
        <section className="relative pt-8 pb-16 md:py-20 border-b border-white/5 bg-[#09090b]/40">
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-rose-600/5 rounded-full blur-[120px]" />
          </div>

          <div className="container relative z-10 mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Right Col: Course Title, Badges under Video, Tabbed details */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-8 space-y-6"
              >
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>العودة لكافة الأقسام التدريبية</span>
                </Link>

                {/* Sparkling badge removed, title size slightly decreased */}
                <div className="space-y-4">
                  <h1 className="text-xl sm:text-3xl lg:text-4xl font-alexandria font-black text-white leading-tight">
                    {course.title}
                  </h1>
                </div>

                {/* 16:9 Interactive Video/Cover Container */}
                <div className="aspect-video bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl group">
                  {previewVideoUrl ? (
                    isEmbed ? (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                        <div className="relative w-full h-full bg-black">
                          <iframe 
                            src={getEmbedUrl(previewVideoUrl, hasInteracted)}
                            className="w-full h-full border-none"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            referrerPolicy="origin"
                          />
                        </div>
                        {/* Click-to-unmute overlay */}
                        {!hasInteracted && (
                          <div 
                            onClick={handleUnmuteAndStart}
                            className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer group/unmute transition-all"
                          >
                            <div className="absolute inset-0 bg-black/30 group-hover/unmute:bg-black/15 transition-colors" />
                            <motion.div 
                              animate={{ scale: [1, 1.08, 1] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                              className="relative w-20 h-20 bg-[#D6004B]/90 backdrop-blur-xl border-2 border-white/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(214,0,75,0.5)] group-hover/unmute:shadow-[0_0_60px_rgba(214,0,75,0.7)] transition-shadow"
                            >
                              <Play className="w-8 h-8 text-white fill-current ml-1" />
                            </motion.div>
                            <span className="relative text-xs font-cairo font-bold text-white/80 bg-black/50 backdrop-blur-md px-5 py-2 rounded-xl border border-white/10 group-hover/unmute:text-white group-hover/unmute:border-white/20 transition-all flex items-center gap-2">
                              <VolumeX className="w-3.5 h-3.5" />
                              اضغط لفتح الصوت
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <CustomVideoPlayer 
                        src={previewVideoUrl}
                        poster={course.image_url || undefined}
                        className="w-full h-full"
                      />
                    )
                  ) : (
                    <>
                      {course.image_url ? (
                        <img 
                          src={course.image_url} 
                          alt={course.title} 
                          className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-700" 
                        />
                      ) : (
                        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-30 flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-zinc-700" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Mobile-only CTA Section (appears under video, block lg:hidden) */}
                <div className="block lg:hidden bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden my-4">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent animate-pulse" />
                  
                  {isEnrolled ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl text-xs font-bold justify-center font-cairo">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>حسابك مفعل ومسجل في القسم</span>
                      </div>
                      <Link
                        href={`/learn/${course.slug}/${firstLessonSlug}`}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
                      >
                        <span>ادخل مشغل الدروس الفنية</span>
                        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-alexandria">استثمار الانضمام للقسم</span>
                        {coursePricing && coursePricing.original_price > coursePricing.price && (
                          <span className="text-xs text-zinc-500 line-through font-alexandria">بدلاً من {formatPrice(coursePricing.original_price, currency)}</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-alexandria font-black text-white">
                          {coursePricing ? (coursePricing.price === 0 ? "مجاني" : formatPrice(coursePricing.price, currency)) : ""}
                        </span>
                        {coursePricing && coursePricing.original_price > coursePricing.price && (
                          <span className="text-xs text-emerald-400 font-bold ml-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md animate-pulse">
                            وفر {coursePricing.discount_pct}%
                          </span>
                        )}
                      </div>
                      {course.price > 0 && course.enable_gateway_fee !== false && (
                        <p className="text-[10px] text-zinc-500 text-right leading-relaxed font-cairo">
                          * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                        </p>
                      )}


                      <Link
                        href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
                        className="w-full h-14 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(214,0,75,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer font-cairo animate-pulse-glow"
                      >
                        <span>{course.price === 0 ? "ابدأ مجاناً 🎁" : (coursePricing && coursePricing.original_price > coursePricing.price) ? `اشترك الآن - خصم ${coursePricing.discount_pct}%` : "اشترك الآن"}</span>
                        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                      </Link>

                      {course.price > 0 && (
                        <button
                          onClick={handleAddToCart}
                          className="w-full mt-2.5 h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-base border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo hover:border-[#D6004B]/30"
                        >
                          <ShoppingCart className="w-5 h-5 text-zinc-300" />
                          <span>إضافة إلى السلة</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Blue Box: Glassmorphism badges row (Directly under the video container) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Duration */}
                  <div className="bg-[#0b0b12]/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[140px] hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/80 transition-all shadow-lg select-none">
                    <Clock className="w-6 h-6 text-rose-500 mb-2 shrink-0" />
                    <span className="text-[11px] text-zinc-400 font-bold mb-1 font-cairo">المدة</span>
                    <span className="text-base sm:text-lg text-white font-alexandria font-black mb-1 leading-none">
                      {course.duration_hours >= 1
                        ? `${course.duration_hours} س`
                        : course.duration_hours > 0
                        ? `${Math.round(course.duration_hours * 60)} د`
                        : "0 س"
                      }
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium font-cairo">إجمالي الوقت</span>
                  </div>

                  {/* Card 2: Lectures */}
                  <div className="bg-[#0b0b12]/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[140px] hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/80 transition-all shadow-lg select-none">
                    <BookOpen className="w-6 h-6 text-rose-500 mb-2 shrink-0" />
                    <span className="text-[11px] text-zinc-400 font-bold mb-1 font-cairo">المحاضرات</span>
                    <span className="text-base sm:text-lg text-white font-alexandria font-black mb-1 leading-none">
                      {totalLessons > 0 ? totalLessons : course.lessons_count}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium font-cairo">دروس مسجلة</span>
                  </div>

                  {/* Card 3: Rating */}
                  <div className="bg-[#0b0b12]/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[140px] hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/80 transition-all shadow-lg select-none">
                    <Star className="w-6 h-6 text-yellow-400 fill-current mb-2 shrink-0 animate-pulse" />
                    <span className="text-[11px] text-zinc-400 font-bold mb-1 font-cairo">التقييم</span>
                    <span className="text-base sm:text-lg text-white font-alexandria font-black mb-0.5 leading-none">
                      {averageRating}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1;
                        const isFilled = starValue <= Math.round(Number(averageRating));
                        return (
                          <Star 
                            key={i} 
                            className={cn(
                              "w-2.5 h-2.5 shrink-0",
                              isFilled ? "text-yellow-400 fill-current" : "text-zinc-700"
                            )} 
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 4: Certificate */}
                  <div className="bg-[#0b0b12]/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center min-h-[140px] hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/80 transition-all shadow-lg select-none">
                    <Award className="w-6 h-6 text-emerald-500 mb-2 shrink-0" />
                    <span className="text-xs sm:text-sm text-white font-alexandria font-black mb-1.5 leading-none">شهادة الإتمام</span>
                    <span className="text-[10px] text-zinc-500 font-medium font-cairo">بعد إكمال الكورس</span>
                  </div>
                </div>

                {/* Green Box: Tabbed Detail Navigation Layer */}
                <div className="border-t border-white/5 pt-6 space-y-6">
                  
                  {/* Tab switches: centered premium tab bar with icons */}
                  <div className="flex items-center justify-around border-b border-white/5 pb-2 w-full">
                    {[
                      { id: 'overview', label: 'الوصف', icon: FileText },
                      { id: 'curriculum', label: 'المنهج', icon: BookOpen },
                      { id: 'certificate', label: 'الشهادة', icon: Award },
                      { id: 'faq', label: 'الأسئلة', icon: HelpCircle }
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 py-3 transition-all relative cursor-pointer font-alexandria font-bold text-xs sm:text-sm flex-1 text-center select-none cursor-pointer",
                            isActive ? "text-[#D6004B]" : "text-zinc-400 hover:text-white"
                          )}
                        >
                          <TabIcon className={cn("w-5 h-5 mb-0.5", isActive ? "text-[#D6004B]" : "text-zinc-500")} />
                          <span>{tab.label}</span>
                          {isActive && (
                            <motion.div 
                              layoutId="activeTabIndicator" 
                              className="absolute bottom-0 h-[3px] bg-[#D6004B] rounded-full w-12" 
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Contents */}
                  <div className="pt-2">
                    <AnimatePresence mode="wait">
                      {activeTab === 'overview' && (
                        <motion.div
                          key="overview"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          {/* Course Description with correct format styling */}
                          {course.description ? (
                            <div className="text-zinc-300 font-cairo text-sm sm:text-base leading-[2.2] space-y-6 [&_p]:mb-6 [&_p]:leading-[2.2] [&_li]:mb-4 [&_li]:leading-[2.2] [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-lg [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-base [&_span]:leading-[2.2]" dangerouslySetInnerHTML={{ __html: course.description.replace(/\n/g, '<br/>') }} />
                          ) : (
                            <p className="text-zinc-400 font-cairo text-sm sm:text-base leading-[1.8]">هذا المسار يحتوي على شرح مفصل وتطبيق شامل لمهارات صناعة المحتوى بالذكاء الاصطناعي وإنتاج الفيديو الإبداعي بأقوى الأدوات الرقمية.</p>
                          )}

                          {/* Checklist: What You'll Learn */}
                          {course.what_will_learn && course.what_will_learn.length > 0 && (
                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                              <h3 className="text-lg sm:text-xl font-alexandria font-bold text-white flex items-center gap-2 relative z-10">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ماذا ستتعلم وتنجز عملياً؟
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                                {course.what_will_learn.map((feat, fIdx) => (
                                  <div key={fIdx} className="flex items-start gap-3 bg-black/20 border border-white/5 p-3 rounded-xl hover:border-emerald-500/30 transition-colors group">
                                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                    <span className="text-zinc-300 text-xs sm:text-sm leading-relaxed">{feat}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Course Requirements */}
                          {course.requirements && course.requirements.length > 0 && (
                            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4">
                              <h3 className="text-lg sm:text-xl font-alexandria font-bold text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-rose-500" />
                                متطلبات البدء في القسم
                              </h3>
                              <ul className="space-y-3.5 text-xs sm:text-sm text-zinc-400 list-disc pr-5">
                                {course.requirements.map((req, rIdx) => (
                                  <li key={rIdx} className="leading-relaxed">{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Target Audience: Who is this for? */}
                          {course.who_is_for && course.who_is_for.length > 0 && (
                            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
                              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                              <h3 className="text-lg sm:text-xl font-alexandria font-bold text-white flex items-center gap-2 relative z-10">
                                <Users className="w-5 h-5 text-blue-500" />
                                من هو الفرد المستهدف بهذا القسم؟
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                                {course.who_is_for.map((aud, aIdx) => (
                                  <div key={aIdx} className="flex items-center gap-2 bg-black/20 border border-white/5 p-3.5 rounded-xl hover:border-blue-500/30 transition-colors group">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 group-hover:scale-125 transition-transform" />
                                    <span className="text-zinc-300 text-xs sm:text-sm">{aud}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeTab === 'curriculum' && (
                        <motion.div
                          key="curriculum"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                            <h3 className="text-lg sm:text-xl font-alexandria font-bold text-white">منهج الوحدات والمواضيع الدراسية</h3>
                            <span className="text-xs text-zinc-500 font-bold">{sections.length} وحدات رئيسية • {totalLessons} محاضرة شاملة</span>
                          </div>

                          <div className="space-y-4">
                            {sections.length === 0 ? (
                              <p className="text-zinc-500 text-xs text-center py-12">المنهج الدراسي قيد التجهيز وسيتم نشره قريباً.</p>
                            ) : (
                              sections.map((mod, index) => {
                                const isOpen = openModuleIndex === index;
                                const durationMinutes = Math.round(mod.lessons.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / 60);

                                return (
                                  <div 
                                    key={mod.id}
                                    className="bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
                                  >
                                    <button
                                      onClick={() => setOpenModuleIndex(isOpen ? null : index)}
                                      className="w-full px-6 py-4 flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:bg-white/[0.02] transition-colors"
                                    >
                                      <span className="flex items-center gap-3 text-right">
                                        <BookOpen className="w-5 h-5 text-[#D6004B] shrink-0" />
                                        <span>{mod.title}</span>
                                      </span>
                                      <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
                                        <span>{mod.lessons.length} دروس ({durationMinutes} دقيقة)</span>
                                        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                      </div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {isOpen && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="border-t border-white/5 bg-black/40 overflow-hidden"
                                        >
                                          <div className="px-6 py-4 space-y-3.5">
                                            {mod.lessons.map((lesson, lIdx) => (
                                              <div 
                                                key={lesson.id} 
                                                onClick={() => {
                                                  if (lesson.is_preview) {
                                                    setActivePreviewLesson(lesson);
                                                  }
                                                }}
                                                className={`flex items-center justify-between gap-3 text-xs sm:text-sm py-2 border-b border-white/[0.02] last:border-b-0 transition-all duration-200 ${
                                                  lesson.is_preview 
                                                    ? "cursor-pointer text-zinc-300 hover:text-white hover:bg-emerald-500/[0.02] px-2.5 -mx-2.5 rounded-xl border-l-2 border-l-transparent hover:border-l-emerald-500" 
                                                    : "text-zinc-400"
                                                }`}
                                              >
                                                <span className="flex items-center gap-2.5 text-right">
                                                  <PlayCircle className={`w-4 h-4 shrink-0 transition-colors ${
                                                    lesson.is_preview ? "text-emerald-400" : "text-zinc-600"
                                                  }`} />
                                                  <span>{lesson.title}</span>
                                                </span>
                                                <div className="flex items-center gap-2.5">
                                                  <span className="text-[10px] text-zinc-500 font-medium shrink-0">
                                                    {lesson.lecture_type === "video" ? "فيديو مباشر" : lesson.lecture_type === "pdf" ? "ملف PDF" : "رابط خارجي"}
                                                  </span>
                                                  {lesson.is_preview && (
                                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black shrink-0 flex items-center gap-1 shadow-sm shadow-emerald-500/5 hover:bg-emerald-500/20 transition-all">
                                                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                      معاينة مجانية
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'certificate' && (
                        <motion.div
                          key="certificate"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6 text-center"
                        >
                          <div className="max-w-xl mx-auto bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                            <Award className="w-16 h-16 text-[#D6004B] mx-auto animate-pulse" />
                            <div className="space-y-2">
                              <h3 className="font-alexandria font-black text-white text-lg sm:text-xl">احصل على شهادتك المهنية المعتمدة</h3>
                              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                                بمجرد إنتهائك من سماعك جميع محاضرات الدورة ستحصل على شهادة احترافية بإسمك من "جو سكول"، بحيث تعزز من فرص قبولك في أفضل الوظائف.
                              </p>
                            </div>

                            {/* Certificate Mockup Frame */}
                            <div className="aspect-[1.414/1] bg-[#07070a] border border-white/10 rounded-2xl relative overflow-hidden shadow-2xl flex items-center justify-center w-full" style={{ containerType: 'inline-size' } as React.CSSProperties}>
                              <style dangerouslySetInnerHTML={{__html: `
                                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                              `}} />
                              {course.certificate_bg_url ? (
                                <>
                                  <img src={course.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-contain animate-fade-in" />
                                  <div className="absolute inset-0 z-10" style={{ color: course.certificate_text_color || "#000000" }}>
                                    <div 
                                      className="absolute whitespace-nowrap transition-all" 
                                      style={{ 
                                        left: `${course.certificate_name_x ?? 50}%`, 
                                        top: `${course.certificate_name_y ?? 47}%`, 
                                        fontSize: `calc(((${(() => {
                                          const name = "Mariem Mahmoud Alsayed";
                                          const nameLength = name.length;
                                          let lengthScale = 1.0;
                                          if (nameLength > 35) lengthScale = 0.55;
                                          else if (nameLength > 28) lengthScale = 0.65;
                                          else if (nameLength > 20) lengthScale = 0.8;
                                          return (course.certificate_name_size || 24) * lengthScale;
                                        })()}) / 800) * 100cqw)`,
                                        transform: 'translate(-50%, -50%)',
                                        fontFamily: "'Alike', serif",
                                        fontWeight: 'normal',
                                      }}
                                    >
                                      Mariem Mahmoud Alsayed
                                    </div>
                                    <div 
                                      className="absolute whitespace-nowrap font-mono" 
                                      style={{ 
                                        left: `${course.certificate_date_x ?? 15}%`, 
                                        top: `${course.certificate_date_y ?? 87}%`, 
                                        fontSize: `calc((${course.certificate_date_size || 14} / 800) * 100cqw)`,
                                        transform: 'translate(-50%, -50%)' 
                                      }}
                                    >
                                      {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-br from-zinc-900 to-zinc-950">
                                  <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-10" />
                                  
                                  <div className="flex justify-between items-start z-10">
                                    <div className="w-6 h-6 border-t-2 border-r-2 border-rose-500/20" />
                                    <span className="text-[8px] font-black text-rose-500/50 uppercase tracking-widest font-alexandria">JoeSchool Academy</span>
                                    <div className="w-6 h-6 border-t-2 border-l-2 border-rose-500/20" />
                                  </div>

                                  <div className="space-y-2 z-10">
                                    <h4 className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest font-alexandria">شهادة إتمام وتخرج رسمية</h4>
                                    <div className="text-sm font-alexandria font-bold text-white border-b border-white/5 pb-2 max-w-xs mx-auto">طالب متفوق ومتميز</div>
                                    <p className="text-zinc-500 text-[9px] max-w-xs mx-auto leading-relaxed">لاجتيازه كافة متطلبات الدورة التدريبية التطبيقية بنجاح.</p>
                                    <div className="text-rose-500 text-xs font-alexandria font-black">{course.title}</div>
                                  </div>

                                  <div className="flex justify-between items-end z-10 text-[8px] text-zinc-500 font-bold border-t border-white/5 pt-3">
                                    <div className="flex flex-col items-start">
                                      <span>كود التحقق:</span>
                                      <span className="text-zinc-400 font-mono">YA-CERT-XXXXX</span>
                                    </div>
                                    <div className="w-10 h-10 bg-white/5 border border-white/10 rounded flex items-center justify-center text-[6px] text-zinc-600">
                                      QR CODE
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}


                      {activeTab === 'faq' && (
                        <motion.div
                          key="faq"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                            <HelpCircle className="w-5 h-5 text-[#D6004B]" />
                            <h3 className="text-lg sm:text-xl font-alexandria font-bold text-white">الأسئلة المتكررة والشائعة</h3>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 space-y-2">
                              <h4 className="font-alexandria font-bold text-white text-sm sm:text-base">هل الكورس مسجل أم بث مباشر؟</h4>
                              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">المحتوى بأكمله مسجل مسبقاً بجودة سينمائية فائقة حتى تتمكن من الدراسة والمراجعة في أي وقت وبالسرعة التي تفضلها مدى الحياة.</p>
                            </div>
                            <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 space-y-2">
                              <h4 className="font-alexandria font-bold text-white text-sm sm:text-base">هل سأحصل على ملفات وقوالب العمل الجاهزة؟</h4>
                              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">نعم بالكامل! كل محاضرة فنية تطبيقية تشتمل على الملفات الجاهزة للتنزيل والتصدير للعمل بها فوراً في مشاريعك الخاصة.</p>
                            </div>
                            <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 space-y-2">
                              <h4 className="font-alexandria font-bold text-white text-sm sm:text-base">كيف يمكنني التواصل مع المحاضر في حال واجهتني مشكلة؟</h4>
                              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">يوجد مجتمع مخصص للطلاب تحت كل درس ومجموعات مجتمع الدعم الفني المباشر لحل المشاكل والإجابة على أي استفسار.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </motion.div>

              {/* Left Col: Enroll CTA Card (Sticky Desktop, hidden lg:block) */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="lg:col-span-4 hidden lg:block bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden lg:sticky lg:top-28"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent animate-pulse" />
                
                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-widest mb-2 font-alexandria">
                  {isEnrolled ? "بوابة الطالب" : "انضم للدورة الآن"}
                </span>

                {isEnrolled ? (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3.5 rounded-2xl text-xs font-bold justify-center font-cairo">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>حسابك مفعل ومسجل في القسم</span>
                    </div>

                    <Link
                      href={`/learn/${course.slug}/${firstLessonSlug}`}
                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
                    >
                      <span>ادخل مشغل الدروس الفنية</span>
                      <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center text-center gap-2 mb-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-alexandria">استثمار الانضمام للدورة</span>
                      <div className="flex items-baseline gap-2 justify-center flex-wrap">
                        <span className="text-4xl sm:text-5xl font-alexandria font-black text-white tracking-tight">
                          {coursePricing ? (coursePricing.price === 0 ? "مجاني" : formatPrice(coursePricing.price, currency)) : ""}
                        </span>
                      </div>
                      {coursePricing && coursePricing.original_price > coursePricing.price && (
                        <div className="flex items-center gap-2 justify-center text-xs font-cairo">
                          <span className="text-zinc-500 line-through font-alexandria">{formatPrice(coursePricing.original_price, currency)}</span>
                          <span className="text-zinc-500 font-medium">بدلاً من</span>
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md animate-pulse">
                            وفر {coursePricing.discount_pct}%
                          </span>
                        </div>
                      )}
                      {course.price > 0 && course.enable_gateway_fee !== false && (
                        <p className="text-[10px] text-zinc-500 text-center leading-relaxed font-cairo mt-1">
                          * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Link
                        href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
                        className="w-full h-14 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(214,0,75,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer font-cairo animate-pulse-glow"
                      >
                        <span>{course.price === 0 ? "ابدأ مجاناً 🎁" : (coursePricing && coursePricing.original_price > coursePricing.price) ? `اشترك الآن - خصم ${coursePricing.discount_pct}%` : "اشترك الآن"}</span>
                        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                      </Link>

                      <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs font-cairo">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>دفع مشفر بالكامل وضمان حماية مطلق</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5 my-6 pt-6 space-y-4 text-xs font-bold text-zinc-400 font-cairo">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#D6004B] shrink-0 mt-0.5" />
                    <span>إمكانية الوصول للمحاضرات مدى الحياة</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#D6004B] shrink-0 mt-0.5" />
                    <span>تحديثات مستمرة وملفات العمل متضمنة</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Award className="w-4 h-4 text-[#D6004B] shrink-0 mt-0.5" />
                    <span>شهادة إكمال رقمية بكود QR بعد الإنجاز</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ── Student Showcase Videos Infinite Loop Marquee ───────────────────────────── */}
        {course.showcase_videos && course.showcase_videos.length > 0 && (
          <section className="container mx-auto px-4 max-w-6xl mb-16 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-alexandria font-black text-white flex items-center gap-2 justify-start">
                  <Sparkles className="w-5 h-5 text-[#D6004B] animate-pulse" />
                  شاهد تجارب وقصص نجاح طلابنا واقعياً
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm font-cairo">اضغط على أي فيديو لمشاهدته وتكبير العرض (أبعاد 9:16)</p>
              </div>
            </div>
            
            <div dir="ltr" className="w-full overflow-hidden relative pt-2">
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0a0a0f] to-transparent z-20 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent z-20 pointer-events-none" />
              
              <div className="flex gap-6 animate-marquee-ltr py-2">
                {marqueeVideos.map((vid: any, idx: number) => (
                  <div key={idx} className="shrink-0 w-[200px] sm:w-[240px]">
                    <ShowcaseVideoCard video={vid} onClick={() => setActiveShowcaseVideo(vid)} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Student Reviews Section (Marquee matching showcase videos) */}
        <ProductReviews productId={course.id} initialReviews={allReviews} courseTitle={course.title} />

        {/* Smart Call-To-Action Banner (Yellow Box / New Premium Section) */}
        {!isEnrolled && (
          <section className="container mx-auto px-4 max-w-6xl mb-16">
            <div className="relative bg-gradient-to-br from-zinc-900 via-[#0a0a0f] to-zinc-950 border border-white/10 rounded-[2.5rem] p-8 sm:p-12 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* background glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-[#D6004B]/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 max-w-2xl text-right z-10">
                <span className="inline-flex items-center gap-1.5 bg-[#D6004B]/10 border border-[#D6004B]/20 text-[#D6004B] px-3.5 py-1.5 rounded-full text-xs font-bold font-alexandria">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>فرصة محدودة للتسجيل</span>
                </span>
                
                <h3 className="text-xl sm:text-3xl font-alexandria font-black text-white leading-tight">
                  هذه فرصتك الحقيقية للاشتراك واحتراف هذا المجال!
                </h3>
                
                <p className="text-zinc-400 text-xs sm:text-sm font-cairo leading-relaxed">
                  انضم اليوم إلى مئات المبدعين الذين غيروا مسارهم المهني وبدأوا بإنتاج قصص ومحتوى احترافي باستخدام أقوى تقنيات الذكاء الاصطناعي التوليدي.
                </p>

                <div className="flex flex-wrap gap-4 pt-2 text-xs text-zinc-300 font-bold font-cairo">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>وصول كامل مدى الحياة</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>شهادة إكمال معتمدة</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>ملفات عمل جاهزة للتطبيق</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center shrink-0 w-full sm:w-[320px] text-center z-10 relative">
                <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-20 pointer-events-none" />
                
                {coursePricing && coursePricing.original_price > 0 && (
                  <span className="text-xs sm:text-sm text-zinc-500 line-through mb-1 font-alexandria">
                    {formatPrice(coursePricing.original_price, currency)}
                  </span>
                )}
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl sm:text-4xl font-alexandria font-black text-white">
                    {coursePricing ? (coursePricing.price === 0 ? "مجاني" : formatPrice(coursePricing.price, currency)) : ""}
                  </span>
                  {coursePricing && coursePricing.original_price > 0 && (
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      وفر {Math.round(((coursePricing.original_price - coursePricing.price) / coursePricing.original_price) * 100)}%
                    </span>
                  )}
                </div>
                {course.price > 0 && course.enable_gateway_fee !== false && (
                  <p className="text-[10px] text-zinc-500 text-center leading-relaxed font-cairo mb-3 -mt-1">
                    * قد يتم إضافة رسوم معالجة دفع بسيطة أثناء إتمام الطلب.
                  </p>
                )}
                <p className="text-[10px] text-zinc-500 font-medium font-cairo mb-6">احصل على السعر المخفض فوراً اليوم</p>

                <Link
                  href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
                  className="w-full h-12 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-bold text-sm shadow-[0_10px_25px_rgba(214,0,75,0.3)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
                >
                  <span>سجل في القسم الآن</span>
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                </Link>
                {course.price > 0 && (
                  <button
                    onClick={handleAddToCart}
                    className="w-full mt-2 h-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>إضافة إلى السلة</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Smart Category Course Recommendations — Premium Redesign */}
        {recommendedCourses.length > 0 && (
          <section className="container mx-auto px-4 max-w-6xl mt-20 mb-8">
            <div className="relative bg-gradient-to-b from-white/[0.02] to-transparent border border-white/5 rounded-[2.5rem] p-8 sm:p-12 overflow-hidden">
              {/* Background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#D6004B]/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 space-y-8">
                <div className="text-center space-y-2">
                  <span className="inline-flex items-center gap-1.5 bg-[#D6004B]/10 border border-[#D6004B]/20 text-[#D6004B] px-3.5 py-1.5 rounded-full text-[10px] font-bold font-alexandria">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    <span>أقسام مقترحة لك</span>
                  </span>
                  <h3 className="text-xl sm:text-2xl font-alexandria font-black text-white">
                    محتوى ذو صلة قد يعجبك
                  </h3>
                  <p className="text-zinc-500 text-xs font-cairo max-w-md mx-auto">اكتشف المزيد من الأقسام التدريبية المميزة لتعزيز مهاراتك واحتراف مجالك</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedCourses.map((item) => {
                    const itemPricing = resolveProductPrice(item as any, currency);
                    return (
                      <Link
                        key={item.id}
                        href={`/courses/${item.slug}`}
                        className="group relative bg-[#09090e] border border-white/5 hover:border-[#D6004B]/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 cursor-pointer"
                      >
                        {/* Image */}
                        <div className="relative aspect-video bg-zinc-950 overflow-hidden">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#12121c] to-[#09090e] flex items-center justify-center">
                              <BookOpen className="w-10 h-10 text-zinc-800" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#09090e] via-transparent to-transparent" />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <span className="bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[9px] font-black text-[#D6004B] font-alexandria">
                              {item.category}
                            </span>
                          </div>
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 bg-[#D6004B]/90 backdrop-blur-xl rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(214,0,75,0.4)] border border-white/20">
                              <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold font-alexandria">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-orange-500" />
                                {item.duration_hours} ساعة
                              </span>
                              <span className="w-[1px] h-3 bg-white/10" />
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-[#D6004B]" />
                                {item.lessons_count} محاضرة
                              </span>
                              <span className="w-[1px] h-3 bg-white/10" />
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                5.0
                              </span>
                            </div>

                            <h4 className="text-sm font-alexandria font-bold text-white group-hover:text-[#D6004B] transition-colors line-clamp-2 leading-snug">
                              {item.title}
                            </h4>
                          </div>

                          <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-lg font-alexandria font-black text-white">
                                {itemPricing.price === 0 ? "مجاني" : formatPrice(itemPricing.price, currency)}
                              </span>
                              {itemPricing.original_price > itemPricing.price && (
                                <span className="text-[10px] text-zinc-500 line-through font-alexandria">{formatPrice(itemPricing.original_price, currency)}</span>
                              )}
                            </div>
                            
                            <div className="h-8 px-3.5 bg-[#D6004B]/10 hover:bg-[#D6004B] border border-[#D6004B]/20 hover:border-[#D6004B] text-[#D6004B] hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all font-cairo">
                              <span>عرض التفاصيل</span>
                              <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        </div>

        <MobileCourseView
          course={course}
          sections={sections}
          isEnrolled={isEnrolled}
          firstLessonSlug={firstLessonSlug}
          totalLessons={totalLessons}
          averageRating={averageRating}
          reviewsCount={reviewsCount}
          allReviews={allReviews}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openModuleIndex={openModuleIndex}
          setOpenModuleIndex={setOpenModuleIndex}
          previewVideoUrl={previewVideoUrl}
          isEmbed={isEmbed}
          getEmbedUrl={getEmbedUrl}
          isMuted={isMuted}
          hasInteracted={hasInteracted}
          handleUnmuteAndStart={handleUnmuteAndStart}
          mobileVideoRef={mobileVideoRef}
          onShowcaseVideoClick={setActiveShowcaseVideo}
          marqueeVideos={marqueeVideos}
          onPreviewLessonClick={setActivePreviewLesson}
          isMobileOnly={isClient && isMobile}
          onAddToCart={handleAddToCart}
          currency={currency}
        />

        {/* Global Styles for Marquee */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes marquee-ltr {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0%); }
          }
          .animate-marquee-ltr {
            display: flex;
            width: max-content;
            animation: marquee-ltr 70s linear infinite;
          }
          .animate-marquee-ltr:hover {
            animation-play-state: paused;
          }
        `}} />

        {/* Showcase Video Modal Overlay */}
        <AnimatePresence>
          {activeShowcaseVideo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6"
              onClick={() => setActiveShowcaseVideo(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-[340px] xs:max-w-[360px] aspect-[9/16] bg-[#07070a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Close Button */}
                <button 
                  onClick={() => setActiveShowcaseVideo(null)}
                  className="absolute top-4 right-4 z-[10000] p-2 bg-black/85 hover:bg-black text-white rounded-full transition-colors cursor-pointer border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Secure Video Player */}
                <ShowcaseModalPlayer video={activeShowcaseVideo} preFetchedUrl={showcaseUrls[activeShowcaseVideo.videoId || activeShowcaseVideo.id]} />
              </motion.div>
            </motion.div>
          )}
        

          {activePreviewLesson && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6"
              onClick={() => setActivePreviewLesson(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl aspect-video bg-[#07070a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
                onClick={e => e.stopPropagation()}
              >
                {/* Header title */}
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent px-6 flex items-center justify-between text-white z-[10000] pointer-events-none select-none">
                  <span className="font-alexandria font-bold text-xs sm:text-sm text-white/90 drop-shadow-md truncate max-w-md pointer-events-auto">
                    معاينة مجانية: {activePreviewLesson.title}
                  </span>
                  <button 
                    onClick={() => setActivePreviewLesson(null)}
                    className="p-2 bg-black/80 hover:bg-black/95 text-white rounded-full transition-colors cursor-pointer border border-white/10 pointer-events-auto shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Video Iframe Container */}
                <div className="w-full h-full bg-black relative">
                  <iframe 
                    src={`/api/video/embed/${activePreviewLesson.id}?autoplay=true&muted=false`}
                    className="w-full h-full border-0 absolute inset-0 z-10"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    referrerPolicy="origin"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Purchase Bar (Mobile/Sticky Mode) */}
      {!isEnrolled && (
        <div className="fixed bottom-0 inset-x-0 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/10 py-3.5 px-5 z-50 flex items-center justify-between lg:hidden transition-all duration-300 gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col shrink-0 text-right">
            <span className="text-[9px] text-zinc-400 font-bold font-cairo">استثمار الانضمام للدورة</span>
            <span className="text-base font-alexandria font-black text-[#D6004B]">
              {coursePricing ? (coursePricing.price === 0 ? "مجاناً" : formatPrice(coursePricing.price, currency)) : ""}
            </span>
          </div>
          <div className="flex gap-2 flex-grow justify-end items-center">
            <Link
              href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
              className="h-12 px-5 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 transition-all shadow-[0_4px_20px_rgba(214,0,75,0.45)] font-cairo flex-grow max-w-[240px] active:scale-95 animate-pulse-glow"
            >
              <span>{course.price === 0 ? "ابدأ مجاناً 🎁" : (coursePricing && coursePricing.original_price > coursePricing.price) ? `اشترك الآن - خصم ${coursePricing.discount_pct}%` : "اشترك الآن"}</span>
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            </Link>
            {course.price > 0 && (
              <button
                onClick={handleAddToCart}
                className="h-12 w-12 shrink-0 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                title="إضافة إلى السلة"
              >
                <ShoppingCart className="w-4.5 h-4.5 text-zinc-300" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

interface MobileCourseViewProps {
  onPreviewLessonClick?: (lesson: LmsLesson) => void;
  course: LmsCourse;
  sections: (LmsSection & { lessons: LmsLesson[] })[];
  isEnrolled: boolean;
  firstLessonSlug: string;
  totalLessons: number;
  averageRating: number | string;
  reviewsCount: number;
  allReviews: any[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  openModuleIndex: number | null;
  setOpenModuleIndex: (index: number | null) => void;
  previewVideoUrl?: string;
  isEmbed: boolean;
  getEmbedUrl: (url: string, autoplay: boolean) => string;
  isMuted: boolean;
  hasInteracted: boolean;
  handleUnmuteAndStart: () => void;
  mobileVideoRef: React.RefObject<HTMLVideoElement | null>;
  onShowcaseVideoClick: (video: ShowcaseVideo) => void;
  marqueeVideos: any[];
  isMobileOnly?: boolean;
  onAddToCart?: () => void;
  currency: Currency;
}

function MobileCourseView({
  course,
  sections,
  isEnrolled,
  firstLessonSlug,
  totalLessons,
  averageRating,
  reviewsCount,
  allReviews,
  activeTab,
  setActiveTab,
  openModuleIndex,
  setOpenModuleIndex,
  previewVideoUrl,
  isEmbed,
  getEmbedUrl,
  isMuted,
  hasInteracted,
  handleUnmuteAndStart,
  mobileVideoRef,
  onShowcaseVideoClick,
  marqueeVideos,
  onPreviewLessonClick,
  isMobileOnly = false,
  onAddToCart,
  currency,
}: MobileCourseViewProps) {
  const coursePricing = resolveProductPrice(course as any, currency);

  return (
    <div className="block md:hidden space-y-6 px-4 pb-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(214, 0, 75, 0.4); }
          50% { box-shadow: 0 0 30px rgba(214, 0, 75, 0.7); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
      `}} />

      {/* Dynamic Urgency / Scarcity Banner */}
      {!isEnrolled && coursePricing && coursePricing.original_price > coursePricing.price && (
        <div className="bg-gradient-to-r from-amber-500/20 via-[#D6004B]/20 to-pink-500/20 border border-[#D6004B]/35 rounded-2xl p-3 flex items-center justify-between text-right text-xs text-white gap-2 shadow-[0_0_25px_rgba(214,0,75,0.2)] mt-2 animate-bounce-subtle">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-bold text-[10px] sm:text-xs">عرض لفترة محدودة: خصم {coursePricing.discount_pct}% مفعل حالياً!</span>
          </div>
          <div className="bg-[#D6004B] text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider animate-pulse shrink-0">
            سارع بالاشتراك
          </div>
        </div>
      )}

      {/* 1. Title & Marketing Badges */}
      <div className="text-center pt-2 space-y-3">
        <h1 className="text-xl sm:text-2xl font-alexandria font-black text-white leading-tight">
          {course.title}
        </h1>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="bg-[#D6004B]/10 border border-[#D6004B]/20 text-[#D6004B] text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">الأكثر مبيعاً 🔥</span>
          <span className="bg-white/5 border border-white/10 text-zinc-300 text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">تفعيل تلقائي وفوري ⚡</span>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full font-cairo">ضمان استرداد 🛡️</span>
        </div>
      </div>

      {/* 2. Video Player */}
      <div className="aspect-video bg-[#0a0a0f] border border-white/5 rounded-2xl overflow-hidden relative shadow-2xl group w-full">
        {previewVideoUrl ? (
          isEmbed ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              <div className="relative w-full h-full bg-black">
                <iframe 
                  src={getEmbedUrl(previewVideoUrl, hasInteracted)}
                  className="w-full h-full border-none"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  referrerPolicy="origin"
                />
              </div>
              {!hasInteracted && (
                <div 
                  onClick={handleUnmuteAndStart}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer group/unmute transition-all"
                >
                  <div className="absolute inset-0 bg-black/30 group-hover/unmute:bg-black/15 transition-colors" />
                  <motion.div 
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-16 h-16 bg-[#D6004B]/90 backdrop-blur-xl border-2 border-white/20 rounded-full flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(214,0,75,0.5)] group-hover/unmute:shadow-[0_0_50px_rgba(214,0,75,0.7)] transition-shadow"
                  >
                    <Play className="w-6 h-6 text-white fill-current ml-1" />
                  </motion.div>
                  <span className="relative text-[11px] font-cairo font-bold text-white/80 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-lg border border-white/10 group-hover/unmute:text-white transition-all flex items-center gap-1.5">
                    <VolumeX className="w-3 h-3" />
                    اضغط لفتح الصوت
                  </span>
                </div>
              )}
            </div>
          ) : (
            <CustomVideoPlayer 
              src={previewVideoUrl}
              poster={course.image_url || undefined}
              className="w-full h-full"
            />
          )
        ) : (
          <>
            {course.image_url ? (
              <img 
                src={course.image_url} 
                alt={course.title} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-30 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-zinc-700" />
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Small Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
         {/* Card 1: Duration */}
         <div className="bg-[#0b0b12]/50 border border-white/5 p-2 rounded-xl flex flex-col items-center justify-center text-center hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/70 transition-all select-none">
            <Clock className="w-4 h-4 text-rose-500 mb-1 shrink-0" />
            <span className="text-[9px] text-zinc-400 font-bold leading-none mb-0.5">المدة</span>
            <span className="text-xs text-white font-alexandria font-bold leading-none">
              {course.duration_hours >= 1
                ? `${course.duration_hours} س`
                : course.duration_hours > 0
                ? `${Math.round(course.duration_hours * 60)} د`
                : (totalLessons > 0 ? '—' : '0 س')
              }
            </span>
         </div>

         {/* Card 2: Lectures */}
         <div className="bg-[#0b0b12]/50 border border-white/5 p-2 rounded-xl flex flex-col items-center justify-center text-center hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/70 transition-all select-none">
            <BookOpen className="w-4 h-4 text-rose-500 mb-1 shrink-0" />
            <span className="text-[9px] text-zinc-400 font-bold leading-none mb-0.5">المحاضرات</span>
            <span className="text-xs text-white font-alexandria font-bold leading-none">
              {totalLessons > 0 ? totalLessons : course.lessons_count}
            </span>
         </div>

         {/* Card 3: Rating */}
         <div className="bg-[#0b0b12]/50 border border-white/5 p-2 rounded-xl flex flex-col items-center justify-center text-center hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/70 transition-all select-none">
            <Star className="w-4 h-4 text-yellow-400 fill-current mb-1 shrink-0" />
            <span className="text-[9px] text-zinc-400 font-bold leading-none mb-0.5">التقييم</span>
            <span className="text-xs text-white font-alexandria font-bold leading-none">
              {averageRating}
            </span>
         </div>

         {/* Card 4: Certificate */}
         <div className="bg-[#0b0b12]/50 border border-white/5 p-2 rounded-xl flex flex-col items-center justify-center text-center hover:border-[#D6004B]/30 hover:bg-[#0b0b12]/70 transition-all select-none">
            <Award className="w-4 h-4 text-emerald-500 mb-1 shrink-0" />
            <span className="text-[9px] text-zinc-400 font-bold leading-none mb-0.5">الشهادة</span>
            <span className="text-[10px] text-emerald-400 font-black leading-none">إحترافية</span>
         </div>
      </div>

      {/* 4. Professional CTA */}
      <div className="bg-gradient-to-br from-[#0e0e1a] to-[#07070d] border border-white/10 rounded-2xl p-5 shadow-[0_15px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent animate-pulse" />
         
         {isEnrolled ? (
           <div className="space-y-3.5 text-center">
             <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl text-xs font-bold justify-center">
               <CheckCircle2 className="w-5 h-5" />
               <span>حسابك مفعل ومسجل في القسم</span>
             </div>
             <Link
               href={`/learn/${course.slug}/${firstLessonSlug}`}
               className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-[0_8px_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
             >
               <span>ادخل مشغل الدروس الفنية</span>
               <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
             </Link>
           </div>
         ) : (
           <div className="space-y-5">
             <div className="flex items-center justify-between">
               <span className="text-[10px] text-zinc-400 font-bold font-alexandria uppercase tracking-wider">سعر الاستثمار الحالي</span>
               {coursePricing && coursePricing.original_price > coursePricing.price && (
                   <span className="text-xs text-zinc-500 line-through font-alexandria">بدلاً من {formatPrice(coursePricing.original_price, currency)}</span>
                )}
             </div>
             
             <div className="flex items-baseline justify-between gap-2">
               <div className="flex items-baseline gap-2">
                 <span className="text-2xl sm:text-3xl font-alexandria font-black text-white">
                    {coursePricing ? (coursePricing.price === 0 ? "مجاني" : formatPrice(coursePricing.price, currency)) : ""}
                 </span>
                 {coursePricing && coursePricing.original_price > coursePricing.price && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md animate-pulse">
                       وفر {coursePricing.discount_pct}%
                    </span>
                  )}
               </div>
               <span className="text-[8.5px] text-zinc-400">وصول كامل مدى الحياة</span>
             </div>

             <Link
               href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
               className="w-full h-14 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-xl font-black text-base sm:text-lg shadow-[0_10px_30px_rgba(214,0,75,0.4)] transition-all flex items-center justify-center gap-2.5 active:scale-98 cursor-pointer font-cairo animate-pulse-glow"
             >
               <span>{course.price === 0 ? "ابدأ مجاناً 🎁" : (coursePricing && coursePricing.original_price > coursePricing.price) ? `اشترك الآن - خصم ${coursePricing.discount_pct}%` : "اشترك الآن"}</span>
               <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
             </Link>
              {course.price > 0 && onAddToCart && (
                <button
                  onClick={onAddToCart}
                  className="w-full mt-2 h-11 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>إضافة إلى السلة</span>
                </button>
              )}

             <div className="flex justify-around pt-2 border-t border-white/5 text-[8.5px] text-zinc-400 font-bold font-cairo">
               <div className="flex items-center gap-1">
                 <CheckCircle2 className="w-3.5 h-3.5 text-[#D6004B]" />
                 <span>تحديثات مستمرة</span>
               </div>
               <div className="flex items-center gap-1">
                 <CheckCircle2 className="w-3.5 h-3.5 text-[#D6004B]" />
                 <span>ملفات العمل</span>
               </div>
               <div className="flex items-center gap-1">
                 <CheckCircle2 className="w-3.5 h-3.5 text-[#D6004B]" />
                 <span>ضمان استرجاع</span>
               </div>
             </div>
           </div>
         )}
      </div>

      {/* 5. Mobile Tabbed Content Box */}
      <div className="bg-[#09090e] border border-white/5 rounded-2xl p-4 space-y-4">
         {/* Tab switches: centered premium tab bar with icons */}
         <div className="flex items-center justify-around border-b border-white/5 pb-2 w-full">
            {[
              { id: 'overview', label: 'الوصف', icon: FileText },
              { id: 'curriculum', label: 'المنهج', icon: BookOpen },
              { id: 'certificate', label: 'الشهادة', icon: Award },
              { id: 'faq', label: 'الأسئلة', icon: HelpCircle }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-3 transition-all relative cursor-pointer font-alexandria font-bold text-xs flex-1 text-center select-none",
                    isActive ? "text-[#D6004B]" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <TabIcon className={cn("w-4.5 h-4.5 mb-0.5", isActive ? "text-[#D6004B]" : "text-zinc-500")} />
                  <span className="text-[10.5px]">{tab.label}</span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabIndicatorMobile" 
                      className="absolute bottom-0 h-[2.5px] bg-[#D6004B] rounded-full w-10" 
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
         </div>

         {/* Tab Contents */}
         <div className="pt-2">
           <AnimatePresence mode="wait">
             {activeTab === 'overview' && (
               <motion.div
                 key="overview-mobile"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-6"
               >
                 {/* Course Description */}
                 {course.description ? (
                   <div className="text-zinc-300 font-cairo text-xs leading-[1.8] space-y-4" dangerouslySetInnerHTML={{ __html: course.description.replace(/\n/g, '<br/>') }} />
                 ) : (
                   <p className="text-zinc-400 font-cairo text-xs leading-[1.8]">هذا المسار يحتوي على شرح مفصل وتطبيق شامل لمهارات صناعة المحتوى بالذكاء الاصطناعي وإنتاج الفيديو الإبداعي بأقوى الأدوات الرقمية.</p>
                 )}

                 {/* Checklist: What You'll Learn */}
                 {course.what_will_learn && course.what_will_learn.length > 0 && (
                   <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl relative overflow-hidden">
                     <div className="absolute -top-5 -right-5 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                     <h3 className="text-xs font-alexandria font-bold text-white flex items-center gap-2 relative z-10">
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                       ماذا ستتعلم وتنجز عملياً؟
                     </h3>
                     <div className="flex flex-col gap-2 relative z-10">
                       {course.what_will_learn.map((feat, fIdx) => (
                         <div key={fIdx} className="flex items-start gap-2 bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                           <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                           <span className="text-zinc-300 text-xs leading-relaxed">{feat}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Course Requirements */}
                 {course.requirements && course.requirements.length > 0 && (
                   <div className="bg-[#050508] border border-white/5 rounded-2xl p-4 space-y-3">
                     <h3 className="text-xs font-alexandria font-bold text-white flex items-center gap-2">
                       <AlertCircle className="w-4 h-4 text-rose-500" />
                       متطلبات البدء في القسم
                     </h3>
                     <ul className="space-y-2 text-xs text-zinc-400 list-disc pr-4">
                       {course.requirements.map((req, rIdx) => (
                         <li key={rIdx} className="leading-relaxed">{req}</li>
                       ))}
                     </ul>
                   </div>
                 )}

                 {/* Target Audience */}
                 {course.who_is_for && course.who_is_for.length > 0 && (
                   <div className="bg-[#050508] border border-white/5 rounded-2xl p-4 space-y-3">
                     <h3 className="text-xs font-alexandria font-bold text-white flex items-center gap-2">
                       <Users className="w-4 h-4 text-blue-500" />
                       من هو الفرد المستهدف؟
                     </h3>
                     <div className="flex flex-col gap-2">
                       {course.who_is_for.map((aud, aIdx) => (
                         <div key={aIdx} className="flex items-center gap-2 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                           <span className="text-zinc-300 text-xs">{aud}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </motion.div>
             )}

             {activeTab === 'curriculum' && (
               <motion.div
                 key="curriculum-mobile"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                   <h3 className="text-xs font-alexandria font-bold text-white">منهج الوحدات والمواضيع الدراسية</h3>
                   <span className="text-[9.5px] text-zinc-500 font-bold">{sections.length} وحدات رئيسية • {totalLessons} محاضرة شاملة</span>
                 </div>

                 <div className="space-y-3">
                   {sections.length === 0 ? (
                     <p className="text-zinc-500 text-[10px] text-center py-8">المنهج الدراسي قيد التجهيز وسيتم نشره قريباً.</p>
                   ) : (
                     sections.map((mod, index) => {
                       const isOpen = openModuleIndex === index;
                       const durationMinutes = Math.round(mod.lessons.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / 60);

                       return (
                         <div 
                           key={mod.id}
                           className="bg-[#050508] border border-white/5 rounded-xl overflow-hidden transition-all duration-300"
                         >
                           <button
                             onClick={() => setOpenModuleIndex(isOpen ? null : index)}
                             className="w-full px-4 py-3 flex items-center justify-between gap-3 font-bold text-xs text-white hover:bg-white/[0.02] transition-colors"
                           >
                             <span className="flex items-center gap-2 text-right">
                               <BookOpen className="w-4 h-4 text-[#D6004B] shrink-0" />
                               <span>{mod.title}</span>
                             </span>
                             <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 shrink-0">
                               <span>{mod.lessons.length} درس</span>
                               <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                             </div>
                           </button>

                           <AnimatePresence initial={false}>
                             {isOpen && (
                               <motion.div
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: "auto", opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 transition={{ duration: 0.2 }}
                                 className="overflow-hidden border-t border-white/5 bg-black/40"
                               >
                                 <div className="py-2 px-4 divide-y divide-white/5">
                                   {mod.lessons.map((lesson) => {
                                      const lMinutes = Math.floor((lesson.duration_seconds || 0) / 60);
                                      const lSeconds = (lesson.duration_seconds || 0) % 60;
                                      
                                      return (
                                        <div 
                                          key={lesson.id}
                                          onClick={() => {
                                            if (lesson.is_preview) {
                                              onPreviewLessonClick?.(lesson);
                                            }
                                          }}
                                          className={`py-2.5 flex items-center justify-between gap-4 text-xs transition-all duration-200 ${
                                            lesson.is_preview ? "cursor-pointer hover:bg-emerald-500/[0.02] px-2 -mx-2 rounded-xl" : ""
                                          }`}
                                        >
                                          <div className="flex items-start gap-2.5 text-right min-w-0 flex-1">
                                            <PlayCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                                              lesson.is_preview ? "text-emerald-400" : "text-[#D6004B]"
                                            }`} />
                                            <div className="flex flex-col min-w-0">
                                              <span className={`font-medium leading-relaxed truncate ${
                                                lesson.is_preview ? "text-white font-bold" : "text-zinc-200"
                                              }`}>{lesson.title}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {lesson.is_preview && (
                                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black shrink-0 flex items-center gap-1 shadow-sm shadow-emerald-500/5 hover:bg-emerald-500/20 transition-all">
                                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                معاينة
                                              </span>
                                            )}
                                            <span className="text-[9px] text-zinc-500 font-mono">
                                              {lMinutes}:{lSeconds < 10 ? `0${lSeconds}` : lSeconds} د
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       );
                     })
                   )}
                 </div>
               </motion.div>
             )}

             {activeTab === 'certificate' && (
               <motion.div
                 key="certificate-mobile"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                   <Award className="w-4 h-4 text-[#D6004B]" />
                   <h3 className="text-xs font-alexandria font-bold text-white">الشهادة المهنية المعتمدة</h3>
                 </div>
                 <p className="text-zinc-400 text-xs leading-relaxed font-cairo">
                   بمجرد إنتهائك من سماعك جميع محاضرات الدورة ستحصل على شهادة احترافية بإسمك من "جو سكول"، بحيث تعزز من فرص قبولك في أفضل الوظائف.
                 </p>

                 {course.certificate_bg_url ? (
                    <div className="relative w-full aspect-[1.414/1] bg-[#07070a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center" style={{ containerType: 'inline-size' } as any}>
                      <style dangerouslySetInnerHTML={{__html: `
                        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                      `}} />
                      <img src={course.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-contain animate-fade-in" />
                      <div className="absolute inset-0 z-10" style={{ color: course.certificate_text_color || "#000000" }}>
                        <div 
                          className="absolute whitespace-nowrap transition-all" 
                          style={{ 
                            left: `${course.certificate_name_x ?? 50}%`, 
                            top: `${course.certificate_name_y ?? 47}%`, 
                            fontSize: `calc(((${(() => {
                              const name = "Mariem Mahmoud Alsayed";
                              const nameLength = name.length;
                              let lengthScale = 1.0;
                              if (nameLength > 35) lengthScale = 0.55;
                              else if (nameLength > 28) lengthScale = 0.65;
                              else if (nameLength > 20) lengthScale = 0.8;
                              return (course.certificate_name_size || 24) * lengthScale;
                            })()}) / 800) * 100cqw)`,
                            transform: 'translate(-50%, -50%)',
                            fontFamily: "'Alike', serif",
                            fontWeight: 'normal',
                          }}
                        >
                          Mariem Mahmoud Alsayed
                        </div>
                        <div 
                          className="absolute whitespace-nowrap font-mono" 
                          style={{ 
                            left: `${course.certificate_date_x ?? 15}%`, 
                            top: `${course.certificate_date_y ?? 87}%`, 
                            fontSize: `calc((${course.certificate_date_size || 14} / 800) * 100cqw)`,
                            transform: 'translate(-50%, -50%)' 
                          }}
                        >
                          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                 ) : (
                   <div className="w-full aspect-[1.414/1] bg-white/5 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                     <span className="text-zinc-500 font-bold text-xs">لا يوجد صورة لمعاينة الشهادة حالياً</span>
                   </div>
                 )}
               </motion.div>
             )}

             

             {activeTab === 'faq' && (
               <motion.div
                 key="faq-mobile"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-3"
               >
                 <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                   <HelpCircle className="w-4 h-4 text-[#D6004B]" />
                   <h3 className="text-xs font-alexandria font-bold text-white">الأسئلة المتكررة</h3>
                 </div>

                 <div className="space-y-2.5">
                   <div className="bg-[#050508] border border-white/5 rounded-xl p-4 space-y-1.5">
                     <h4 className="font-alexandria font-bold text-white text-[11px]">هل الكورس مسجل أم بث مباشر؟</h4>
                     <p className="text-zinc-400 text-[10px] leading-relaxed">المحتوى بأكمله مسجل مسبقاً بجودة سينمائية فائقة حتى تتمكن من الدراسة والمراجعة في أي وقت وبالسرعة التي تفضلها مدى الحياة.</p>
                   </div>
                   <div className="bg-[#050508] border border-white/5 rounded-xl p-4 space-y-1.5">
                     <h4 className="font-alexandria font-bold text-white text-[11px]">هل سأحصل على ملفات وقوالب العمل الجاهزة؟</h4>
                     <p className="text-zinc-400 text-[10px] leading-relaxed">نعم بالكامل! كل محاضرة فنية تطبيقية تشتمل على الملفات الجاهزة للتنزيل والتصدير للعمل بها فوراً في مشاريعك الخاصة.</p>
                   </div>
                   <div className="bg-[#050508] border border-white/5 rounded-xl p-4 space-y-1.5">
                     <h4 className="font-alexandria font-bold text-white text-[11px]">كيف يمكنني التواصل مع المحاضر في حال واجهتني مشكلة؟</h4>
                     <p className="text-zinc-400 text-[10px] leading-relaxed">يوجد مجتمع مخصص للطلاب تحت كل درس ومجموعات مجتمع الدعم الفني المباشر لحل المشاكل والإجابة على أي استفسار.</p>
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
         </div>
      </div>

      {/* 6. Showcase Videos Loop (Marquee LTR) */}
      {course.showcase_videos && course.showcase_videos.length > 0 && (
        <div className="space-y-4 overflow-hidden py-4">
           <h3 className="text-base font-alexandria font-black text-center text-white flex items-center gap-2 justify-center">
             <Sparkles className="w-4 h-4 text-[#D6004B] animate-pulse" />
             قصص نجاح وتجارب طلابنا
           </h3>
           
           <div dir="ltr" className="w-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#050505] to-transparent z-20 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#050505] to-transparent z-20 pointer-events-none" />
              
              <div className="flex gap-4 animate-marquee-ltr">
                {marqueeVideos.map((vid: any, idx: number) => (
                  <div key={idx} className="shrink-0 w-[140px] sm:w-[160px]">
                     <ShowcaseVideoCard video={vid} onClick={() => onShowcaseVideoClick(vid)} />
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Student Reviews Section (Marquee matching showcase videos) */}
      <ProductReviews productId={course.id} initialReviews={allReviews} courseTitle={course.title} />

      {/* 7. Final Urgency CTA Reminder */}
      {!isEnrolled && (
        <div className="relative bg-gradient-to-br from-[#12080c] via-[#090507] to-[#050508] border border-white/10 rounded-2xl p-5 overflow-hidden shadow-2xl text-center space-y-4">
           <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#D6004B]/10 rounded-full blur-2xl pointer-events-none" />
           
           <span className="inline-flex items-center gap-1.5 bg-[#D6004B]/15 border border-[#D6004B]/20 text-[#D6004B] px-3 py-1 rounded-full text-[8.5px] font-bold font-alexandria">
             <Sparkles className="w-3 h-3 animate-pulse" />
             <span>العرض ينتهي قريباً جداً</span>
           </span>
           
           <h3 className="text-sm font-alexandria font-black text-white leading-tight">
             الخصم المتاح خصم مؤقت وقد يتغير السعر في أي لحظة!
           </h3>
           
           <p className="text-zinc-400 text-[10px] font-cairo leading-relaxed">
             ابدأ اليوم واستفد من هذا الاستثمار المميز لاحتراف صناعة المحتوى والذكاء الاصطناعي وبناء مستقبلك الإبداعي والمهني.
           </p>
           
           <Link
             href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
             className="w-full h-13 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-xl font-black text-sm sm:text-base shadow-[0_10px_25px_rgba(214,0,75,0.35)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer font-cairo animate-pulse-glow"
           >
              <span>{course.price === 0 ? "ابدأ مجاناً 🎁" : (coursePricing && coursePricing.original_price > coursePricing.price) ? `اشترك الآن - خصم ${coursePricing.discount_pct}%` : "اشترك الآن"}</span>
             <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
           </Link>
        </div>
      )}

      {/* 8. Small Custom Footer */}
      <footer className="border-t border-white/5 pt-6 pb-24 flex flex-col items-center gap-4 text-center text-zinc-500 text-[9px] w-full">
         <Link href="/" className="flex items-center group">
           <img src="/logo-text.png" alt="JoeSchool" className="h-6 object-contain" />
         </Link>
         
         <div className="flex flex-wrap justify-center gap-3 font-bold">
           <Link href="/privacy?tab=privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
           <span>·</span>
           <Link href="/privacy?tab=refund" className="hover:text-white transition-colors">سياسة الإسترجاع</Link>
           <span>·</span>
           <Link href="/privacy?tab=terms" className="hover:text-white transition-colors">الشروط والأحكام</Link>
           <span>·</span>
           <a href="mailto:support@joeschool.com" className="hover:text-white transition-colors">الدعم الفني</a>
         </div>

         <div className="flex justify-center scale-90">
           <SocialLinks />
         </div>

         <div className="text-zinc-600">
           جميع الحقوق محفوظة © {new Date().getFullYear()} JoeSchool
         </div>
      </footer>

      {/* Sticky Mobile CTA */}
      {!isEnrolled && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest font-alexandria">السعر الحالي</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-alexandria font-black text-white">
                {coursePricing ? (coursePricing.price === 0 ? "مجاني" : formatPrice(coursePricing.price, currency)) : ""}
              </span>
              {coursePricing && coursePricing.original_price > 0 && (
                <span className="text-[10px] text-zinc-500 line-through font-alexandria">
                  {formatPrice(coursePricing.original_price, currency)}
                </span>
              )}
            </div>
          </div>
          <Link
            href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
            className="flex-1 h-12 bg-gradient-to-r from-[#D6004B] via-[#ff1d6b] to-[#D6004B] text-white rounded-xl font-black text-sm shadow-[0_5px_15px_rgba(214,0,75,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer font-cairo animate-pulse-glow"
          >
            <span>{course.price === 0 ? "مجاناً الان" : "اشترك الآن"}</span>
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      )}
    </div>
  );
}
