"use client";

import { use, useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Award, ShieldCheck, Calendar, User, BookOpen, AlertTriangle, ArrowLeft, Printer, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { getCertificateByVerificationId, type LmsCertificate } from "@/lib/coursesDb";
import { cn } from "@/lib/utils";

export default function CertificateVerificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [cert, setCert] = useState<LmsCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCertificateByVerificationId(id).then((data) => {
      setCert(data);
      setIsLoading(false);
    });
  }, [id]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-brand-500/30 font-sans overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 flex items-center justify-center relative">
        {/* Glowing radial gradient backdrop */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-30"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-2xl">
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
              <p className="text-zinc-500 text-sm font-medium">جاري التحقق من رقم التوثيق المعتمد...</p>
            </div>
          ) : cert ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Header Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>مستند توثيق معتمد ومفعل</span>
                </div>
              </div>

              {/* Customizable Certificate Live Template OR Gold Certificate Frame */}
              {cert.certificate_bg_url ? (
                <div 
                  className="w-full aspect-[1.414/1] bg-slate-50 border border-amber-500/30 rounded-3xl overflow-hidden relative shadow-sm border border-zinc-200/60 print:m-0 print:border-none print:shadow-none"
                  style={{ containerType: "inline-size" }}
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&family=Alexandria:wght@800;900&family=Alike&display=swap');
                  `}} />
                  <img src={cert.certificate_bg_url} alt="Certificate Background" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 z-10 font-bold" style={{ color: cert.certificate_text_color || "#000000" }}>
                    <div 
                      className="absolute whitespace-nowrap transition-all" 
                      style={{ 
                        left: `${cert.certificate_name_x || 50}%`, 
                        top: `${cert.certificate_name_y || 40}%`, 
                        fontSize: `calc((${(() => {
                          const nameLength = cert.student_name.length;
                          let lengthScale = 1.0;
                          if (nameLength > 35) lengthScale = 0.55;
                          else if (nameLength > 28) lengthScale = 0.65;
                          else if (nameLength > 20) lengthScale = 0.8;
                          return (cert.certificate_name_size || 24) * lengthScale;
                        })()} / 800) * 100cqw)`,
                        transform: 'translate(-50%, -50%)',
                        fontFamily: /[\u0600-\u06FF]/.test(cert.student_name) ? "'Cairo', 'Alexandria', sans-serif" : "'Alike', serif",
                        fontWeight: /[\u0600-\u06FF]/.test(cert.student_name) ? 900 : 'normal',
                      }}
                    >
                      {cert.student_name}
                    </div>
                    <div 
                      className="absolute whitespace-nowrap font-mono" 
                      style={{ 
                        left: `${cert.certificate_date_x || 50}%`, 
                        top: `${cert.certificate_date_y || 70}%`, 
                        fontSize: `calc((${cert.certificate_date_size || 14} / 800) * 100cqw)`,
                        transform: 'translate(-50%, -50%)' 
                      }}
                    >
                      {cert.issued_at}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-amber-500/30 rounded-[2.5rem] p-8 sm:p-12 shadow-sm border border-zinc-200/60 relative overflow-hidden text-center space-y-8">
                  {/* Gold Crest background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Secure watermark seal */}
                  <div className="absolute top-6 left-6 w-14 h-14 border border-amber-500/10 rounded-full flex items-center justify-center text-[7px] text-amber-500/25 font-bold uppercase tracking-widest font-mono select-none">
                    SECURE
                  </div>

                  <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm border border-zinc-200/60 shadow-amber-500/5">
                    <Award className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <h1 className="font-sans font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 tracking-tight leading-tight">
                      صلاحية التوثيق المعتمد
                    </h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] font-mono leading-none">Verified Digital Credential</p>
                  </div>

                  <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                    تؤكد منصة وأكاديمية <span className="text-zinc-900 font-bold">JoeSchool</span> رسمياً صحة ومصداقية الشهادة الرقمية الممنوحة للطالب:
                  </p>

                  {/* Student Name */}
                  <div className="py-2">
                    <h2 className="font-sans font-black text-3xl sm:text-4xl text-zinc-900 underline decoration-amber-500/40 decoration-wavy underline-offset-8">
                      {cert.student_name}
                    </h2>
                  </div>

                  <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                    نظير إكماله ومثابرته المتميزة في استيفاء متطلبات واجتياز محاضرات الكورس الاحترافي:
                  </p>

                  {/* Course Name */}
                  <div className="bg-zinc-50/70 border border-zinc-200/60 rounded-2xl p-4 max-w-lg mx-auto">
                    <h3 className="font-sans font-bold text-base sm:text-lg text-yellow-500 flex items-center justify-center gap-2">
                      <BookOpen className="w-4.5 h-4.5 text-yellow-500" />
                      <span>{cert.course_name}</span>
                    </h3>
                  </div>

                  {/* Meta details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-zinc-200/60 text-zinc-500 text-xs text-right sm:text-center font-bold">
                    <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                      <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <span className="block text-[9px] text-zinc-600 font-medium">تاريخ صدور الوثيقة:</span>
                        <span className="text-zinc-700 font-mono mt-0.5 block">{cert.issued_at}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 justify-center sm:justify-end">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <span className="block text-[9px] text-zinc-600 font-medium">رقم التوثيق الرقمي:</span>
                        <span className="text-yellow-500 font-mono mt-0.5 block">{cert.verification_id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto h-12 px-6 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 border border-zinc-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-4.5 h-4.5 text-zinc-500" />
                  <span>طباعة وثيقة التوثيق المعتمد</span>
                </button>
                <Link
                  href="/courses"
                  className="w-full sm:w-auto h-12 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_4px_15px_rgba(29, 78, 216,0.25)]"
                >
                  <ArrowLeft className="w-4.5 h-4.5 rtl:rotate-180" />
                  <span>تصفح دورات الأكاديمية</span>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-50 border border-red-500/20 rounded-[2rem] p-8 text-center space-y-6 max-w-md mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="font-sans font-bold text-zinc-900 text-lg">فشل التحقق من الشهادة الرقمية!</h2>
              <p className="text-zinc-500 text-xs sm:text-sm leading-relaxed">
                رقم التوثيق المدخل غير صالح أو ربما تم إلغاء الشهادة بسبب عدم استكمال المسار التعليمي بشكل صحيح. يرجى مراجعة إدارة الدعم الفني.
              </p>
              <Link
                href="/"
                className="inline-flex h-11 px-6 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 rounded-2xl text-xs font-bold items-center justify-center gap-2 border border-zinc-200 transition-colors"
              >
                العودة للرئيسية
              </Link>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
