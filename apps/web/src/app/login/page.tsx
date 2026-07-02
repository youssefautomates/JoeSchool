"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient, syncSessionToCookie } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { trackMetaEvent } from "@/lib/metaPixel";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState(searchParams.get("email") || "");
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
        // Sync access token cookie synchronously before client redirect to prevent Next.js Middleware blocking
        syncSessionToCookie(data.session);

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
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Grids & Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-brand-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo and Brand Header */}
        <div className="text-center mb-2 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <Link href="/" className="group inline-block">
              <img src="/logo-text.png" alt="JoeSchool Logo" className="h-28 sm:h-32 object-contain group-hover:scale-105 transition-transform duration-300" />
            </Link>
          </motion.div>
        </div>

        {/* Card Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.035),0_6px_24px_rgba(0,0,0,0.015)] relative overflow-hidden"
        >

          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-sans font-bold text-zinc-900 mb-2">تسجيل الدخول للمنصة</h2>
            <p className="text-zinc-500 text-xs sm:text-sm">أهلاً بك مجدداً! قم بتسجيل الدخول للوصول إلى لوحة التحكم ودوراتك التدريبية.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 block pr-1">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#2563EB] transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-zinc-900 placeholder-zinc-400"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-zinc-500 block">كلمة المرور</label>
                <Link
                  href="/login/forgot-password"
                  className="text-[10px] sm:text-xs text-[#2563EB] hover:text-[#1D4ED8] font-bold transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-[#2563EB] transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all text-zinc-900 placeholder-zinc-400"
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
              className="w-full group h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-2xl font-bold text-base shadow-[0_4px_12px_rgba(37,99,235,0.15)] transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
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
          <div className="mt-8 pt-6 border-t border-zinc-200/60 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-zinc-500 text-xs sm:text-sm">
              ليس لديك حساب حتى الآن؟{" "}
              <Link href="/signup" className="text-[#2563EB] hover:text-[#1D4ED8] font-bold transition-colors">
                إنشاء حساب جديد
              </Link>
            </p>
            <Link
              href="/"
              className="text-zinc-500 hover:text-zinc-900 text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1.5"
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
      <div className="min-h-screen bg-white flex items-center justify-center font-sans text-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin" />
          <p className="text-zinc-500 text-sm font-medium font-sans">جاري التحميل...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
