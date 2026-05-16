"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Lock, Loader2, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        toast.success("تم تسجيل الدخول بنجاح");
        router.push("/admin");
        router.refresh();
      } else {
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }
    } catch (error) {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #080810 0%, #0f0f1a 45%, #130810 100%)" }}
    >
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(214,0,75,0.13) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-0 right-0 w-[350px] h-[350px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(214,0,75,0.07) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(90,0,180,0.07) 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-cairo text-sm transition-colors duration-200 mb-10 group"
          style={{ color: "#71717a" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={e => (e.currentTarget.style.color = "#71717a")}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
          العودة للمتجر الرئيسي
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 16 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: "linear-gradient(135deg, #D6004B 0%, #ff2d6b 100%)",
              boxShadow: "0 20px 60px rgba(214,0,75,0.4), 0 0 0 1px rgba(214,0,75,0.25)",
            }}
          >
            <Fingerprint className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-4xl font-alexandria font-black tracking-tighter mb-2" style={{ color: "#ffffff" }}>
            بوابة الإدارة
          </h1>
          <p className="font-cairo text-base" style={{ color: "#71717a" }}>
            نظام وصول محمي بتقنيات التشفير المتقدمة
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="rounded-3xl p-8"
          style={{
            background: "rgba(16, 16, 26, 0.88)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(214,0,75,0.07)",
          }}
        >
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-2">
              <label className="block font-cairo text-sm font-semibold" style={{ color: "#d4d4d8" }}>
                البريد الإلكتروني للإدارة
              </label>
              <div className="relative">
                <Mail
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors duration-200"
                  style={{ color: "#52525b" }}
                />
                <Input
                  type="email"
                  placeholder="admin@youssefautomates.com"
                  dir="ltr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="h-14 pr-12 font-cairo text-sm rounded-xl transition-all duration-200 outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{
                    background: "rgba(255,255,255,0.045)",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    color: "#f4f4f5",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = "1.5px solid #D6004B";
                    e.currentTarget.style.background = "rgba(214,0,75,0.07)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.045)";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block font-cairo text-sm font-semibold" style={{ color: "#d4d4d8" }}>
                كلمة المرور السرية
              </label>
              <div className="relative">
                <Lock
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none transition-colors duration-200"
                  style={{ color: "#52525b" }}
                />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  dir="ltr"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-14 pr-12 pl-12 font-cairo text-sm rounded-xl transition-all duration-200 outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{
                    background: "rgba(255,255,255,0.045)",
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    color: "#f4f4f5",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = "1.5px solid #D6004B";
                    e.currentTarget.style.background = "rgba(214,0,75,0.07)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.1)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.045)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                  style={{ color: "#52525b" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#52525b")}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full h-14 mt-2 rounded-xl font-alexandria font-black text-lg text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #D6004B 0%, #ff2d6b 100%)",
                boxShadow: "0 8px 32px rgba(214,0,75,0.38)",
              }}
              onMouseEnter={e => {
                if (!isLoading && (email || password))
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 14px 44px rgba(214,0,75,0.55)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(214,0,75,0.38)";
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري التحقق من الهوية...
                </span>
              ) : (
                "تسجيل الدخول الآمن"
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div
            className="mt-6 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-cairo text-xs"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#52525b",
            }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: "#22c55e" }} />
            نظام وصول مشفر ومراقب على مدار الساعة
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
