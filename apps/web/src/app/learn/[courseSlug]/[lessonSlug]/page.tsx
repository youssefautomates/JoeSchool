"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  PlayCircle, BookOpen, Clock, FileText, ChevronLeft, ChevronRight, ChevronDown,
  ArrowRight, ShieldCheck, CheckCircle2, ArrowLeft, 
  Menu, X, Sparkles, Download, MessageSquare, Award, Loader2, Link as LinkIcon, Printer,
  Eye, CornerDownLeft, Send, CheckCircle, Keyboard, Edit, FileImage
} from "lucide-react";
import Link from "next/link";
import { 
  getCourseBySlug, getLessonProgress, toggleLessonCompleted, 
  getCourseProgressPercent, getUserCertificates, checkSessionIsValid,
  type LmsCourse, type LmsSection, type LmsLesson, type LmsCertificate 
} from "@/lib/coursesDb";
import SecureVideoPlayer from "@/components/SecureVideoPlayer";


export default function LessonPlayerPage({ params }: { params: Promise<{ courseSlug: string, lessonSlug: string }> }) {
  const { courseSlug, lessonSlug } = use(params);
  const router = useRouter();
  const playerRef = useRef<HTMLDivElement>(null);

  // Unified Database states
  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [sections, setSections] = useState<(LmsSection & { lessons: LmsLesson[] })[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  // Progress states
  const [progressPercent, setProgressPercent] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Certificates states
  const [certificates, setCertificates] = useState<LmsCertificate[]>([]);
  const [activeCert, setActiveCert] = useState<LmsCertificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  
  // Editing Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveCertificateName = async () => {
    if (!activeCert || !newNameInput.trim() || !user || !course) return;
    setIsSavingName(true);
    try {
      const { updateCertificateStudentName } = await import("@/lib/coursesDb");
      const success = await updateCertificateStudentName(user.id, course.id, newNameInput.trim());
      if (success) {
        toast.success("تم تحديث وحفظ الاسم على الشهادة بنجاح! 🎉");
        
        // Update local state instantly
        setActiveCert(prev => prev ? { ...prev, student_name: newNameInput.trim() } : prev);
        
        // Reload curriculum to keep everything synced
        await loadCurriculumAndProgress();
        setIsEditingName(false);
      } else {
        toast.error("فشل حفظ الاسم الجديد. يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
    } finally {
      setIsSavingName(false);
    }
  };

  const downloadCertificate = async (format: "png" | "pdf") => {
    if (!activeCert) return;
    if (format === "pdf") setIsDownloadingPdf(true);
    else setIsDownloadingPng(true);

    toast.info("جاري تهيئة وتصميم الشهادة الرقمية بدقة عالية...");
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsDownloadingPdf(false);
      setIsDownloadingPng(false);
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
          pdf.save(`شهادة_${activeCert.course_name.replace(/\s+/g, "_")}_${activeCert.student_name.replace(/\s+/g, "_")}.pdf`);
          toast.success("تم تنزيل شهادتك المعتمدة بصيغة PDF بنجاح! 🎉🏆");
        } else {
          const link = document.createElement("a");
          link.download = `شهادة_${activeCert.course_name.replace(/\s+/g, "_")}_${activeCert.student_name.replace(/\s+/g, "_")}.png`;
          link.href = dataUrl;
          link.click();
          toast.success("تم تنزيل شهادتك المعتمدة بصيغة PNG بنجاح! 🎉🏆");
        }
      } catch (err) {
        console.error("Certificate download failed:", err);
        toast.error("فشل التنزيل المباشر، يمكنك استخدام زر الطباعة (PDF).");
      } finally {
        setIsDownloadingPdf(false);
        setIsDownloadingPng(false);
      }
    };

    if (activeCert.certificate_bg_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.naturalWidth || 2000;
        canvas.height = img.naturalHeight || 1414;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = activeCert.certificate_text_color || "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Match the exact same preview auto-shrinking logic for high fidelity export
        const nameLength = activeCert.student_name.length;
        let lengthScale = 1.0;
        if (nameLength > 35) lengthScale = 0.55;
        else if (nameLength > 28) lengthScale = 0.65;
        else if (nameLength > 20) lengthScale = 0.8;
        
        const baseNameSize = (activeCert.certificate_name_size || 24) * lengthScale;
        const nameSize = baseNameSize * (canvas.width / 800);
        ctx.font = `bold ${nameSize}px Cairo, Alexandria, sans-serif`;
        
        const nameX = (activeCert.certificate_name_x || 50) * (canvas.width / 100);
        const nameY = (activeCert.certificate_name_y || 40) * (canvas.height / 100);
        ctx.fillText(activeCert.student_name, nameX, nameY);
        
        const dateSize = (activeCert.certificate_date_size || 14) * (canvas.width / 800);
        ctx.font = `normal ${dateSize}px monospace`;
        const dateX = (activeCert.certificate_date_x || 50) * (canvas.width / 100);
        const dateY = (activeCert.certificate_date_y || 70) * (canvas.height / 100);
        ctx.fillText(activeCert.issued_at, dateX, dateY);
        
        const dataUrl = canvas.toDataURL("image/png");
        finalizeDownload(dataUrl, canvas.width, canvas.height);
      };
      
      img.onerror = () => {
        toast.error("فشل تحميل قالب الشهادة المخصصة.");
        setIsDownloadingPdf(false);
        setIsDownloadingPng(false);
      };
      
      img.src = activeCert.certificate_bg_url;
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
      ctx.fillText(activeCert.student_name, canvas.width / 2, 630);
      
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
      ctx.fillText(activeCert.course_name, canvas.width / 2, 940);
      
      ctx.fillStyle = "#4b5563";
      ctx.font = "30px Cairo, sans-serif";
      ctx.fillText(`تاريخ الصدور: ${activeCert.issued_at}`, canvas.width / 2 - 350, 1150);
      ctx.fillText(`رقم التوثيق الرقمي: ${activeCert.verification_id}`, canvas.width / 2 + 350, 1150);
      
      ctx.fillStyle = "rgba(251, 191, 36, 0.03)";
      ctx.font = "bold 130px Cairo, sans-serif";
      ctx.fillText("JOESCHOOL", canvas.width / 2, canvas.height / 2 + 50);
      
      const dataUrl = canvas.toDataURL("image/png");
      finalizeDownload(dataUrl, canvas.width, canvas.height);
    }
  };

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Accordion collapsed state
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Personal Notes States
  const [personalNote, setPersonalNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Performance Refs
  const loadedCourseSlugRef = useRef<string | null>(null);

  // Derive current lesson dynamically from URL params and loaded curriculum
  const allLessonsFlat = sections.flatMap(s => s.lessons);
  const currentLesson = allLessonsFlat.find(l => {
    try {
      return (
        l.slug === lessonSlug ||
        l.slug === decodeURIComponent(lessonSlug) ||
        decodeURIComponent(l.slug) === decodeURIComponent(lessonSlug)
      );
    } catch (e) {
      return l.slug === lessonSlug;
    }
  }) || allLessonsFlat[0] || null;

  // Initialize sidebar state on mount based on screen width
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSidebarOpen(window.innerWidth >= 1024);
    }
  }, []);

  // 1. Auth Protection Check & Session retrieval
  useEffect(() => {
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        toast.error("يرجى تسجيل الدخول للوصول إلى مشغل الدروس");
        router.push(`/login?redirect=/learn/${courseSlug}/${lessonSlug}`);
      } else {
        // Check active session validity for security
        try {
          const deviceId = localStorage.getItem("youssef_device_id") || "unknown_device";
          const isValid = await checkSessionIsValid(session.user.id, deviceId);
          if (!isValid) {
            toast.error("تم إيقاف حسابك أو انتهت صلاحية الجلسة. يرجى التواصل مع الدعم الفني.");
            await supabaseClient.auth.signOut();
            router.push("/login?error=suspended");
            return;
          }
        } catch (e) {}

        setUser(session.user);
        setCheckingAuth(false);
      }
    });
  }, [router, courseSlug, lessonSlug]);


  // 2. Fetch Course Curriculum and Progress dynamically on initial mount or course change
  useEffect(() => {
    if (!user) return;
    
    if (loadedCourseSlugRef.current !== courseSlug) {
      loadCurriculumAndProgress();
    }
  }, [user, courseSlug]);

  // 3. Keep current section expanded when navigating lessons
  useEffect(() => {
    if (sections.length > 0 && lessonSlug) {
      const activeSectionObj = sections.find(sec => sec.lessons.some(l => {
        try {
          return (
            l.slug === lessonSlug ||
            l.slug === decodeURIComponent(lessonSlug) ||
            decodeURIComponent(l.slug) === decodeURIComponent(lessonSlug)
          );
        } catch (e) {
          return l.slug === lessonSlug;
        }
      }));
      if (activeSectionObj && !expandedSections.includes(activeSectionObj.id)) {
        setExpandedSections(prev => [...new Set([...prev, activeSectionObj.id])]);
      }
    }
  }, [lessonSlug, sections]);

  // 3. Track last viewed lesson to resume watching later
  useEffect(() => {
    if (courseSlug && lessonSlug) {
      localStorage.setItem(`last_lesson_${courseSlug}`, lessonSlug);
    }
  }, [courseSlug, lessonSlug]);

  // 4. Load Personal Note for the active lesson
  useEffect(() => {
    if (courseSlug && lessonSlug) {
      const saved = localStorage.getItem(`note_${courseSlug}_${lessonSlug}`) || "";
      setPersonalNote(saved);
    }
  }, [courseSlug, lessonSlug]);

  // 6. Keyboard Shortcuts Listener (Conflict-free: Space/Arrows are handled natively by SecureVideoPlayer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside inputs or textareas
      if (
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "f": // F key: Fullscreen toggle
          e.preventDefault();
          if (playerRef.current) {
            if (!document.fullscreenElement) {
              playerRef.current.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadCurriculumAndProgress = async () => {
    const { course: c, sections: s } = await getCourseBySlug(courseSlug);
    if (!c) {
      toast.error("هذا الكورس غير متوفر حالياً");
      router.push("/dashboard");
      return;
    }

    setCourse(c);
    setSections(s);
    loadedCourseSlugRef.current = courseSlug;

    // Retrieve progress
    const progressList = await getLessonProgress(user.id);
    setCompletedLessons(progressList);

    // Compute progress percent
    const { percent, completedCount: cCount, totalCount: tCount } = await getCourseProgressPercent(user.id, c.id);
    setProgressPercent(percent);
    setCompletedCount(cCount);
    setTotalCount(tCount);

    // Expand section containing current lesson by default
    const activeSectionObj = s.find(sec => sec.lessons.some(l => {
      try {
        return (
          l.slug === lessonSlug ||
          l.slug === decodeURIComponent(lessonSlug) ||
          decodeURIComponent(l.slug) === decodeURIComponent(lessonSlug)
        );
      } catch (e) {
        return l.slug === lessonSlug;
      }
    })) || s[0];
    if (activeSectionObj && expandedSections.length === 0) {
      setExpandedSections([activeSectionObj.id]);
    }

    // Retrieve user certificates
    const certs = await getUserCertificates(user.id);
    setCertificates(certs);
    const matchedCert = certs.find(cert => cert.course_id === c.id);
    if (matchedCert) setActiveCert(matchedCert);
  };

  // Session watch tracking timer
  useEffect(() => {
    if (!currentLesson || !course || !user) return;
    
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      if (seconds % 30 === 0) {
        // Send a ping every 30 seconds for live watch tracking
        fetch(`/api/lessons/${currentLesson.id}/complete`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: course.id,
            watch_time_seconds: 30,
            is_completed: false
          })
        }).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLesson?.id, course?.id, user?.id]);

  // Toggle lesson complete
  const handleToggleComplete = async (lessonId: string) => {
    if (!user || !course) return;

    try {
      const studentName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "طالب جو سكول";
      const { completed, percent, certIssued } = await toggleLessonCompleted(
        user.id,
        lessonId,
        course.id,
        studentName
      );

      // Ping API for streak and completion update
      fetch(`/api/lessons/${lessonId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: course.id,
          watch_time_seconds: 0,
          is_completed: completed
        })
      }).catch(console.error);

      if (completed) {
        toast.success("تهانينا! تم وضع علامة إكمال للدرس بنجاح 🎉");
        // Autoplay next lesson logic (only if marking the CURRENT viewed lesson as complete)
        if (lessonId === currentLesson?.id && nextLesson) {
          toast.info("جاري الانتقال الفوري للمحاضرة التالية...");
          router.push(`/learn/${courseSlug}/${nextLesson.slug}`);
        }
      } else {
        toast.info("تم إلغاء تحديد إكمال الدرس");
      }

      // Re-load to capture progress percent and certificates
      await loadCurriculumAndProgress();

      if (certIssued) {
        setActiveCert(certIssued);
        setShowCertModal(true);
        toast.success("رائع جداً! لقد أكملت الكورس بنجاح وتم إصدار شهادة الإكمال الموثقة الخاصة بك! 🎓🏆");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء تحديث تقدم الدرس");
    }
  };

  // Toggle section accordion expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId) 
        : [...prev, sectionId]
    );
  };

  // Safe Video Embed Url Generator
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    
    // YouTube
    if (url.includes("youtube.com/watch?v=")) {
      const vid = url.split("v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`;
    }
    if (url.includes("youtu.be/")) {
      const vid = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`;
    }
    if (url.includes("youtube.com/embed/")) {
      const vid = url.split("embed/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`;
    }
    
    // Vimeo
    if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com")) {
      const parts = url.split("vimeo.com/")[1]?.split("?")[0].split("/");
      if (parts && parts.length > 1) {
        const vid = parts[0];
        const hash = parts[1];
        return `https://player.vimeo.com/video/${vid}?h=${hash}&autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479`;
      } else if (parts && parts.length === 1) {
        const vid = parts[0];
        return `https://player.vimeo.com/video/${vid}?autoplay=1&badge=0&autopause=0&player_id=0&app_id=58479`;
      }
    }
    if (url.includes("player.vimeo.com/video/")) {
      return url.includes("autoplay=1") ? url : `${url}${url.includes("?") ? "&" : "?"}autoplay=1`;
    }
    
    // Bunny Stream
    if (url.includes("iframe.mediadelivery.net")) {
      return url.includes("autoplay=true") ? url : `${url}${url.includes("?") ? "&" : "?"}autoplay=true`;
    }
    
    // Cloudflare Stream
    if (url.includes("cloudflarestream.com") || url.includes("videodelivery.net")) {
      return url.includes("autoplay=true") ? url : `${url}${url.includes("?") ? "&" : "?"}autoplay=true`;
    }
    
    return url;
  };

  // Save Note to LocalStorage
  const handleSaveNote = () => {
    if (!courseSlug || !lessonSlug) return;
    setIsSavingNote(true);
    localStorage.setItem(`note_${courseSlug}_${lessonSlug}`, personalNote);
    
    setTimeout(() => {
      setIsSavingNote(false);
      toast.success("تم حفظ الملاحظة الشخصية لهذا الدرس بنجاح! 📝");
    }, 600);
  };

  // Download Note as TXT
  const handleDownloadNote = () => {
    if (!personalNote.trim()) {
      toast.error("يرجى كتابة ملاحظة أولاً قبل التنزيل!");
      return;
    }
    const blob = new Blob([personalNote], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ملاحظات_${course?.title || "الكورس"}_${currentLesson?.title || "الدرس"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير وتنزيل الملاحظة بنجاح!");
  };

  if (checkingAuth || !course || !currentLesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">جاري تأمين الجلسة وفتح مشغل الدروس...</p>
        </div>
      </div>
    );
  }

  // Next and Previous lesson calculators
  const currentIdx = currentLesson ? allLessonsFlat.findIndex(l => l.id === currentLesson.id) : -1;
  const prevLesson = currentIdx > 0 ? allLessonsFlat[currentIdx - 1] : null;
  const nextLesson = currentIdx !== -1 && currentIdx < allLessonsFlat.length - 1 ? allLessonsFlat[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Upper Navigation Header */}
      <header className="h-16 bg-slate-50 border-b border-zinc-200/60 px-6 flex items-center justify-between shrink-0 z-30 font-sans">
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle Button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-2xl bg-zinc-100/40 border border-zinc-200 hover:text-yellow-500 transition-colors cursor-pointer"
            title="توسيع/طي قائمة المحاضرات"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            <span>لوحة التحكم</span>
          </Link>
          
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-xs sm:text-sm font-bold text-zinc-900 hidden sm:inline truncate max-w-xs">{course.title}</span>
        </div>

        {/* Keyboard Shortcuts Guide Indicator */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500 border border-zinc-200/60 bg-zinc-50/40 px-3 py-1.5 rounded-2xl font-bold">
          <Keyboard className="w-3.5 h-3.5 text-zinc-600" />
          <span>اختصارات لوحة المفاتيح مفعلة (Space/Arrows)</span>
        </div>

        {/* Certificates & Progression info */}
        <div className="flex items-center gap-3">
          {activeCert ? (
            <button
              onClick={() => setShowCertModal(true)}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] sm:text-xs rounded-full font-black flex items-center gap-1.5 shadow-sm border border-zinc-200/60 shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>عرض شهادة الإكمال 🎓</span>
            </button>
          ) : (
            <span className="bg-brand-600/10 border border-zinc-200/60 text-yellow-500 text-[10px] sm:text-xs px-3 py-1 rounded-full font-bold">
              مكتمل: {progressPercent}%
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* RIGHT PANEL: Lessons list Sidebar (collapsible on mobile) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-slate-50 border-l border-zinc-200/60 flex flex-col z-20 lg:relative lg:translate-x-0 font-sans"
            >
              {/* Sidebar Header */}
              <div className="p-5 border-b border-zinc-200/60 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block">محتويات القسم</span>
                  <span className="text-xs font-bold text-zinc-900 mt-1 block">تتبع تقدمك في حضور المحاضرات</span>
                </div>
                
                {/* Progress Circle Ring */}
                <div className="flex items-center gap-3">
                  <div className="text-right font-sans">
                    <span className="text-sm font-black text-yellow-500 block">{progressPercent}%</span>
                    <span className="text-[9px] text-zinc-500 block">{completedCount} من {totalCount} درس</span>
                  </div>
                </div>
              </div>

              {/* Modules and lessons list (Udemy style Accordion) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {sections.map((mod, mIdx) => {
                  const isExpanded = expandedSections.includes(mod.id);
                  return (
                    <div key={mod.id} className="border border-zinc-200/60 rounded-2xl bg-black/40 overflow-hidden transition-all duration-350">
                      <button
                        onClick={() => toggleSection(mod.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 bg-zinc-50/40 hover:bg-zinc-100/30 transition-colors text-right"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-yellow-500 font-bold block">الوحدة {mIdx + 1}</span>
                          <h3 className="text-xs font-black text-zinc-700 leading-snug truncate mt-0.5">{mod.title}</h3>
                        </div>
                        <ChevronLeft className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isExpanded ? "-rotate-90" : "rtl:rotate-180"}`} />
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-zinc-200/60 bg-slate-50 p-2 space-y-1 overflow-hidden"
                          >
                            {mod.lessons.map((lesson) => {
                              const isCurrent = lesson.id === currentLesson.id;
                              const isCompleted = completedLessons.includes(lesson.id);
                              return (
                                <div
                                  key={lesson.id}
                                  className={`w-full text-right flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 ${
                                    isCurrent 
                                      ? "bg-brand-600/10 border border-zinc-200/60 text-yellow-500" 
                                      : "hover:bg-zinc-50/70 text-zinc-500 hover:text-zinc-900"
                                  }`}
                                >
                                  {/* Checkbox button */}
                                  <button 
                                    onClick={() => handleToggleComplete(lesson.id)}
                                    className={`w-5 h-5 rounded-xl border shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                      isCompleted 
                                        ? "bg-brand-600 border-brand-600 text-white" 
                                        : "border-zinc-700 hover:border-brand-500"
                                    }`}
                                  >
                                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                                  </button>

                                  {/* Nav link */}
                                  <Link
                                    href={`/learn/${courseSlug}/${lesson.slug}`}
                                    onClick={() => {
                                      if (window.innerWidth < 1024) setSidebarOpen(false);
                                    }}
                                    className="flex-1 text-right min-w-0 bg-transparent border-none p-0 cursor-pointer block"
                                  >
                                    <p className={`text-xs font-bold leading-snug truncate ${isCurrent ? "text-zinc-900" : ""}`}>{lesson.title}</p>
                                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 mt-1 font-bold">
                                      <Clock className="w-3 h-3 text-zinc-600" />
                                      <span>{Math.floor(lesson.duration_seconds / 60) || 5} دقيقة</span>
                                      
                                      {lesson.is_preview && (
                                        <span className="bg-emerald-950 text-emerald-400 px-1 py-0.5 rounded text-[8px] mr-auto border border-emerald-900/30">تجربة مجانية Preview</span>
                                      )}
                                    </div>
                                  </Link>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* LEFT PANEL: Main Video Player & Lesson Info */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Main Cinematic Video Panel / Embed */}
          <div 
            ref={playerRef}
            className="aspect-video w-full max-w-4xl mx-auto rounded-2xl bg-zinc-950 border border-zinc-200/60 overflow-hidden relative group flex flex-col items-center justify-center shadow-sm border border-zinc-200/60 shrink-0"
          >
            {/* Cinematic Overlay Grid */}
            <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-20 pointer-events-none z-0"></div>

            {currentLesson.lecture_type === "video" && (currentLesson.video_url || currentLesson.video_id) ? (
              <div className="absolute inset-0 w-full h-full z-10">
                <SecureVideoPlayer
                  key={currentLesson.id}
                  lessonId={currentLesson.id}
                  courseId={course.id}
                  userId={user.id}
                  onLessonComplete={() => {
                    if (!completedLessons.includes(currentLesson.id)) {
                      handleToggleComplete(currentLesson.id);
                    }
                  }}
                  onNextLesson={nextLesson ? () => {
                    router.push(`/learn/${courseSlug}/${nextLesson.slug}`);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  } : undefined}
                  nextLessonTitle={nextLesson?.title || null}
                  courseImage={course.image_url}
                />
              </div>
            ) : currentLesson.lecture_type === "video" ? (
              <div className="absolute inset-0 w-full h-full z-10 flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center select-none">
                <div className="w-16 h-16 rounded-full bg-brand-600/10 border border-zinc-200/60 flex items-center justify-center text-[#1D4ED8] shadow-[0_0_30px_rgba(29, 78, 216,0.15)] animate-pulse">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="font-sans font-bold text-zinc-900 text-sm">المحاضرة قيد الإعداد 🎬</h4>
                  <p className="text-zinc-500 text-xs font-alexandria leading-relaxed">
                    لم يتم رفع فيديو لهذه المحاضرة بعد. يرجى المتابعة وسيكون الفيديو متاحاً قريباً.
                  </p>
                </div>
              </div>
            ) : (
              // Non-video content states (PDF, Links, Downloads)
              <div className="text-center z-10 space-y-4 p-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-zinc-200/60 flex items-center justify-center text-yellow-500 mx-auto">
                  {currentLesson.lecture_type === "pdf" && <FileText className="w-8 h-8 text-emerald-400" />}
                  {currentLesson.lecture_type === "link" && <LinkIcon className="w-8 h-8 text-sky-400" />}
                  {currentLesson.lecture_type === "download" && <Download className="w-8 h-8 text-amber-400" />}
                </div>

                <h3 className="font-sans font-bold text-zinc-900 text-base">
                  {currentLesson.lecture_type === "pdf" && "محتوى دراسي مقروء (PDF)"}
                  {currentLesson.lecture_type === "link" && "رابط خارجي للمحاضرة"}
                  {currentLesson.lecture_type === "download" && "ملف مرفق للتحميل"}
                </h3>
                
                <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                  {currentLesson.lecture_type === "pdf" && "هذا الدرس عبارة عن ملف PDF. اضغط على زر التحميل أو الاستعراض بالأسفل لمذاكرته."}
                  {currentLesson.lecture_type === "link" && "هذا الدرس يعتمد على رابط توثيق خارجي. اضغط على الزر لفتحه مباشرة."}
                  {currentLesson.lecture_type === "download" && "قم بتحميل الأكواد والملفات المرفقة بالضغط على زر التنزيل أدناه."}
                </p>

                {currentLesson.attachment_url && (
                  <a
                    href={currentLesson.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all shadow-sm border border-zinc-200/60 shadow-brand-600/10"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الملف: {currentLesson.attachment_name || "اضغط للتحميل"}</span>
                  </a>
                )}

                {currentLesson.external_link && (
                  <a
                    href={currentLesson.external_link}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 px-6 bg-sky-600 hover:bg-sky-700 text-zinc-900 rounded-2xl text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all shadow-sm border border-zinc-200/60"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>فتح الرابط الخارجي</span>
                  </a>
                )}
              </div>
            )}

            {/* Sticky Player Controls bar */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent px-4 flex items-center justify-between text-[10px] text-zinc-500 select-none pointer-events-none">
              <span>HD 1080p • تشغيل آمن وموثق</span>
              <span>JoeSchool LMS</span>
            </div>
          </div>

          {/* Lesson Outline Title & Quick Actions */}
          <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/60 pb-6">
            <div>
              <span className="text-[10px] text-yellow-500 font-bold block uppercase tracking-wider font-sans">تشاهد حالياً</span>
              <h2 className="text-lg sm:text-2xl font-alexandria font-bold text-zinc-900 mt-1 leading-snug">{currentLesson.title}</h2>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>مدة الشرح التقريبية: {Math.floor(currentLesson.duration_seconds / 60) || 5} دقيقة</span>
              </p>
            </div>

            {/* Complete and navigation buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {prevLesson && (
                <button
                  onClick={() => router.push(`/learn/${courseSlug}/${prevLesson.slug}`)}
                  className="h-12 w-12 rounded-2xl border border-zinc-200/60 hover:bg-zinc-100/40 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                  title="الدرس السابق (أو اضغط ArrowRight)"
                >
                  <ArrowRight className="w-5 h-5 " />
                </button>
              )}

              <button
                onClick={() => handleToggleComplete(currentLesson.id)}
                className={`h-12 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ${
                  completedLessons.includes(currentLesson.id)
                    ? "bg-emerald-600/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm border border-zinc-200/60 shadow-brand-600/25"
                }`}
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>
                  {completedLessons.includes(currentLesson.id) ? "مكتمل بنجاح" : "تحديد كمكتمل"}
                </span>
              </button>

              {nextLesson && (
                <button
                  onClick={() => router.push(`/learn/${courseSlug}/${nextLesson.slug}`)}
                  className="h-12 w-12 rounded-2xl border border-zinc-200/60 hover:bg-zinc-100/40 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
                  title="الدرس التالي (أو اضغط ArrowLeft)"
                >
                  <ArrowLeft className="w-5 h-5 " />
                </button>
              )}
            </div>
          </div>

          {/* Additional details tabs (Overview, Notes, Q&A) */}
          <div className="w-full max-w-4xl mx-auto space-y-4 font-sans">
            <div className="flex border-b border-zinc-200/60 gap-6 text-xs font-bold text-zinc-500 pb-1 overflow-x-auto scrollbar-none font-cairo">
              {[
                { id: "overview", name: "تفاصيل وملاحظات الدرس", icon: FileText },
                { id: "personal_notes", name: "ملاحظاتي الشخصية Notes", icon: Keyboard },
                { id: "resources", name: "المرفقات والملفات", icon: Download }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 pb-2.5 transition-colors border-b-2 shrink-0 cursor-pointer ${
                    activeTab === t.id 
                      ? "border-brand-600 text-zinc-900" 
                      : "border-transparent hover:text-zinc-700"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>

            {/* Tab content displays */}
            <div className="py-4">
              {activeTab === "overview" && (
                <div className="space-y-4 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                  <div 
                    className="bg-zinc-50/40 border border-zinc-200/60 p-5 rounded-2xl space-y-3"
                    dangerouslySetInnerHTML={{ 
                      __html: currentLesson.content 
                        ? currentLesson.content.replace(/\n/g, '<br/>') 
                        : "لا توجد ملاحظات تفصيلية مضافة لهذا الدرس حتى الآن." 
                    }}
                  />
                </div>
              )}

              {activeTab === "personal_notes" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-bold block">اكتب ملاحظاتك الشخصية، يتم حفظها تلقائياً على متصفحك</span>
                    <button 
                      onClick={handleDownloadNote}
                      className="text-[10px] text-yellow-500 hover:text-brand-300 font-bold border border-zinc-200/60 px-3 py-1.5 rounded-2xl bg-brand-600/5 transition-all flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>تنزيل الملاحظة كملف نصي</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={personalNote}
                    onChange={e => setPersonalNote(e.target.value)}
                    placeholder="مثال: النقاط الهامة في هذا الدرس، الأكواد المشروحة..."
                    className="w-full bg-slate-50 border border-zinc-200/60 focus:border-zinc-200/60 rounded-2xl p-4 text-xs focus:outline-none transition-all text-zinc-900 text-right leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="h-10 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      <span>حفظ الملاحظة</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-4">
                  {/* Single Legacy Attachment (if any) */}
                  {currentLesson.attachment_url && (!currentLesson.attachments || currentLesson.attachments.length === 0) && (
                    <div className="bg-slate-50 border border-zinc-200/60 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-zinc-200/60 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-600/10 border border-zinc-200/60 flex items-center justify-center text-yellow-500">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900">{currentLesson.attachment_name || "ملف مرفق للدراسة والعمل"}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">جاهز للتنزيل الفوري • حجم خفيف</p>
                        </div>
                      </div>
                      <a
                        href={`/api/video/attachment?lessonId=${currentLesson.id}&url=${encodeURIComponent(currentLesson.attachment_url)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-4 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 rounded-2xl text-[10px] font-bold transition-all border border-zinc-200 flex items-center justify-center shrink-0"
                      >
                        تحميل الآن
                      </a>
                    </div>
                  )}

                  {/* Multi-Attachments (Modern System) */}
                  {currentLesson.attachments && currentLesson.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentLesson.attachments.map((file, idx) => {
                        const getFileIcon = (type: string) => {
                          const t = type.toLowerCase();
                          if (t === 'pdf') return '📄';
                          if (['zip', 'rar', '7z', 'tar', 'gz'].includes(t)) return '📦';
                          if (['doc', 'docx'].includes(t)) return '📝';
                          if (['xls', 'xlsx', 'csv'].includes(t)) return '📊';
                          if (t === 'mp3') return '🎵';
                          if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(t)) return '🖼️';
                          if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'json', 'go', 'rs', 'c', 'cpp'].includes(t)) return '💻';
                          return '📁';
                        };
                        const formatBytes = (bytes: number): string => {
                          if (bytes === 0) return '0 Bytes';
                          const k = 1024;
                          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                          const i = Math.floor(Math.log(bytes) / Math.log(k));
                          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                        };

                        return (
                          <div 
                            key={file.url || idx} 
                            className="bg-slate-50 border border-zinc-200/60 hover:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all group hover:scale-[1.01]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg shrink-0">
                                {getFileIcon(file.type)}
                              </div>
                              <div className="min-w-0 leading-tight">
                                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate max-w-[200px]" title={file.name}>
                                  {file.name}
                                </h4>
                                <span className="text-[10px] text-zinc-500 mt-0.5 font-bold font-mono">
                                  {formatBytes(file.size)}
                                </span>
                              </div>
                            </div>
                            <a
                              href={`/api/video/attachment?lessonId=${currentLesson.id}&url=${encodeURIComponent(file.url)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="h-9 px-4 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-2xl text-[10px] font-bold transition-all flex items-center justify-center shrink-0 gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    (!currentLesson.attachment_url) && (
                      <p className="text-zinc-500 text-xs text-center py-8">لا توجد ملفات مرفقة مخصصة لهذه المحاضرة حالياً.</p>
                    )
                  )}
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* ── 4. CERTIFICATE SHADED MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCertModal && activeCert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#08080c]/90 border border-amber-500/20 rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-10 space-y-8 shadow-[0_0_80px_rgba(217,119,6,0.15)] relative overflow-hidden font-sans"
            >
              {/* Premium Background Ornaments */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

              <button 
                onClick={() => setShowCertModal(false)}
                className="absolute top-6 left-6 p-2.5 rounded-2xl bg-zinc-100/40 hover:bg-brand-500/20 text-zinc-500 hover:text-yellow-500 border border-zinc-200 hover:border-zinc-200/60 transition-all cursor-pointer z-10"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Celebration Header */}
              <div className="text-center space-y-4 pt-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-amber-400/30 flex items-center justify-center text-black shadow-[0_0_50px_rgba(245,158,11,0.35)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-zinc-200/80 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <Award className="w-12 h-12 text-black shrink-0 relative z-10" />
                </div>
                
                <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-1.5 rounded-full font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>مبارك الإنجاز الاستثنائي العظيم! 🎉</span>
                </div>
                
                <h2 className="font-sans font-black text-2xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 tracking-tight leading-tight">
                  تهانينا الحارة من جو سكول
                </h2>
                
                <p className="text-zinc-500 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                  بكل فخر واعتزاز، نُبارك لك إتمام كامل متطلبات ودروس هذا المسار التعليمي الفخم بنجاح باهر. هذا الإنجاز يعكس شغفك وعزيمتك نحو التميز الرقمي والاحتراف!
                </p>
              </div>

              {/* Certificate Preview Frame (Aesthetic live-preview) */}
              {activeCert.certificate_bg_url ? (
                <div 
                  className="w-full aspect-[1.414/1] bg-slate-50 border border-amber-500/30 rounded-3xl overflow-hidden relative shadow-sm border border-zinc-200/60"
                  style={{ containerType: 'inline-size' } as React.CSSProperties}
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                  `}} />
                  <img src={activeCert.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 z-10 font-bold" style={{ color: activeCert.certificate_text_color || "#000000" }}>
                    <div 
                      className="absolute whitespace-nowrap transition-all" 
                      style={{ 
                        left: `${activeCert.certificate_name_x || 50}%`, 
                        top: `${activeCert.certificate_name_y || 40}%`, 
                        fontSize: `calc((${(() => {
                          const nameLength = activeCert.student_name.length;
                          let lengthScale = 1.0;
                          if (nameLength > 35) lengthScale = 0.55;
                          else if (nameLength > 28) lengthScale = 0.65;
                          else if (nameLength > 20) lengthScale = 0.8;
                          return (activeCert.certificate_name_size || 24) * lengthScale;
                        })()} / 800) * 100cqw)`,
                        transform: 'translate(-50%, -50%)',
                        fontFamily: /[\u0600-\u06FF]/.test(activeCert.student_name) ? "'Cairo', 'Alexandria', sans-serif" : "'Alike', serif",
                        fontWeight: /[\u0600-\u06FF]/.test(activeCert.student_name) ? 900 : 'normal',
                      }}
                    >
                      {activeCert.student_name}
                    </div>
                    <div 
                      className="absolute whitespace-nowrap font-mono" 
                      style={{ 
                        left: `${activeCert.certificate_date_x || 50}%`, 
                        top: `${activeCert.certificate_date_y || 70}%`, 
                        fontSize: `calc((${activeCert.certificate_date_size || 14} / 800) * 100cqw)`,
                        transform: 'translate(-50%, -50%)' 
                      }}
                    >
                      {activeCert.issued_at}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-double border-amber-500/30 p-4 sm:p-8 rounded-3xl bg-black/60 relative text-center space-y-6 overflow-hidden shadow-inner group/cert">
                  {/* Secure watermark seal */}
                  <div className="absolute top-4 left-4 w-12 h-12 border border-amber-500/10 rounded-full flex items-center justify-center text-[6px] text-amber-500/25 font-bold uppercase tracking-widest font-mono select-none">
                    SECURE
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.22em] font-mono leading-none">Verified Digital Credential</span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-zinc-500 text-xs font-medium">يُشهد فريق العمل الفني بالمنصة بأن الطالب المتميز:</p>
                    <h3 
                      className="text-zinc-900 text-2xl sm:text-4xl underline decoration-amber-500/30 decoration-wavy underline-offset-8 transition-all font-black"
                      style={{
                        fontFamily: /[\u0600-\u06FF]/.test(activeCert.student_name) ? "'Cairo', 'Alexandria', sans-serif" : "'Alike', serif",
                      }}
                    >
                      {activeCert.student_name}
                    </h3>
                    <p className="text-zinc-500 text-xs font-medium mt-4">قد اجتاز بتفوق كامل دروس المسار التدريبي الاحترافي:</p>
                    <h4 className="font-sans font-bold text-lg sm:text-xl text-yellow-500 bg-brand-500/5 border border-zinc-200/60 rounded-2xl py-3 px-6 inline-block">
                      {activeCert.course_name}
                    </h4>
                  </div>

                  {/* Metadata & Verification Block */}
                  <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200/60 pt-6 gap-6 text-xs text-right sm:text-center text-zinc-500 font-bold leading-normal">
                    <div className="space-y-2 text-right shrink-0">
                      <div>
                        <span className="block text-[9px] text-zinc-600 font-medium">تاريخ إصدار الشهادة:</span>
                        <span className="text-zinc-700 font-mono mt-0.5 block">{activeCert.issued_at}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-zinc-600 font-medium">رقم التوثيق الرقمي المعتمد:</span>
                        <span className="text-yellow-500 font-mono mt-0.5 block">{activeCert.verification_id}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/20 px-2.5 py-1 rounded-2xl w-fit">
                        <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
                        <span>شهادة آمنة ومدرجة في حسابك للرجوع إليها دائماً</span>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-1.5 bg-zinc-50/70 border border-zinc-200/60 p-2 rounded-2xl shrink-0 group-hover/cert:scale-[1.03] transition-transform duration-350">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=d97706&bgcolor=0a0a0f&data=${encodeURIComponent(`https://joeschool.com/certificates/verify?id=${activeCert.verification_id}`)}`}
                        alt="Certificate QR Verification" 
                        className="w-18 h-18 rounded-2xl border border-amber-500/10"
                      />
                      <span className="text-[7px] text-amber-500/60 font-mono tracking-widest block uppercase font-bold select-none">Scan to Verify</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Certificate Editing Section */}
              {!isEditingName ? (
                <div className="flex flex-col items-center justify-center p-5 bg-zinc-50/40 border border-zinc-200/60 rounded-3xl gap-3 text-center">
                  <div className="text-zinc-500 text-xs font-medium">الاسم المطبوع حالياً على الشهادة: <span className="text-amber-400 font-black">{activeCert.student_name}</span></div>
                  <button
                    onClick={() => {
                      setNewNameInput(activeCert.student_name);
                      setIsEditingName(true);
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
                    value={newNameInput}
                    onChange={(e) => setNewNameInput(e.target.value)}
                    placeholder="اكتب اسمك الثلاثي بالشكل الصحيح..."
                    className="w-full bg-slate-50 border border-zinc-200/60 focus:border-zinc-200/60 rounded-2xl p-4 text-xs focus:outline-none transition-all text-zinc-900 text-right leading-relaxed"
                    required
                  />
                  
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="h-10 px-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-zinc-200/60"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveCertificateName}
                      disabled={isSavingName || !newNameInput.trim()}
                      className="h-10 px-5 bg-gradient-to-l from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-zinc-900 rounded-2xl text-xs font-sans font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm border border-zinc-200/60 shadow-brand-600/10"
                    >
                      {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      <span>حفظ الاسم وتحديث الشهادة</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-200/60">
                <button
                  onClick={() => downloadCertificate("pdf")}
                  disabled={isDownloadingPdf || isDownloadingPng}
                  className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Download className="w-4.5 h-4.5" />
                  )}
                  <span>تحميل الشهادة بصيغة PDF (جودة فائقة)</span>
                </button>

                <button
                  onClick={() => downloadCertificate("png")}
                  disabled={isDownloadingPdf || isDownloadingPng}
                  className="w-full sm:w-auto h-12 px-5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  {isDownloadingPng ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <FileImage className="w-4.5 h-4.5 text-zinc-500" />
                  )}
                  <span>تحميل بصيغة PNG (صورة)</span>
                </button>
                
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto h-12 px-5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Printer className="w-4.5 h-4.5 text-zinc-500" />
                  <span>طباعة الشهادة</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setShowCertModal(false);
                  }}
                  className="w-full sm:w-auto h-12 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-700 hover:text-zinc-900 rounded-2xl font-bold text-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  العودة للمشاهدة
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
