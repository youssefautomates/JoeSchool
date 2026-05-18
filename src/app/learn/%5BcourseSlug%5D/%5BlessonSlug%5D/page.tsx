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
  Eye, CornerDownLeft, Send, CheckCircle, Keyboard
} from "lucide-react";
import Link from "next/link";
import { 
  getCourseBySlug, getLessonProgress, toggleLessonCompleted, 
  getCourseProgressPercent, getUserCertificates, 
  type LmsCourse, type LmsSection, type LmsLesson, type LmsCertificate 
} from "@/lib/coursesDb";

interface QAComment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  time: string;
  replies?: { author: string; avatar: string; content: string; time: string }[];
}

export default function LessonPlayerPage({ params }: { params: Promise<{ courseSlug: string, lessonSlug: string }> }) {
  const { courseSlug, lessonSlug } = use(params);
  const router = useRouter();
  const playerRef = useRef<HTMLDivElement>(null);

  // Unified Database states
  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [sections, setSections] = useState<(LmsSection & { lessons: LmsLesson[] })[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LmsLesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  // Progress states
  const [progressPercent, setProgressPercent] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Certificates states
  const [certificates, setCertificates] = useState<LmsCertificate[]>([]);
  const [activeCert, setActiveCert] = useState<LmsCertificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Accordion collapsed state
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Q&A Interactive States
  const [qaList, setQaList] = useState<QAComment[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  // Personal Notes States
  const [personalNote, setPersonalNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // 1. Auth Protection Check & Session retrieval
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("يرجى تسجيل الدخول للوصول إلى مشغل الدروس");
        router.push(`/login?redirect=/learn/${courseSlug}/${lessonSlug}`);
      } else {
        setUser(session.user);
        setCheckingAuth(false);
      }
    });
  }, [router, courseSlug, lessonSlug]);

  // 2. Fetch Course Curriculum and Progress dynamically
  useEffect(() => {
    if (!user) return;
    loadCurriculumAndProgress();
  }, [user, courseSlug, lessonSlug]);

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

  // 5. Load Q&A from local storage or set defaults
  useEffect(() => {
    if (lessonSlug) {
      const savedQA = localStorage.getItem(`qa_${lessonSlug}`);
      if (savedQA) {
        setQaList(JSON.parse(savedQA));
      } else {
        const defaultQA: QAComment[] = [
          {
            id: "1",
            author: "ياسين عبد الرحمن",
            avatar: "YA",
            content: "السلام عليكم مهندس يوسف، هل هذا التطبيق يشتغل على n8n المحلي بالكامل أم نحتاج سيرفر خارجي؟",
            time: "منذ ساعتين",
            replies: [
              {
                author: "يوسف أوتوميتس (المدرب)",
                avatar: "YA",
                content: "وعليكم السلام يا ياسين. نعم، يمكنك تطبيقه بالكامل على n8n المحلي (Self-Hosted) عبر Docker أو npm دون دفع أي تكاليف سيرفرات خارجية. بالتوفيق!",
                time: "منذ ساعة"
              }
            ]
          }
        ];
        setQaList(defaultQA);
        localStorage.setItem(`qa_${lessonSlug}`, JSON.stringify(defaultQA));
      }
    }
  }, [lessonSlug]);

  // 6. Keyboard Shortcuts Listener
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
        case " ": // Spacebar: Play/Pause video
          e.preventDefault();
          setIsPlaying(prev => !prev);
          toast.info(isPlaying ? "تم إيقاف تشغيل الفيديو مؤقتاً" : "جاري تشغيل الفيديو");
          break;
        case "arrowleft": // Left Arrow: Next Lesson (Arabic layout direction)
          if (nextLesson) {
            router.push(`/learn/${courseSlug}/${nextLesson.slug}`);
            toast.info(`المحاضرة التالية: ${nextLesson.title}`);
          }
          break;
        case "arrowright": // Right Arrow: Previous Lesson
          if (prevLesson) {
            router.push(`/learn/${courseSlug}/${prevLesson.slug}`);
            toast.info(`المحاضرة السابقة: ${prevLesson.title}`);
          }
          break;
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
  }, [courseSlug, lessonSlug, isPlaying]);

  const loadCurriculumAndProgress = async () => {
    const { course: c, sections: s } = await getCourseBySlug(courseSlug);
    if (!c) {
      toast.error("هذا الكورس غير متوفر حالياً");
      router.push("/dashboard");
      return;
    }

    setCourse(c);
    setSections(s);

    // Find current lesson based on slug
    const allLessons = s.flatMap(sec => sec.lessons);
    const found = allLessons.find(l => l.slug === lessonSlug) || allLessons[0] || null;
    setCurrentLesson(found);

    // Retrieve progress
    const progressList = await getLessonProgress(user.id);
    setCompletedLessons(progressList);

    // Compute progress percent
    const { percent, completedCount: cCount, totalCount: tCount } = await getCourseProgressPercent(user.id, c.id);
    setProgressPercent(percent);
    setCompletedCount(cCount);
    setTotalCount(tCount);

    // Expand section containing current lesson by default
    const activeSectionObj = s.find(sec => sec.lessons.some(l => l.slug === lessonSlug)) || s[0];
    if (activeSectionObj && expandedSections.length === 0) {
      setExpandedSections([activeSectionObj.id]);
    }

    // Retrieve user certificates
    const certs = await getUserCertificates(user.id);
    setCertificates(certs);
    const matchedCert = certs.find(cert => cert.course_id === c.id);
    if (matchedCert) setActiveCert(matchedCert);
  };

  // Toggle lesson complete
  const handleToggleComplete = async (lessonId: string) => {
    if (!user || !course) return;

    try {
      const studentName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "طالب يوسف أوتوميتس";
      const { completed, percent, certIssued } = await toggleLessonCompleted(
        user.id,
        lessonId,
        course.id,
        studentName
      );

      if (completed) {
        toast.success("تهانينا! تم وضع علامة إكمال للدرس بنجاح 🎉");
        // Autoplay next lesson logic
        if (nextLesson) {
          toast.info("جاري الانتقال التلقائي للمحاضرة التالية خلال لحظات...");
          setTimeout(() => {
            router.push(`/learn/${courseSlug}/${nextLesson.slug}`);
          }, 1500);
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

  // Submit Q&A Question
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    const authorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "طالب يوسف أوتوميتس";
    
    const newQAItem: QAComment = {
      id: `qa-${Date.now()}`,
      author: authorName,
      avatar: authorName.substring(0, 2).toUpperCase(),
      content: newQuestion,
      time: "الآن",
      replies: []
    };

    const updated = [newQAItem, ...qaList];
    setQaList(updated);
    setNewQuestion("");
    localStorage.setItem(`qa_${lessonSlug}`, JSON.stringify(updated));
    toast.success("تم نشر سؤالك بنجاح! سيتم الرد عليك قريباً من قبل المدرب. 💬");
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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">جاري تأمين الجلسة وفتح مشغل الدروس...</p>
        </div>
      </div>
    );
  }

  // Next and Previous lesson calculators
  const allLessonsFlat = sections.flatMap(s => s.lessons);
  const currentIdx = allLessonsFlat.findIndex(l => l.id === currentLesson.id);
  const prevLesson = currentIdx > 0 ? allLessonsFlat[currentIdx - 1] : null;
  const nextLesson = currentIdx < allLessonsFlat.length - 1 ? allLessonsFlat[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex flex-col h-screen overflow-hidden">
      
      {/* Upper Navigation Header */}
      <header className="h-16 bg-[#0a0a0f] border-b border-white/5 px-6 flex items-center justify-between shrink-0 z-30 font-alexandria">
        <div className="flex items-center gap-4">
          {/* Mobile Sidebar Toggle */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 hover:text-rose-500 transition-colors cursor-pointer"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link href="/dashboard" className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            <span>لوحة التحكم</span>
          </Link>
          
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-xs sm:text-sm font-bold text-white hidden sm:inline truncate max-w-xs">{course.title}</span>
        </div>

        {/* Keyboard Shortcuts Guide Indicator */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500 border border-white/5 bg-white/[0.01] px-3 py-1.5 rounded-xl font-bold">
          <Keyboard className="w-3.5 h-3.5 text-zinc-600" />
          <span>اختصارات لوحة المفاتيح مفعلة (Space/Arrows)</span>
        </div>

        {/* Certificates & Progression info */}
        <div className="flex items-center gap-3">
          {activeCert ? (
            <button
              onClick={() => setShowCertModal(true)}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] sm:text-xs rounded-full font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>عرض شهادة الإكمال 🎓</span>
            </button>
          ) : (
            <span className="bg-rose-600/10 border border-rose-500/20 text-rose-400 text-[10px] sm:text-xs px-3 py-1 rounded-full font-bold">
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
              className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#0a0a0f] border-l border-white/5 flex flex-col z-20 lg:relative lg:translate-x-0 font-cairo"
            >
              {/* Sidebar Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold block">محتويات المساق</span>
                  <span className="text-xs font-bold text-white mt-1 block">تتبع تقدمك في حضور المحاضرات</span>
                </div>
                
                {/* Progress Circle Ring */}
                <div className="flex items-center gap-3">
                  <div className="text-right font-alexandria">
                    <span className="text-sm font-black text-rose-500 block">{progressPercent}%</span>
                    <span className="text-[9px] text-zinc-500 block">{completedCount} من {totalCount} درس</span>
                  </div>
                </div>
              </div>

              {/* Modules and lessons list (Udemy style Accordion) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {sections.map((mod, mIdx) => {
                  const isExpanded = expandedSections.includes(mod.id);
                  return (
                    <div key={mod.id} className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden transition-all duration-350">
                      <button
                        onClick={() => toggleSection(mod.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 bg-white/[0.01] hover:bg-white/[0.03] transition-colors text-right"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-rose-500 font-bold block">الوحدة {mIdx + 1}</span>
                          <h3 className="text-xs font-black text-zinc-300 leading-snug truncate mt-0.5">{mod.title}</h3>
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
                            className="border-t border-white/5 bg-[#0a0a0f] p-2 space-y-1 overflow-hidden"
                          >
                            {mod.lessons.map((lesson) => {
                              const isCurrent = lesson.id === currentLesson.id;
                              const isCompleted = completedLessons.includes(lesson.id);
                              return (
                                <div
                                  key={lesson.id}
                                  className={`w-full text-right flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                                    isCurrent 
                                      ? "bg-rose-600/10 border border-rose-500/30 text-rose-400" 
                                      : "hover:bg-white/[0.02] text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  {/* Checkbox button */}
                                  <button 
                                    onClick={() => handleToggleComplete(lesson.id)}
                                    className={`w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                      isCompleted 
                                        ? "bg-rose-600 border-rose-600 text-white" 
                                        : "border-zinc-700 hover:border-rose-500"
                                    }`}
                                  >
                                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                                  </button>

                                  {/* Nav link */}
                                  <button
                                    onClick={() => {
                                      router.push(`/learn/${courseSlug}/${lesson.slug}`);
                                      if (window.innerWidth < 1024) setSidebarOpen(false);
                                    }}
                                    className="flex-1 text-right min-w-0 bg-transparent border-none p-0 cursor-pointer"
                                  >
                                    <p className={`text-xs font-bold leading-snug truncate ${isCurrent ? "text-white" : ""}`}>{lesson.title}</p>
                                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 mt-1 font-bold">
                                      <Clock className="w-3 h-3 text-zinc-600" />
                                      <span>{Math.floor(lesson.duration_seconds / 60) || 5} دقيقة</span>
                                      
                                      {lesson.is_preview && (
                                        <span className="bg-emerald-950 text-emerald-400 px-1 py-0.5 rounded text-[8px] mr-auto border border-emerald-900/30">تجربة مجانية Preview</span>
                                      )}
                                    </div>
                                  </button>
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
            className="aspect-video w-full max-w-4xl mx-auto rounded-3xl bg-zinc-950 border border-white/5 overflow-hidden relative group flex flex-col items-center justify-center shadow-2xl"
          >
            {/* Cinematic Overlay Grid */}
            <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-20 pointer-events-none z-0"></div>

            {currentLesson.lecture_type === "video" && currentLesson.video_url ? (
              isPlaying ? (
                <iframe
                  src={getEmbedUrl(currentLesson.video_url)}
                  title={currentLesson.title}
                  className="w-full h-full border-none z-10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <>
                  <div className="absolute w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-rose-600/5 rounded-full blur-[80px] group-hover:scale-110 transition-transform duration-700 pointer-events-none z-0"></div>
                  <button 
                    onClick={() => setIsPlaying(true)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white shadow-xl shadow-rose-600/20 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer z-10"
                  >
                    <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 ml-0.5" />
                  </button>
                  <span className="text-xs font-bold text-zinc-500 mt-4 select-none z-10">انقر لتشغيل المحاضرة</span>
                </>
              )
            ) : (
              // Non-video content states (PDF, Links, Downloads)
              <div className="text-center z-10 space-y-4 p-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
                  {currentLesson.lecture_type === "pdf" && <FileText className="w-8 h-8 text-emerald-400" />}
                  {currentLesson.lecture_type === "link" && <LinkIcon className="w-8 h-8 text-sky-400" />}
                  {currentLesson.lecture_type === "download" && <Download className="w-8 h-8 text-amber-400" />}
                </div>

                <h3 className="font-alexandria font-bold text-white text-base">
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
                    className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-rose-600/10"
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
                    className="h-10 px-6 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition-all shadow-lg"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>فتح الرابط الخارجي</span>
                  </a>
                )}
              </div>
            )}

            {/* Sticky Player Controls bar */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent px-4 flex items-center justify-between text-[10px] text-zinc-400 select-none pointer-events-none">
              <span>HD 1080p • تشغيل آمن وموثق</span>
              <span>Youssef Automates LMS</span>
            </div>
          </div>

          {/* Lesson Outline Title & Quick Actions */}
          <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div>
              <span className="text-[10px] text-rose-500 font-bold block uppercase tracking-wider font-alexandria">تشاهد حالياً</span>
              <h2 className="text-lg sm:text-2xl font-alexandria font-bold text-white mt-1 leading-snug">{currentLesson.title}</h2>
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
                  className="h-12 w-12 rounded-xl border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="الدرس السابق (أو اضغط ArrowRight)"
                >
                  <ArrowRight className="w-5 h-5 " />
                </button>
              )}

              <button
                onClick={() => handleToggleComplete(currentLesson.id)}
                className={`h-12 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer ${
                  completedLessons.includes(currentLesson.id)
                    ? "bg-emerald-600/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25"
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
                  className="h-12 w-12 rounded-xl border border-white/5 hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="الدرس التالي (أو اضغط ArrowLeft)"
                >
                  <ArrowLeft className="w-5 h-5 " />
                </button>
              )}
            </div>
          </div>

          {/* Additional details tabs (Overview, Notes, Q&A) */}
          <div className="w-full max-w-4xl mx-auto space-y-4 font-cairo">
            <div className="flex border-b border-white/5 gap-6 text-xs font-bold text-zinc-500 pb-1 overflow-x-auto scrollbar-none font-alexandria">
              {[
                { id: "overview", name: "تفاصيل وملاحظات الدرس", icon: FileText },
                { id: "personal_notes", name: "ملاحظاتي الشخصية Notes", icon: Keyboard },
                { id: "resources", name: "المرفقات والملفات", icon: Download },
                { id: "support", name: "المناقشات والاستفسارات Q&A", icon: MessageSquare }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 pb-2.5 transition-colors border-b-2 shrink-0 cursor-pointer ${
                    activeTab === t.id 
                      ? "border-rose-600 text-white" 
                      : "border-transparent hover:text-zinc-300"
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
                <div className="space-y-4 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  <p className="whitespace-pre-line bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                    {currentLesson.content || "لا توجد ملاحظات تفصيلية مضافة لهذا الدرس حتى الآن."}
                  </p>
                </div>
              )}

              {activeTab === "personal_notes" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500 font-bold block">اكتب ملاحظاتك الشخصية، يتم حفظها تلقائياً على متصفحك</span>
                    <button 
                      onClick={handleDownloadNote}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold border border-rose-500/10 px-3 py-1.5 rounded-lg bg-rose-600/5 transition-all flex items-center gap-1"
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
                    className="w-full bg-[#0a0a0f] border border-white/5 focus:border-rose-500/50 rounded-2xl p-4 text-xs focus:outline-none transition-all text-white text-right leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      <span>حفظ الملاحظة</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-4">
                  {currentLesson.attachment_url ? (
                    <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-rose-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">{currentLesson.attachment_name || "ملف مرفق للدراسة والعمل"}</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5">جاهز للتنزيل الفوري • حجم خفيف</p>
                        </div>
                      </div>
                      <a
                        href={currentLesson.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-all border border-white/10 flex items-center justify-center shrink-0"
                      >
                        تحميل الآن
                      </a>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-xs text-center py-6">لا توجد ملفات مرفقة مخصصة لهذا الدرس.</p>
                  )}
                </div>
              )}

              {activeTab === "support" && (
                <div className="space-y-6">
                  {/* Write Question */}
                  <div className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-4 space-y-3">
                    <span className="text-xs text-zinc-400 font-bold block">لديك سؤال أو استفسار؟ اطرحه هنا</span>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newQuestion}
                        onChange={e => setNewQuestion(e.target.value)}
                        placeholder="اكتب سؤالك بوضوح..."
                        className="flex-1 bg-white/5 border border-white/5 focus:border-rose-500/50 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all text-white text-right"
                      />
                      <button 
                        onClick={handleAddQuestion}
                        className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>ارسال</span>
                      </button>
                    </div>
                  </div>

                  {/* List QA comments */}
                  <div className="space-y-4">
                    {qaList.map((qa) => (
                      <div key={qa.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-600/10 border border-rose-500/20 text-rose-500 font-bold text-xs flex items-center justify-center">
                            {qa.avatar}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-none">{qa.author}</h4>
                            <span className="text-[9px] text-zinc-500 font-bold block mt-1">{qa.time}</span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed pr-11">{qa.content}</p>

                        {/* Replies */}
                        {qa.replies && qa.replies.map((rep, rIdx) => (
                          <div key={rIdx} className="bg-white/[0.01] border-r border-rose-500/30 p-3 rounded-xl mr-8 space-y-2 mt-2">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[9px] flex items-center justify-center">
                                {rep.avatar}
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold text-amber-400 leading-none">{rep.author}</h5>
                                <span className="text-[8px] text-zinc-500 block mt-0.5">{rep.time}</span>
                              </div>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed pr-9">{rep.content}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── 4. CERTIFICATE SHADED MODAL ─────────────────────────────────────────── */}
      {showCertModal && activeCert && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl max-w-3xl w-full p-8 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowCertModal(false)}
              className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Border certificate frame */}
            <div className="border-4 border-double border-amber-500/50 p-6 sm:p-10 rounded-2xl bg-black/60 relative text-center space-y-6 overflow-hidden">
              {/* Subtle background crest / glow */}
              <div className="absolute w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -top-20 -right-20 pointer-events-none" />
              <div className="absolute w-64 h-64 bg-yellow-500/5 rounded-full blur-[80px] -bottom-20 -left-20 pointer-events-none" />

              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <style dangerouslySetInnerHTML={{__html: `
                  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&display=swap');
                  @import url('https://fonts.cdnfonts.com/css/lovelo');
                `}} />
                <h3 className="font-alexandria font-black text-white text-lg sm:text-2xl tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500">
                  شهادة إكمال ومثابرة موثقة
                </h3>
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] font-mono font-cairo">Certificate of Course Completion</p>
              </div>

              <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                يُشهد فريق عمل أكاديمية <span className="font-bold text-white">Youssef Automates</span> الفنية بأن الطالب البارز:
              </p>

              <h4 
                className="text-white text-2xl sm:text-4xl underline decoration-amber-500/50 underline-offset-8 transition-all"
                style={{
                  fontFamily: /[\u0600-\u06FF]/.test(activeCert.student_name) ? "'Cairo', 'Alexandria', sans-serif" : "'Lovelo', sans-serif",
                  fontWeight: /[\u0600-\u06FF]/.test(activeCert.student_name) ? 900 : 'bold',
                }}
              >
                {activeCert.student_name}
              </h4>

              <p className="text-zinc-400 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed">
                قد أتم بنجاح ومثابرة كامل متطلبات ودروس المسار التدريبي الاحترافي:
              </p>

              <h5 className="font-bold text-white text-base sm:text-lg text-rose-500">
                {activeCert.course_name}
              </h5>

              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-6 gap-6 text-xs font-bold text-zinc-500">
                <div className="text-right space-y-3 shrink-0">
                  <div>
                    <span className="block text-[10px] text-zinc-600 font-medium">تاريخ إصدار الشهادة:</span>
                    <span className="text-zinc-300 font-mono mt-0.5 block">{activeCert.issued_at}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-600 font-medium">رقم التوثيق الرقمي (Verification ID):</span>
                    <span className="text-rose-400 font-mono mt-0.5 block">{activeCert.verification_id}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-3 py-1 rounded w-fit">
                      <ShieldCheck className="w-4 h-4" />
                      <span>شهادة رقمية معتمدة وآمنة</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Dynamic Verification QR Code */}
                <div className="flex flex-col items-center gap-2 bg-white/5 border border-white/5 p-3 rounded-2xl shrink-0">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=d97706&bgcolor=0a0a0f&data=${encodeURIComponent(`https://youssefautomates.com/certificates/verify?id=${activeCert.verification_id}`)}`}
                    alt="Certificate QR Verification" 
                    className="w-20 h-20 rounded-lg border border-amber-500/20"
                  />
                  <span className="text-[8px] text-amber-500/70 font-mono tracking-widest block uppercase">Scan to Verify</span>
                </div>
              </div>
            </div>

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
                onClick={() => setShowCertModal(false)}
                className="h-11 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs active:scale-95 transition-all cursor-pointer"
              >
                العودة لمشاهدة المنهج
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
