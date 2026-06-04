"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { trackMetaEvent } from "@/lib/metaPixel";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user is already logged in, redirect them immediately to dashboard or password reset
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        if (session.user?.user_metadata?.requires_password_change === true) {
          router.push("/reset-password?temp=true");
        } else {
          router.push(redirectPath);
        }
      } else {
        setCheckingSession(false);
      }
    });
  }, [router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast.error(error.message || "فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.");
      } else if (data?.session) {
        if (data.user?.user_metadata?.requires_password_change === true) {
          toast.success("يرجى تغيير كلمة المرور المؤقتة للاستمرار.");
          router.push("/reset-password?temp=true");
        } else {
          toast.success("تم تسجيل الدخول بنجاح! مرحباً بك.");
          router.push(redirectPath);
        }
        router.refresh();
      }
    } catch (err: any) {
      toast.error("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-400 text-sm font-medium">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Grids & Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-rose-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo and Brand Header */}
        <div className="text-center mb-8 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <Link href="/" className="group inline-block">
              <img src="/logo-text.png" alt="JoeSchool Logo" className="h-14 sm:h-16 object-contain group-hover:scale-105 transition-transform duration-300" />
            </Link>
          </motion.div>
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
            <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white mb-2">تسجيل الدخول للمنصة</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">أهلاً بك مجدداً! قم بتسجيل الدخول للوصول إلى لوحة التحكم ودوراتك التدريبية.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 block pr-1">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-zinc-600"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-zinc-400 block">كلمة المرور</label>
                <Link
                  href="/login/forgot-password"
                  className="text-[10px] sm:text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              onClick={() => trackMetaEvent("Lead", { content_name: "login_button_click" })}
              className="w-full group h-14 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(214,0,75,0.3)] transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Options */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-zinc-500 text-xs sm:text-sm">
              ليس لديك حساب حتى الآن؟{" "}
              <Link href="/signup" className="text-rose-400 hover:text-rose-300 font-bold transition-colors">
                إنشاء حساب جديد
              </Link>
            </p>
            <Link
              href="/"
              className="text-zinc-500 hover:text-white text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <span>العودة للمتجر الرئيسي</span>
            </Link>
          </div>
        </motion.div>

        {/* Security badge at bottom */}
        <div className="text-center mt-6 flex items-center justify-center gap-2 text-zinc-600 text-xs select-none">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>نظام مشفر بالكامل للحفاظ على حماية حسابك</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-400 text-sm font-medium font-cairo">جاري التحميل...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
