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
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { trackPurchase, trackLead } from "@/lib/metaPixel";

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
  const hasRun = useRef(false);

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
            exchange_rate: data.exchange_rate
          });
          setPhase("success");
          setTimeout(() => setShowParticles(true), 300);
          
          if (!data.alreadyDelivered) {
             clearCart();
             toast.success("تم تأكيد دفعك بنجاح! شكراً لثقتك بنا.");
          }

          // Facebook and TikTok purchase triggers
          if (!data.alreadyDelivered && typeof window !== "undefined") {
            // High-Performance Unified Meta Purchase tracking (Pixel + CAPI)
            trackPurchase(
              id,
              data.productTitle || "منتجك الرقمي",
              [id],
              Number(data.orderValue) || 0,
              data.currency || "EGP"
            );
            if ((window as any).ttq) {
              (window as any).ttq.track("CompletePayment", {
                value: data.orderValue,
                currency: data.currency,
                contents: [{ content_id: id, content_name: data.productTitle, quantity: 1 }],
                content_type: "product",
              });
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
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-8">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-28 h-28 rounded-full border border-rose-500/20 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-rose-500/40 flex items-center justify-center">
              <motion.div
                className="w-14 h-14 rounded-full border-2 border-emerald-500 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/10"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          className="text-center animate-pulse"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-alexandria text-white text-xl font-bold mb-2">
            جاري تأكيد وتفعيل مشترياتك بأمان...
          </p>
          <p className="font-cairo text-zinc-500 text-sm">
            يرجى الانتظار، لا تغلق هذه الصفحة
          </p>
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
      <div className="relative z-10 py-6 px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="JoeSchool"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-alexandria font-bold text-lg tracking-tight text-white leading-tight" dir="ltr">
              Joe <span className="text-rose-500">School</span>
            </span>
            <span className="font-cairo text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Premium Store</span>
          </div>
        </Link>
      </div>

      <main className="relative z-10 pb-24 pt-4">
        <div className="container mx-auto px-4 max-w-3xl">
          
          {/* Animated Success Badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 250, damping: 18, delay: 0.1 }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full border border-emerald-500/20"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
              <div className="w-24 h-24 rounded-[1.8rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.25)] rotate-3">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Dynamic Header Block based on Purchase Type */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              تم التحقق والتفعيل الفوري
            </motion.div>

            {isHybrid ? (
              <h1 className="font-alexandria font-black text-3xl md:text-5xl text-white tracking-tight leading-tight mb-3">
                تهانينا! تم تفعيل وتوصيل<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                  طلبك المختلط بنجاح ⚡
                </span>
              </h1>
            ) : hasCourses ? (
              <h1 className="font-alexandria font-black text-3xl md:text-5xl text-white tracking-tight leading-tight mb-3">
                تهانينا! تم تفعيل اشتراكك<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400">
                  بالدورة التدريبية 🎓
                </span>
              </h1>
            ) : (
              <h1 className="font-alexandria font-black text-3xl md:text-5xl text-white tracking-tight leading-tight mb-3">
                تهانينا! ملفاتك الرقمية<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                  جاهزة للتحميل الفوري ⬇️
                </span>
              </h1>
            )}

            <p className="font-cairo text-zinc-400 text-base md:text-lg leading-relaxed max-w-lg mx-auto">
              أهلاً **{orderData?.customerName}**، شكراً لثقتك بنا. تم تسجيل طلبك وتجهيز كافة المحتويات الرقمية الخاصة بك.
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
                className="space-y-4"
              >
                {digitalProducts.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-[#0b0b12] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <FileArchive className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            ملف رقمي أصلي
                          </span>
                          <h3 className="text-lg font-alexandria font-bold text-white leading-snug">{p.title}</h3>
                          
                          {/* File Details Grid */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-zinc-500 font-medium">
                            <span className="flex items-center gap-1">
                              <span className="text-zinc-400">نوع الملف:</span>
                              <span className="text-white font-bold">{p.fileType}</span>
                            </span>
                            <span className="text-white/10">•</span>
                            <span className="flex items-center gap-1">
                              <span className="text-zinc-400">حجم الملف:</span>
                              <span className="text-white font-bold">{p.fileSize}</span>
                            </span>
                            <span className="text-white/10">•</span>
                            <span className="flex items-center gap-1 text-emerald-400/80">
                              <span className="text-zinc-400">التحميل المتبقي:</span>
                              <span>{p.remainingDownloads}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Direct Secure Download CTA */}
                      <a
                        href={p.downloadUrl || "#"}
                        className="w-full sm:w-auto h-14 px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-alexandria font-black rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_25px_rgba(16,185,129,0.25)] active:scale-98 cursor-pointer shrink-0"
                      >
                        <Download className="w-5 h-5 animate-bounce" />
                        <span>تحميل الملف الآن</span>
                      </a>
                    </div>
                  </div>
                ))}

                {/* Database Save Confirmation Block */}
                <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2.5xl p-6 flex items-start gap-4">
                  <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-alexandria font-bold text-emerald-400 text-sm">تم الحفظ تلقائياً في حسابك</h4>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      لقد قمنا بحفظ هذا المنتج وتراخيص التحميل الخاصة به تلقائياً داخل حساب العميل المربوط ببريدك الإلكتروني. 
                      يمكنك إعادة تحميل الملفات وتوليد روابط أمنة جديدة في أي وقت لاحقاً من خلال قسم **"ملفاتي الرقمية"** داخل لوحة التحكم.
                    </p>
                    <Link
                      href="/dashboard"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <span>الانتقال إلى لوحة التحميلات الرقمية</span>
                      <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                    </Link>
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
                className="space-y-4"
              >
                {courses.map((c) => (
                  <div 
                    key={c.id}
                    className="bg-[#0b0b12] border border-white/5 rounded-3xl overflow-hidden shadow-2xl hover:border-rose-500/20 transition-all duration-300"
                  >
                    <div className="relative h-48 bg-zinc-900 overflow-hidden flex items-center justify-center border-b border-white/5">
                      <img 
                        src={c.image_url} 
                        alt={c.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b12] to-transparent" />
                      <div className="absolute w-32 h-32 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="absolute bottom-5 right-5 z-10 flex flex-wrap items-center gap-2">
                        <span className="bg-black/60 border border-white/10 text-white text-[10px] px-3 py-1 rounded-md font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                          <span>{c.lessons_count} درس تدريبي</span>
                        </span>
                        <span className="bg-black/60 border border-white/10 text-white text-[10px] px-3 py-1 rounded-md font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-400" />
                          <span>{c.duration_hours} ساعة متابعة</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-6">
                      <div className="space-y-2">
                        <span className="text-[10px] bg-rose-600/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          دورة تعليمية معتمدة
                        </span>
                        <h3 className="text-xl sm:text-2xl font-alexandria font-black text-white leading-tight">{c.title}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                          تم قيد حسابك الدراسي بنجاح في الدورة. المنهج التعليمي، الاختبارات، والشهادة المعتمدة أصبحت جاهزة لك بالكامل.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                          href="/dashboard"
                          className="flex-1 h-14 bg-gradient-to-r from-[#D6004B] to-orange-500 hover:from-[#b0003d] hover:to-orange-600 text-white font-alexandria font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(214,0,75,0.25)] transition-all active:scale-98"
                        >
                          🚀
                          <span>ابدأ التعلم الآن</span>
                        </Link>
                        
                        <Link
                          href="/dashboard"
                          className="h-14 px-6 bg-white/5 hover:bg-white/10 text-white font-alexandria font-bold text-base rounded-2xl flex items-center justify-center gap-2 border border-white/10 transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5 text-zinc-400" />
                          <span>لوحة الطلاب</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Course Enrollment Save Confirmation Block */}
                <div className="bg-rose-950/20 border border-rose-900/30 rounded-2.5xl p-6 flex items-start gap-4">
                  <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-alexandria font-bold text-rose-400 text-sm">تم تسجيل دورتك تلقائياً</h4>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
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
                <div className="space-y-3">
                  <h3 className="font-alexandria font-bold text-emerald-400 text-base flex items-center gap-2 border-b border-white/5 pb-2">
                    <Download className="w-5 h-5" />
                    <span>تحميل ملفاتك الرقمية</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {digitalProducts.map((p) => (
                      <div 
                        key={p.id}
                        className="bg-[#0b0b12] border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/20 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <FileArchive className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-alexandria font-bold text-white text-sm md:text-base leading-snug">{p.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium mt-1">
                              <span>نوع الملف: <strong className="text-white">{p.fileType}</strong></span>
                              <span>•</span>
                              <span>الحجم: <strong className="text-white">{p.fileSize}</strong></span>
                            </div>
                          </div>
                        </div>

                        <a
                          href={p.downloadUrl || "#"}
                          className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-alexandria font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          <span>تحميل الملف</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Courses Section inside Hybrid */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-alexandria font-bold text-rose-400 text-base flex items-center gap-2 border-b border-white/5 pb-2">
                    <BookOpen className="w-5 h-5" />
                    <span>الدورات التعليمية المسجلة</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {courses.map((c) => (
                      <div 
                        key={c.id}
                        className="bg-[#0b0b12] border border-white/5 rounded-2.5xl overflow-hidden flex flex-col sm:flex-row hover:border-rose-500/20 transition-all duration-300"
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

                          <Link
                            href="/dashboard"
                            className="h-11 bg-white/5 border border-white/10 hover:bg-rose-600 hover:border-none text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                          >
                            <span>ابدأ مشاهدة المنهج الآن</span>
                            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hybrid Overview Dashboard Link */}
                <div className="bg-sky-950/20 border border-sky-900/30 rounded-2.5xl p-6 flex items-start gap-4">
                  <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-alexandria font-bold text-sky-400 text-sm">إدارة متكاملة لمشترياتك</h4>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      لقد اشتريت حزمة متكاملة تجمع بين التدريب المعتمد والملفات الجاهزة! تم تسجيل كافة المنتجات في حسابك الدراسي الموحد. 
                      يمكنك التحكم بملفاتك الرقمية والوصول المباشر للمحاضرات في أي وقت عبر الانتقال إلى لوحة التحكم الرئيسية الخاصة بك.
                    </p>
                    <Link
                      href="/dashboard"
                      className="mt-4 h-12 px-6 bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-alexandria font-bold text-xs rounded-xl inline-flex items-center justify-center gap-2 shadow-lg shadow-sky-600/10 active:scale-98 transition-all"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>الانتقال للوحة التحكم الشاملة</span>
                    </Link>
                  </div>
                </div>

              </motion.div>
            )}

            {/* 4. PREMIUM ORDER METADATA SUMMARY & EMAIL RESENDER (Rendered in all scenarios for completeness) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-zinc-500 border-b border-white/5 pb-6">
                
                {/* Meta details list */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <User className="w-4 h-4 text-zinc-600 shrink-0" />
                    <span className="font-medium">اسم المشغل:</span>
                    <span className="text-white font-bold">{orderData?.customerName}</span>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Mail className="w-4 h-4 text-zinc-600 shrink-0" />
                    <span className="font-medium">البريد الإلكتروني:</span>
                    <span className="text-white font-mono text-xs">{orderData?.customerEmail}</span>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Calendar className="w-4 h-4 text-zinc-600 shrink-0" />
                    <span className="font-medium">تاريخ المعاملة:</span>
                    <span className="text-white font-bold">{purchaseDate}</span>
                  </div>
                </div>

                {/* Status & Pricing list */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <CreditCard className="w-4 h-4 text-zinc-600 shrink-0" />
                    <span className="font-medium">بوابة الدفع:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      دفع معتمد آمن (Paymob)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <ShieldCheck className="w-4 h-4 text-zinc-600 shrink-0" />
                    <span className="font-medium">رقم العملية المعتمد:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-mono text-xs truncate max-w-[130px]" dir="ltr">#{orderId}</span>
                      <button onClick={copyOrderId} className="text-zinc-500 hover:text-white transition-colors cursor-pointer" title="نسخ المرجع">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-zinc-400 text-sm">
                    <Sparkles className="w-4 h-4 text-zinc-600 shrink-0 mt-1" />
                    <div className="space-y-1">
                      <span className="font-medium block">المبلغ الإجمالي المدفوع:</span>
                      {orderData?.currency === "USD" || (orderData?.original_amount_usd && orderData.original_amount_usd > 0) ? (
                        <div className="space-y-1">
                          <span className="text-emerald-400 font-alexandria font-black text-base block" dir="ltr">
                            ${Number(orderData.original_amount_usd).toFixed(2)} <span className="text-[10px] font-cairo font-normal text-zinc-500">USD</span>
                          </span>
                          <span className="text-zinc-400 font-alexandria font-medium text-xs block animate-pulse" dir="ltr">
                            ({Number(orderData.charged_amount_egp).toFixed(2)} ج.م)
                          </span>
                          {orderData.exchange_rate && (
                            <span className="text-[10px] text-zinc-500 block">
                              سعر الصرف المثبت: 1 USD = {Number(orderData.exchange_rate).toFixed(4)} ج.م
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-alexandria font-black text-base block" dir="ltr">
                          {Number(orderData?.charged_amount_egp || orderData?.amount || 0).toFixed(2)} <span className="text-[10px] font-cairo font-normal text-zinc-500">ج.م</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Email Delivery Control Block */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <h4 className="font-alexandria font-bold text-white text-sm leading-snug">وصلتك رسالة التسليم الفنية!</h4>
                    <p className="font-cairo text-zinc-500 text-xs leading-relaxed mt-1">
                      قمنا بإرسال فواتير الشراء المستقلة وتراخيص المنتجات إلى بريدك الإلكتروني. تفقد صندوق الوارد أو البريد المزعج (Spam).
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="w-full sm:w-auto h-11 px-5 bg-white/5 hover:bg-white/10 text-white font-alexandria font-bold text-xs rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 select-none cursor-pointer shrink-0"
                >
                  {resendingEmail ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-zinc-400" />
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
            className="flex flex-col sm:flex-row items-center justify-center gap-4 my-8"
          >
            {[
              { icon: ShieldCheck, label: "حماية مشفرة 256-bit SSL" },
              { icon: Sparkles, label: "توصيل فوري وتفعيل مباشر" },
              { icon: Package, label: "تراخيص وتحميل مدى الحياة" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-zinc-500 font-cairo text-xs">
                <Icon className="w-3.5 h-3.5 text-zinc-600" />
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
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-cairo text-zinc-500 hover:text-white transition-colors text-sm group"
            >
              <span>العودة إلى المتجر الرئيسي</span>
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
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
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-emerald-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="font-cairo text-zinc-500 text-sm">جاري تحميل صفحة تفعيل المشتريات...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
