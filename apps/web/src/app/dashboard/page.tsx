"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  User, BookOpen, Download, Award, Settings, LogOut, 
  Loader2, Sparkles, ShieldCheck, CheckCircle2, ChevronLeft, 
  ExternalLink, PlayCircle, Clock, FileText, ArrowLeft, RefreshCw, X, Printer, Send, Heart, Trash2, Edit, FileImage, CheckCircle
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
  const [imgError, setImgError] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("courses");

  const profileImageUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.profile_image;

  // Dynamic user data states
  const [enrolledCourses, setEnrolledCourses] = useState<(LmsCourse & { progress: number; completedCount: number; totalCount: number; firstLessonSlug: string; lastLessonSlug?: string })[]>([]);
  const [certificates, setCertificates] = useState<LmsCertificate[]>([]);
  const [digitalProducts, setDigitalProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [isRemovingWishlistId, setIsRemovingWishlistId] = useState<string | null>(null);
  const [studyStats, setStudyStats] = useState({ totalSeconds: 0, completedCount: 0, streak: 1, level: "البرونزي (مستكشف مبتدئ) 🥉" });

  
  // Settings Form State
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Active Modals
  const [selectedCert, setSelectedCert] = useState<LmsCertificate | null>(null);
  const [isEditingCertName, setIsEditingCertName] = useState(false);
  const [certNameInput, setCertNameInput] = useState("");
  const [isSavingCertName, setIsSavingCertName] = useState(false);
  const [isDownloadingCertPdf, setIsDownloadingCertPdf] = useState(false);
  const [isDownloadingCertPng, setIsDownloadingCertPng] = useState(false);
  const [isDownloadingInvoicePdf, setIsDownloadingInvoicePdf] = useState(false);
  const [isDownloadingInvoicePng, setIsDownloadingInvoicePng] = useState(false);
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
      
      if (session.user.user_metadata?.requires_password_change === true) {
        toast.error("يرجى تعيين كلمة مرور جديدة للمتابعة.");
        router.push("/reset-password?temp=true");
        return;
      }

      setUser(session.user);
      setImgError(false);
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
        
        const { data: userSettings } = await supabaseClient
          .from("users")
          .select("max_devices")
          .eq("user_id", session.user.id)
          .single();

        const userMaxDevices = userSettings?.max_devices || 3;

        // Track the current session with dynamic max limit
        await trackActiveSession(session.user.id, deviceId, userIp, browserInfo, "Browser", userMaxDevices);
        
        // Verify if session is valid (old sessions might have been deactivated)
        const isSessionValid = await checkSessionIsValid(session.user.id, deviceId);
        if (!isSessionValid) {
          toast.error("تم إيقاف حسابك أو انتهت صلاحية الجلسة. يرجى التواصل مع الدعم الفني.");
          await supabaseClient.auth.signOut();
          router.push("/login?error=suspended");
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
        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
          const liveStats = await statsRes.json();
          setStudyStats({
            totalSeconds: liveStats.studyHours * 3600,
            completedCount: liveStats.completedLessons,
            streak: liveStats.streak,
            level: liveStats.level || "البرونزي (مستكشف مبتدئ) 🥉"
          });
        }
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

  const handleSaveCertificateName = async () => {
    if (!selectedCert || !certNameInput.trim() || !user) return;
    setIsSavingCertName(true);
    try {
      const { updateCertificateStudentName } = await import("@/lib/coursesDb");
      const success = await updateCertificateStudentName(user.id, selectedCert.course_id, certNameInput.trim());
      if (success) {
        toast.success("تم تحديث وحفظ الاسم على الشهادة بنجاح! 🎉");
        
        // Update selectedCert in state instantly
        setSelectedCert(prev => prev ? { ...prev, student_name: certNameInput.trim() } : prev);
        
        // Refresh certificates list
        const { getUserCertificates } = await import("@/lib/coursesDb");
        const updatedList = await getUserCertificates(user.id);
        setCertificates(updatedList);
        
        setIsEditingCertName(false);
      } else {
        toast.error("فشل حفظ الاسم الجديد. يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
    } finally {
      setIsSavingCertName(false);
    }
  };

  const downloadCertificate = async (format: "png" | "pdf") => {
    if (!selectedCert) return;
    if (format === "pdf") setIsDownloadingCertPdf(true);
    else setIsDownloadingCertPng(true);

    toast.info("جاري تهيئة وتصميم الشهادة الرقمية بدقة عالية...");
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsDownloadingCertPdf(false);
      setIsDownloadingCertPng(false);
      return;
    }
    
    const finalizeDownload = async (dataUrl: string, width: number, height: number) => {
      try {
        if (format === "pdf") {
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "px",
            format: [width, height]
          });
          pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
          pdf.save(`شهادة_${selectedCert.course_name.replace(/\s+/g, "_")}_${selectedCert.student_name.replace(/\s+/g, "_")}.pdf`);
          toast.success("تم تنزيل شهادتك المعتمدة بصيغة PDF بنجاح! 🎉🏆");
        } else {
          const link = document.createElement("a");
          link.download = `شهادة_${selectedCert.course_name.replace(/\s+/g, "_")}_${selectedCert.student_name.replace(/\s+/g, "_")}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("تم تنزيل شهادتك المعتمدة بصيغة PNG بنجاح! 🎉🏆");
        }
      } catch (err) {
        console.error("Certificate download failed:", err);
        toast.error("فشل التنزيل المباشر، يمكنك استخدام زر الطباعة (PDF).");
      } finally {
        setIsDownloadingCertPdf(false);
        setIsDownloadingCertPng(false);
      }
    };

    if (selectedCert.certificate_bg_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.naturalWidth || 2000;
        canvas.height = img.naturalHeight || 1414;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = selectedCert.certificate_text_color || "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Match the exact same preview auto-shrinking logic for high fidelity export
        const nameLength = selectedCert.student_name.length;
        let lengthScale = 1.0;
        if (nameLength > 35) lengthScale = 0.55;
        else if (nameLength > 28) lengthScale = 0.65;
        else if (nameLength > 20) lengthScale = 0.8;
        
        const baseNameSize = (selectedCert.certificate_name_size || 24) * lengthScale;
        const nameSize = baseNameSize * (canvas.width / 800);
        ctx.font = `bold ${nameSize}px Cairo, Alexandria, sans-serif`;
        
        const nameX = (selectedCert.certificate_name_x || 50) * (canvas.width / 100);
        const nameY = (selectedCert.certificate_name_y || 40) * (canvas.height / 100);
        ctx.fillText(selectedCert.student_name, nameX, nameY);
        
        const dateSize = (selectedCert.certificate_date_size || 14) * (canvas.width / 800);
        ctx.font = `normal ${dateSize}px monospace`;
        const dateX = (selectedCert.certificate_date_x || 50) * (canvas.width / 100);
        const dateY = (selectedCert.certificate_date_y || 70) * (canvas.height / 100);
        ctx.fillText(selectedCert.issued_at, dateX, dateY);
        
        const dataUrl = canvas.toDataURL("image/png");
        finalizeDownload(dataUrl, canvas.width, canvas.height);
      };
      
      img.onerror = () => {
        toast.error("فشل تحميل قالب الشهادة المخصصة.");
        setIsDownloadingCertPdf(false);
        setIsDownloadingCertPng(false);
      };
      
      img.src = selectedCert.certificate_bg_url;
    } else {
      canvas.width = 2000;
      canvas.height = 1414;
      
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, "#06060c");
      grad.addColorStop(1, "#020205");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 16;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
      
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
      
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 80px Cairo, sans-serif";
      ctx.fillText("شهادة إكمال ومثابرة معتمدة", canvas.width / 2, 260);
      
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 24px monospace";
      ctx.fillText("VERIFIED DIGITAL CREDENTIAL OF COMPLETION", canvas.width / 2, 330);
      
      ctx.fillStyle = "#9ca3af";
      ctx.font = "40px Cairo, sans-serif";
      ctx.fillText("تشهد منصة وأكاديمية جو سكول بأن الطالب البارز:", canvas.width / 2, 480);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 90px Cairo, sans-serif";
      ctx.fillText(selectedCert.student_name, canvas.width / 2, 630);
      
      ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 400, 700);
      ctx.lineTo(canvas.width / 2 + 400, 700);
      ctx.stroke();
      
      ctx.fillStyle = "#9ca3af";
      ctx.font = "40px Cairo, sans-serif";
      ctx.fillText("قد أكمل بنجاح ومثابرة كامل متطلبات ودروس المسار التدريبي الفخم:", canvas.width / 2, 820);
      
      ctx.fillStyle = "#ec4899";
      ctx.font = "bold 65px Cairo, sans-serif";
      ctx.fillText(selectedCert.course_name, canvas.width / 2, 940);
      
      ctx.fillStyle = "#4b5563";
      ctx.font = "30px Cairo, sans-serif";
      ctx.fillText(`تاريخ الصدور: ${selectedCert.issued_at}`, canvas.width / 2 - 350, 1150);
      ctx.fillText(`رقم التوثيق الرقمي: ${selectedCert.verification_id}`, canvas.width / 2 + 350, 1150);
      
      ctx.fillStyle = "rgba(251, 191, 36, 0.03)";
      ctx.font = "bold 130px Cairo, sans-serif";
      ctx.fillText("JOESCHOOL", canvas.width / 2, canvas.height / 2 + 50);
      
      const dataUrl = canvas.toDataURL("image/png");
      finalizeDownload(dataUrl, canvas.width, canvas.height);
    }
  };

  const downloadInvoice = async (format: "png" | "pdf") => {
    if (!selectedInvoice) return;
    if (format === "pdf") setIsDownloadingInvoicePdf(true);
    else setIsDownloadingInvoicePng(true);

    toast.info("جاري تصميم الفاتورة الرقمية بدقة عالية...");

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsDownloadingInvoicePdf(false);
      setIsDownloadingInvoicePng(false);
      return;
    }

    const isEgp = selectedInvoice.currency?.toUpperCase() === "EGP";
    const formattedPrice = isEgp ? `${selectedInvoice.amount} جنيه` : `$${selectedInvoice.amount}`;
    const formattedTax = isEgp ? "0 جنيه" : "$0.00";

    // Draw beautiful dark glassmorphic receipt design
    // 1. Background
    const grad = ctx.createLinearGradient(0, 0, 0, 1400);
    grad.addColorStop(0, "#08080c");
    grad.addColorStop(1, "#0f0f16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 1400);

    // Decorative glass glow
    const radialGrad = ctx.createRadialGradient(600, 700, 100, 600, 700, 600);
    radialGrad.addColorStop(0, "rgba(29, 78, 216, 0.05)");
    radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, 1200, 1400);

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 1184, 1384);

    ctx.strokeStyle = "#1D4ED8";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 1160, 1360);

    // Header (RTL Alignment for Arabic Texts)
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    
    // Logo text
    ctx.font = "bold 42px sans-serif";
    ctx.fillText("جو سكول", 1100, 100);
    
    ctx.font = "normal 18px sans-serif";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("المنصة الرائدة لتعليم الأتمتة وأنظمة الذكاء الاصطناعي", 1100, 140);
    ctx.fillText("support@joeschool.com", 1100, 170);

    // Document Title (LTL Alignment for metadata)
    ctx.textAlign = "left";
    ctx.fillStyle = "#1D4ED8";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("فاتورة شراء رقمية", 100, 100);

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "normal 20px monospace";
    ctx.fillText(`رقم الفاتورة: #${selectedInvoice.payment_id || selectedInvoice.id}`, 100, 145);
    ctx.fillText(`تاريخ الإصدار: ${new Date(selectedInvoice.created_at).toLocaleDateString("ar-EG")}`, 100, 175);

    // Separator line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 230);
    ctx.lineTo(1100, 230);
    ctx.stroke();

    // Bill to / Bill from
    ctx.textAlign = "right";
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("مُصدرة إلى (العميل):", 1100, 280);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(selectedInvoice.customer_name || profileName, 1100, 320);
    
    ctx.font = "normal 20px monospace";
    ctx.fillStyle = "#d4d4d8";
    ctx.fillText(selectedInvoice.customer_email, 1100, 365);

    ctx.textAlign = "left";
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("تفاصيل الدفع والمزود:", 100, 280);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("أكاديمية JoeSchool", 100, 320);

    ctx.font = "normal 20px sans-serif";
    ctx.fillStyle = "#d4d4d8";
    ctx.fillText("بوابة الدفع الإلكتروني: Paymob", 100, 360);
    ctx.fillText("الحالة: مدفوعة بالكامل ✅", 100, 395);

    // Separator line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 450);
    ctx.lineTo(1100, 450);
    ctx.stroke();

    // Table Header
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("تفاصيل المسار التعليمي / المنتج", 1100, 510);
    
    ctx.textAlign = "left";
    ctx.fillText("المبلغ الإجمالي", 100, 510);

    // Separator line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 540);
    ctx.lineTo(1100, 540);
    ctx.stroke();

    // Table Row
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "right";
    
    // Draw course title
    const prodTitle = selectedInvoice.product_title;
    ctx.fillText(prodTitle, 1100, 610);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px monospace";
    ctx.textAlign = "left";
    ctx.fillText(formattedPrice, 100, 610);

    // Separator line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 670);
    ctx.lineTo(1100, 670);
    ctx.stroke();

    // Totals Section
    ctx.textAlign = "right";
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "normal 22px sans-serif";
    ctx.fillText("المجموع الفرعي:", 900, 740);
    ctx.fillText("الضرائب والرسوم:", 900, 790);
    ctx.fillText("الخصومات والكوبونات:", 900, 840);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px monospace";
    ctx.fillText(formattedPrice, 1100, 740);
    ctx.fillText(formattedTax, 1100, 790);
    ctx.fillText(formattedTax, 1100, 840);

    // Total Paid Row
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(700, 890);
    ctx.lineTo(1100, 890);
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("الإجمالي المدفوع:", 900, 950);
    
    ctx.font = "bold 38px monospace";
    ctx.fillText(formattedPrice, 1100, 950);

    // Stamp / Paid seal in the center bottom
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(300, 850, 90, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("مدفوع", 300, 835);
    ctx.font = "bold 20px monospace";
    ctx.fillText("PAID", 300, 875);

    // Bottom banner
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 1100);
    ctx.lineTo(1100, 1100);
    ctx.stroke();

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "normal 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("شكراً لثقتك واشتراكك في مساراتنا التعليمية الفنية الفاخرة.", 600, 1160);
    ctx.fillText("هذه الفاتورة مستند رسمي ومعتمد لعملية الشراء ولا تحتاج لتوقيع.", 600, 1200);
    ctx.font = "normal 14px monospace";
    ctx.fillStyle = "#71717a";
    ctx.fillText("JoeSchool © 2026. All rights reserved.", 600, 1240);

    // Finalize image export
    const dataUrl = canvas.toDataURL("image/png");
    
    try {
      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [1200, 1400]
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, 1200, 1400);
        pdf.save(`فاتورة_${selectedInvoice.product_title.replace(/\s+/g, "_")}_#${selectedInvoice.payment_id || selectedInvoice.id}.pdf`);
        toast.success("تم تحميل فاتورتك الرسمية بصيغة PDF بنجاح! 📄🎉");
      } else {
        const link = document.createElement("a");
        link.download = `فاتورة_${selectedInvoice.product_title.replace(/\s+/g, "_")}_#${selectedInvoice.payment_id || selectedInvoice.id}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("تم تحميل الفاتورة الرقمية كصورة PNG بنجاح! 🖼️🎉");
      }
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast.error("حدث خطأ أثناء تحميل الفاتورة.");
    } finally {
      setIsDownloadingInvoicePdf(false);
      setIsDownloadingInvoicePng(false);
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
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">جاري تحميل لوحة التحكم الفنية...</p>
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
    <div className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col lg:flex-row overflow-x-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 left-10 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-[#07070b]/90 backdrop-blur-xl border-b lg:border-b-0 lg:border-l border-zinc-200/60 flex flex-col justify-between p-4 lg:p-6 z-20 shrink-0 font-sans">
        <div className="space-y-4 lg:space-y-8">
          <div className="flex items-center justify-between lg:justify-start gap-3 border-b border-zinc-200/60 pb-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div>
                <span className="font-sans font-bold text-base block text-zinc-900 group-hover:text-yellow-500 transition-colors">جو سكول</span>
                <span className="text-[10px] text-zinc-500 block -mt-1 font-medium tracking-wide">STUDENT PORTAL</span>
              </div>
            </Link>
            <Link 
              href="/" 
              className="lg:hidden text-xs text-yellow-500 hover:text-brand-300 hover:border-zinc-200/60 hover:bg-brand-500/10 transition-colors font-bold border border-zinc-200/60 px-3 py-1.5 rounded-2xl bg-brand-600/5"
            >
              العودة للمتجر
            </Link>
          </div>

          <div className="hidden lg:flex flex-col gap-2 bg-zinc-50/40 border border-zinc-200/60 rounded-2xl p-4 relative overflow-hidden group select-none">
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex items-center gap-4 relative z-10">
              {profileImageUrl && !imgError && (
                <img
                  src={profileImageUrl}
                  alt={profileName}
                  onError={() => setImgError(true)}
                  className="w-12 h-12 rounded-2xl object-cover border border-zinc-200/60 shadow-sm border border-zinc-200/60 shrink-0 group-hover:scale-105 transition-transform duration-300"
                />
              )}
              
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-sans font-bold text-zinc-900 truncate leading-tight mb-1.5">{profileName}</p>
                <p className="text-[9px] text-zinc-500 truncate leading-none mb-2" dir="ltr">{user?.email}</p>
                <div className="flex justify-end">
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    طالب مميز
                  </span>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none relative">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-xs shrink-0 lg:w-full relative cursor-pointer ${
                    isActive 
                      ? "text-zinc-900" 
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50/70"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-bg"
                      className="absolute inset-0 bg-gradient-to-l from-brand-600 to-pink-600 rounded-2xl -z-10 shadow-sm border border-zinc-200/60 shadow-brand-600/15"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "scale-110 text-zinc-900" : "text-zinc-500"}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-200/60 hidden lg:block">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors font-bold text-xs group cursor-pointer"
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
            <h1 className="text-2xl sm:text-3xl font-sans font-black text-zinc-900 flex items-center justify-start gap-2">
              <span>أهلاً بك، {profileName}</span>
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1.5 font-sans">تصفح مساراتك التعليمية والحزم الإبداعية التي قمت باقتنائها في مكان واحد.</p>
          </div>
          
          <div className="flex items-center justify-start sm:justify-end gap-3">
            <Link 
              href="/" 
              className="hidden lg:inline-flex items-center gap-2 text-xs font-sans font-bold text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-4 py-2.5 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 transition-all"
            >
              <span>العودة للمتجر الرئيسي</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button 
              onClick={handleLogout}
              className="lg:hidden flex items-center gap-2 border border-red-500/20 px-4 py-2.5 rounded-2xl bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors font-bold text-xs cursor-pointer"
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
              color: "from-brand-600 to-pink-600",
              bgColor: "bg-brand-500/10",
              borderColor: "border-zinc-200/60",
              iconColor: "text-yellow-500",
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
              value: studyStats.level || "البرونزي (مستكشف مبتدئ) 🥉",
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
              className="group relative bg-zinc-50/70 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4 shadow-sm border border-zinc-200/60 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.04] text-right"
            >
              {/* Card glowing light effect on hover */}
              <div className={`absolute inset-0 -z-10 rounded-2xl sm:rounded-3xl bg-gradient-to-tr ${stat.color} opacity-0 group-hover:opacity-5 blur-[20px] transition-opacity duration-300`} />
              
              <div className={`w-10 sm:w-14 h-10 sm:h-14 rounded-2xl sm:rounded-2xl ${stat.bgColor} ${stat.borderColor} border ${stat.iconColor} flex items-center justify-center shrink-0 shadow-sm border border-zinc-200/60 group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-5 sm:w-7 h-5 sm:h-7 ${stat.pulse ? "animate-pulse" : ""}`} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-500 block font-sans font-bold tracking-wide">{stat.title}</span>
                {stat.isLevel ? (
                  <span className="text-xs sm:text-sm font-sans font-black text-zinc-900 block mt-1 leading-none truncate">
                    {stat.value}
                  </span>
                ) : (
                  <span className="text-base sm:text-xl font-sans font-black text-zinc-900 mt-1 block leading-none">
                    {stat.value} <span className="text-[10px] sm:text-xs font-normal text-zinc-500">{stat.unit}</span>
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
            <div className="group relative bg-gradient-to-l from-brand-950/20 via-white/80 to-[#07070b]/90 border border-zinc-200/60 hover:border-zinc-200/60 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 overflow-hidden shadow-sm border border-zinc-200/60 backdrop-blur-xl transition-all duration-300">
              {/* Animated mesh gradient behind */}
              <div className="absolute -right-20 -top-20 w-[300px] h-[300px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute left-10 bottom-0 w-[150px] h-[150px] bg-pink-500/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex-1 space-y-4 text-right w-full relative z-10">
                <div className="flex items-center gap-2 text-yellow-500 text-xs font-sans font-bold tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                  </span>
                  <span>متابعة التعلم (واصل من حيث توقفت)</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-sans font-black text-zinc-900 leading-tight tracking-tight group-hover:text-yellow-500 transition-colors duration-300">{courseToResume.title}</h3>
                  <p className="text-zinc-500 text-xs mt-2 font-alexandria leading-relaxed">أحسنت صنعاً! لقد أكملت <span className="text-yellow-500 font-bold">{courseToResume.progress}%</span> من هذا الكورس الرائد بنجاح.</p>
                </div>
                
                {/* Progress bar inside callout */}
                <div className="max-w-md pt-2">
                  <div className="flex justify-between items-center text-[10px] font-sans font-bold text-zinc-500 mb-1.5">
                    <span>نسبة تقدمك الإجمالية</span>
                    <span className="text-yellow-500 font-mono">{courseToResume.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100/40 rounded-full overflow-hidden border border-zinc-200/60 p-[1px]">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-brand-600 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" 
                      style={{ width: `${courseToResume.progress}%` }} 
                    />
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 w-full md:w-auto relative z-10">
                <Link
                  href={`/learn/${courseToResume.slug}/${courseToResume.lastLessonSlug || courseToResume.firstLessonSlug}`}
                  className="w-full md:w-auto h-14 px-8 bg-gradient-to-l from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-zinc-900 rounded-2xl text-xs sm:text-sm font-sans font-black flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-98 shadow-[0_12px_24px_rgba(29, 78, 216,0.3)] hover:shadow-[0_16px_32px_rgba(29, 78, 216,0.45)] group/btn"
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
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-zinc-200/60 pb-4">
                <h2 className="text-lg font-sans font-bold text-zinc-900">الأقسام والشهادات المسجل بها</h2>
                <span className="bg-brand-600/15 border border-zinc-200/60 text-yellow-500 text-[10px] px-3 py-1 rounded-full font-bold">
                  {enrolledCourses.length} دورات تدريبية
                </span>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50/40 border border-zinc-200/60 rounded-3xl p-8 shadow-sm border border-zinc-200/60">
                  <BookOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-sans font-bold text-zinc-900 text-base">لم تسجل في أي دورة بعد</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-alexandria">
                    ابدأ رحلتك التعليمية واشترك في أحد مساراتنا القوية لصناعة المحتوى والرسوم المتحركة بالذكاء الاصطناعي.
                  </p>
                  <Link 
                    href="/courses"
                    className="mt-6 inline-flex h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl text-xs font-bold items-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    تصفح الدورات التدريبية
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrolledCourses.map((course) => (
                    <div 
                      key={course.id}
                      className="group relative bg-[#07070b]/60 border border-zinc-200/60 hover:border-zinc-200/60 rounded-3xl overflow-hidden flex flex-col h-full shadow-sm border border-zinc-200/60 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                    >
                      {/* Top Media Cover */}
                      <Link 
                        href={`/learn/${course.slug}/${course.lastLessonSlug || course.firstLessonSlug}`}
                        className="relative h-48 bg-zinc-950 overflow-hidden flex items-center justify-center cursor-pointer block"
                      >
                        <img 
                          src={course.image_url} 
                          alt={course.title}
                          className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-700 ease-out" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-[#07070b]/40 to-transparent" />
                        
                        {/* Glassmorphic Play button wrapper */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-zinc-200 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-600/90 group-hover:border-zinc-200/60 transition-all duration-300 shadow-sm border border-zinc-200/60">
                            <PlayCircle className="w-8 h-8 text-zinc-900" />
                          </div>
                        </div>
                        
                        <span className="absolute bottom-4 right-4 bg-slate-50/85 backdrop-blur-md text-[9px] font-sans font-bold px-3 py-1.5 rounded-2xl z-10 border border-zinc-200/60 flex items-center gap-1.5 text-zinc-700">
                          <Clock className="w-3.5 h-3.5 text-yellow-500" />
                          <span>{course.duration_hours} ساعة تدريبية</span>
                        </span>
                      </Link>

                      {/* Card Content */}
                      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between relative z-10">
                        <div className="space-y-2">
                          <h3 className="text-base sm:text-lg font-sans font-black text-zinc-900 leading-snug group-hover:text-yellow-500 transition-colors duration-300 line-clamp-2">
                            <Link href={`/learn/${course.slug}/${course.lastLessonSlug || course.firstLessonSlug}`}>
                              {course.title}
                            </Link>
                          </h3>
                          <p className="text-zinc-500 font-sans text-xs leading-relaxed line-clamp-2">
                            {course.short_description || "تعلم صناعة المحتوى بالذكاء الاصطناعي خطوة بخطوة."}
                          </p>
                        </div>

                        <div className="mt-6 space-y-5">
                          {/* Progress display */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-sans font-bold text-zinc-500">
                              <span>نسبة الإنجاز</span>
                              <span className="text-yellow-500 font-mono">{course.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100/40 rounded-full overflow-hidden border border-zinc-200/60 p-[1px]">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-brand-600 rounded-full transition-all duration-500" 
                                style={{ width: `${course.progress}%` }} 
                              />
                            </div>
                          </div>

                          {/* Action Button */}
                          <Link
                            href={`/learn/${course.slug}/${course.lastLessonSlug || course.firstLessonSlug}`}
                            className="w-full h-12 bg-zinc-100/40 border border-zinc-200 hover:bg-gradient-to-l hover:from-brand-600 hover:to-pink-600 hover:border-transparent text-zinc-900 rounded-2xl text-xs font-sans font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-98 shadow-md group-hover:shadow-[0_8px_20px_rgba(29, 78, 216,0.15)]"
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
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-zinc-200/60 pb-4">
                <h2 className="text-lg font-sans font-bold text-zinc-900">ملفاتي الرقمية والحزم الإبداعية</h2>
                <span className="bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {digitalProducts.length} ملفات جاهزة
                </span>
              </div>

              {digitalProducts.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50/40 border border-zinc-200/60 rounded-3xl p-8 shadow-sm border border-zinc-200/60">
                  <Download className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-sans font-bold text-zinc-900 text-base">لا تتوفر ملفات رقمية</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-alexandria">
                    لم تقم باقتناء أي حزم إبداعية أو قوالب فيديو بعد. استكشف المنتجات الرقمية لدعم إبداعك!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {digitalProducts.map((p) => (
                    <div 
                      key={p.id}
                      className="group bg-[#07070b]/60 border border-zinc-200/60 hover:border-emerald-500/25 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-zinc-200/60 transition-all duration-300 hover:bg-zinc-100/30"
                    >
                      <div className="flex items-start gap-4 text-right">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-sans font-bold text-zinc-900 group-hover:text-emerald-400 transition-colors">{p.product_title}</h3>
                          
                          {/* File Details Grid */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500 font-medium font-sans">
                            <span>نوع الملف: <strong className="text-zinc-700 font-bold">{p.fileType}</strong></span>
                            <span className="opacity-30">•</span>
                            <span>الحجم: <strong className="text-zinc-700 font-bold">{p.fileSize}</strong></span>
                            <span className="opacity-30">•</span>
                            <span className="text-emerald-400/80 font-bold">التحميل: {p.remainingDownloads}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        <a
                          href={`/api/download?token=${p.id}`}
                          className="flex-1 sm:flex-none h-12 px-6 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-550 hover:to-teal-550 text-zinc-900 rounded-2xl text-xs font-sans font-black flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-98 shadow-[0_8px_20px_rgba(16,185,129,0.2)]"
                        >
                          <Download className="w-4 h-4" />
                          <span>تحميل الملف</span>
                        </a>

                        <button
                          onClick={() => handleResendEmailForOrder(p.id)}
                          className="h-12 px-4 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl text-xs font-sans font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          title="إعادة إرسال البريد"
                        >
                          <Send className="w-4 h-4 text-zinc-500" />
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
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-zinc-200/60 pb-4">
                <h2 className="text-lg font-sans font-bold text-zinc-900">الشهادات والاعتمادات</h2>
                <span className="bg-brand-600/15 border border-zinc-200/60 text-yellow-500 text-[10px] px-3 py-1 rounded-full font-bold">
                  {certificates.length} شهادات موثقة
                </span>
              </div>

              {certificates.length === 0 ? (
                <div className="bg-[#07070b]/60 border border-zinc-200/60 rounded-3xl p-10 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm border border-zinc-200/60 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-600 to-transparent" />
                  <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-zinc-200/60 flex items-center justify-center text-yellow-500 mb-6 shadow-inner">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-sans font-bold text-zinc-900 mb-2">لا تتوفر شهادات بعد</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm max-w-md leading-relaxed mb-6 font-alexandria">
                    ستظهر شهادات التخرج الرقمية المعتمدة هنا فور إتمام أي قسم تدريبي بنجاح وحضور الدروس والتقييمات المخصصة لها.
                  </p>
                  <button
                    onClick={() => setActiveTab("courses")}
                    className="h-10 px-5 bg-zinc-100/40 border border-zinc-200 hover:bg-zinc-100/80 text-zinc-900 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    تصفح أقسامي للبدء
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certificates.map((cert) => (
                    <div 
                      key={cert.id}
                      className="group bg-[#07070b]/60 border border-zinc-200/60 hover:border-amber-500/20 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm border border-zinc-200/60 transition-all duration-300 text-right relative overflow-hidden"
                    >
                      {/* Ambient light for active certificate */}
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
                      
                      <div className="space-y-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[9px] text-amber-500 font-sans font-bold block uppercase tracking-wider">رقم التحقق: {cert.verification_id}</span>
                          <h3 className="font-alexandria font-black text-zinc-900 text-base sm:text-lg mt-1.5 group-hover:text-amber-400 transition-colors">{cert.course_name}</h3>
                          <p className="text-zinc-500 font-alexandria text-xs mt-1">تاريخ الإصدار: {cert.issued_at}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                        }}
                        className="mt-6 w-full h-12 bg-gradient-to-l from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-sans font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.35)] active:scale-98 transition-all cursor-pointer relative z-10"
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
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-zinc-200/60 pb-4">
                <h2 className="text-lg font-sans font-bold text-zinc-900">فواتير ومعاملات الشراء</h2>
                <span className="bg-sky-600/15 border border-sky-500/30 text-sky-400 text-[10px] px-3 py-1 rounded-full font-bold">
                  {invoices.length} فواتير معتمدة
                </span>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50/40 border border-zinc-200/60 rounded-3xl p-8 shadow-sm border border-zinc-200/60">
                  <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="font-sans font-bold text-zinc-900 text-base">لا توجد عمليات شراء سابقة</h3>
                  <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto font-alexandria">
                    لم نجد أي فواتير أو إيصالات شراء سابقة مربوطة بهذا البريد الإلكتروني.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div 
                      key={inv.id}
                      className="group bg-[#07070b]/60 border border-zinc-200/60 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-200 transition-all duration-300 text-right shadow-sm border border-zinc-200/60"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100/40 border border-zinc-200 flex items-center justify-center text-zinc-500 shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-sans font-bold text-zinc-900 group-hover:text-yellow-500 transition-colors">{inv.product_title}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-1.5 font-alexandria">
                            <span>الرقم المرجعي: <strong className="text-zinc-700 font-mono text-[10px]">#{inv.payment_id || inv.id}</strong></span>
                            <span className="opacity-30">•</span>
                            <span>التاريخ: {new Date(inv.created_at).toLocaleDateString("ar-EG")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                        <span className="text-emerald-400 font-sans font-black text-base pr-2 sm:pr-4">
                          {inv.currency?.toUpperCase() === "EGP" ? `${inv.amount} جنيه` : `$${inv.amount}`}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-11 px-4 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl text-xs font-sans font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>عرض الفاتورة</span>
                          </button>

                          <button
                            onClick={() => handleResendEmailForOrder(inv.id)}
                            className="h-11 px-3.5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                            title="إعادة إرسال البريد"
                          >
                            <Send className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-900 transition-colors" />
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
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-zinc-200/60 pb-4">
                <h2 className="text-lg font-sans font-bold text-zinc-900">المفضلة الخاصة بي</h2>
                <span className="bg-brand-600/15 border border-zinc-200/60 text-yellow-500 text-[10px] px-3 py-1 rounded-full font-bold">
                  {wishlistItems.length} عناصر محفوظة
                </span>
              </div>

              {wishlistItems.length === 0 ? (
                <div className="bg-[#07070b]/60 border border-zinc-200/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-6 shadow-sm border border-zinc-200/60">
                  <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-zinc-200/60 flex items-center justify-center text-yellow-500">
                    <Heart className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-zinc-900 font-sans">قائمة المفضلة فارغة حالياً</h3>
                    <p className="text-zinc-500 text-xs max-w-sm leading-relaxed mx-auto font-alexandria">
                      تصفح متجرنا الرقمي ومساراتنا الاحترافية وأضف ما ينال إعجابك إلى المفضلة للعودة إليه لاحقاً بسهولة!
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl text-xs font-bold transition-all shadow-sm border border-zinc-200/60 shadow-brand-600/20"
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
                        : "bg-brand-500/10 text-yellow-500 border-zinc-200/60";

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
                        className="bg-[#07070b]/60 border border-zinc-200/60 rounded-3xl p-5 flex gap-4 hover:border-zinc-200 hover:border-zinc-200/60 transition-all duration-300 relative group overflow-hidden shadow-sm border border-zinc-200/60"
                      >
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-neutral-900 border border-zinc-200/60 relative">
                          {imageUrl ? (
                            <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-sans font-bold text-zinc-900/20">
                              YA
                            </div>
                          )}
                          <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-2xl text-[8px] font-sans font-bold border backdrop-blur-md ${badgeColor}`}>
                            {typeBadge}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between text-right">
                          <div className="space-y-1">
                            <h3 className="text-sm sm:text-base font-sans font-bold text-zinc-900 truncate group-hover:text-yellow-500 transition-colors">
                              {title}
                            </h3>
                            <p className="text-zinc-500 font-sans text-xs line-clamp-2 leading-relaxed">
                              {desc}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-200/60">
                            <span className="text-xs sm:text-sm font-sans font-black text-rose-450">${price}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRemoveFromWishlist(item.item_type, id)}
                                disabled={isRemovingWishlistId === id}
                                className="p-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                                title="إزالة من المفضلة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <Link
                                href={itemLink}
                                className="px-4 py-2 bg-gradient-to-l from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-zinc-900 rounded-2xl text-[10px] sm:text-xs font-sans font-bold transition-all shadow-md shadow-brand-600/10 flex items-center gap-1.5"
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
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2.5 sm:gap-4 border-b border-zinc-200/60 pb-4 text-right">
                <h2 className="text-lg font-sans font-bold text-zinc-900">إعدادات الحساب</h2>
              </div>

              <div className="bg-[#07070b]/60 border border-zinc-200/60 rounded-3xl p-6 sm:p-10 shadow-sm border border-zinc-200/60 backdrop-blur-md">
                <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl text-right">
                  <div>
                    <h3 className="text-base font-sans font-bold text-zinc-900">المعلومات الشخصية</h3>
                    <p className="text-zinc-500 font-alexandria text-xs mt-1">قم بتحديث معلومات حساب الطالب وكلمة المرور الخاصة بك في أي وقت.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-zinc-500 block pr-1">الاسم الكامل</label>
                    <div className="relative group">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-sans font-medium focus:outline-none focus:border-zinc-200/60 focus:bg-zinc-100/80 transition-all text-zinc-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-sans font-bold text-zinc-500 block pr-1">البريد الإلكتروني (غير قابل للتعديل)</label>
                    <div className="relative opacity-60">
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-650" />
                      <input
                        type="email"
                        value={user?.email || ""}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-sans font-medium text-zinc-500 focus:outline-none cursor-not-allowed"
                        dir="ltr"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-200/60 my-8 pt-8" />

                  <div>
                    <h3 className="text-base font-sans font-bold text-zinc-900">تعديل كلمة المرور</h3>
                    <p className="text-zinc-500 font-alexandria text-xs mt-1">اترك هذه الحقول فارغة إذا كنت لا ترغب في تغيير كلمة المرور الحالية.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-sans font-bold text-zinc-500 block pr-1">كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="•••••••• (6 أحرف كحد أدنى)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl py-3.5 px-4 text-sm font-sans font-medium focus:outline-none focus:border-zinc-200/60 focus:bg-zinc-100/80 transition-all text-zinc-900"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-sans font-bold text-zinc-500 block pr-1">تأكيد كلمة المرور الجديدة</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl py-3.5 px-4 text-sm font-sans font-medium focus:outline-none focus:border-zinc-200/60 focus:bg-zinc-100/80 transition-all text-zinc-900"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="h-12 px-8 bg-gradient-to-l from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-zinc-900 rounded-2xl font-sans font-black text-xs shadow-sm border border-zinc-200/60 shadow-brand-600/25 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-6"
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 border border-zinc-200 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-sm border border-zinc-200/60 relative">
            <button 
              onClick={() => {
                setIsEditingCertName(false);
                setSelectedCert(null);
              }}
              className="absolute top-4 left-4 p-2 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {selectedCert.certificate_bg_url ? (
              <div 
                className="w-full aspect-[1.414/1] bg-slate-50 border border-amber-500/30 rounded-2xl overflow-hidden relative shadow-sm border border-zinc-200/60"
                style={{ containerType: 'inline-size' } as React.CSSProperties}
              >
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
                      fontSize: `calc((${(() => {
                        const nameLength = selectedCert.student_name.length;
                        let lengthScale = 1.0;
                        if (nameLength > 35) lengthScale = 0.55;
                        else if (nameLength > 28) lengthScale = 0.65;
                        else if (nameLength > 20) lengthScale = 0.8;
                        return (selectedCert.certificate_name_size || 24) * lengthScale;
                      })()} / 800) * 100cqw)`,
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
                      fontSize: `calc((${selectedCert.certificate_date_size || 14} / 800) * 100cqw)`,
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
                  <h3 className="font-sans font-black text-zinc-900 text-lg sm:text-2xl tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
                    شهادة إكمال ومثابرة موثقة
                  </h3>
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] font-mono">Certificate of Course Completion</p>
                </div>

                <p className="text-zinc-500 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed font-sans">
                  يُشهد فريق عمل أكاديمية <span className="font-bold text-zinc-900">JoeSchool</span> الفنية بأن الطالب البارز:
                </p>

                <h4 className="font-sans font-black text-zinc-900 text-2xl sm:text-4xl underline decoration-amber-500/50 underline-offset-8">
                  {selectedCert.student_name}
                </h4>

                <p className="text-zinc-500 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed font-sans">
                  قد أتم بنجاح ومثابرة كامل متطلبات ودروس المسار التدريبي الاحترافي:
                </p>

                <h5 className="font-bold text-zinc-900 text-base sm:text-lg text-yellow-500">
                  {selectedCert.course_name}
                </h5>

                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200/60 pt-6 gap-4 text-xs font-bold text-zinc-500">
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-medium">تاريخ إصدار الشهادة:</span>
                    <span className="text-zinc-700 font-mono mt-0.5 block">{selectedCert.issued_at}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>شهادة رقمية معتمدة</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 font-medium">رقم التوثيق المعتمد (Verification ID):</span>
                    <span className="text-yellow-500 font-mono mt-0.5 block">{selectedCert.verification_id}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Editing Section */}
            {!isEditingCertName ? (
              <div className="flex flex-col items-center justify-center p-5 bg-zinc-50/40 border border-zinc-200/60 rounded-3xl gap-3 text-center">
                <div className="text-zinc-500 text-xs font-medium">الاسم المطبوع حالياً على الشهادة: <span className="text-amber-400 font-black">{selectedCert.student_name}</span></div>
                <button
                  onClick={() => {
                    setCertNameInput(selectedCert.student_name);
                    setIsEditingCertName(true);
                  }}
                  className="px-5 py-2.5 bg-zinc-100/40 hover:bg-zinc-100/80 text-yellow-500 border border-zinc-200 hover:border-brand-500/25 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>تعديل الاسم المطبوع على الشهادة</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col bg-zinc-50/40 border border-zinc-200/60 p-6 rounded-3xl gap-4 text-right">
                <div className="space-y-1">
                  <label className="text-xs font-sans font-bold text-zinc-700 block">تعديل اسم الطالب المطبوع:</label>
                  <p className="text-[10px] text-zinc-500 font-medium">تنبيه: يمكنك فقط تعديل نص الاسم. لا يمكنك تغيير نوع الخط أو الحجم المحددين مسبقاً من الإدارة لضمان توافق وجودة الشهادة الاحترافية.</p>
                </div>
                
                <input
                  type="text"
                  value={certNameInput}
                  onChange={(e) => setCertNameInput(e.target.value)}
                  placeholder="اكتب اسمك الثلاثي بالشكل الصحيح..."
                  className="w-full bg-slate-50 border border-zinc-200/60 focus:border-zinc-200/60 rounded-2xl p-4 text-xs focus:outline-none transition-all text-zinc-900 text-right leading-relaxed"
                  required
                />
                
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setIsEditingCertName(false)}
                    className="h-10 px-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-zinc-200/60"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveCertificateName}
                    disabled={isSavingCertName || !certNameInput.trim()}
                    className="h-10 px-5 bg-gradient-to-l from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-zinc-900 rounded-2xl text-xs font-sans font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm border border-zinc-200/60 shadow-brand-600/10"
                  >
                    {isSavingCertName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>حفظ الاسم وتحديث الشهادة</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-200/60">
              <button
                onClick={() => downloadCertificate("pdf")}
                disabled={isDownloadingCertPdf || isDownloadingCertPng}
                className="w-full sm:w-auto h-11 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isDownloadingCertPdf ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <Download className="w-4.5 h-4.5" />
                )}
                <span>تحميل الشهادة بصيغة PDF (جودة فائقة)</span>
              </button>

              <button
                onClick={() => downloadCertificate("png")}
                disabled={isDownloadingCertPdf || isDownloadingCertPng}
                className="w-full sm:w-auto h-11 px-5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                {isDownloadingCertPng ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <FileImage className="w-4.5 h-4.5 text-zinc-500" />
                )}
                <span>تحميل بصيغة PNG (صورة)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto h-11 px-5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الشهادة</span>
              </button>
              
              <button
                onClick={() => {
                  setIsEditingCertName(false);
                  setSelectedCert(null);
                }}
                className="w-full sm:w-auto h-11 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 hover:text-zinc-900 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRINTABLE INVOICES SHADED MODAL ───────────────────────────── */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 border border-zinc-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-sm border border-zinc-200/60 relative my-auto">
            <button 
              onClick={() => setSelectedInvoice(null)}
              className="absolute top-4 left-4 p-2 rounded-2xl bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Invoice Container */}
            <div id="printable-invoice" className="border border-zinc-200 p-6 sm:p-8 rounded-2xl bg-black/40 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-sans font-bold text-zinc-900 text-lg">فاتورة شراء رقمية</h3>
                  <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">Invoice Ref: #{selectedInvoice.payment_id || selectedInvoice.id}</span>
                </div>
                <div className="text-left">
                  <span className="font-sans font-bold text-sm text-yellow-500 block">JoeSchool</span>
                  <span className="text-[9px] text-zinc-500 block">support@joeschool.com</span>
                </div>
              </div>

              <div className="border-t border-b border-zinc-200/60 py-4 my-4 grid grid-cols-2 gap-4 text-xs text-right">
                <div>
                  <span className="text-zinc-500 block">مُصدرة إلى:</span>
                  <span className="text-zinc-900 font-bold block">{selectedInvoice.customer_name || profileName}</span>
                  <span className="text-zinc-500 font-mono block mt-0.5">{selectedInvoice.customer_email}</span>
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
                  <tr className="border-b border-zinc-200/60 text-zinc-500">
                    <th className="pb-2 font-bold">المنتج</th>
                    <th className="pb-2 text-left font-bold">السعر</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 text-zinc-900 font-bold">{selectedInvoice.product_title}</td>
                    <td className="py-3 text-left text-emerald-400 font-bold">
                      {selectedInvoice.currency?.toUpperCase() === "EGP" ? `${selectedInvoice.amount} جنيه` : `$${selectedInvoice.amount}`}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-zinc-200/60 pt-4 flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-500">الإجمالي المدفوع:</span>
                <span className="text-emerald-400 text-lg">
                  {selectedInvoice.currency?.toUpperCase() === "EGP" ? `${selectedInvoice.amount} جنيه` : `$${selectedInvoice.amount}`}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 pt-6 pb-2 border-t border-zinc-200/60 w-full">
              <button
                onClick={() => downloadInvoice("pdf")}
                disabled={isDownloadingInvoicePdf || isDownloadingInvoicePng}
                className="w-full sm:w-auto h-11 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isDownloadingInvoicePdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>تحميل PDF (جودة فائقة)</span>
              </button>

              <button
                onClick={() => downloadInvoice("png")}
                disabled={isDownloadingInvoicePdf || isDownloadingInvoicePng}
                className="w-full sm:w-auto h-11 px-5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isDownloadingInvoicePng ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileImage className="w-4 h-4 text-zinc-500" />
                )}
                <span>تحميل كصورة PNG</span>
              </button>

              <button
                onClick={() => handleResendEmailForOrder(selectedInvoice.id)}
                className="w-full sm:w-auto h-11 px-4 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
                title="إعادة إرسال الفاتورة والبريد الإلكتروني"
              >
                <Send className="w-4 h-4 text-zinc-500" />
                <span>إرسال بالبريد</span>
              </button>

              <button
                onClick={() => {
                  const printContents = document.getElementById("printable-invoice")?.innerHTML;
                  if (printContents) {
                    const printWindow = window.open("", "_blank");
                    printWindow?.document.write(`
                      <html dir="rtl" lang="ar">
                      <head>
                        <title>فاتورة JoeSchool</title>
                        <style>
                          body { font-family: system-ui; padding: 40px; background: white; color: black; }
                          .text-yellow-500 { color: #1D4ED8 !important; }
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
                className="w-full sm:w-auto h-11 px-4 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
              
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full sm:w-auto h-11 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 hover:text-zinc-900 rounded-2xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
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
