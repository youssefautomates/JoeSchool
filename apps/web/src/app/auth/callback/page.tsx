"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient, syncSessionToCookie } from "@/lib/supabaseClient";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/dashboard";
      
      try {
        // 1. If code parameter is present (PKCE Flow), exchange it for a session
        if (code) {
          const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (error) throw error;
          
          if (data?.session) {
            syncSessionToCookie(data.session);
            toast.success(next.includes("reset-password") ? "تم تأكيد هويتك بنجاح! يمكنك الآن تعيين كلمة مرور جديدة." : "تم تأكيد حسابك بنجاح! مرحباً بك.");
            router.push(next);
            router.refresh();
            return;
          }
        }
        
        // 2. Check if a session is already present (e.g. Implicit grant flow hash is parsed)
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          syncSessionToCookie(session);
          toast.success("تم استعادة الجلسة بأمان! مرحباً بك.");
          router.push(next);
          router.refresh();
          return;
        }

        // 3. Fallback: Wait briefly to allow implicit detectSessionInUrl to finish parsing
        const timer = setTimeout(async () => {
          const { data: { session: delayedSession } } = await supabaseClient.auth.getSession();
          if (delayedSession) {
            syncSessionToCookie(delayedSession);
            toast.success(next.includes("reset-password") ? "تم تأكيد الهوية وتأمين الدخول!" : "تم تأكيد البريد وتأمين الدخول!");
            router.push(next);
            router.refresh();
          } else {
            // If no session after delay, redirect to login page
            toast.error("انتهت صلاحية رابط التفعيل أو تم استخدامه مسبقاً.");
            router.push("/login");
          }
        }, 2000);

        return () => clearTimeout(timer);
      } catch (err: any) {
        console.error("Auth callback handler failed:", err);
        toast.error(err.message || "فشل التحقق من رابط التفعيل. يرجى إعادة المحاولة.");
        router.push("/login");
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo flex items-center justify-center relative overflow-hidden px-4">
      {/* Background Grids & Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-grid-lines mask-radial-faded opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-rose-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      <div className="w-full max-w-md relative z-10 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-4 rounded-3xl bg-[#0a0a0f]/80 border border-white/5 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle edge glow */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent" />
          
          <div className="p-6 flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 shadow-[0_0_30px_rgba(214,0,75,0.2)]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h1 className="font-alexandria font-bold text-xl text-white">تأمين الجلسة وتفعيل الحساب...</h1>
              <p className="text-zinc-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                جاري تأكيد بريدك الإلكتروني والتحقق من تشفير البيانات للوصول إلى لوحة التحكم الخاصة بك.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 select-none">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>اتصال آمن ومحمي بالكامل SSL</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-cairo text-white">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
