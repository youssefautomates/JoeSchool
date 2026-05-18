"use client";

import { useState, useEffect } from "react";
import { 
  Users, Search, BookOpen, Clock, Award, CheckCircle2, 
  ShieldAlert, Edit, Trash2, X, ShieldCheck, Loader2, RefreshCw 
} from "lucide-react";
import { 
  getEnrollmentsForAdmin, getCoursesList, getCourseProgressPercent, 
  updateStudentProfile, removeStudentFromCourse, updateEnrollmentStatus,
  type LmsEnrollment, type LmsCourse 
} from "@/lib/coursesDb";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StudentRow extends LmsEnrollment {
  courseTitle: string;
  percent: number;
  completedCount: number;
  totalCount: number;
  isFinished: boolean;
}

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  // Edit/Action Modal States
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    let enrolls = await getEnrollmentsForAdmin();
    const lmsCourses = await getCoursesList();
    setCourses(lmsCourses);

    if (enrolls.length === 0 && lmsCourses.length > 0) {
      // Seed some beautiful demonstration students!
      const { enrollUser } = await import("@/lib/coursesDb");
      await enrollUser("usr-student-1", lmsCourses[0].id, { email: "ahmed.ali@gmail.com", name: "أحمد علي" });
      await enrollUser("usr-student-2", lmsCourses[0].id, { email: "yassine.automates@outlook.com", name: "ياسين عبد الرحمن" });
      if (lmsCourses[1]) {
        await enrollUser("usr-student-3", lmsCourses[1].id, { email: "m.nour@yahoo.com", name: "محمد نور الدين" });
      }
      
      // Seed progress as well
      const { toggleLessonCompleted } = await import("@/lib/coursesDb");
      const { getCourseBySlug } = await import("@/lib/coursesDb");
      
      const { sections: sec1 } = await getCourseBySlug(lmsCourses[0].slug);
      if (sec1.length > 0 && sec1[0].lessons.length > 0) {
        await toggleLessonCompleted("usr-student-1", sec1[0].lessons[0].id, lmsCourses[0].id, "أحمد علي");
        if (sec1[0].lessons[1]) {
          await toggleLessonCompleted("usr-student-1", sec1[0].lessons[1].id, lmsCourses[0].id, "أحمد علي");
        }
        
        // 100% completion for student 2 to test certificates
        for (const sec of sec1) {
          for (const les of sec.lessons) {
            await toggleLessonCompleted("usr-student-2", les.id, lmsCourses[0].id, "ياسين عبد الرحمن");
          }
        }
      }

      enrolls = await getEnrollmentsForAdmin();
    }

    // Populate rows with visual progress percentages
    const populated: StudentRow[] = [];
    for (const e of enrolls) {
      const c = lmsCourses.find(course => course.id === e.course_id);
      const courseTitle = c?.title || "دورة تعليمية غير معروفة";
      const { percent, completedCount, totalCount, isFinished } = await getCourseProgressPercent(e.user_id, e.course_id);
      populated.push({
        ...e,
        courseTitle,
        percent,
        completedCount,
        totalCount,
        isFinished
      });
    }

    setRows(populated);
    setLoading(false);
  };

  const handleOpenActionModal = (student: StudentRow) => {
    setSelectedStudent(student);
    setEditName(student.user_name || "");
    setEditEmail(student.user_email || "");
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSaving(true);

    try {
      const success = await updateStudentProfile(selectedStudent.user_id, editName, editEmail);
      if (success) {
        toast.success("تم تحديث بيانات الطالب بنجاح! ✨");
        setSelectedStudent(null);
        await loadData();
      } else {
        toast.error("فشل في تحديث بيانات الطالب");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء حفظ التغييرات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedStudent) return;
    const isSuspended = selectedStudent.status === "suspended";
    const nextStatus = isSuspended ? "active" : "suspended";
    
    try {
      const success = await updateEnrollmentStatus(selectedStudent.user_id, selectedStudent.course_id, nextStatus);
      if (success) {
        toast.success(isSuspended ? "تم إعادة تفعيل حساب الطالب بنجاح! ✅" : "تم حظر حساب الطالب بنجاح! 🔒");
        setSelectedStudent(null);
        await loadData();
      } else {
        toast.error("فشل في تعديل حالة الحساب");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء تعديل حالة الطالب");
    }
  };

  const handleDisenroll = async () => {
    if (!selectedStudent) return;
    if (!confirm("هل أنت متأكد من إلغاء اشتراك هذا الطالب وحذف تقدمه بالكامل؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    try {
      const success = await removeStudentFromCourse(selectedStudent.user_id, selectedStudent.course_id);
      if (success) {
        toast.success("تم إلغاء اشتراك الطالب وحذف تقدمه من الكورس بنجاح!");
        setSelectedStudent(null);
        await loadData();
      } else {
        toast.error("فشل في إلغاء اشتراك الطالب");
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء إلغاء الاشتراك");
    }
  };

  const filteredRows = rows.filter(r => {
    const matchSearch = 
      (r.user_name?.toLowerCase().includes(search.toLowerCase())) || 
      (r.user_email?.toLowerCase().includes(search.toLowerCase()));
    const matchCourse = selectedCourseId === "all" || r.course_id === selectedCourseId;
    return matchSearch && matchCourse;
  });

  return (
    <div className="space-y-8 font-cairo text-right" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-alexandria font-black text-white">إدارة قائمة الطلاب والمشتركين</h1>
          <p className="text-zinc-400 text-sm mt-1">تابع إنجازات الطلاب، نسب تقدمهم، والتحكم الكامل في الحسابات والاشتراكات.</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
          <Users className="w-6 h-6" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0a0a0f] border border-white/5 p-4 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:flex-1 group">
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث عن طالب بالاسم أو البريد..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pr-11 pl-4 text-xs font-cairo focus:outline-none focus:border-rose-500/50 transition-all text-white text-right"
          />
        </div>

        {/* Filter Course */}
        <select
          value={selectedCourseId}
          onChange={e => setSelectedCourseId(e.target.value)}
          className="w-full md:w-64 bg-[#0f0f15] border border-white/5 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-cairo text-zinc-300"
        >
          <option value="all">جميع المساقات</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <button 
          onClick={loadData}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:text-rose-500 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center text-zinc-400"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Students Data Grid/Table */}
      <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[11px] font-black text-zinc-400 uppercase tracking-widest font-cairo">
                <th className="p-5 text-right">اسم الطالب</th>
                <th className="p-5 text-right">المسار التعليمي المشترك به</th>
                <th className="p-5 text-center">نسبة التقدم وإكمال المنهج</th>
                <th className="p-5 text-right">تاريخ الاشتراك</th>
                <th className="p-5 text-right">حالة الحساب</th>
                <th className="p-5 text-center">خيارات التحكم</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-white/5">
                    <td colSpan={6} className="p-8">
                      <div className="h-6 bg-white/5 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-zinc-500 font-bold text-xs">
                    <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    لا توجد اشتراكات مطابقة للبحث حالياً.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.id} 
                    className="border-b border-white/5 hover:bg-white/[0.01] transition-all font-cairo text-xs"
                  >
                    {/* Student Identity */}
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{row.user_name || "طالب يوسف أوتوميتس"}</span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5" dir="ltr">{row.user_email}</span>
                      </div>
                    </td>

                    {/* Course */}
                    <td className="p-5 font-medium text-zinc-300">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                        <span className="max-w-xs line-clamp-1">{row.courseTitle}</span>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="p-5">
                      <div className="flex flex-col items-center justify-center space-y-1.5 max-w-xs mx-auto">
                        <div className="flex items-center justify-between w-full text-[10px] font-bold">
                          <span className="text-zinc-500">
                            ({row.completedCount} من {row.totalCount} دروس)
                          </span>
                          <span className={cn(
                            "font-mono font-black",
                            row.isFinished ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {row.percent}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              row.isFinished 
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                                : "bg-gradient-to-r from-rose-500 to-orange-400"
                            )}
                            style={{ width: `${row.percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-5 text-zinc-400 font-mono">
                      {new Date(row.enrolled_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                    </td>

                    {/* Account status */}
                    <td className="p-5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-flex items-center gap-1",
                        row.status === "suspended"
                          ? "bg-red-950/40 text-red-400 border-red-900/20"
                          : row.isFinished
                          ? "bg-emerald-950 text-emerald-400 border-emerald-900/30"
                          : "bg-rose-950/40 text-rose-400 border-rose-900/20"
                      )}>
                        {row.status === "suspended" ? (
                          <>
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            <span>محظور</span>
                          </>
                        ) : row.isFinished ? (
                          <>
                            <Award className="w-3 h-3 text-emerald-400" />
                            <span>مكتمل</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-rose-400" />
                            <span>نشط</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Quick Action controls */}
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => handleOpenActionModal(row)}
                        className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 font-bold transition-all text-[11px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        <span>تحكم وإدارة</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CONTROL & EDIT MODAL ──────────────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-right">
            {/* Close */}
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 left-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <div>
              <h3 className="font-alexandria font-bold text-white text-base">إدارة حساب واشتراك الطالب</h3>
              <p className="text-zinc-500 text-xs mt-1">تعديل الاسم والبريد أو إدارة حالة تفعيل الحساب والاشتراك.</p>
            </div>

            {/* Overview Stats */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 grid grid-cols-2 gap-4 text-xs font-bold text-zinc-400">
              <div>
                <span className="text-[10px] text-zinc-500 block">المسار المشترك به:</span>
                <span className="text-white mt-1 block truncate">{selectedStudent.courseTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">نسبة الإنجاز الفعلية:</span>
                <span className="text-rose-400 mt-1 block font-mono">{selectedStudent.percent}% ({selectedStudent.completedCount} من {selectedStudent.totalCount} دروس)</span>
              </div>
            </div>

            {/* Details Form */}
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">اسم الطالب الكامل</label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-cairo text-zinc-300 w-full text-right"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-bold">البريد الإلكتروني</label>
                <input 
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-rose-500/50 transition-all font-cairo text-zinc-300 w-full text-left font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>

            <div className="border-t border-white/5 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-white">إجراءات إضافية</h4>
              
              <div className="flex flex-wrap gap-2.5">
                {/* Block/Unblock Button */}
                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className={cn(
                    "h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border",
                    selectedStudent.status === "suspended"
                      ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30 hover:bg-emerald-950"
                      : "bg-red-950/40 text-red-400 border-red-900/20 hover:bg-red-950"
                  )}
                >
                  {selectedStudent.status === "suspended" ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>إلغاء حظر حساب الطالب</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>حظر حساب الطالب من الكورس</span>
                    </>
                  )}
                </button>

                {/* Disenroll Student */}
                <button
                  type="button"
                  onClick={handleDisenroll}
                  className="h-10 px-4 bg-zinc-950/60 hover:bg-red-950 hover:text-red-400 hover:border-red-900/30 border border-white/5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer text-zinc-400"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>إلغاء الاشتراك وحذف التقدم</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
