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
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 left-10 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-[#07070b]/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-l border-white/5 flex flex-col justify-between p-4 lg:p-6 z-20 shrink-0 font-alexandria">
        <div className="space-y-4 lg:space-y-8">
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
              className="lg:hidden text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors font-bold border border-rose-500/20 px-3 py-1.5 rounded-lg bg-rose-600/5"
            >
              العودة للمتجر
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-4 bg-white/[0.01] border border-white/5 rounded-2xl p-4 relative overflow-hidden group">
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-orange-500 flex items-center justify-center font-alexandria font-black text-white shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-300">
              {profileName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 z-10 text-right">
              <p className="text-sm font-alexandria font-bold text-white truncate leading-tight mb-1.5">{profileName}</p>
              <p className="text-[9px] text-zinc-500 truncate leading-none" dir="ltr">{user?.email}</p>
            </div>
          </div>

          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none relative">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold text-xs shrink-0 lg:w-full relative cursor-pointer ${
                    isActive 
                      ? "text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-bg"
                      className="absolute inset-0 bg-gradient-to-l from-rose-600 to-pink-600 rounded-xl -z-10 shadow-lg shadow-rose-600/15"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "scale-110 text-white" : "text-zinc-500"}`} />
                  <span>{item.name}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 text-right">
          <div>
            <h1 className="text-2xl sm:text-3xl font-alexandria font-black text-white flex items-center justify-start gap-2">
              <span>أهلاً بك، {profileName}</span>
              <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 font-cairo">تصفح أقسامك التعليمية وحزم الأتمتة التي قمت باقتنائها في مكان واحد.</p>
          </div>
          
          <div className="flex items-center justify-start sm:justify-end gap-3">
            <Link 
              href="/" 
              className="hidden lg:inline-flex items-center gap-2 text-xs font-alexandria font-bold text-zinc-400 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10">
          {[
            {
              title: "وقت التعلم",
              value: `${(studyStats.totalSeconds / 3600).toFixed(1)}`,
              unit: "ساعة",
              icon: Clock,
              color: "from-rose-600 to-pink-600",
              bgColor: "bg-rose-500/10",
              borderColor: "border-rose-500/20",
              iconColor: "text-rose-400",
            },
            {
              title: "الدروس المكتملة",
              value: studyStats.completedCount,
              unit: "دروس",
              icon: CheckCircle2,
              color: "from-emerald-600 to-teal-500",
              bgColor: "bg-emerald-500/10",
              borderColor: "border-emerald-500/20",
              iconColor: "text-emerald-400",
            },
            {
              title: "سلسلة التعلم",
              value: studyStats.streak,
              unit: "يوم 🔥",
              icon: Sparkles,
              color: "from-orange-600 to-yellow-500",
              bgColor: "bg-orange-500/10",
              borderColor: "border-orange-500/20",
              iconColor: "text-orange-400",
              pulse: true,
            },
            {
              title: "المستوى التعليمي",
              value: studyStats.completedCount >= 10 ? "خبير الأتمتة 🎓" : studyStats.completedCount >= 4 ? "طالب مجتهد ⚡" : "مستكشف مبتدئ 🌱",
              unit: "",
              isLevel: true,
              icon: Award,
              color: "from-purple-600 to-indigo-600",
              bgColor: "bg-purple-500/10",
              borderColor: "border-purple-500/20",
              iconColor: "text-purple-405",
            }
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="group relative bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] text-right"
            >
              {/* Card glowing light effect on hover */}
              <div className={`absolute inset-0 -z-10 rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${stat.color} opacity-0 group-hover:opacity-5 blur-[20px] transition-opacity duration-300`} />
              
              <div className={`w-10 sm:w-14 h-10 sm:h-14 rounded-xl sm:rounded-2xl ${stat.bgColor} ${stat.borderColor} border ${stat.iconColor} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-5 sm:w-7 h-5 sm:h-7 ${stat.pulse ? "animate-pulse" : ""}`} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-400 block font-alexandria font-bold tracking-wide">{stat.title}</span>
                {stat.isLevel ? (
                  <span className="text-xs sm:text-sm font-alexandria font-black text-white block mt-1 leading-none truncate">
                    {stat.value}
                  </span>
                ) : (
                  <span className="text-base sm:text-xl font-alexandria font-black text-white mt-1 block leading-none">
                    {stat.value} <span className="text-[10px] sm:text-xs font-normal text-zinc-400">{stat.unit}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Premium Resume Watching widget */}
        {(() => {
          const inProgress = enrolledCourses.filter(c => c.progress > 0 && c.progress < 100);
          const courseToResume = inProgress.sort((a, b) => b.progress - a.progress)[0] || enrolledCourses.find(c => c.progress < 100);
          
          if (!courseToResume) return null;

          return (
            <div className="group relative bg-gradient-to-l from-rose-950/20 via-[#0a0a0f]/80 to-[#07070b]/90 border border-white/5 hover:border-rose-500/20 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-300">
              {/* Animated mesh gradient behind */}
              <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute left-10 bottom-0 w-[150px] h-[150px] bg-pink-500/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex-1 space-y-4 text-right w-full relative z-10">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-alexandria font-bold tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>متابعة التعلم (واصل من حيث توقفت)</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-alexandria font-black text-white leading-tight tracking-tight group-hover:text-rose-400 transition-colors duration-300">{courseToResume.title}</h3>
                  <p className="text-zinc-400 text-xs mt-2 font-cairo leading-relaxed">أحسنت صنعاً! لقد أكملت <span className="text-rose-400 font-bold">{courseToResume.progress}%</span> من هذا الكورس الرائد بنجاح.</p>
                </div>
                
                {/* Progress bar inside callout */}
                <div className="max-w-md pt-2">
                  <div className="flex justify-between items-center text-[10px] font-alexandria font-bold text-zinc-400 mb-1.5">
                    <span>نسبة تقدمك الإجمالية</span>
                    <span className="text-rose-400 font-mono">{courseToResume.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-rose-600 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" 
                      style={{ width: `${courseToResume.progress}%` }} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 w-full md:w-auto relative z-10">
                <Link
                  href={`/learn/${courseToResume.slug}/${courseToResume.lastLessonSlug || courseToResume.firstLessonSlug}`}
                  className="w-full md:w-auto h-14 px-8 bg-gradient-to-l from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl text-xs sm:text-sm font-alexandria font-black flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-98 shadow-[0_12px_24px_rgba(214,0,75,0.3)] hover:shadow-[0_16px_32px_rgba(214,0,75,0.45)] group/btn"
                >
                  <PlayCircle className="w-5 h-5 group-hover/btn:rotate-12 transition-transform duration-300" />
                  <span>تابع الدرس الآن</span>
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180 group-hover/btn:-translate-x-1 transition-transform" />
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
              className="space-y-6 text-right"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">الأقسام والشهادات المسجل بها</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {enrolledCourses.length} دورات تدريبية
                </span>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl p-8 shadow-xl">
                  <BookOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لم تسجل في أي دورة بعد</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-cairo">
                    ابدأ رحلتك التعليمية واشترك في أحد أقسامنا القوية للأتمتة والذكاء الاصطناعي وصناعة المحتوى.
                  </p>
                  <Link 
                    href="/courses"
                    className="mt-6 inline-flex h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold items-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    تصفح الدورات التدريبية
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrolledCourses.map((course) => (
                    <div 
                      key={course.id}
                      className="group relative bg-[#07070b]/60 border border-white/5 hover:border-rose-500/20 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                      {/* Top Media Cover */}
                      <div className="relative h-48 bg-zinc-950 overflow-hidden flex items-center justify-center">
                        <img 
                          src={course.image_url} 
                          alt={course.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-700 ease-out" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#07070b] via-[#07070b]/40 to-transparent" />
                        
                        {/* Glassmorphic Play button wrapper */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600/90 group-hover:border-rose-500/20 transition-all duration-300 shadow-2xl">
                            <PlayCircle className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        
                        <span className="absolute bottom-4 right-4 bg-[#0a0a0f]/85 backdrop-blur-md text-[9px] font-alexandria font-bold px-3 py-1.5 rounded-xl z-10 border border-white/5 flex items-center gap-1.5 text-zinc-300">
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                          <span>{course.duration_hours} ساعة تدريبية</span>
                        </span>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between relative z-10">
                        <div className="space-y-2">
                          <h3 className="text-base sm:text-lg font-alexandria font-black text-white leading-snug group-hover:text-rose-400 transition-colors duration-300 line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-zinc-400 font-cairo text-xs leading-relaxed line-clamp-2">
                            {course.short_description || "تعلم الأتمتة والتقنيات الحديثة خطوة بخطوة."}
                          </p>
                        </div>

                        <div className="mt-6 space-y-5">
                          {/* Progress display */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-alexandria font-bold text-zinc-400">
                              <span>نسبة الإنجاز</span>
                              <span className="text-rose-400 font-mono">{course.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-rose-600 rounded-full transition-all duration-500" 
                                style={{ width: `${course.progress}%` }} 
                              />
                            </div>
                          </div>

                          {/* Action Button */}
                          <Link
                            href={`/learn/${course.slug}/${course.lastLessonSlug || course.firstLessonSlug}`}
                            className="w-full h-12 bg-white/5 border border-white/10 hover:bg-gradient-to-l hover:from-rose-600 hover:to-pink-600 hover:border-transparent text-white rounded-2xl text-xs font-alexandria font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-98 shadow-md group-hover:shadow-[0_8px_20px_rgba(214,0,75,0.15)]"
                          >
                            <span>{course.progress > 0 ? "متابعة المشاهدة" : "ابدأ التعلم الآن"}</span>
                            <ChevronLeft className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-[-2px] transition-transform" />
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
              className="space-y-6 text-right"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">ملفاتي الرقمية وحزم الأتمتة</h2>
                <span className="bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {digitalProducts.length} ملفات جاهزة
                </span>
              </div>

              {digitalProducts.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl p-8 shadow-xl">
                  <Download className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لا تتوفر ملفات رقمية</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-cairo">
                    لم تقم باقتناء أي قوالب أتمتة أو حزم برمجية بعد. استكشف المنتجات الرقمية لتسريع أعمالك!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {digitalProducts.map((p) => (
                    <div 
                      key={p.id}
                      className="group bg-[#07070b]/60 border border-white/5 hover:border-emerald-500/25 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl transition-all duration-300 hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start gap-4 text-right">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-alexandria font-bold text-white group-hover:text-emerald-400 transition-colors">{p.product_title}</h3>
                          
                          {/* File Details Grid */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500 font-medium font-cairo">
                            <span>نوع الملف: <strong className="text-zinc-300 font-bold">{p.fileType}</strong></span>
                            <span className="opacity-30">•</span>
                            <span>الحجم: <strong className="text-zinc-300 font-bold">{p.fileSize}</strong></span>
                            <span className="opacity-30">•</span>
                            <span className="text-emerald-400/80 font-bold">التحميل: {p.remainingDownloads}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        <a
                          href={`/api/download?token=${p.id}`}
                          className="flex-1 sm:flex-none h-12 px-6 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-550 hover:to-teal-550 text-white rounded-2xl text-xs font-alexandria font-black flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-98 shadow-[0_8px_20px_rgba(16,185,129,0.2)]"
                        >
                          <Download className="w-4 h-4" />
                          <span>تحميل الملف</span>
                        </a>

                        <button
                          onClick={() => handleResendEmailForOrder(p.id)}
                          className="h-12 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-alexandria font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
              className="space-y-6 text-right"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">الشهادات والاعتمادات</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {certificates.length} شهادات موثقة
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="bg-[#07070b]/60 border border-white/5 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-600 to-transparent" />
                  <div className="w-16 h-16 rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 shadow-inner">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-alexandria font-bold text-white mb-2">لا تتوفر شهادات بعد</h3>
                  <p className="text-zinc-400 text-xs sm:text-sm max-w-md leading-relaxed mb-6 font-cairo">
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
                      className="group bg-[#07070b]/60 border border-white/5 hover:border-amber-500/20 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl transition-all duration-300 text-right relative overflow-hidden"
                    >
                      {/* Ambient light for active certificate */}
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
                      
                      <div className="space-y-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[9px] text-amber-500 font-alexandria font-bold block uppercase tracking-wider">رقم التحقق: {cert.verification_id}</span>
                          <h3 className="font-alexandria font-black text-white text-base sm:text-lg mt-1.5 group-hover:text-amber-400 transition-colors">{cert.course_name}</h3>
                          <p className="text-zinc-500 font-cairo text-xs mt-1">تاريخ الإصدار: {cert.issued_at}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                        }}
                        className="mt-6 w-full h-12 bg-gradient-to-l from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-alexandria font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.35)] active:scale-98 transition-all cursor-pointer relative z-10"
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

          {/* TABS 4: INVOICES */}
          {activeTab === "invoices" && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 text-right"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">فواتير ومعاملات الشراء</h2>
                <span className="bg-sky-600/15 border border-sky-500/30 text-sky-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {invoices.length} فواتير معتمدة
                </span>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl p-8 shadow-xl">
                  <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لا توجد عمليات شراء سابقة</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-cairo">
                    لم نجد أي فواتير أو إيصالات شراء سابقة مربوطة بهذا البريد الإلكتروني.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div 
                      key={inv.id}
                      className="group bg-[#07070b]/60 border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/10 transition-all duration-300 text-right shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-alexandria font-bold text-white group-hover:text-rose-400 transition-colors">{inv.product_title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-1.5 font-cairo">
                            <span>الرقم المرجعي: <strong className="text-zinc-300 font-mono text-[10px]">#{inv.payment_id || inv.id}</strong></span>
                            <span className="opacity-30">•</span>
                            <span>التاريخ: {new Date(inv.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                        <span className="text-emerald-400 font-alexandria font-black text-base pr-2 sm:pr-4">
                          ${inv.amount}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-11 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-alexandria font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>عرض الفاتورة</span>
                          </button>

                          <button
                            onClick={() => handleResendEmailForOrder(inv.id)}
                            className="h-11 px-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                            title="إعادة إرسال البريد"
                          >
                            <Send className="w-3.5 h-3.5 text-zinc-400 hover:text-white transition-colors" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TABS: WISHLIST */}
          {activeTab === "wishlist" && (
            <motion.div
              key="wishlist"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 text-right"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">المفضلة الخاصة بي</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {wishlistItems.length} عناصر محفوظة
                </span>
              </div>

              {wishlistItems.length === 0 ? (
                <div className="bg-[#07070b]/60 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Heart className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-white font-alexandria">قائمة المفضلة فارغة حالياً</h3>
                    <p className="text-zinc-500 text-xs max-w-sm leading-relaxed mx-auto font-cairo">
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
                        className="bg-[#07070b]/60 border border-white/5 rounded-3xl p-5 flex gap-4 hover:border-white/10 hover:border-rose-500/10 transition-all duration-300 relative group overflow-hidden shadow-xl"
                      >
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-white/5 relative">
                          {imageUrl ? (
                            <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-alexandria font-bold text-white/20">
                              YA
                            </div>
                          )}
                          <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-xl text-[8px] font-alexandria font-bold border backdrop-blur-md ${badgeColor}`}>
                            {typeBadge}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between text-right">
                          <div className="space-y-1">
                            <h3 className="text-sm sm:text-base font-alexandria font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                              {title}
                            </h3>
                            <p className="text-zinc-400 font-cairo text-xs line-clamp-2 leading-relaxed">
                              {desc}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                            <span className="text-xs sm:text-sm font-alexandria font-black text-rose-450">${price}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemoveFromWishlist(item.item_type, id)}
                                disabled={isRemovingWishlistId === id}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                                title="إزالة من المفضلة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <Link
                                href={itemLink}
                                className="px-4 py-2 bg-gradient-to-l from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-[10px] sm:text-xs font-alexandria font-bold transition-all shadow-md shadow-rose-600/10 flex items-center gap-1.5"
                              >
                                <span>عرض</span>
                                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
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

          {/* TABS 5: SETTINGS */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-white/5 pb-4 text-right">
                <h2 className="text-lg font-alexandria font-bold text-white">إعدادات الحساب</h2>
              </div>

              <div className="bg-[#07070b]/60 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl text-right">
                  <div>
                    <h3 className="text-base font-alexandria font-bold text-white">المعلومات الشخصية</h3>
                    <p className="text-zinc-500 font-cairo text-xs mt-1">قم بتحديث معلومات حساب الطالب وكلمة المرور الخاصة بك في أي وقت.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-alexandria font-bold text-zinc-400 block pr-1">الاسم الكامل</label>
                    <div className="relative group">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-cairo font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-alexandria font-bold text-zinc-400 block pr-1">البريد الإلكتروني (غير قابل للتعديل)</label>
                    <div className="relative opacity-60">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-650" />
                      <input
                        type="email"
                        value={user?.email || ""}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-cairo font-medium text-zinc-500 focus:outline-none cursor-not-allowed"
                        dir="ltr"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-8 pt-8" />

                  <div>
                    <h3 className="text-base font-alexandria font-bold text-white">تعديل كلمة المرور</h3>
                    <p className="text-zinc-500 font-cairo text-xs mt-1">اترك هذه الحقول فارغة إذا كنت لا ترغب في تغيير كلمة المرور الحالية.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-alexandria font-bold text-zinc-400 block pr-1">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="•••••••• (6 أحرف كحد أدنى)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 px-4 text-sm font-cairo font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-alexandria font-bold text-zinc-400 block pr-1">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 px-4 text-sm font-cairo font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="h-12 px-8 bg-gradient-to-l from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-2xl font-alexandria font-black text-xs shadow-lg shadow-rose-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-6"
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

                <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed font-cairo">
                  يُشهد فريق عمل أكاديمية <span className="font-bold text-white">Youssef Automates</span> الفنية بأن الطالب البارز:
                </p>

                <h4 className="font-alexandria font-black text-white text-2xl sm:text-4xl underline decoration-amber-500/50 underline-offset-8">
                  {selectedCert.student_name}
                </h4>

                <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed font-cairo">
                  قد أتم بنجاح ومثابرة كامل متطلبات ودروس المسار التدريبي الاحترافي:
                </p>

                <h5 className="font-bold text-white text-base sm:text-lg text-rose-500">
                  {selectedCert.course_name}
                </h5>

                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 gap-4 text-xs font-bold text-zinc-500">
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-medium">تاريخ إصدار الشهادة:</span>
                    <span className="text-zinc-300 font-mono mt-0.5 block">{selectedCert.issued_at}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>شهادة رقمية معتمدة</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 font-medium">رقم التوثيق المعتمد (Verification ID):</span>
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

              <div className="border-t border-b border-white/5 py-4 my-4 grid grid-cols-2 gap-4 text-xs text-right">
                <div>
                  <span className="text-zinc-500 block">مُصدرة إلى:</span>
                  <span className="text-white font-bold block">{selectedInvoice.customer_name || profileName}</span>
                  <span className="text-zinc-400 font-mono block mt-0.5">{selectedInvoice.customer_email}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">تفاصيل الفاتورة:</span>
                  <span className="text-zinc-350 block">تاريخ الشراء: {new Date(selectedInvoice.created_at).toLocaleDateString("ar-EG")}</span>
                  <span className="text-zinc-350 block">طريقة الدفع: Paymob (مدفوع بالكامل)</span>
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
