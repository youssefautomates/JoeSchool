"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  User, BookOpen, Download, Award, Settings, LogOut, 
  Loader2, Sparkles, ShieldCheck, CheckCircle2, ChevronLeft, 
  ExternalLink, PlayCircle, Clock, FileText, ArrowLeft, RefreshCw, X, Printer
} from "lucide-react";
import Link from "next/link";
import { 
  getCoursesList, getUserEnrollments, getCourseProgressPercent, 
  getUserCertificates, getCourseBySlug, type LmsCourse, type LmsCertificate 
} from "@/lib/coursesDb";

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
  
  // Settings Form State
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Active Certificate Modal State
  const [selectedCert, setSelectedCert] = useState<LmsCertificate | null>(null);

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
      const userEnrolls = await getUserEnrollments(activeUser.id);

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

      // 5. Fetch purchased digital products from orders table
      const { data: orders, error } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("customer_email", activeUser.email)
        .eq("status", "completed");

      if (!error && orders) {
        // Exclude products that are actually courses to keep things strictly separate
        const coursesTitles = allCourses.map(c => c.title.toLowerCase());
        const filteredProducts = orders.filter(order => {
          const titleLower = order.product_title.toLowerCase();
          return !coursesTitles.some(cTitle => cTitle.includes(titleLower) || titleLower.includes(cTitle));
        });
        setDigitalProducts(filteredProducts);
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      // 1. Update metadata (Full Name)
      const { error: metaError } = await supabaseClient.auth.updateUser({
        data: { full_name: fullName }
      });

      if (metaError) throw metaError;

      // 2. Update password if requested
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
    { id: "courses", name: "دوراتي التدريبية", icon: BookOpen },
    { id: "products", name: "الحزم والمنتجات المشتراة", icon: Download },
    { id: "certificates", name: "الشهادات الممنوحة", icon: Award },
    { id: "settings", name: "إعدادات الحساب", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex flex-col lg:flex-row overflow-x-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Desktop & Mobile Sidebar */}
      <aside className="w-full lg:w-80 bg-[#0a0a0f] border-b lg:border-b-0 lg:border-l border-white/5 flex flex-col justify-between p-6 z-10 shrink-0 font-alexandria">
        <div className="space-y-8">
          {/* Dashboard Branding & Logo */}
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

          {/* User Profile Info Card */}
          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center font-alexandria font-bold text-white shadow-lg">
              {profileName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight mb-1">{profileName}</p>
              <p className="text-[10px] text-zinc-500 truncate leading-none" dir="ltr">{user?.email}</p>
            </div>
          </div>

          {/* Navigation Links */}
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
                  <item.icon className="w-4 h-4" />
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

        {/* Sidebar Footer Log out */}
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
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-alexandria font-black text-white flex items-center gap-2">
              <span>أهلاً بك، {profileName}</span>
              <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">تصفح مساقاتك التعليمية وحزم الأتمتة التي قمت باقتنائها في مكان واحد.</p>
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

        {/* Tab Contents with animations */}
        <AnimatePresence mode="wait">
          {activeTab === "courses" && (
            <motion.div
              key="courses"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">المساقات المسجل بها</h2>
                <span className="bg-rose-600/15 border border-rose-500/30 text-rose-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {enrolledCourses.length} دورات تدريبية
                </span>
              </div>

              {/* Enrolled Courses Grid */}
              {enrolledCourses.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <BookOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لم تسجل في أي دورة بعد</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                    ابدأ رحلتك التعليمية واشترك في أحد مساقاتنا القوية للأتمتة والذكاء الاصطناعي وصناعة المحتوى.
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
                          className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
                        
                        <div className="absolute w-24 h-24 bg-rose-600/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                        <PlayCircle className="w-12 h-12 text-rose-500 z-10 group-hover:scale-110 transition-transform duration-300 relative" />
                        
                        <span className="absolute bottom-4 right-4 bg-black/60 text-[9px] px-2.5 py-1 rounded-md font-bold z-10 border border-white/5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-rose-400" />
                          <span>{course.duration_hours} ساعة تدريبية</span>
                        </span>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] bg-rose-600/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {course.level}
                          </span>
                          <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-2 leading-snug group-hover:text-rose-400 transition-colors line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-zinc-400 text-xs mt-1.5 line-clamp-2">
                            {course.short_description || "تعلم الأتمتة والتقنيات الحديثة خطوة بخطوة."}
                          </p>
                        </div>

                        <div className="mt-6 space-y-4">
                          {/* Dynamic Progress Bar */}
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
                            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "products" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">المنتجات والحزم المشتراة</h2>
                <span className="bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {digitalProducts.length} منتجات جاهزة
                </span>
              </div>

              {/* Purchased Products List */}
              {digitalProducts.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <Download className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-alexandria font-bold text-white text-base">لا تتوفر مشتريات رقمية</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                    لم تقم باقتناء أي قوالب أتمتة أو حزم برمجية بعد. استكشف المنتجات الرقمية لتسريع أعمالك!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {digitalProducts.map((order) => (
                    <div 
                      key={order.id}
                      className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:border-emerald-500/20 transition-all duration-300"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/10 group-hover:scale-105 transition-all">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-white">{order.product_title}</h3>
                          <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">
                            تاريخ الشراء: {new Date(order.created_at).toLocaleDateString("ar-EG")} • السعر: ${order.amount}
                          </p>
                        </div>
                      </div>

                      <a
                        href={`/api/download?token=${order.id}`}
                        className="w-full sm:w-auto h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل الملف الرقمي</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "certificates" && (
            <motion.div
              key="certificates"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">الشهادات الممنوحة</h2>
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
                    ستظهر شهادات التخرج الرقمية المعتمدة هنا فور إتمام أي مساق تدريبي بنجاح وحضور الدروس والتقييمات المخصصة لها.
                  </p>
                  <button
                    onClick={() => setActiveTab("courses")}
                    className="h-10 px-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    تصفح مساقاتي للبدء
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

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-lg font-alexandria font-bold text-white">إعدادات الحساب</h2>
              </div>

              {/* Settings Profile Form */}
              <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl">
                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                  {/* Title */}
                  <div>
                    <h3 className="text-sm font-bold text-white">المعلومات الشخصية</h3>
                    <p className="text-zinc-500 text-xs mt-1">تحديث معلومات حساب الطالب وكلمة المرور الخاصة بك.</p>
                  </div>

                  {/* Name field */}
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

                  {/* Email field (readonly) */}
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

                  {/* Password updates */}
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

                  {/* Save button */}
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

      {/* ── CERTIFICATE SHADED MODAL ─────────────────────────────────────────── */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Customizable Certificate Live Template OR Gold Certificate Frame */}
            {selectedCert.certificate_bg_url ? (
              <div className="w-full aspect-[1.414/1] bg-[#0a0a0f] border border-amber-500/30 rounded-2xl overflow-hidden relative shadow-2xl">
                <img src={selectedCert.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 z-10 font-alexandria font-bold" style={{ color: selectedCert.certificate_text_color || "#000000" }}>
                  <div className="absolute whitespace-nowrap text-lg sm:text-xl lg:text-2xl" style={{ left: `${selectedCert.certificate_name_x || 50}%`, top: `${selectedCert.certificate_name_y || 40}%`, transform: 'translate(-50%, -50%)' }}>
                    {selectedCert.student_name}
                  </div>
                  <div className="absolute whitespace-nowrap text-xs sm:text-sm lg:text-base" style={{ left: `${selectedCert.certificate_course_x || 50}%`, top: `${selectedCert.certificate_course_y || 55}%`, transform: 'translate(-50%, -50%)' }}>
                    {selectedCert.course_name}
                  </div>
                  <div className="absolute whitespace-nowrap text-[10px] sm:text-xs" style={{ left: `${selectedCert.certificate_date_x || 50}%`, top: `${selectedCert.certificate_date_y || 70}%`, transform: 'translate(-50%, -50%)' }}>
                    {selectedCert.issued_at}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-4 border-double border-amber-500/50 p-6 sm:p-10 rounded-2xl bg-black/60 relative text-center space-y-6 overflow-hidden">
                {/* Subtle background crest / glow */}
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

            {/* Actions for Certificate */}
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
    </div>
  );
}
