"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Lock, Loader2, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Validate that a valid active session is present (from recovery callback)
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        toast.error("انتهت صلاحية جلسة إعادة التعيين. يرجى طلب رابط جديد.");
        router.push("/login/forgot-password");
      } else {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }

    if (password.length < 6) {
      toast.error("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Update password error:", error);
        toast.error(error.message || "فشل تحديث كلمة المرور. يرجى المحاولة مجدداً.");
      } else {
        toast.success("تم تحديث كلمة المرور بنجاح! جاري تحويلك للوحة التحكم.");
        
        // Wait a split second and redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      toast.error("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-400 text-sm font-medium font-cairo">جاري التحقق من الجلسة الآمنة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Background Grids & Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-rose-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo and Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 relative flex items-center justify-center p-2 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-[0_0_30px_rgba(214,0,75,0.2)]">
              <img src="/logo.png" alt="JoeSchool Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-alexandria font-black text-2xl tracking-tight text-white mt-2">
                Youssef <span className="text-rose-500">Automates</span>
              </h1>
              <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase block mt-1">المنصة التعليمية الفاخرة</span>
            </div>
          </Link>
        </div>

        {/* Card Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent" />

          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white mb-2">تعيين كلمة مرور جديدة</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">أنت في وضع إعادة التعيين الآمن الآن. يرجى إدخال كلمة مرور جديدة وقوية لحسابك.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            {/* New Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 block pr-1">كلمة المرور الجديدة</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-zinc-600"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 block pr-1">تأكيد كلمة المرور الجديدة</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-zinc-600"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full group h-14 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(214,0,75,0.3)] transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تعيين كلمة المرور...</span>
                </>
              ) : (
                <>
                  <span>حفظ وتحديث كلمة المرور</span>
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Options */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link
              href="/"
              className="text-zinc-500 hover:text-white text-xs sm:text-sm font-medium transition-colors"
            >
              <span>العودة للمتجر الرئيسي</span>
            </Link>
          </div>
        </motion.div>

        {/* Security badge at bottom */}
        <div className="text-center mt-6 flex items-center justify-center gap-2 text-zinc-600 text-xs select-none">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>جلسة مشفرة ومؤمنة بالكامل بالمعايير العالمية</span>
        </div>
      </div>
    </div>
  );
}
