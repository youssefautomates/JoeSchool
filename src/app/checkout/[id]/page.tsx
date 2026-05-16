"use client";

import { useState, use, useEffect, useRef } from "react";
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

import { supabase } from "@/lib/supabase";
import { type Product, calcDiscount } from "@/lib/products";

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  


  useEffect(() => {
    fetchProduct();
  }, [resolvedParams.id]); // eslint-disable-line

  async function fetchProduct() {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

      if (error) throw error;
      setProduct(data as Product);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("فشل تحميل تفاصيل المنتج للcheckout");
    } finally {
      setIsFetching(false);
    }
  }

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
    if (!product) return;

    setIsLoading(true);
    try {
      const payloadBody = {
        amount: product.price,
        email: data.email,
        firstName: data.fullName.split(" ")[0],
        lastName: data.fullName.split(" ").slice(1).join(" ") || "Customer",
        productId: resolvedParams.id,
        paymentMethod: paymentMethod, 
      };

      const response = await fetch("/api/paymob/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const result = await response.json();

      if (result.checkoutUrl) {
        toast.success("جاري تحويلك لبوابة الدفع الآمنة...");
        window.location.href = result.checkoutUrl; 
      } else if (result.success) {
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

  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-rose-600/30 border-t-rose-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white font-cairo">
        <Package className="w-16 h-16 text-zinc-700 mb-4" />
        <h1 className="text-3xl font-alexandria font-bold mb-4">عذراً، المنتج غير متاح للcheckout</h1>
        <Link href="/" className="text-rose-400 hover:text-rose-300 underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const discountPct = calcDiscount(product.price, product.original_price);
  const savings = product.original_price ? product.original_price - product.price : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo">
      <Navbar />
      
      <main className="pt-32 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <Link href={`/product/${resolvedParams.id}`} className="inline-flex items-center text-zinc-500 hover:text-white font-cairo transition-all mb-4 group">
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                العودة لتفاصيل المنتج
              </Link>
              <h1 className="text-3xl md:text-5xl font-alexandria font-black text-white tracking-tight">إتمام الطلب بأمان</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-col-reverse lg:flex-row">
            
            <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0a0a0f]/80 backdrop-blur-2xl rounded-[2rem] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff0f53] to-[#ff00b3]" />
                
                <h2 className="text-xl font-alexandria font-bold text-white mb-6">معلومات الاستلام</h2>
                
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm">الاسم الكامل</Label>
                    <Input 
                      placeholder="الاسم الثلاثي لتأكيد الملكية" 
                      className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all", errors.fullName && "border-red-500/50 focus:ring-red-500")}
                      disabled={isLoading}
                      {...register("fullName")}
                    />
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

                  <div className="pt-4 mt-4">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm mb-3 block">طريقة الدفع</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div 
                        onClick={() => setPaymentMethod("card")}
                        className={cn(
                          "cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                          paymentMethod === "card" ? "border-rose-500/50 bg-rose-500/10" : "border-white/5 bg-white/5"
                        )}
                      >
                        <CreditCard className={cn("w-6 h-6", paymentMethod === "card" ? "text-rose-400" : "text-zinc-500")} />
                        <div className="font-cairo">
                          <p className={cn("font-bold", paymentMethod === "card" ? "text-white" : "text-zinc-300")}>البطاقات البنكية</p>
                          <p className="text-xs text-zinc-500">Visa / Mastercard</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => setPaymentMethod("wallet")}
                        className={cn(
                          "cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                          paymentMethod === "wallet" ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/5 bg-white/5"
                        )}
                      >
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
                  <h3 className="font-alexandria font-bold text-white text-lg mb-5 flex items-center gap-2">
                    <Package className="w-5 h-5 text-rose-500" />
                    ملخص الطلب
                  </h3>
                  
                  <div className="flex gap-4 items-start pb-6 border-b border-white/10">
                    <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-white/10 relative overflow-hidden shrink-0">
                      {product.image_url && (
                        <Image src={product.image_url} alt={product.title} fill className="object-cover" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-cairo font-bold text-white text-lg leading-tight mb-2 line-clamp-2">{product.title}</h4>
                      <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md w-fit">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">تنزيل فوري</span>
                      </div>
                    </div>
                  </div>

                  <div className="py-6 space-y-4">
                    {product.original_price && (
                      <div className="flex justify-between items-center text-zinc-400 font-cairo">
                        <span>السعر الأصلي</span>
                        <span className="line-through">{product.original_price} ج.م</span>
                      </div>
                    )}
                    {discountPct && (
                      <div className="flex justify-between items-center text-emerald-400 font-cairo font-bold">
                        <span>الخصم ({discountPct}%)</span>
                        <span>- {savings} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="font-alexandria font-bold text-white text-xl">الإجمالي</span>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-alexandria font-black">{product.price}</span>
                        <span className="text-sm font-cairo">ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#050505] rounded-2xl p-4 border border-white/5">
                    <ul className="space-y-3">
                      {[
                        "ملفات المنتج الأصلية والكاملة",
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
