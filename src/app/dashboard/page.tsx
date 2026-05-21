"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  User, BookOpen, Download, Award, Settings, LogOut, 
  Loader2, Sparkles, ShieldCheck, CheckCircle2, ChevronLeft, 
  ExternalLink, PlayCircle, Clock, FileText, ArrowLeft, RefreshCw, X, Printer, Send, Heart, Trash2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  getCoursesList, getUserEnrollments, getCourseProgressPercent, 
  getUserCertificates, getCourseBySlug, getStudentStudyHours,
  trackActiveSession, checkSessionIsValid, type LmsCourse, type LmsCertificate 
} from "@/lib/coursesDb";
import { fetchUserWishlist, removeFromWishlist } from "@/lib/wishlist";


export default function DashboardPage() {
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("courses");

  // Dynamic user data states
  const [enrolledCourses, setEnrolledCourses] = useState<(LmsCourse & { progress: number; completedCount: number; totalCount: number; firstLessonSlug: string; lastLessonSlug?: string })[]>([]);
  const [certificates, setCertificates] = useState<LmsCertificate[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [isRemovingWishlistId, setIsRemovingWishlistId] = useState<string | null>(null);
  const [studyStats, setStudyStats] = useState({ totalSeconds: 0, completedCount: 0, streak: 1 });

  
  // Settings Form State
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Active Modals
  const [selectedCert, setSelectedCert] = useState<LmsCertificate | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);

  // Authenticated state loading and session validation
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        toast.error("يرجى تسجيل الدخول للوصول إلى لوحة التحكم");
        router.push("/login?redirect=/dashboard");
        return;
      }
      
      setUser(session.user);
      const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "طالب مميز";
      setProfileName(name);
      setFullName(name);
      
      // Enforce Device Session Tracking & Max Active Sessions check
      try {
        let deviceId = localStorage.getItem("youssef_device_id");
        if (!deviceId) {
          deviceId = "dev_" + Math.random().toString(36).substring(2, 15);
          localStorage.setItem("youssef_device_id", deviceId);
        }

        // Get user IP dynamically or fallback
        let userIp = "127.0.0.1";
        try {
          const ipRes = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipRes.json();
          if (ipData.ip) userIp = ipData.ip;
        } catch (e) {}

        const browserInfo = navigator.userAgent || "unknown_browser";
        
        // Track the current session (max 3 concurrent active devices)
        await trackActiveSession(session.user.id, deviceId, userIp, browserInfo, "Browser", 3);
        
        // Verify if session is valid (old sessions might have been deactivated)
        const isSessionValid = await checkSessionIsValid(session.user.id, deviceId);
        if (!isSessionValid) {
          toast.error("تم تسجيل خروجك بسبب تجاوز الحد الأقصى للأجهزة النشطة (3 أجهزة)");
          await supabaseClient.auth.signOut();
          router.push("/login?error=max_devices");
          return;
        }
      } catch (e) {
        console.error("Session tracking failure:", e);
      }

      // Sync any anonymous purchases made before registration
      try {
        await fetch("/api/user/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id, email: session.user.email })
        });
      } catch (e) {
        console.error("Failed to sync user records:", e);
      }

      // Load user metrics and course enrollments
      await loadUserDashboardData(session.user);
      setIsLoading(false);
    };


    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const loadUserDashboardData = async (activeUser: any) => {
    try {
      // 1. Fetch all courses
      const allCourses = await getCoursesList();

      // 2. Fetch user's enrollments (course IDs)
      const userEnrolls = await getUserEnrollments(activeUser.id, activeUser.email);

      // 3. Populate enrolled course statistics
      const populatedCourses = [];
      for (const courseId of userEnrolls) {
        const course = allCourses.find(c => c.id === courseId);
        if (course) {
          const { percent, completedCount, totalCount } = await getCourseProgressPercent(activeUser.id, courseId);
          const { sections } = await getCourseBySlug(course.slug);
          const firstLessonSlug = sections[0]?.lessons[0]?.slug || "introduction";
          
          let lastLessonSlug = firstLessonSlug;
          if (typeof window !== "undefined") {
            const saved = localStorage.getItem(`last_lesson_${course.slug}`);
            if (saved) {
              const allLessons = sections.flatMap(s => s.lessons);
              if (allLessons.some(l => l.slug === saved)) {
                lastLessonSlug = saved;
              }
            }
          }

          populatedCourses.push({
            ...course,
            progress: percent,
            completedCount,
            totalCount,
            firstLessonSlug,
            lastLessonSlug
          });
        }
      }
      setEnrolledCourses(populatedCourses);

      // 4. Fetch dynamic certificates
      const certsList = await getUserCertificates(activeUser.id);
      setCertificates(certsList);

      // 5. Fetch purchased products and map files dynamically from database
      const { data: orders, error } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("customer_email", activeUser.email)
        .eq("status", "completed");

      if (!error && orders) {
        setInvoices(orders);

        // Exclude products that are actually courses to keep things strictly separate
        const coursesTitles = allCourses.map(c => c.title.toLowerCase());
        const filteredProducts = orders.filter(order => {
          const titleLower = order.product_title.toLowerCase();
          return !coursesTitles.some(cTitle => cTitle.includes(titleLower) || titleLower.includes(cTitle));
        });

        const mappedProducts = [];
        for (const order of filteredProducts) {
          const { data: pData } = await supabaseClient
            .from("products")
            .select("tags, file_url")
            .eq("id", order.product_id)
            .maybeSingle();

          const fileUrl = pData?.file_url || "";
          const fileExtension = fileUrl.split("?")[0].split(".").pop()?.toUpperCase() || "ZIP";
          const fileSize = pData?.tags?.find((t: string) => t.startsWith("size:"))?.replace("size:", "") || "18.4 MB";

          mappedProducts.push({
            ...order,
            fileName: order.product_title.replace(/\s+/g, "_") + "." + fileExtension.toLowerCase(),
            fileType: fileExtension,
            fileSize: fileSize,
            remainingDownloads: "غير محدود (تحميل مدى الحياة)"
          });
        }
        setDigitalProducts(mappedProducts);
      }

      // Fetch unified wishlist
      const { items: wishlistData, error: wishlistErr } = await fetchUserWishlist(activeUser.id);
      if (!wishlistErr && wishlistData) {
        setWishlistItems(wishlistData);
      }

      // Fetch dynamic study statistics and gamification info
      try {
        const stats = await getStudentStudyHours(activeUser.id);
        setStudyStats(stats);
      } catch (e) {
        console.error("Failed to load study stats:", e);
      }

    } catch (err) {
      console.error("Error loading student dashboard data:", err);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("تم تسجيل الخروج بنجاح. نراك لاحقاً!");
        router.push("/login");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    }
  };

  const handleResendEmailForOrder = async (orderId: string) => {
    if (resendingOrderId) return;
    setResendingOrderId(orderId);
    
    const resolvePromise = new Promise(async (resolve, reject) => {
      try {
        const res = await fetch("/api/paymob/verify-and-deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, forceResend: true }),
        });
        const data = await res.json();
        if (data.success) {
          resolve("success");
        } else {
          reject(new Error(data.error || "Failed to resend"));
        }
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(resolvePromise, {
      loading: "جاري إعادة إرسال الفاتورة والبريد الإلكتروني...",
      success: "تم إرسال روابط التحميل والفاتورة لبريدك بنجاح! 🎉",
      error: "فشل الإرسال. يرجى محاولة التواصل مع الدعم الفني.",
    });

    try {
      await resolvePromise;
    } catch {} finally {
      setResendingOrderId(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const { error: metaError } = await supabaseClient.auth.updateUser({
        data: { full_name: fullName }
      });

      if (metaError) throw metaError;

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("كلمات المرور الجديدة غير متطابقة");
          setIsUpdatingProfile(false);
          return;
        }
        if (newPassword.length < 6) {
          toast.error("يجب أن تتكون كلمة المرور من 6 أحرف كحد أدنى");
          setIsUpdatingProfile(false);
          return;
        }

        const { error: passError } = await supabaseClient.auth.updateUser({
          password: newPassword
        });

        if (passError) throw passError;
        toast.success("تم تحديث كلمة المرور بنجاح");
        setNewPassword("");
        setConfirmPassword("");
      }

      setProfileName(fullName);
      toast.success("تم تحديث معلومات الحساب بنجاح!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "فشل في تحديث الحساب");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRemoveFromWishlist = async (itemType: "course" | "digital_product" | "bundle", itemId: string) => {
    if (isRemovingWishlistId) return;
    setIsRemovingWishlistId(itemId);
    try {
      const { success, error } = await removeFromWishlist(itemType, itemId, user?.id);
      if (success) {
        setWishlistItems(prev => prev.filter(item => {
          if (item.item_type !== itemType) return true;
          if (itemType === "course") return item.course_id !== itemId;
          if (itemType === "digital_product") return item.product_id !== itemId;
          if (itemType === "bundle") return item.bundle_id !== itemId;
          return true;
        }));
        toast.success("تمت الإزالة من المفضلة بنجاح");
      } else {
        toast.error(error || "فشل إزالة العنصر");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ ما");
    } finally {
      setIsRemovingWishlistId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">جاري تحميل لوحة التحكم الفنية...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "courses", name: "كورساتي", icon: BookOpen },
    { id: "products", name: "ملفاتي الرقمية", icon: Download },
    { id: "wishlist", name: "المفضلة", icon: Heart },
    { id: "certificates", name: "الشهادات", icon: Award },
    { id: "invoices", name: "الفواتير", icon: FileText },
    { id: "settings", name: "إعدادات الحساب", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex flex-col lg:flex-row overflow-x-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-[#0a0a0f] border-b lg:border-b-0 lg:border-l border-white/5 flex flex-col justify-between p-6 z-10 shrink-0 font-alexandria">
        <div className="space-y-8">
          <div className="flex items-center justify-between lg:justify-start gap-3 border-b border-white/5 pb-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-alexandria font-bold text-base block text-white">يوسف أوتوميتس</span>
                <span className="text-[10px] text-zinc-400 block -mt-1 font-medium tracking-wide">STUDENT PORTAL</span>
              </div>
            </Link>
            <Link 
              href="/" 
              className="lg:hidden text-xs text-rose-400 hover:text-rose-300 font-bold border border-rose-500/20 px-3 py-1.5 rounded-lg bg-rose-600/5 transition-colors"
            >
              العودة للمتجر
            </Link>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center font-alexandria font-bold text-white shadow-lg shrink-0">
              {profileName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight mb-1">{profileName}</p>
              <p className="text-[10px] text-zinc-500 truncate leading-none" dir="ltr">{user?.email}</p>
            </div>
          </div>

          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-xs shrink-0 lg:w-full relative cursor-pointer ${
                    isActive 
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-accent"
                      className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-white rounded-l-full hidden lg:block"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 hidden lg:block">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold text-xs group cursor-pointer"
          >
            <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 lg:p-12 z-10 max-w-[1200px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-alexandria font-black text-white flex items-center gap-2">
              <span>أهلاً بك، {profileName}</span>
              <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">تصفح أقسامك التعليمية وحزم الأتمتة التي قمت باقتنائها في مكان واحد.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="hidden lg:inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <span>العودة للمتجر الرئيسي</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button 
              onClick={handleLogout}
              className="lg:hidden flex items-center gap-2 border border-red-500/20 px-4 py-2.5 rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors font-bold text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Dynamic Study Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Hours */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold">وقت التعلم</span>
              <span className="text-sm sm:text-lg font-alexandria font-black text-white">{(studyStats.totalSeconds / 3600).toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">ساعة</span></span>
            </div>
          </div>

          {/* Card 2: Lessons Completed */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold">الدروس المكتملة</span>
              <span className="text-sm sm:text-lg font-alexandria font-black text-white">{studyStats.completedCount} <span className="text-[10px] font-normal text-zinc-400">دروس</span></span>
            </div>
          </div>

          {/* Card 3: Streak */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 sm:w-6 h-5 sm:h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block font-bold">سلسلة التعلم</span>
              <span className="text-sm sm:text-lg font-alexandria font-black text-white">{studyStats.streak} <span className="text-[10px] font-normal text-zinc-400">يوم 🔥</span></span>
            </div>
          </div>

          {/* Card 4: Level */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-xl">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              <Award className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-zinc-500 block font-bold">المستوى التعليمي</span>
              <span className="text-[11px] sm:text-xs font-alexandria font-black text-white truncate block">
                {studyStats.completedCount >= 10 ? "خبير الأتمتة 🎓" : studyStats.completedCount >= 4 ? "طالب مجتهد ⚡" : "مستكشف مبتدئ 🌱"}
              </span>
            </div>
          </div>
        </div>

        {/* Premium Resume Watching widget */}
        {(() => {
          const inProgress = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100);
          const courseToResume = inProgress.sort((a, b) => b.progress - a.progress)[0] || enrolledCourses.find(c => c.progress < 100);
          
          if (!courseToResume) return null;

          return (
            <div className="bg-gradient-to-r from-rose-950/20 via-[#0a0a0f] to-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-rose-600/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex-1 space-y-4 text-right w-full">
                <div className="flex items-center gap-2 text-rose-500 text-xs font-bold font-alexandria">
                  <PlayCircle className="w-4 h-4" />
                  <span>متابعة التعلم (واصل من حيث توقفت)</span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-alexandria font-black text-white leading-tight">{courseToResume.title}</h3>
                  <p className="text-zinc-400 text-xs mt-1.5 font-cairo">أحسنت صنعاً! لقد أكملت {courseToResume.progress}% من هذا الكورس الرائد.</p>
                </div>
                
                {/* Progress bar inside callout */}
                <div className="max-w-md">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                    <span>نسبة تقدمك الإجمالية</span>
                    <span className="text-rose-400">{courseToResume.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-600 to-orange-500 rounded-full transition-all duration-500" 
                      style={{ width: `${courseToResume.progress}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 w-full md:w-auto">
                <Link
                  href={`/learn/${courseToResume.slug}/${courseToResume.lastLessonSlug || courseToResume.firstLessonSlug}`}
                  className="w-full md:w-auto h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_8px_20px_rgba(214,0,75,0.2)]"
                >
                  <span>تابع الدرس الآن</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Tab Contents */}
        <AnimatePresence mode="wait">

          
          {/* TABS 1: COURSES */}
          {activeTab === "courses" && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">الأقسام والشهادات المسجل بها</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {enrolledCourses.length} دورات تدريبية
                </span>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <BookOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لم تسجل في أي دورة بعد</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                    ابدأ رحلتك التعليمية واشترك في أحد أقسامنا القوية للأتمتة والذكاء الاصطناعي وصناعة المحتوى.
                  </p>
                  <Link 
                    href="/courses"
                    className="mt-6 inline-flex h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold items-center gap-2"
                  >
                    تصفح الدورات التدريبية
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrolledCourses.map((course) => (
                    <div 
                      key={course.id}
                      className="bg-[#0a0a0f] border border-white/5 hover:border-rose-500/20 rounded-2.5xl overflow-hidden group flex flex-col h-full shadow-2xl transition-all hover:-translate-y-1 duration-300"
                    >
                      <div className="relative h-40 bg-zinc-900 overflow-hidden border-b border-white/5 flex items-center justify-center">
                        <img 
                          src={course.image_url} 
                          alt={course.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
                        <PlayCircle className="w-12 h-12 text-rose-500 z-10 group-hover:scale-110 transition-transform duration-300 relative" />
                        
                        <span className="absolute bottom-4 right-4 bg-black/60 text-[9px] px-2.5 py-1 rounded-md font-bold z-10 border border-white/5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-rose-400" />
                          <span>{course.duration_hours} ساعة تدريبية</span>
                        </span>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>

                          <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-2 leading-snug group-hover:text-rose-400 transition-colors line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-zinc-400 text-xs mt-1.5 line-clamp-2">
                            {course.short_description || "تعلم الأتمتة والتقنيات الحديثة خطوة بخطوة."}
                          </p>
                        </div>

                        <div className="mt-6 space-y-4">
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                              <span>نسبة الإنجاز</span>
                              <span className="text-rose-400">{course.progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="h-full bg-gradient-to-r from-rose-600 to-orange-500 rounded-full transition-all duration-500" 
                                style={{ width: `${course.progress}%` }} 
                              />
                            </div>
                          </div>

                          <Link
                            href={`/learn/${course.slug}/${course.lastLessonSlug || course.firstLessonSlug}`}
                            className="w-full h-11 bg-white/5 border border-white/10 hover:bg-rose-600 hover:border-none text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                          >
                            <span>{course.progress > 0 ? "متابعة المشاهدة" : "ابدأ التعلم الآن"}</span>
                            <ChevronLeft className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TABS 2: DIGITAL PRODUCTS */}
          {activeTab === "products" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">ملفاتي الرقمية وحزم الأتمتة</h2>
                <span className="bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {digitalProducts.length} ملفات جاهزة
                </span>
              </div>

              {digitalProducts.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <Download className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لا تتوفر ملفات رقمية</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                    لم تقم باقتناء أي قوالب أتمتة أو حزم برمجية بعد. استكشف المنتجات الرقمية لتسريع أعمالك!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {digitalProducts.map((p) => (
                    <div 
                      key={p.id}
                      className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-emerald-500/20 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-emerald-500/10 group-hover:scale-105 transition-all">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-white">{p.product_title}</h3>
                          
                          {/* File Details Grid */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-zinc-500 font-medium">
                            <span>نوع الملف: <strong className="text-white">{p.fileType}</strong></span>
                            <span>•</span>
                            <span>الحجم: <strong className="text-white">{p.fileSize}</strong></span>
                            <span>•</span>
                            <span className="text-emerald-400/80">التحميل: {p.remainingDownloads}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <a
                          href={`/api/download?token=${p.id}`}
                          className="flex-1 sm:flex-none h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                        >
                          <Download className="w-4 h-4" />
                          <span>تحميل الملف</span>
                        </a>

                        <button
                          onClick={() => handleResendEmailForOrder(p.id)}
                          className="h-11 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          title="إعادة إرسال البريد"
                        >
                          <Send className="w-4 h-4 text-zinc-400" />
                          <span className="hidden sm:inline">إرسال بالبريد</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TABS 3: CERTIFICATES */}
          {activeTab === "certificates" && (
            <motion.div
              key="certificates"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">الشهادات والاعتمادات</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {certificates.length} شهادات موثقة
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-600 to-transparent" />
                  <div className="w-16 h-16 rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-inner">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-alexandria font-bold text-white mb-2">لا تتوفر شهادات بعد</h3>
                  <p className="text-zinc-400 text-xs sm:text-sm max-w-md leading-relaxed mb-6">
                    ستظهر شهادات التخرج الرقمية المعتمدة هنا فور إتمام أي قسم تدريبي بنجاح وحضور الدروس والتقييمات المخصصة لها.
                  </p>
                  <button
                    onClick={() => setActiveTab("courses")}
                    className="h-10 px-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    تصفح أقسامي للبدء
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certificates.map((cert) => (
                    <div 
                      key={cert.id}
                      className="bg-[#0a0a0f] border border-white/5 hover:border-amber-500/20 rounded-2.5xl p-6 flex flex-col justify-between shadow-2xl transition-all duration-300"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-500 font-bold block uppercase tracking-wider font-mono">Verification ID: {cert.verification_id}</span>
                          <h3 className="font-alexandria font-bold text-white text-base sm:text-lg mt-1">{cert.course_name}</h3>
                          <p className="text-zinc-400 text-xs mt-1">تاريخ التخرج: {cert.issued_at}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                        }}
                        className="mt-6 w-full h-11 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>عرض وطباعة الشهادة الموثقة</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TABS 4: INVOICES (Brand New Tab!) */}
          {activeTab === "invoices" && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">فواتير ومعاملات الشراء</h2>
                <span className="bg-sky-600/15 border border-sky-500/30 text-sky-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {invoices.length} فواتير معتمدة
                </span>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لا توجد عمليات شراء سابقة</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                    لم نجد أي فواتير أو إيصالات شراء سابقة مربوطة بهذا البريد الإلكتروني.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div 
                      key={inv.id}
                      className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-white">{inv.product_title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-1">
                            <span>الرقم المرجعي: <strong className="text-zinc-300 font-mono text-[10px]">#{inv.payment_id || inv.id}</strong></span>
                            <span>•</span>
                            <span>التاريخ: {new Date(inv.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <span className="text-emerald-400 font-alexandria font-black text-sm pr-4">
                          ${inv.amount}
                        </span>

                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-10 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>تحميل الفاتورة (PDF)</span>
                        </button>

                        <button
                          onClick={() => handleResendEmailForOrder(inv.id)}
                          className="h-10 px-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          title="إعادة إرسال البريد"
                        >
                          <Send className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TABS 5: SETTINGS */}
          {/* TABS: WISHLIST */}
          {activeTab === "wishlist" && (
            <motion.div
              key="wishlist"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">المفضلة الخاصة بي</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {wishlistItems.length} عناصر محفوظة
                </span>
              </div>

              {wishlistItems.length === 0 ? (
                <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Heart className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white">قائمة المفضلة فارغة حالياً</h3>
                    <p className="text-zinc-500 text-xs max-w-sm leading-relaxed mx-auto">
                      تصفح متجرنا الرقمي ومساراتنا الاحترافية وأضف ما ينال إعجابك إلى المفضلة للعودة إليه لاحقاً بسهولة!
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
                  >
                    تصفح المكتبة والمتجر
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {wishlistItems.map((item) => {
                    const id = item.course_id || item.product_id || item.bundle_id;
                    const typeBadge =
                      item.item_type === "course"
                        ? "دورة تعليمية"
                        : item.item_type === "bundle"
                        ? "حزمة عروض"
                        : "منتج رقمي";

                    const badgeColor =
                      item.item_type === "course"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : item.item_type === "bundle"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20";

                    const title =
                      item.course?.title || item.product?.title || item.bundle?.title || "";
                    const desc =
                      item.course?.short_description ||
                      item.product?.short_description ||
                      item.bundle?.short_description ||
                      item.course?.description ||
                      item.product?.description ||
                      item.bundle?.description ||
                      "";
                    const imageUrl =
                      item.course?.image_url ||
                      item.product?.image_url ||
                      item.bundle?.image_url ||
                      "";
                    const slug =
                      item.course?.slug || item.product?.slug || item.bundle?.slug || "";

                    const price =
                      item.course?.price || item.product?.price || item.bundle?.price || 0;

                    const itemLink =
                      item.item_type === "course"
                        ? `/courses/${slug}`
                        : item.item_type === "bundle"
                        ? `/bundles/${slug}`
                        : `/product/${slug}`;

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-5 flex gap-4 hover:border-white/10 transition-all duration-300 relative group overflow-hidden"
                      >
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5 relative">
                          {imageUrl ? (
                            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/20">
                              YA
                            </div>
                          )}
                          <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border backdrop-blur-sm ${badgeColor}`}>
                            {typeBadge}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-rose-500 transition-colors">
                              {title}
                            </h3>
                            <p className="text-zinc-500 text-xs line-clamp-2 mt-1 leading-relaxed">
                              {desc}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                            <span className="text-xs font-bold text-white font-mono">${price}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemoveFromWishlist(item.item_type, id)}
                                disabled={isRemovingWishlistId === id}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                                title="إزالة من المفضلة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                href={itemLink}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-rose-600/10 flex items-center gap-1"
                              >
                                <span>عرض</span>
                                <ChevronLeft className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">إعدادات الحساب</h2>
              </div>

              <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl">
                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-white">المعلومات الشخصية</h3>
                    <p className="text-zinc-500 text-xs mt-1">تحديث معلومات حساب الطالب وكلمة المرور الخاصة بك.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block pr-1">الاسم الكامل</label>
                    <div className="relative group">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block pr-1">البريد الإلكتروني (غير قابل للتعديل)</label>
                    <div className="relative opacity-65">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                      <input
                        type="email"
                        value={user?.email || ""}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium text-zinc-500 focus:outline-none cursor-not-allowed"
                        dir="ltr"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-6 pt-6" />

                  <div>
                    <h3 className="text-sm font-bold text-white">تعديل كلمة المرور</h3>
                    <p className="text-zinc-500 text-xs mt-1">اترك هذه الحقول فارغة إذا كنت لا ترغب في تغيير كلمة المرور الحالية.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 block pr-1">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="•••••••• (6 أحرف كحد أدنى)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 block pr-1">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="h-12 px-6 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-4"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <span>حفظ التعديلات</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── MODAL 1: CERTIFICATES SHADED MODAL ────────────────────────────────── */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedCert.certificate_bg_url ? (
              <div className="w-full aspect-[1.414/1] bg-[#0a0a0f] border border-amber-500/30 rounded-2xl overflow-hidden relative shadow-2xl">
                <style dangerouslySetInnerHTML={{__html: `
                  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                `}} />
                <img src={selectedCert.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 z-10 font-bold" style={{ color: selectedCert.certificate_text_color || "#000000" }}>
                  <div 
                    className="absolute whitespace-nowrap transition-all" 
                    style={{ 
                      left: `${selectedCert.certificate_name_x || 50}%`, 
                      top: `${selectedCert.certificate_name_y || 40}%`, 
                      fontSize: `${selectedCert.certificate_name_size || 24}px`,
                      transform: 'translate(-50%, -50%)',
                      fontFamily: /[\u0600-\u06FF]/.test(selectedCert.student_name) ? "'Cairo', 'Alexandria', sans-serif" : "'Alike', serif",
                      fontWeight: /[\u0600-\u06FF]/.test(selectedCert.student_name) ? 900 : 'normal',
                    }}
                  >
                    {selectedCert.student_name}
                  </div>
                  <div 
                    className="absolute whitespace-nowrap font-mono" 
                    style={{ 
                      left: `${selectedCert.certificate_date_x || 50}%`, 
                      top: `${selectedCert.certificate_date_y || 70}%`, 
                      fontSize: `${selectedCert.certificate_date_size || 14}px`,
                      transform: 'translate(-50%, -50%)' 
                    }}
                  >
                    {selectedCert.issued_at}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-4 border-double border-amber-500/50 p-6 sm:p-10 rounded-2xl bg-black/60 relative text-center space-y-6 overflow-hidden">
                <div className="absolute w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -top-20 -right-20 pointer-events-none" />
                <div className="absolute w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px] -bottom-20 -left-20 pointer-events-none" />

                <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Award className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-alexandria font-black text-white text-lg sm:text-2xl tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
                    شهادة إكمال ومثابرة موثقة
                  </h3>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] font-mono">Certificate of Course Completion</p>
                </div>

                <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                  يُشهد فريق عمل أكاديمية <span className="font-bold text-white">Youssef Automates</span> الفنية بأن الطالب البارز:
                </p>

                <h4 className="font-alexandria font-black text-white text-2xl sm:text-4xl underline decoration-amber-500/50 underline-offset-8">
                  {selectedCert.student_name}
                </h4>

                <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                  قد أتم بنجاح ومثابرة كامل متطلبات ودروس المسار التدريبي الاحترافي:
                </p>

                <h5 className="font-bold text-white text-base sm:text-lg text-rose-500">
                  {selectedCert.course_name}
                </h5>

                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 gap-4 text-xs font-bold text-zinc-500">
                  <div>
                    <span className="block text-[10px] text-zinc-600 font-medium">تاريخ إصدار الشهادة:</span>
                    <span className="text-zinc-300 font-mono mt-0.5 block">{selectedCert.issued_at}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>شهادة رقمية معتمدة</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-600 font-medium">رقم التوثيق المعتمد (Verification ID):</span>
                    <span className="text-rose-400 font-mono mt-0.5 block">{selectedCert.verification_id}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => window.print()}
                className="h-11 px-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الشهادة (PDF)</span>
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRINTABLE INVOICES SHADED MODAL ───────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Invoice Container */}
            <div id="printable-invoice" className="border border-white/10 p-6 sm:p-8 rounded-2xl bg-black/40 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-alexandria font-bold text-white text-lg">فاتورة شراء رقمية</h3>
                  <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">Invoice Ref: #{selectedInvoice.payment_id || selectedInvoice.id}</span>
                </div>
                <div className="text-left">
                  <span className="font-alexandria font-bold text-sm text-rose-500 block">Youssef Automates</span>
                  <span className="text-[9px] text-zinc-500 block">support@youssefautomates.com</span>
                </div>
              </div>

              <div className="border-t border-b border-white/5 py-4 my-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block">مُصدرة إلى:</span>
                  <span className="text-white font-bold block">{selectedInvoice.customer_name || profileName}</span>
                  <span className="text-zinc-400 font-mono block mt-0.5">{selectedInvoice.customer_email}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">تفاصيل الفاتورة:</span>
                  <span className="text-zinc-300 block">تاريخ الشراء: {new Date(selectedInvoice.created_at).toLocaleDateString("ar-EG")}</span>
                  <span className="text-zinc-300 block">طريقة الدفع: Paymob (مدفوع بالكامل)</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500">
                    <th className="pb-2 font-bold">المنتج</th>
                    <th className="pb-2 text-left font-bold">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 text-white font-bold">{selectedInvoice.product_title}</td>
                    <td className="py-3 text-left text-emerald-400 font-bold">${selectedInvoice.amount}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-400">الإجمالي المدفوع:</span>
                <span className="text-emerald-400 text-lg">${selectedInvoice.amount}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  const printContents = document.getElementById("printable-invoice")?.innerHTML;
                  if (printContents) {
                    const printWindow = window.open("", "_blank");
                    printWindow?.document.write(`
                      <html dir="rtl" lang="ar">
                      <head>
                        <title>فاتورة Youssef Automates</title>
                        <style>
                          body { font-family: system-ui; padding: 40px; background: white; color: black; }
                          .text-rose-500 { color: #d6004b !important; }
                          .text-emerald-400 { color: #10b981 !important; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: right; }
                          .text-left { text-align: left; }
                        </style>
                      </head>
                      <body>
                        ${printContents}
                        <script>window.print();</script>
                      </body>
                      </html>
                    `);
                    printWindow?.document.close();
                  }
                }}
                className="h-11 px-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة (PDF)</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
