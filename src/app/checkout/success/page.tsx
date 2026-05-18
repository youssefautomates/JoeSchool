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
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(214,0,75,0.6), transparent)`,
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
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const { clearCart } = useCart();

  const [phase, setPhase] = useState<"loading" | "success" | "error">("loading");
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [copied, setCopied] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!orderId) {
      router.replace("/");
      return;
    }

    verifyAndDeliver(orderId);
  }, [orderId, router]);

  async function verifyAndDeliver(id: string) {
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch("/api/paymob/verify-and-deliver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        });
        const data = await res.json();

        if (data.success) {
          setOrderData({
            id,
            productTitle: data.productTitle || data.productNames || "منتجك الرقمي",
            customerName: data.customerName || "عميلنا العزيز",
            customerEmail: data.customerEmail || "",
            amount: parseFloat(data.orderValue || "0"),
            currency: data.currency || "EGP",
            downloadUrl: data.downloadUrl || null,
            downloadToken: data.downloadToken || null,
            transactionId: data.transactionId || "",
            alreadyDelivered: data.alreadyDelivered,
            category: data.category || null,
            tags: data.tags || null,
          });
          setPhase("success");
          setTimeout(() => setShowParticles(true), 300);
          
          if (!data.alreadyDelivered) {
             clearCart();
             toast.success("تم الدفع بنجاح! شكراً لثقتك بنا.");
          }

          if (!data.alreadyDelivered && typeof window !== "undefined") {
            if ((window as any).fbq) {
              (window as any).fbq("track", "Purchase", {
                value: data.orderValue,
                currency: data.currency,
                content_name: data.productNames,
                content_ids: [id],
                content_type: "product",
              });
            }
            if ((window as any).ttq) {
              (window as any).ttq.track("CompletePayment", {
                value: data.orderValue,
                currency: data.currency,
                contents: [{ content_id: id, content_name: data.productNames, quantity: 1 }],
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
      } catch {
        if (attempt >= maxAttempts) setPhase("error");
        else await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  function copyOrderId() {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId).then(() => {
      setCopied(true);
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
                className="w-14 h-14 rounded-full border-2 border-rose-500 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>
          <motion.div
            className="absolute inset-0 rounded-full bg-rose-500/10"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="font-alexandria text-white text-xl font-bold mb-2">
            جاري التحقق من الدفع بشكل آمن...
          </p>
          <p className="font-cairo text-zinc-500 text-sm">
            يرجى الانتظار، لا تغلق هذه الصفحة
          </p>
        </motion.div>

        <motion.div
          className="flex gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-rose-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </motion.div>
      </div>
    );
  }

  if (phase === "error") {
    // If it fails verification, redirect to the failed page
    router.replace(`/checkout/failed?order_id=${orderId}&reason=verification_timeout`);
    return null;
  }

  const isCourse = orderData?.category?.toLowerCase() === "courses" || 
                   orderData?.category === "دورة" || 
                   orderData?.category === "تعليمي" ||
                   (orderData?.tags && orderData.tags.some(tag => ["course", "dora", "دورة", "تعليمي"].includes(tag.toLowerCase()))) ||
                   orderData?.productTitle?.toLowerCase().includes("course") ||
                   orderData?.productTitle?.includes("دورة") ||
                   orderData?.productTitle?.includes("مساق");

  const hasDigitalDownload = !!orderData?.downloadUrl;

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-cairo">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-sky-500/5 blur-[120px]" />
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
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

      <div className="relative z-10 py-6 px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Youssef Automates"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(214,0,75,0.5)]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-alexandria font-bold text-lg tracking-tight text-white leading-tight" dir="ltr">
              Youssef <span className="text-rose-500">Automates</span>
            </span>
            <span className="font-cairo text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Premium Workflows</span>
          </div>
        </Link>
      </div>

      <main className="relative z-10 pb-24 pt-4">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div
            className="flex justify-center mb-8"
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
              <motion.div
                className="absolute inset-0 rounded-full border border-emerald-500/30"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
              />
              <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.4)] rotate-3">
                <CheckCircle2 className="w-14 h-14 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-cairo font-bold uppercase tracking-widest mb-5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              تم تأكيد الدفع بنجاح
            </motion.div>

            <h1 className="font-alexandria font-black text-4xl md:text-5xl text-white tracking-tight leading-tight mb-3">
              تم شراء المنتج<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                بنجاح! 🎉
              </span>
            </h1>

            <p className="font-cairo text-zinc-400 text-lg leading-relaxed">
              شكراً {orderData?.customerName?.split(" ")[0]}! تم حفظ طلبك بنجاح.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/[0.03] border border-white/10 rounded-[2rem] overflow-hidden mb-4"
          >
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

            <div className="p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <p className="font-cairo text-zinc-500 text-xs uppercase tracking-widest mb-1">المنتج الذي قمت بشرائه</p>
                  <h2 className="font-alexandria font-bold text-white text-xl leading-snug">
                    {orderData?.productTitle}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="font-cairo text-zinc-500 text-xs mb-1">رقم الطلب</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-white text-sm font-bold truncate" dir="ltr">
                      {orderId?.slice(0, 14)}...
                    </p>
                    <button
                      onClick={copyOrderId}
                      className="shrink-0 text-zinc-500 hover:text-white transition-colors"
                      title="نسخ رقم الطلب"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="font-cairo text-zinc-500 text-xs mb-1">المبلغ المدفوع</p>
                  <p className="font-alexandria font-black text-emerald-400 text-xl" dir="ltr">
                    {orderData?.amount?.toFixed(0)}
                    <span className="text-sm font-cairo font-normal text-zinc-500 ml-1">{orderData?.currency}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Course Access Button */}
                {isCourse && (
                  <Link
                    href="/dashboard"
                    className="group w-full h-16 flex items-center justify-center gap-3 bg-gradient-to-r from-[#D6004B] to-orange-500 hover:from-[#b0003d] hover:to-orange-600 text-white font-alexandria font-black text-lg rounded-2xl transition-all shadow-[0_8px_30px_rgba(214,0,75,0.3)] hover:shadow-[0_12px_40px_rgba(214,0,75,0.4)] hover:-translate-y-0.5 active:scale-[0.98] select-none text-center"
                  >
                    <BookOpen className="w-5 h-5 animate-pulse" />
                    <span>الدخول للوحة الطالب والكورس 🚀</span>
                  </Link>
                )}

                {/* Direct Digital Product Download Button */}
                {hasDigitalDownload && (
                  <a
                    href={`/api/download?token=${orderData?.downloadToken || orderData?.id}`}
                    className="group w-full h-16 flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-alexandria font-black text-lg rounded-2xl transition-all shadow-[0_8px_30px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:scale-[0.98] text-center"
                  >
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    <span>تحميل الملف الرقمي المباشر ⬇️</span>
                    <ExternalLink className="w-4 h-4 opacity-60" />
                  </a>
                )}

                {/* Fallback if neither */}
                {!isCourse && !hasDigitalDownload && (
                  <div className="w-full h-16 flex items-center justify-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-alexandria font-bold text-base rounded-2xl select-none">
                    <Mail className="w-5 h-5" />
                    <span>تم إرسال الملفات والتعليمات لبريدك الإلكتروني</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white/[0.02] border border-white/10 rounded-3xl p-5 md:p-6 mb-4 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-alexandria font-bold text-white text-base mb-1">
                تم إرسال نسخة لبريدك الإلكتروني
              </h3>
              {orderData?.customerEmail && (
                <p className="font-mono text-rose-400 text-sm mb-1">{orderData.customerEmail}</p>
              )}
              <p className="font-cairo text-zinc-500 text-sm leading-relaxed">
                يحتوي الإيميل على رابط التحميل وبيانات الطلب لتستطيع الوصول للمنتج في أي وقت. تفقد مجلد الـ Spam إن لم تجده.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            {[
              { icon: ShieldCheck, label: "دفع آمن ومشفر" },
              { icon: Sparkles, label: "منتج رقمي أصلي" },
              { icon: Package, label: "تسليم فوري ومباشر" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-zinc-500 font-cairo text-sm">
                <Icon className="w-4 h-4 text-zinc-600" />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="text-center"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-cairo text-zinc-500 hover:text-white transition-colors text-sm group"
            >
              العودة إلى المتجر
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
              className="w-16 h-16 rounded-full border-2 border-rose-500 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="font-cairo text-zinc-500 text-sm">جاري التحميل...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
