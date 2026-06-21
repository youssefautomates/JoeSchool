"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Package,
  Copy,
  ExternalLink,
  BookOpen,
  Send,
  Calendar,
  CreditCard,
  User,
  LayoutDashboard,
  RefreshCw,
  FileText,
  Clock,
  ChevronLeft,
  FileArchive,
  Info
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { trackPurchase, trackLead } from "@/lib/metaPixel";
import { trackEvent } from "@/lib/analytics";
import { supabaseClient } from "@/lib/supabaseClient";

function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(16,185,129,0.4), transparent)`,
      }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: -600, opacity: [0, 0.8, 0] }}
      transition={{
        duration: 4 + Math.random() * 3,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  delay: i * 0.18,
  x: 5 + (i / 13) * 90,
  size: 4 + Math.random() * 6,
}));

interface ProductInfo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  isCourse: boolean;
  hasDownload: boolean;
  downloadUrl: string | null;
  orderId: string;
  slug?: string;
  image_url?: string;
  lessons_count?: number;
  duration_hours?: number;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  remainingDownloads?: string;
  firstLessonSlug?: string | null;
}

interface OrderData {
  id: string;
  productTitle: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  downloadUrl: string | null;
  downloadToken: string | null;
  transactionId: string;
  alreadyDelivered?: boolean;
  category?: string | null;
  tags?: string[] | null;
  products?: ProductInfo[];
  original_amount_usd?: number | null;
  charged_amount_egp?: number | null;
  exchange_rate?: number | null;
  loginLink?: string | null;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Dual-lookup: support either direct Supabase order_id OR Paymob order param
  const orderIdParam = searchParams.get("order_id");
  const paymobOrderParam = searchParams.get("paymob_order_id") || searchParams.get("order");
  const orderId = orderIdParam || paymobOrderParam;
  
  const { clearCart } = useCart();

  const [phase, setPhase] = useState<"loading" | "success" | "error">("loading");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setIsLoggedIn(true);
      }
    });
  }, []);

  function getModifiedLoginLink(baseLink: string | null | undefined, targetPath: string): string {
    if (isLoggedIn) return targetPath;
    if (!baseLink) return targetPath;
    try {
      const url = new URL(baseLink);
      url.searchParams.set("redirect_to", `${window.location.origin}${targetPath}`);
      return url.toString();
    } catch (e) {
      console.error("Error modifying login link:", e);
      return targetPath;
    }
  }

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, targetPath: string) => {
    if (isLoggedIn) {
      e.preventDefault();
      router.push(targetPath);
    }
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!orderId) {
      console.warn("[REDIRECT] No order identifier found in query parameters. Redirecting to home.");
      router.replace("/");
      return;
    }

    verifyAndDeliver(orderId);
  }, [orderId, router]);

  async function verifyAndDeliver(id: string) {
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[VERIFY] Attempt ${attempt}/${maxAttempts} for Order ID: ${id}`);
        const res = await fetch("/api/paymob/verify-and-deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id, paymobOrderId: paymobOrderParam }),
        });
        const data = await res.json();

        if (data.success) {
          setOrderData({
            id,
            productTitle: data.productTitle || "منتجك الرقمي",
            customerName: data.customerName || "عميلنا العزيز",
            customerEmail: data.customerEmail || "",
            amount: parseFloat(data.orderValue || "0"),
            currency: data.currency || "EGP",
            downloadUrl: data.downloadUrl || null,
            downloadToken: data.downloadToken || null,
            transactionId: data.transactionId || id,
            alreadyDelivered: data.alreadyDelivered,
            category: data.category || null,
            tags: data.tags || null,
            products: data.products || [],
            original_amount_usd: data.original_amount_usd,
            charged_amount_egp: data.charged_amount_egp,
            exchange_rate: data.exchange_rate,
            loginLink: data.loginLink || null
          });
          setPhase("success");
          setTimeout(() => setShowParticles(true), 300);
          
if (!data.alreadyDelivered) {
             clearCart();
             toast.success("تم تأكيد دفعك بنجاح! شكراً لثقتك بنا.");
           }

           // Facebook and TikTok purchase triggers
           if (typeof window !== "undefined") {
             const sessionStorageKey = `purchase_tracked_${id}`;
             const hasTracked = sessionStorage.getItem(sessionStorageKey);
             
             if (!hasTracked) {
               sessionStorage.setItem(sessionStorageKey, "true");
               console.log(`[META_TRACKING] Firing client-side Pixel Purchase event for transaction: ${id}`);
               
               const productIds = data.products && data.products.length > 0
                 ? data.products.map((p: any) => String(p.id))
                 : [id];

               // Track purchase in Supabase analytics database
               const primaryProductId = data.products && data.products.length > 1 ? "cart" : (data.products && data.products.length === 1 ? data.products[0].id : id);
               const primaryTitle = data.products && data.products.length > 1 ? "Cart Purchase" : (data.productTitle || "Order");
               trackEvent("purchase", primaryProductId, primaryTitle, {
                 price: parseFloat(data.orderValue || "0"),
                 currency: data.currency || "EGP",
                 orderId: id,
                 transactionId: data.transactionId || id,
                 products: data.products
               });

               // High-Performance Unified Meta Purchase tracking (Pixel + CAPI)
               trackPurchase(
                 id,
                 data.productTitle || "منتجك الرقمي",
                 productIds,
                 Number(data.orderValue) || 0,
                 data.currency || "EGP"
               );

               if ((window as any).ttq) {
                 (window as any).ttq.track("CompletePayment", {
                   value: data.orderValue,
                   currency: data.currency,
                   contents: productIds.map((pid: string) => ({
                     content_id: pid,
                     content_name: data.productTitle || "منتجك الرقمي",
                     quantity: 1
                   })),
                   content_type: "product",
                 });
               }
             } else {
               console.log(`[META_TRACKING] Duplicate visit detected for transaction: ${id}. Client-side Pixel Purchase trigger skipped.`);
             }
           }
           return;
        }

        if (data.status === "pending" && attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }

        setPhase("error");
        return;
      } catch (err) {
        console.error(`[VERIFY_ERROR] Attempt ${attempt} failed:`, err);
        if (attempt >= maxAttempts) setPhase("error");
        else await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  async function handleResendEmail() {
    if (!orderId || resendingEmail) return;
    setResendingEmail(true);
    
    const resolvePromise = new Promise(async (resolve, reject) => {
      try {
        const res = await fetch("/api/paymob/verify-and-deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, forceResend: true }),
        });
        const data = await res.json();
        if (data.success) {
          resolve("success");
        } else {
          reject(new Error(data.error || "Failed to resend"));
        }
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(resolvePromise, {
      loading: "جاري إعادة إرسال البريد الإلكتروني...",
      success: "تم إرسال الملفات والتعليمات لبريدك بنجاح! 🎉",
      error: "فشل إعادة الإرسال. يرجى التواصل مع الدعم الفني.",
    });

    try {
      await resolvePromise;
    } catch {} finally {
      setResendingEmail(false);
    }
  }

  function copyOrderId() {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true);
      toast.success("تم نسخ رقم الطلب بنجاح");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-10 px-6">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-32 h-32 rounded-full border border-emerald-500/20 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border border-emerald-500/30 flex items-center justify-center">
              <motion.div
                className="w-16 h-16 rounded-full border-3 border-emerald-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/10"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/5"
            animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="font-alexandria text-white text-2xl md:text-3xl font-bold mb-3 tracking-tight">
            جاري تأكيد وتفعيل مشترياتك
          </p>
          <p className="font-cairo text-zinc-500 text-base md:text-lg max-w-md mx-auto leading-relaxed">
            نتحقق من دفعتك بأمان ونجهز محتوياتك الرقمية. يرجى عدم إغلاق هذه الصفحة.
          </p>
          <motion.div
            className="mt-8 flex items-center justify-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (phase === "error") {
    router.replace(`/checkout/failed?order_id=${orderId}&reason=verification_timeout`);
    return null;
  }

  // Parse purchased products
  const products = orderData?.products || [];
  const courses = products.filter(p => p.isCourse);
  const digitalProducts = products.filter(p => p.hasDownload);
  
  const hasCourses = courses.length > 0;
  const hasDigital = digitalProducts.length > 0;
  const isHybrid = hasCourses && hasDigital;

  // Format purchase date dynamically
  const purchaseDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-cairo">
      {/* Decorative Blur Spheres */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-sky-500/5 blur-[120px]" />
      </div>

      {/* Grid Pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <AnimatePresence>
        {showParticles && PARTICLES.map((p) => (
          <FloatingParticle key={p.id} delay={p.delay} x={p.x} size={p.size} />
        ))}
      </AnimatePresence>

      {/* Brand Header */}
      <div className="relative z-10 py-6 px-6 flex justify-start">
        <a href="/" className="group inline-flex items-center gap-3">
          <img src="/logo-text.png" alt="JoeSchool Logo" className="h-10 object-contain group-hover:scale-105 transition-transform duration-300" />
          <div className="flex flex-col text-right justify-center border-r border-white/10 pr-3 h-8">
            <span className="font-cairo text-[10px] text-zinc-500 font-bold tracking-wider uppercase leading-none">Premium Store</span>
          </div>
        </a>
      </div>

      <main className="relative z-10 pb-24 pt-4">
        <div className="container mx-auto px-4 max-w-3xl">
          
          {/* Animated Success Badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full border border-emerald-500/30"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border border-emerald-500/15"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
              />
              <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.35),0_20px_40px_rgba(16,185,129,0.2)] rotate-3 relative">
                <CheckCircle2 className="w-14 h-14 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
              </div>
            </div>
          </motion.div>

          {/* Dynamic Header Block based on Purchase Type */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              تم التحقق والتفعيل الفوري
            </motion.div>

            {isHybrid ? (
              <h1 className="font-alexandria font-black text-3xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.15] mb-4">
                تهانينا! تم تفعيل وتوصيل<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                  طلبك المتكامل بنجاح ⚡
                </span>
              </h1>
            ) : hasCourses ? (
              <h1 className="font-alexandria font-black text-3xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.15] mb-4">
                تهانينا! تم تفعيل اشتراكك<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400">
                  بالدورة التدريبية 🎓
                </span>
              </h1>
            ) : (
              <h1 className="font-alexandria font-black text-3xl md:text-5xl lg:text-6xl text-white tracking-tight leading-[1.15] mb-4">
                تهانينا! ملفاتك الرقمية<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                  جاهزة للتحميل الفوري ⬇️
                </span>
              </h1>
            )}

            <p className="font-cairo text-zinc-400 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
              أهلاً <span className="font-alexandria font-bold text-white">{orderData?.customerName}</span>، شكراً لثقتك بنا. تم تسجيل طلبك وتجهيز كافة المحتويات الرقمية الخاصة بك.
            </p>
          </motion.div>

          {/* Main Context Layout */}
          <div className="space-y-6">

            {/* 1. SCENARIO A: DIGITAL PRODUCT ONLY */}
            {hasDigital && !hasCourses && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-5"
              >
                {digitalProducts.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-gradient-to-br from-[#0b0b12] to-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_8px_24px_rgba(16,185,129,0.15)]">
                          <FileArchive className="w-8 h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                            ملف رقمي أصلي
                          </span>
                          <h3 className="text-xl font-alexandria font-black text-white leading-snug">{p.title}</h3>
                          
                          {/* File Details Grid */}
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 text-sm text-zinc-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <span className="text-zinc-500">نوع الملف:</span>
                              <span className="text-white font-bold">{p.fileType}</span>
                            </span>
                            <span className="text-white/10">•</span>
                            <span className="flex items-center gap-1.5">
                              <span className="text-zinc-500">حجم الملف:</span>
                              <span className="text-white font-bold">{p.fileSize}</span>
                            </span>
                            <span className="text-white/10">•</span>
                            <span className="flex items-center gap-1.5 text-emerald-400/90">
                              <span className="text-zinc-500">التحميل المتبقي:</span>
                              <span className="font-bold text-white">{p.remainingDownloads}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Secure Download CTA */}
                      <a
                        href={p.downloadUrl || "#"}
                        className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-alexandria font-black rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_30px_rgba(16,185,129,0.35)] active:scale-98 cursor-pointer shrink-0 group"
                      >
                        <Download className="w-5 h-5 group-hover:animate-bounce transition-transform" />
                        <span>تحميل الملف الآن</span>
                      </a>
                    </div>
                  </div>
                ))}

                {/* Database Save Confirmation Block */}
                <div className="bg-gradient-to-r from-emerald-950/30 to-teal-950/20 border border-emerald-900/40 rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-alexandria font-bold text-emerald-400 text-base">تم الحفظ تلقائياً في حسابك</h4>
                    <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                      لقد قمنا بحفظ هذا المنتج وتراخيص التحميل الخاصة به تلقائياً داخل حساب العميل المربوط ببريدك الإلكتروني. 
                      يمكنك إعادة تحميل الملفات وتوليد روابط أمنة جديدة في أي وقت لاحقاً من خلال قسم **"ملفاتي الرقمية"** داخل لوحة التحكم.
                    </p>
                    <a
                      href={getModifiedLoginLink(orderData?.loginLink, "/dashboard")}
                      onClick={(e) => handleNavigation(e, "/dashboard")}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <span>الانتقال إلى لوحة التحميلات الرقمية</span>
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. SCENARIO B: COURSE ONLY */}
            {hasCourses && !hasDigital && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-5"
              >
                {courses.map((c) => (
                  <div 
                    key={c.id}
                    className="bg-gradient-to-br from-[#0b0b12] to-[#0a0a0f] border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-rose-500/30 transition-all duration-300"
                  >
                    <div className="relative h-56 bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-white/5">
                      <img 
                        src={c.image_url} 
                        alt={c.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b12]/95 via-transparent to-transparent" />
                      <div className="absolute w-40 h-40 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="absolute bottom-5 right-5 z-10 flex flex-wrap items-center gap-2">
                        <span className="bg-black/70 border border-white/10 text-white text-[10px] px-3 py-1 rounded-md font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                          <span>{c.lessons_count} درس تدريبي</span>
                        </span>
                        <span className="bg-black/70 border border-white/10 text-white text-[10px] px-3 py-1 rounded-md font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-400" />
                          <span>{c.duration_hours} ساعة متابعة</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                      <div className="space-y-2">
                        <span className="text-[10px] bg-rose-600/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                          دورة تعليمية معتمدة
                        </span>
                        <h3 className="text-2xl font-alexandria font-black text-white leading-tight">{c.title}</h3>
                        <p className="text-zinc-400 text-base leading-relaxed">
                          تم قيد حسابك الدراسي بنجاح في الدورة. المنهج التعليمي، الاختبارات، والشهادة المعتمدة أصبحت جاهزة لك بالكامل.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        {(() => {
                          const startLearningPath = c.firstLessonSlug 
                            ? `/learn/${c.slug}/${c.firstLessonSlug}` 
                            : `/courses/${c.slug}`;
                          return (
                            <>
                              <a
                                href={getModifiedLoginLink(orderData?.loginLink, startLearningPath)}
                                onClick={(e) => handleNavigation(e, startLearningPath)}
                                className="flex-1 h-14 bg-gradient-to-r from-[#D6004B] to-orange-500 hover:from-[#b0003d] hover:to-orange-600 text-white font-alexandria font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(214,0,75,0.35)] transition-all active:scale-98 text-center group"
                              >
                                <span className="group-hover:animate-bounce">🚀</span>
                                <span>ابدأ التعلم الآن</span>
                              </a>
                              
                              <a
                                href={getModifiedLoginLink(orderData?.loginLink, "/dashboard")}
                                onClick={(e) => handleNavigation(e, "/dashboard")}
                                className="h-14 px-6 bg-white/5 hover:bg-white/10 text-white font-alexandria font-bold text-base rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-colors text-center"
                              >
                                <LayoutDashboard className="w-5 h-5 text-zinc-400" />
                                <span>لوحة الطلاب</span>
                              </a>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Course Enrollment Save Confirmation Block */}
                <div className="bg-gradient-to-r from-rose-950/30 to-orange-950/20 border border-rose-900/40 rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="font-alexandria font-bold text-rose-400 text-base">تم تسجيل دورتك تلقائياً</h4>
                    <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                      تم ربط وتسجيل هذه الدورة بحساب الطالب الموحد الخاص بك. يمكنك الوصول المباشر لكافة أقسامك، ومتابعة تقدم الدراسة، وحفظ تقدم مشاهدة المحاضرات، 
                      وطباعة فواتير الشراء، بالإضافة لتوثيق وتحميل شهادتك فور الوصول لنسبة إنجاز 100%.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. SCENARIO C: HYBRID (MIXED CART) */}
            {isHybrid && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                
                {/* Digital Downloads Section inside Hybrid */}
                <div className="space-y-4">
                  <h3 className="font-alexandria font-bold text-emerald-400 text-lg flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <span>تحميل ملفاتك الرقمية</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {digitalProducts.map((p) => (
                      <div 
                        key={p.id}
                        className="bg-[#0b0b12] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/30 hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <FileArchive className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-alexandria font-bold text-white text-base leading-snug">{p.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium mt-1">
                              <span>نوع الملف: <strong className="text-white">{p.fileType}</strong></span>
                              <span>•</span>
                              <span>الحجم: <strong className="text-white">{p.fileSize}</strong></span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={p.downloadUrl || "#"}
                          className="h-12 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-alexandria font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
                        >
                          <Download className="w-4 h-4" />
                          <span>تحميل الملف</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Courses Section inside Hybrid */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-alexandria font-bold text-rose-400 text-lg flex items-center gap-2.5 border-b border-white/5 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span>الدورات التعليمية المسجلة</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {courses.map((c) => (
                      <div 
                        key={c.id}
                        className="bg-[#0b0b12] border border-white/5 rounded-2.5xl overflow-hidden flex flex-col sm:flex-row hover:border-rose-500/30 hover:shadow-[0_4px_20px_rgba(214,0,75,0.1)] transition-all duration-300"
                      >
                        <div className="w-full sm:w-44 h-32 bg-zinc-900 shrink-0 relative">
                          <img src={c.image_url} alt={c.title} className="absolute inset-0 w-full h-full object-cover opacity-55" />
                          <div className="absolute inset-0 bg-gradient-to-l from-[#0b0b12] to-transparent" />
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div>
                            <h4 className="font-alexandria font-bold text-white text-base leading-snug">{c.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2 font-medium">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                                <span>{c.lessons_count} درس تدريبي</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-orange-400" />
                                <span>{c.duration_hours} ساعة متابعة</span>
                              </span>
                            </div>
                          </div>

                          {(() => {
                            const startLearningPath = c.firstLessonSlug 
                              ? `/learn/${c.slug}/${c.firstLessonSlug}` 
                              : `/courses/${c.slug}`;
                            return (
                              <a
                                href={getModifiedLoginLink(orderData?.loginLink, startLearningPath)}
                                onClick={(e) => handleNavigation(e, startLearningPath)}
                                className="h-11 bg-white/5 border border-white/10 hover:bg-gradient-to-r hover:from-rose-600 hover:to-orange-500 hover:border-none text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 text-center"
                              >
                                <span>ابدأ مشاهدة المنهج الآن</span>
                                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hybrid Overview Dashboard Link */}
                <div className="bg-gradient-to-r from-sky-950/30 to-emerald-950/20 border border-sky-900/40 rounded-3xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h4 className="font-alexandria font-bold text-sky-400 text-base">إدارة متكاملة لمشترياتك</h4>
                    <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                      لقد اشتريت حزمة متكاملة تجمع بين التدريب المعتمد والملفات الجاهزة! تم تسجيل كافة المنتجات في حسابك الدراسي الموحد. 
                      يمكنك التحكم بملفاتك الرقمية والوصول المباشر للمحاضرات في أي وقت عبر الانتقال إلى لوحة التحكم الرئيسية الخاصة بك.
                    </p>
                    <a
                      href={getModifiedLoginLink(orderData?.loginLink, "/dashboard")}
                      onClick={(e) => handleNavigation(e, "/dashboard")}
                      className="mt-4 h-12 px-6 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-alexandria font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2 shadow-lg shadow-sky-600/10 active:scale-98 transition-all text-center"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>الانتقال للوحة التحكم الشاملة</span>
                    </a>
                  </div>
                </div>

              </motion.div>
            )}

            {/* 4. PREMIUM ORDER METADATA SUMMARY & EMAIL RESENDER (Rendered in all scenarios for completeness) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-white/[0.02] to-white/[0.01] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm font-medium text-zinc-500 border-b border-white/5 pb-6">
                
                {/* Meta details list */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-zinc-600 text-xs block mb-0.5">اسم العميل</span>
                      <span className="text-white font-bold">{orderData?.customerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-zinc-600 text-xs block mb-0.5">البريد الإلكتروني</span>
                      <span className="text-white font-mono text-sm">{orderData?.customerEmail}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-zinc-600 text-xs block mb-0.5">تاريخ المعاملة</span>
                      <span className="text-white font-bold">{purchaseDate}</span>
                    </div>
                  </div>
                </div>

                {/* Status & Pricing list */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-zinc-600 text-xs block mb-0.5">بوابة الدفع</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        دفع معتمد آمن (Paymob)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-zinc-600 text-xs block mb-0.5">رقم العملية المعتمد</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-mono text-sm truncate max-w-[160px]" dir="ltr">#{orderId}</span>
                        <button onClick={copyOrderId} className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5 active:scale-95" title="نسخ المرجع">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-zinc-400">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <span className="text-zinc-600 text-xs block mb-1">المبلغ الإجمالي المدفوع</span>
                      {orderData?.currency === "USD" || (orderData?.original_amount_usd && orderData.original_amount_usd > 0) ? (
                        <div className="space-y-1">
                          <span className="text-emerald-400 font-alexandria font-black text-lg block" dir="ltr">
                            ${Number(orderData.original_amount_usd).toFixed(2)} <span className="text-[10px] font-cairo font-normal text-zinc-500">USD</span>
                          </span>
                          <span className="text-zinc-400 font-alexandria font-medium text-xs block" dir="ltr">
                            ({Number(orderData.charged_amount_egp).toFixed(2)} ج.م)
                          </span>
                          {orderData.exchange_rate && (
                            <span className="text-[10px] text-zinc-500 block">
                              سعر الصرف المثبت: 1 USD = {Number(orderData.exchange_rate).toFixed(4)} ج.م
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-alexandria font-black text-lg block" dir="ltr">
                          {Number(orderData?.charged_amount_egp || orderData?.amount || 0).toFixed(2)} <span className="text-[10px] font-cairo font-normal text-zinc-500">ج.م</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Email Delivery Control Block */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-alexandria font-bold text-white text-base leading-snug">وصلتك رسالة التسليم الفنية!</h4>
                    <p className="font-cairo text-zinc-500 text-sm leading-relaxed mt-1">
                      قمنا بإرسال فواتير الشراء المستقلة وتراخيص المنتجات إلى بريدك الإلكتروني. تفقد صندوق الوارد أو البريد المزعج (Spam).
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="w-full sm:w-auto h-12 px-6 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white font-alexandria font-bold text-xs rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 select-none cursor-pointer shrink-0"
                >
                  {resendingEmail ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>إعادة إرسال الفاتورة والبريد</span>
                </button>
              </div>

            </motion.div>

          </div>

          {/* Secure Badging Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 my-8 py-6 border-y border-white/5"
          >
            {[
              { icon: ShieldCheck, label: "حماية مشفرة 256-bit SSL" },
              { icon: Sparkles, label: "توصيل فوري وتفعيل مباشر" },
              { icon: Package, label: "تراخيص وتحميل مدى الحياة" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-zinc-500 font-cairo text-xs hover:text-zinc-400 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/[0.08] flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </motion.div>

          {/* Footer Back Action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <a
              href="/"
              className="inline-flex items-center gap-2 font-cairo text-zinc-500 hover:text-white transition-colors text-base group"
            >
              <span>العودة إلى المتجر الرئيسي</span>
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </a>
          </motion.div>

        </div>
      </main>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
          <div className="flex flex-col items-center gap-8">
            <motion.div
              className="w-20 h-20 rounded-full border-2 border-emerald-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <div className="text-center">
              <p className="font-alexandria text-white text-lg font-bold mb-2">جاري تحميل صفحة التفعيل...</p>
              <p className="font-cairo text-zinc-500 text-sm px-4">سيتم توجيهك إلى نتيجة الدفع في لحظات</p>
            </div>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
