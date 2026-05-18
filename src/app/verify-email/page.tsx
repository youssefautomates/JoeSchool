"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Mail, Loader2, ArrowLeft, Sparkles, ShieldCheck, 
  CheckCircle2, ExternalLink, RefreshCw 
} from "lucide-react";
import Link from "next/link";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Cooldown countdown timer for resend spam protection
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auth State Change listener & Session Polling
  useEffect(() => {
    // 1. Initial immediate session validation
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        toast.success("تم تأكيد بريدك الإلكتروني بنجاح!");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2500);
      }
    };
    checkSession();

    // 2. Real-time auth state change subscription
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        toast.success("تم تأكيد بريدك الإلكتروني بنجاح!");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2500);
      }
    });

    // 3. Periodic polling check (runs every 4 seconds in case session cookie sets in background)
    const interval = setInterval(async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        clearInterval(interval);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2500);
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router]);

  const handleResend = async () => {
    if (!email) {
      toast.error("لم يتم العثور على بريد إلكتروني لإعادة الإرسال");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        toast.error(error.message || "حدث خطأ أثناء إعادة إرسال البريد");
      } else {
        toast.success("تم إعادة إرسال رابط التفعيل بنجاح! تفقد بريدك الوارد.");
        setCooldown(60); // 60 seconds spam prevention cooldown
      }
    } catch (err) {
      toast.error("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsResending(false);
    }
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      // Force refreshing the Supabase session to update cached user details
      const { data: { session }, error } = await supabaseClient.auth.refreshSession();
      
      if (session?.user?.email_confirmed_at) {
        setIsVerified(true);
        toast.success("تهانينا! حسابك مفعل ونشط الآن.");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      } else {
        toast.error("لم يتم تأكيد الحساب بعد. يرجى الضغط على الرابط المرسل لبريدك الإلكتروني.");
      }
    } catch (err) {
      toast.error("فشل التحقق التلقائي. يرجى محاولة الضغط على الرابط في البريد.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleOpenGmail = () => {
    window.open("https://mail.google.com", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Background Grids & Glowing Rose Blurs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-rose-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 relative flex items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-[0_0_30px_rgba(214,0,75,0.2)]">
              <img src="/logo.png" alt="Youssef Automates Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-alexandria font-black text-2xl tracking-tight text-white mt-2">
                Youssef <span className="text-rose-500">Automates</span>
              </h1>
              <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase block mt-1">المنصة التعليمية الفاخرة</span>
            </div>
          </Link>
        </div>

        {/* Dynamic Card Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent" />

          <AnimatePresence mode="wait">
            {isVerified ? (
              // Verified Success State
              <motion.div
                key="verified-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-alexandria font-bold text-white mb-2">تم تأكيد البريد الإلكتروني!</h2>
                  <p className="text-zinc-400 text-sm">تهانينا، تم تفعيل حساب الطالب الخاص بك بنجاح. سنقوم بتحويلك الآن للوحة التحكم الخاصة بك...</p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  <span className="text-zinc-500 text-xs font-bold">جاري تحويلك تلقائياً...</span>
                </div>

                <Link
                  href="/dashboard"
                  className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2"
                >
                  <span>الدخول المباشر للوحة التحكم</span>
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </Link>
              </motion.div>
            ) : (
              // Verification Pending State
              <motion.div
                key="pending-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_30px_rgba(214,0,75,0.15)] relative overflow-hidden group">
                    <Mail className="w-8 h-8 animate-pulse z-10" />
                    <div className="absolute w-12 h-12 bg-rose-600/20 rounded-full blur-lg group-hover:scale-125 transition-transform pointer-events-none" />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white mb-2">تأكيد حساب الطالب الخاص بك</h2>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    لقد أرسلنا رسالة بريد إلكتروني تحتوي على رابط تفعيل فوري إلى العنوان التالي:
                  </p>
                </div>

                {/* Email highlighting box */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <span className="font-bold text-sm sm:text-base text-rose-400 select-all truncate max-w-[260px] sm:max-w-xs text-right" dir="ltr">
                    {email || "بريدك الإلكتروني المسجل"}
                  </span>
                  <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90 shrink-0">معلق</span>
                </div>

                {/* Onboarding steps list */}
                <div className="space-y-3.5 pt-2 text-xs sm:text-sm text-zinc-400">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-rose-500 shrink-0 mt-0.5">١</span>
                    <p className="leading-relaxed text-right">افتح بريدك الوارد (Inbox) أو مجلد البريد غير الهام (Spam).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-rose-500 shrink-0 mt-0.5">٢</span>
                    <p className="leading-relaxed text-right">اضغط على زر <strong>"تأكيد الحساب"</strong> المرفق بالرسالة لتثبيت التفعيل.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-rose-500 shrink-0 mt-0.5">٣</span>
                    <p className="leading-relaxed text-right">سيتم تحديث هذه الصفحة وتحويلك تلقائياً للوحة التحكم.</p>
                  </div>
                </div>

                {/* Main Action CTAs */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  {/* Open Gmail button */}
                  <button
                    onClick={handleOpenGmail}
                    className="w-full group h-14 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-2xl font-bold text-base transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>فتح بريد Gmail سريعاً</span>
                    <ExternalLink className="w-5 h-5 group-hover:scale-105 transition-transform" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Manual Check Status button */}
                    <button
                      onClick={handleManualCheck}
                      disabled={isChecking}
                      className="h-12 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري التحقق...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>التحقق من التفعيل</span>
                        </>
                      )}
                    </button>

                    {/* Resend button */}
                    <button
                      onClick={handleResend}
                      disabled={isResending || cooldown > 0}
                      className="h-12 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/5 hover:border-white/10 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري الإرسال...</span>
                        </>
                      ) : cooldown > 0 ? (
                        <span>إعادة الإرسال ({cooldown}ث)</span>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>إعادة إرسال الرابط</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Back to login link */}
                <div className="pt-6 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-zinc-500">
                  <p>هل قمت بإدخال بريد خاطئ؟</p>
                  <Link href="/signup" className="text-rose-400 hover:text-rose-300 font-bold transition-colors">
                    العودة لإنشاء حساب جديد
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Security badge at bottom */}
        <div className="text-center mt-6 flex items-center justify-center gap-2 text-zinc-600 text-xs select-none">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>تأمين فوري للحساب لحماية بيانات الطالب الخاصة بك</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-400 text-sm font-medium font-cairo">جاري تحميل المعطيات...</p>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
