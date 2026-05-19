"use client";

import { useState, useEffect } from "react";
import { Award, Search, Award as CertIcon, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { getCertificatesForAdmin, getCoursesList, type LmsCertificate, type LmsCourse } from "@/lib/coursesDb";
import { cn } from "@/lib/utils";

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<LmsCertificate[]>([]);
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getCertificatesForAdmin();
    const lmsCourses = await getCoursesList();
    setCourses(lmsCourses);
    setCerts(data);
    setLoading(false);
  };

  const filteredCerts = certs.filter(c => {
    return (
      (c.student_name?.toLowerCase().includes(search.toLowerCase())) || 
      (c.course_name?.toLowerCase().includes(search.toLowerCase())) ||
      (c.verification_id?.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-alexandria font-black text-white">إدارة الشهادات المصدرة</h1>
          <p className="text-zinc-400 text-sm mt-1">تصفح وتتبع شهادات الإكمال المصدرة تلقائياً للطلاب المتميزين الذين أكملوا 100% من القسم.</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Award className="w-6 h-6" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex bg-[#0a0a0f] border border-white/5 p-4 rounded-2xl">
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث عن شهادة بالاسم، الكورس، أو كود التحقق (Verification ID)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pr-11 pl-4 text-xs font-cairo focus:outline-none focus:border-rose-500/50 transition-all text-white"
          />
        </div>
      </div>

      {/* Certificates Data Grid */}
      <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[11px] font-black text-zinc-400 uppercase tracking-widest font-cairo">
                <th className="p-5">كود التحقق الفريد</th>
                <th className="p-5">اسم الطالب المكرّم</th>
                <th className="p-5">القسم التدريبي المنجز</th>
                <th className="p-5">تاريخ الإصدار</th>
                <th className="p-5">حالة التوثيق</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-white/5">
                    <td colSpan={5} className="p-8">
                      <div className="h-6 bg-white/5 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-zinc-500 font-bold text-xs">
                    <CertIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    لم يتم إصدار أي شهادات مطابقة للبحث حتى الآن.
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr 
                    key={cert.id} 
                    className="border-b border-white/5 hover:bg-white/[0.01] transition-all font-cairo text-xs"
                  >
                    {/* Verification ID */}
                    <td className="p-5 font-mono text-rose-400 font-black text-sm tracking-wide">
                      {cert.verification_id}
                    </td>

                    {/* Student Name */}
                    <td className="p-5 font-bold text-white text-sm">
                      {cert.student_name}
                    </td>

                    {/* Course */}
                    <td className="p-5 text-zinc-300 font-medium">
                      {cert.course_name}
                    </td>

                    {/* Issue Date */}
                    <td className="p-5 text-zinc-400 font-mono">
                      {cert.issued_at}
                    </td>

                    {/* Verification State */}
                    <td className="p-5">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded border bg-emerald-950 text-emerald-400 border-emerald-900/30 inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>موثقة ونشطة</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
