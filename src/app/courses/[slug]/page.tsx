"use client";

import { use, useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, BookOpen, Clock, ArrowLeft, Star, 
  CheckCircle2, ChevronDown, Award, PlayCircle, ShieldCheck, Loader2
} from "lucide-react";
import Link from "next/link";
import { getCourseBySlug, checkEnrollment, type LmsCourse, type LmsSection, type LmsLesson } from "@/lib/coursesDb";
import { supabaseClient } from "@/lib/supabaseClient";
import RelatedCarousel from "@/components/RelatedCarousel";

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [sections, setSections] = useState<(LmsSection & { lessons: LmsLesson[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [firstLessonSlug, setFirstLessonSlug] = useState("introduction");
  
  // Open modules state
  const [openModuleIndex, setOpenModuleIndex] = useState<number | null>(0);

  useEffect(() => {
    async function loadData() {
      const { course: c, sections: s } = await getCourseBySlug(slug);
      if (!c) {
        setIsLoading(false);
        return;
      }
      setCourse(c);
      setSections(s);

      // Find first lesson slug
      const firstSlug = s[0]?.lessons[0]?.slug || "introduction";
      setFirstLessonSlug(firstSlug);

      // Check enrollment if user session exists
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        const enrolled = await checkEnrollment(session.user.id, c.id);
        setIsEnrolled(enrolled);
      }
      setIsLoading(false);
    }
    loadData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
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

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden">
      <Navbar />

      <main className="flex-1 pt-24 pb-20">
        {/* Banner with Glowing Gradient */}
        <section className="relative py-12 md:py-24 border-b border-white/5 bg-[#09090b]/50">
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-35"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rose-600/10 rounded-full blur-[100px]" />
          </div>

          <div className="container relative z-10 mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              
              {/* Right Col: Course Title & Main Details */}
              <div className="lg:col-span-2 space-y-6">
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>العودة لكافة الأقسام</span>
                </Link>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-alexandria font-black text-white leading-tight">
                  {course.title}
                </h1>

                <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                  {course.description}
                </p>

                {/* Badges details */}
                <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-400 pt-2">
                  <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <span>مدة القسم: {course.duration_hours} ساعة تدريبية</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-rose-500" />
                    <span>الدروس: {course.lessons_count} محاضرة</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>التقييم: 5.0 (طالب مميز)</span>
                  </div>
                </div>
              </div>

              {/* Left Col: Enroll CTA Card */}
              <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-600 to-transparent" />
                
                <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-widest">
                  {isEnrolled ? "حالة الاشتراك" : "التسجيل المباشر"}
                </span>
                
                {isEnrolled ? (
                  <div className="py-6 space-y-4">
                    <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl text-xs font-bold justify-center">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                      <span>أنت مشترك في هذا الكورس بالفعل</span>
                    </div>

                    <Link
                      href={`/learn/${course.slug}/${firstLessonSlug}`}
                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <span>دخول مشغل الكورسات ومتابعة التعلم</span>
                      <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mt-2 mb-4">
                      <span className="text-3xl sm:text-4xl font-alexandria font-black text-white">
                        {course.price === 0 ? "مجاني" : `${course.price} ج.م`}
                      </span>
                      {course.original_price > 0 && (
                        <span className="text-xs text-zinc-400 line-through">{course.original_price} ج.م</span>
                      )}
                      {course.original_price > 0 && (
                        <span className="text-xs text-emerald-400 font-bold ml-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">وفر 50%</span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <Link
                        href={course.price === 0 ? `/learn/${course.slug}/${firstLessonSlug}` : `/checkout/${course.id}`}
                        className="w-full h-14 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(214,0,75,0.3)] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                      >
                        <span>{course.price === 0 ? "سجل مجاناً في الكورس الآن" : "سجل وانضم للمساق الآن"}</span>
                        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                      </Link>

                      <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>دفع آمن مع ضمان استرداد خلال 14 يوماً</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-white/5 my-6 pt-6 space-y-3 text-xs font-bold text-zinc-400">
                  <p className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>دخول كامل مدى الحياة للمساق والتحديثات</span>
                  </p>
                  <p className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>شهادة إتمام معتمدة بعد إنجاز الدروس</span>
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Syllabus / Modules Accordion */}
        <section className="container mx-auto px-4 max-w-4xl mt-16 space-y-12">
          
          {/* Syllabus Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-alexandria font-bold text-white border-r-4 border-rose-500 pr-3.5">
              منهج الدورة والمنهاج الدراسي
            </h2>
            <p className="text-zinc-400 text-sm">
              يحتوي هذا القسم التدريبي على وحدات مهيكلة تأخذك خطوة بخطوة نحو التميز. اضغط على الوحدة لعرض قائمة الدروس المشمولة بها:
            </p>

            <div className="space-y-4">
              {sections.length === 0 ? (
                <p className="text-zinc-500 text-xs text-center py-6">المنهاج الدراسي قيد التجهيز وسيتم نشره قريباً.</p>
              ) : (
                sections.map((mod, index) => {
                  const isOpen = openModuleIndex === index;
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
                          <BookOpen className="w-5 h-5 text-rose-500 shrink-0" />
                          <span>{mod.title}</span>
                        </span>
                        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
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
                                  className="flex items-center justify-between gap-3 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors py-1 border-b border-white/[0.02] last:border-b-0"
                                >
                                  <span className="flex items-center gap-2.5 text-right">
                                    <PlayCircle className="w-4 h-4 text-zinc-600 shrink-0" />
                                    <span>{lesson.title}</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-medium shrink-0">
                                    {lesson.lecture_type === "video" ? "فيديو مباشر" : lesson.lecture_type === "pdf" ? "ملف PDF" : "رابط خارجي"}
                                  </span>
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
          </div>

          {/* Benefits Grid */}
          {course.what_will_learn && course.what_will_learn.length > 0 && (
            <div className="bg-[#0a0a0f]/40 border border-white/5 rounded-3xl p-8 sm:p-10 space-y-8">
              <h3 className="text-xl font-alexandria font-bold text-white">ماذا ستتعلم في هذا القسم؟</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {course.what_will_learn.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-300 text-xs sm:text-sm leading-relaxed">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        {/* Smart Related Recommendations */}
        <section className="container mx-auto px-4 max-w-6xl mt-20 border-t border-white/5 pt-16">
          <RelatedCarousel sourceType="course" sourceId={course.id} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
