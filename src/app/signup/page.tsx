"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, User, Loader2, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { trackCompleteRegistration, trackMetaEvent } from "@/lib/metaPixel";

const COUNTRY_CODES = [
  { code: "+20", name: "مصر (Egypt)", flag: "🇪🇬" },
  { code: "+966", name: "السعودية (Saudi Arabia)", flag: "🇸🇦" },
  { code: "+971", name: "الإمارات (UAE)", flag: "🇦🇪" },
  { code: "+965", name: "الكويت (Kuwait)", flag: "🇰🇼" },
  { code: "+974", name: "قطر (Qatar)", flag: "🇶🇦" },
  { code: "+968", name: "عمان (Oman)", flag: "🇴🇲" },
  { code: "+973", name: "البحرين (Bahrain)", flag: "🇧🇭" },
  { code: "+962", name: "الأردن (Jordan)", flag: "🇯🇴" },
  { code: "+964", name: "العراق (Iraq)", flag: "🇮🇶" },
  { code: "+212", name: "المغرب (Morocco)", flag: "🇲🇦" },
  { code: "+213", name: "الجزائر (Algeria)", flag: "🇩🇿" },
  { code: "+216", name: "تونس (Tunisia)", flag: "🇹🇳" },
  { code: "+218", name: "ليبيا (Libya)", flag: "🇱🇾" },
  { code: "+249", name: "السودان (Sudan)", flag: "🇸🇩" },
  { code: "+963", name: "سوريا (Syria)", flag: "🇸🇾" },
  { code: "+961", name: "لبنان (Lebanon)", flag: "🇱🇧" },
  { code: "+970", name: "فلسطين (Palestine)", flag: "🇵🇸" },
  { code: "+967", name: "اليمن (Yemen)", flag: "🇾🇪" },
];

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+20");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user is already logged in, redirect them immediately to dashboard
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
  }, [router]);

  // Auto-detect visitor country calling code
  useEffect(() => {
    async function detectCountryCode() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data && data.country_calling_code) {
          let prefix = data.country_calling_code;
          if (!prefix.startsWith("+")) prefix = "+" + prefix;
          setCountryCode(prefix);
        }
      } catch (err) {
        console.error("Failed to auto-detect country calling code:", err);
      }
    }
    detectCountryCode();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول المطلوبة بما في ذلك رقم الهاتف");
      return;
    }

    if (password.length < 6) {
      toast.error("يجب أن تتكون كلمة المرور من 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: fullPhone,
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);
        toast.error(error.message || "حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.");
      } else {
        trackCompleteRegistration();
        toast.success("تم إنشاء حسابك وتفعيله بنجاح! مرحباً بك.");
        if (data?.session) {
          router.push("/dashboard");
        } else {
          router.push("/login");
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
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex items-center justify-center relative overflow-hidden px-4 py-8">
      {/* Background Grids & Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-rose-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo and Brand Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
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
            <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white mb-2">إنشاء حساب طالب جديد</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">انضم إلينا اليوم! ابدأ بالتعلم والتحميل الفوري لمنتجات وأصول صناعة المحتوى بالذكاء الاصطناعي التوليدي.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 block pr-1">الاسم الكامل</label>
              <div className="relative group">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="text"
                  placeholder="محمد أحمد"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-zinc-600"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
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

            {/* WhatsApp Phone Number Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 block pr-1">رقم الهاتف (الواتساب) <span className="text-rose-500">*</span></label>
              <div className="flex gap-2 relative group" dir="ltr">
                {/* Country Code Select Dropdown */}
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 px-3 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white max-w-[110px] appearance-none cursor-pointer text-center select-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#0a0a0f] text-white">
                      {c.flag} {c.code}
                    </option>
                  ))}
                  {!COUNTRY_CODES.some(c => c.code === countryCode) && (
                    <option value={countryCode} className="bg-[#0a0a0f] text-white">
                      🌐 {countryCode}
                    </option>
                  )}
                </select>

                {/* Actual Phone Input */}
                <div className="relative flex-1 group">
                  <input
                    type="tel"
                    placeholder="100000000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-4 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-zinc-600 tracking-wider text-left"
                    dir="ltr"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 block pr-1">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
                <input
                  type="password"
                  placeholder="•••••••• (6 أحرف كحد أدنى)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-medium focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-white placeholder-zinc-600"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 block pr-1">تأكيد كلمة المرور</label>
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
              onClick={() => trackMetaEvent("Lead", { content_name: "signup_button_click" })}
              className="w-full group h-14 bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-2xl font-bold text-base shadow-[0_10px_30px_rgba(214,0,75,0.3)] transition-all hover:-translate-y-0.5 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
              ) : (
                <>
                  <span>إنشاء الحساب والانضمام</span>
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Card Footer Options */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-zinc-500 text-xs sm:text-sm">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-rose-400 hover:text-rose-300 font-bold transition-colors">
                تسجيل الدخول
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
