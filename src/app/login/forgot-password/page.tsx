"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("يرجى إدخال البريد الإلكتروني الخاص بك");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
        toast.error(error.message || "حدث خطأ أثناء إرسال رابط التعيين. حاول مرة أخرى.");
      } else {
        toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني!");
        setIsSent(true);
      }
    } catch (err: any) {
      toast.error("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

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
                Joe <span className="text-rose-500">School</span>
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

          {!isSent ? (
            <>
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white mb-2">استعادة كلمة المرور</h2>
                <p className="text-zinc-400 text-xs sm:text-sm">أدخل بريدك الإلكتروني وسنقوم بإرسال رابط آمن لإعادة تعيين كلمة مرورك فوراً.</p>
              </div>

              <form onSubmit={handleResetRequest} className="space-y-6">
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full group h-14 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(214,0,75,0.3)] transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري إرسال رابط التعيين...</span>
                    </>
                  ) : (
                    <>
                      <span>إرسال رابط التعيين الآمن</span>
                      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-alexandria font-bold text-xl text-white">تفقد بريدك الإلكتروني!</h3>
                <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                  لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى <span className="text-rose-400 font-bold">{email}</span>. يرجى الضغط عليه للمتابعة.
                </p>
              </div>

              <button
                onClick={() => setIsSent(false)}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold transition-all underline"
              >
                إعادة المحاولة ببريد إلكتروني آخر
              </button>
            </motion.div>
          )}

          {/* Card Footer Options */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center flex justify-between items-center gap-4">
            <Link href="/login" className="text-zinc-500 hover:text-white text-xs sm:text-sm font-medium transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4 rotate-180" />
              <span>العودة لتسجيل الدخول</span>
            </Link>
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
          <span>حماية وتشفير SSL آمن لطلب إعادة التعيين</span>
        </div>
      </div>
    </div>
  );
}
