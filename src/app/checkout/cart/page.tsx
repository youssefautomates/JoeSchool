"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldCheck, CreditCard, ChevronRight, Loader2, ShieldAlert, Sparkles, CheckCircle2, Package, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CartCheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  


  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  const onInvalid = () => {
    toast.error("يرجى إكمال جميع الحقول المطلوبة بشكل صحيح.");
  };

  async function onSubmit(data: CheckoutValues) {
    if (items.length === 0) {
      toast.error("السلة فارغة!");
      return;
    }

    setIsLoading(true);
    try {
      const payloadBody = {
        items: items.map(i => ({ id: i.id, price: i.price, title: i.title })),
        amount: cartTotal,
        email: data.email,
        firstName: data.fullName.split(" ")[0],
        lastName: data.fullName.split(" ").slice(1).join(" ") || "Customer",
        paymentMethod: paymentMethod, 
      };

      const response = await fetch("/api/paymob/initiate-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const result = await response.json();

      if (result.checkoutUrl) {
        clearCart();
        toast.success("جاري تحويلك لبوابة الدفع الآمنة...");
        window.location.href = result.checkoutUrl; 
      } else if (result.success) {
         clearCart();
         toast.success("تم الدفع بنجاح!");
         router.push(`/success?order_id=${result.orderId}`);
      } else {
        throw new Error(result.error || "فشل بدء عملية الدفع");
      }
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error(error.message || "حدث خطأ أثناء معالجة الطلب");
    } finally {
      setIsLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-cairo">
        <Package className="w-16 h-16 text-zinc-700 mb-4" />
        <h1 className="text-3xl font-alexandria font-bold mb-4">السلة فارغة حالياً</h1>
        <Link href="/" className="text-rose-400 hover:text-rose-300 underline">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo">
      <Navbar />
      
      <main className="pt-32 pb-24 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-white font-cairo transition-all mb-4 group">
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                العودة للتسوق
              </Link>
              <h1 className="text-3xl md:text-5xl font-alexandria font-black text-white tracking-tight">إتمام الطلب بأمان</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-col-reverse lg:flex-row">
            
            {/* Checkout Form (Right Side on Desktop, Bottom on Mobile) */}
            <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0a0a0f]/80 backdrop-blur-2xl rounded-[2rem] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-orange-400" />
                
                <h2 className="text-xl font-alexandria font-bold text-white mb-6">معلومات الاستلام</h2>
                
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm">الاسم الكامل</Label>
                    <div className="relative">
                      <Input 
                        placeholder="الاسم الثلاثي لتأكيد الملكية" 
                        className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all", errors.fullName && "border-red-500/50 focus:ring-red-500")}
                        disabled={isLoading}
                        {...register("fullName")}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.fullName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm">البريد الإلكتروني <span className="text-[10px] font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded ml-2">هام: سيتم إرسال الملفات هنا</span></Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input 
                        placeholder="name@email.com" 
                        type="email"
                        dir="ltr"
                        className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all pl-11", errors.email && "border-red-500/50 focus:ring-red-500")}
                        disabled={isLoading}
                        {...register("email")}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.email.message}</p>}
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-4 mt-4">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm mb-3 block">طريقة الدفع</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      <div 
                        onClick={() => setPaymentMethod("card")}
                        className={cn(
                          "cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                          paymentMethod === "card" 
                            ? "border-rose-500/50 bg-rose-500/10 shadow-[inset_0_0_30px_rgba(59,130,246,0.1)]" 
                            : "border-white/5 bg-white/5 hover:border-white/10 hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === "card" ? "border-rose-500" : "border-zinc-500")}>
                          {paymentMethod === "card" && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                        </div>
                        <CreditCard className={cn("w-6 h-6", paymentMethod === "card" ? "text-rose-400" : "text-zinc-500")} />
                        <div className="font-cairo">
                          <p className={cn("font-bold", paymentMethod === "card" ? "text-white" : "text-zinc-300")}>البطاقات البنكية</p>
                          <p className="text-xs text-zinc-500">Visa / Mastercard / Meeza</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod("wallet")}
                        className={cn(
                          "cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                          paymentMethod === "wallet" 
                            ? "border-emerald-500/50 bg-emerald-500/10 shadow-[inset_0_0_30px_rgba(16,185,129,0.1)]" 
                            : "border-white/5 bg-white/5 hover:border-white/10 hover:shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === "wallet" ? "border-emerald-500" : "border-zinc-500")}>
                          {paymentMethod === "wallet" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-zinc-800 shrink-0">
                          <span className={cn("text-xs font-black font-sans", paymentMethod === "wallet" ? "text-emerald-400" : "text-zinc-500")}>Pay</span>
                        </div>
                        <div className="font-cairo">
                          <p className={cn("font-bold", paymentMethod === "wallet" ? "text-white" : "text-zinc-300")}>المحافظ الإلكترونية</p>
                          <p className="text-xs text-zinc-500">فودافون كاش والأخرى</p>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 mt-8">
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-6 opacity-50 hover:opacity-80 transition-opacity">
                      <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/><span className="text-[10px] uppercase tracking-widest font-bold">SSL Secure</span></div>
                      <div className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
                      <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/><span className="text-[10px] uppercase tracking-widest font-bold">Paymob Protected</span></div>
                      <div className="w-1 h-1 rounded-full bg-white/20 hidden md:block" />
                      <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5"/><span className="text-[10px] uppercase tracking-widest font-bold">Instant Delivery</span></div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className={cn(
                        "w-full h-14 text-white font-alexandria text-lg font-bold rounded-xl transition-all active:scale-[0.98]",
                        paymentMethod === "card" 
                          ? "bg-[#D6004B] hover:bg-[#b0003d] shadow-[0_4px_14px_0_rgba(214,0,75,0.39)] hover:shadow-[0_6px_20px_rgba(214,0,75,0.23)] hover:-translate-y-0.5" 
                          : "bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5"
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin ml-2" />
                          جاري تجهيز الدفع...
                        </>
                      ) : (
                        <>إتمام الدفع الآمن <Lock className="w-5 h-5 mr-3 opacity-80" /></>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>

            {/* Order Summary (Left Side on Desktop, Top on Mobile) */}
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 md:p-8 backdrop-blur-2xl">
                  <h3 className="font-alexandria font-bold text-white text-lg mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
                    <Package className="w-5 h-5 text-rose-500" />
                    منتجات السلة ({items.length})
                  </h3>
                  
                  <div className="flex flex-col gap-4 mb-6">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                        <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-white/10 relative overflow-hidden shrink-0">
                          {item.image_url && (
                            <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-cairo font-bold text-white text-sm leading-tight mb-1 line-clamp-2">{item.title}</h4>
                          <span className="text-rose-400 font-bold text-sm">{item.price} ج.م</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="py-6 space-y-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="font-alexandria font-bold text-white text-xl">الإجمالي</span>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-alexandria font-black">{cartTotal}</span>
                        <span className="text-sm font-cairo">ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#050505] rounded-2xl p-4 border border-white/5">
                    <ul className="space-y-3">
                      {[
                        "ملفات المنتجات الأصلية والكاملة",
                        "دعم فني وتحديثات مجانية",
                        "إرسال تلقائي للبريد الإلكتروني"
                      ].map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2 text-zinc-400 font-cairo text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="opacity-40 hover:opacity-100 transition-opacity pb-8">
        <Footer />
      </div>
    </div>
  );
}
