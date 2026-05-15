"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Lock, Loader2, ShieldAlert, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, Fingerprint } from "lucide-react";
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white font-cairo transition-all mb-12 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
          العودة للمتجر الرئيسي
        </Link>
        
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-br from-rose-600 to-pink-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-rose-500/20"
          >
            <Fingerprint className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-alexandria font-black text-white mb-3 tracking-tighter">بوابة الإدارة</h1>
          <p className="text-zinc-500 font-cairo text-lg">نظام وصول محمي بتقنيات التشفير المتقدمة</p>
        </div>

        <Card className="glass-card border-white/5 bg-white/5 p-8 md:p-10 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="font-alexandria font-bold text-zinc-400 text-sm">البريد الإلكتروني للإدارة</Label>
                <div className="relative group">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
                  <Input 
                    type="email" 
                    placeholder="admin@youssefautomates.com" 
                    className="bg-white/5 border-white/10 text-white font-cairo h-16 pr-12 focus:border-rose-500 transition-all rounded-2xl placeholder:text-zinc-700"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-alexandria font-bold text-zinc-400 text-sm">كلمة المرور السرية</Label>
                <div className="relative group">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••••••" 
                    className="bg-white/5 border-white/10 text-white font-cairo h-16 pr-12 pl-12 focus:border-rose-500 transition-all rounded-2xl placeholder:text-zinc-700"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-16 bg-rose-600 hover:bg-rose-500 text-white font-alexandria font-black text-xl rounded-2xl shadow-2xl shadow-rose-500/10 transition-all active:scale-95" 
              disabled={isLoading || !email || !password}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري التحقق من الهوية...
                </div>
              ) : (
                "تسجيل الدخول الآمن"
              )}
            </Button>
          </form>

          <div className="mt-10 flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl border border-white/5 text-zinc-500 font-cairo text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            نظام وصول مشفر ومراقب على مدار الساعة
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={className}>{children}</label>;
}

