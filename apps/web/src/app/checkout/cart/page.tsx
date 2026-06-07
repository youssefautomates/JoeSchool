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
import { supabaseClient } from "@/lib/supabaseClient";

import { resolveUserCurrency, resolveProductPrice, formatPrice, getUSDtoEGPExchangeRate, type Currency } from "@/lib/pricing";

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CartCheckoutPage() {
  const { items, clearCart } = useCart();
  const hasCourse = items.some(item => 
    item.category === "courses" || 
    item.id.startsWith("course-") || 
    item.title?.includes("دورة") || 
    item.title?.includes("كورس")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "instapay">("card");
  const [showInstapayModal, setShowInstapayModal] = useState(false);
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [exchangeRate, setExchangeRate] = useState<number>(50.0);

  // Global gateway fee settings state
  const [globalFeeEnabled, setGlobalFeeEnabled] = useState(true);
  const [globalFeePercentage, setGlobalFeePercentage] = useState(3.00);
  
  // Card Fields State
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardErrors, setCardErrors] = useState({ number: "", expiry: "", cvv: "", holder: "" });
  const [cardType, setCardType] = useState<"visa" | "mastercard" | "meeza" | null>(null);
  const [saveCard, setSaveCard] = useState(true);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);

  // Auto-focus card number when selected
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (paymentMethod === "card" && cardNumberRef.current) {
      setTimeout(() => cardNumberRef.current?.focus(), 100);
    }
  }, [paymentMethod]);

  const router = useRouter();

  // Load visitor currency on mount
  useEffect(() => {
    resolveUserCurrency().then(async (detectedCurrency) => {
      setCurrency(detectedCurrency);
      if (detectedCurrency === "USD") {
        try {
          const rate = await getUSDtoEGPExchangeRate();
          setExchangeRate(rate);
        } catch (err) {}
      }
    });

    // Fetch global settings
    fetch("/api/admin/settings")
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setGlobalFeeEnabled(data.globalGatewayFeeEnabled !== false);
          setGlobalFeePercentage(typeof data.globalGatewayFeePercentage === "number" ? data.globalGatewayFeePercentage : 3.00);
        }
      })
      .catch(e => console.error("Error fetching settings:", e));
  }, []);

  // Force credit card payment for international users
  useEffect(() => {
    if (currency === "USD") {
      setPaymentMethod("card");
    }
  }, [currency]);

  // Resolve prices dynamically with gateway fee recovery and smart rounding
  const resolvedItems = items.map(item => {
    const resolvedPricing = resolveProductPrice(item, currency);
    const subtotal = resolvedPricing.price;
    const showFee = currency === "EGP" && paymentMethod !== "instapay" && globalFeeEnabled && (item.enable_gateway_fee !== false) && subtotal > 0;
    const subtotalEGP = currency === "USD" ? Math.round(subtotal * exchangeRate) : subtotal;
    const feeEGP = showFee ? Math.ceil(subtotalEGP * (globalFeePercentage / 100)) : 0;
    const isCheap = subtotalEGP < 100;
    const feeFormatted = showFee ? feeEGP : 0;
    const finalPrice = subtotal + feeFormatted;

    return {
      ...item,
      price: subtotal,
      original_price: resolvedPricing.original_price,
      enable_gateway_fee: item.enable_gateway_fee,
      feeFormatted,
      finalPrice,
      showFee,
      isCheap
    };
  });

  const subtotalCartTotal = resolvedItems.reduce((sum, item) => sum + item.price, 0);
  const totalBundledFees = resolvedItems.reduce((sum, item) => sum + (item.showFee && item.isCheap ? item.feeFormatted : 0), 0);
  const hasSeparatedFeeRow = resolvedItems.some(item => item.showFee && !item.isCheap);
  const displayedFee = hasSeparatedFeeRow ? resolvedItems.reduce((sum, item) => sum + (item.showFee ? item.feeFormatted : 0), 0) : 0;
  
  // Total to charge/display
  const resolvedCartTotal = subtotalCartTotal + (hasSeparatedFeeRow ? displayedFee : totalBundledFees);

  // Track InitiateCheckout on mount/currency load
  useEffect(() => {
    if (items.length > 0) {
      if ((window as any).fbq) {
        (window as any).fbq('track', 'InitiateCheckout', {
          content_ids: items.map(i => i.id),
          content_type: 'product',
          value: resolvedCartTotal,
          currency: currency
        });
      }
      if ((window as any).ttq) {
        (window as any).ttq.track('InitiateCheckout', {
          contents: items.map(i => ({
            content_id: i.id,
            content_name: i.title,
            quantity: 1,
            price: i.price
          })),
          value: resolvedCartTotal,
          currency: currency
        });
      }
    }
  }, [currency, resolvedCartTotal]); // eslint-disable-line

  // Card Formatting & Validation Handlers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.startsWith("50")) setCardType("meeza");
    else if (value.startsWith("4")) setCardType("visa");
    else if (value.match(/^(5[1-5]|2[2-7])/)) setCardType("mastercard");
    else setCardType(null);

    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardNumber(formatted.substring(0, 19));
    
    if (value.length > 0 && value.length < 16) {
      setCardErrors(prev => ({ ...prev, number: "رقم البطاقة غير مكتمل" }));
    } else {
      setCardErrors(prev => ({ ...prev, number: "" }));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      const month = parseInt(value.substring(0, 2));
      if (month > 12) value = "12" + value.substring(2);
      if (month === 0) value = "01" + value.substring(2);
      value = value.substring(0, 2) + "/" + value.substring(2);
    }
    setExpiryDate(value.substring(0, 5));

    if (value.length === 5) {
      const [m, y] = value.split("/");
      const expDate = new Date(2000 + parseInt(y), parseInt(m)); // End of month
      if (expDate < new Date()) {
        setCardErrors(prev => ({ ...prev, expiry: "البطاقة منتهية" }));
      } else {
        setCardErrors(prev => ({ ...prev, expiry: "" }));
      }
    } else if (value.length > 0) {
      setCardErrors(prev => ({ ...prev, expiry: "صيغة غير صحيحة" }));
    } else {
      setCardErrors(prev => ({ ...prev, expiry: "" }));
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 4);
    setCvv(value);
    if (value.length > 0 && value.length < 3) {
      setCardErrors(prev => ({ ...prev, cvv: "غير مكتمل" }));
    } else {
      setCardErrors(prev => ({ ...prev, cvv: "" }));
    }
  };

  const handleCardHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[0-9!@#$%^&*()_+={}\[\]|\\:;"'<>,.?\/]/g, "").toUpperCase();
    setCardHolder(value);
    if (value.length > 0 && value.length < 3) {
      setCardErrors(prev => ({ ...prev, holder: "الاسم قصير جداً" }));
    } else {
      setCardErrors(prev => ({ ...prev, holder: "" }));
    }
  };

  const [user, setUser] = useState<any>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setValue("fullName", session.user.user_metadata?.full_name || "");
        setValue("email", session.user.email || "");
      }
    }
    checkUser();
  }, [setValue]);

  const validateCardFields = () => {
    if (paymentMethod !== "card") return true;
    let hasEmptyError = false;
    const currentErrors = { ...cardErrors };
    
    if (!cardNumber) { currentErrors.number = "يرجى إدخال رقم البطاقة"; hasEmptyError = true; }
    if (!expiryDate) { currentErrors.expiry = "مطلوب"; hasEmptyError = true; }
    if (!cvv) { currentErrors.cvv = "مطلوب"; hasEmptyError = true; }
    if (!cardHolder) { currentErrors.holder = "يرجى إدخال اسم حامل البطاقة"; hasEmptyError = true; }

    if (hasEmptyError) {
      setCardErrors(currentErrors);
      return false;
    }
    if (cardErrors.number || cardErrors.expiry || cardErrors.cvv || cardErrors.holder) {
      return false;
    }
    return true;
  };

  const onInvalid = () => {
    if (paymentMethod === "card") {
      validateCardFields();
      toast.error("يرجى إكمال جميع الحقول المطلوبة بشكل صحيح.");
    }
  };

  async function onSubmit(data: CheckoutValues) {
    if (items.length === 0) {
      toast.error("السلة فارغة!");
      return;
    }

    if (paymentMethod === "card") {
      const isValid = validateCardFields();
      if (!isValid) {
        toast.error("توجد أخطاء في بيانات البطاقة، يرجى مراجعتها.");
        return;
      }
    }

    setIsLoading(true);
    try {
      let activeUser = user;

      // If user is not logged in, perform Instant Purchase Authentication
      if (!activeUser && hasCourse) {
        if (!data.password) {
          toast.error("يرجى إدخال كلمة مرور لإنشاء حسابك وتأمين مشترياتك.");
          setIsLoading(false);
          return;
        }

        // Try to sign up
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: "",
            }
          }
        });

        if (signUpError) {
          // If already registered, try signing in with password automatically
          if (signUpError.message.includes("already registered") || signUpError.status === 422) {
            const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });

            if (signInError) {
              toast.error("هذا البريد مسجل بالفعل بكلمة مرور أخرى. يرجى إدخال كلمة المرور الصحيحة لحسابك، أو تسجيل الدخول.");
              setIsLoading(false);
              return;
            }
            activeUser = signInData.user;
          } else {
            toast.error(`فشل إنشاء الحساب: ${signUpError.message}`);
            setIsLoading(false);
            return;
          }
        } else {
          activeUser = signUpData.user;
        }
      }

      const finalPriceEGP = currency === "USD"
        ? Math.round(resolvedCartTotal * exchangeRate)
        : resolvedCartTotal;

      const payloadBody = {
        items: resolvedItems.map(i => {
          const itemPriceEGP = currency === "USD"
            ? Math.round(i.price * exchangeRate)
            : i.price;
          return { id: i.id, price: itemPriceEGP, title: i.title };
        }),
        amount: finalPriceEGP,
        email: data.email,
        firstName: data.fullName.split(" ")[0],
        lastName: data.fullName.split(" ").slice(1).join(" ") || "Customer",
        phone: "",
        paymentMethod: paymentMethod, 
        cardData: paymentMethod === "card" ? {
          cardNumber,
          expiry: expiryDate,
          cvv,
          cardHolder
        } : undefined,
        password: data.password || undefined
      };

      const response = await fetch("/api/paymob/initiate-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const result = await response.json();

      if (result.checkoutUrl) {
        clearCart();
        if (paymentMethod === "wallet") {
          toast.success("جاري تحويلك لمحفظتك الإلكترونية...");
          window.location.assign(result.checkoutUrl); 
        } else {
          toast.success("جاري تأكيد عملية الدفع...");
          window.location.assign(result.checkoutUrl); 
        }
      } else if (result.success) {
         clearCart();
         toast.success("تم الدفع بنجاح!");
         router.push(`/checkout/success?order_id=${result.orderId}`);
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
          <div className="flex flex-col items-center justify-center text-center gap-2 mb-12">
            <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-white font-cairo transition-all mb-3 group">
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              العودة للتسوق
            </Link>
            <h1 className="text-3xl md:text-5xl font-alexandria font-black text-white tracking-tight">إتمام الطلب بأمان</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-col-reverse lg:flex-row">
            
            {/* Checkout Form (Right Side on Desktop, Bottom on Mobile) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
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
                        autoFocus
                        {...register("fullName")}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.fullName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm">البريد الإلكتروني</Label>
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

                  {!user && hasCourse && (
                    <>
                      <div className="space-y-2">
                        <Label className="font-cairo font-bold text-zinc-400 text-sm">كلمة المرور الجديدة</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input 
                            placeholder="••••••••" 
                            type="password"
                            dir="ltr"
                            className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all pl-11", errors.password && "border-red-500/50 focus:ring-red-500")}
                            disabled={isLoading}
                            {...register("password")}
                          />
                        </div>
                        {errors.password && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.password.message}</p>}
                      </div>
                      
                      <p className="text-xs text-zinc-500 font-cairo mt-1.5">
                        لديك حساب بالفعل؟{" "}
                        <Link href="/login?redirect=/checkout/cart" className="text-rose-400 hover:text-rose-300 underline font-bold transition-all">
                          اضغط هنا لتسجيل الدخول
                        </Link>
                      </p>
                    </>
                  )}

                  {/* Payment Method Selector */}
                  <div className="pt-4 mt-4">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm mb-3 block">طريقة الدفع</Label>
                    <div className={cn("grid gap-3", currency === "EGP" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1")}>
                      
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

                      {currency === "EGP" && (
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
                      )}

                      {currency === "EGP" && (
                        <div 
                          onClick={() => setShowInstapayModal(true)}
                          className="cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] border-white/5 bg-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 hover:shadow-[inset_0_0_20px_rgba(147,51,234,0.05)]"
                        >
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-zinc-500">
                          </div>
                          <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-900/30 shrink-0">
                            <span className="text-[8px] font-black font-sans text-purple-400">IPN</span>
                          </div>
                          <div className="font-cairo">
                            <p className="font-bold text-zinc-300">Instapay تحويل فوري</p>
                            <p className="text-xs text-zinc-500">تحويل بنكي فوري عبر إنستاباي</p>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Inline Card Fields (Animated transition) */}
                  <div className={cn(
                    "transition-all duration-500 ease-in-out overflow-hidden border-t border-white/5",
                    paymentMethod === "card" ? "max-h-[600px] opacity-100 pt-6 mt-6" : "max-h-0 opacity-0 pt-0 mt-0 border-transparent pointer-events-none"
                  )}>
                    <div className="mb-4">
                      <h3 className="font-cairo font-bold text-white flex items-center gap-2 text-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        بيانات البطاقة
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="font-cairo text-xs text-zinc-400">رقم البطاقة</Label>
                        <div className="relative">
                          <Input 
                            ref={cardNumberRef}
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="0000 0000 0000 0000" 
                            dir="ltr"
                            maxLength={19}
                            inputMode="numeric"
                            className={cn("h-14 rounded-xl bg-white/5 border-white/5 text-white font-mono text-lg tracking-widest hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all", 
                              cardErrors.number ? "border-red-500/50 focus:ring-red-500" : (cardNumber.length === 19 ? "border-emerald-500/50 focus:ring-emerald-500" : "")
                            )}
                              disabled={isLoading}
                            />
                            {cardNumber.length === 19 && !cardErrors.number && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />}
                          </div>
                          {cardErrors.number && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {cardErrors.number}</p>}
                        </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="font-cairo text-xs text-zinc-400">تاريخ الانتهاء</Label>
                          <Input 
                            value={expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY" 
                            dir="ltr"
                            maxLength={5}
                            inputMode="numeric"
                            className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white font-mono text-base text-center hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all", 
                              cardErrors.expiry ? "border-red-500/50 focus:ring-red-500" : (expiryDate.length === 5 ? "border-emerald-500/50 focus:ring-emerald-500" : "")
                            )}
                            disabled={isLoading}
                          />
                          {cardErrors.expiry && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {cardErrors.expiry}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="font-cairo text-xs text-zinc-400">رمز الأمان (CVV)</Label>
                          <Input 
                            value={cvv}
                            onChange={handleCvvChange}
                            placeholder="123" 
                            type="password"
                            dir="ltr"
                            maxLength={3}
                            inputMode="numeric"
                            className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white font-mono text-base text-center hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all", 
                              cardErrors.cvv ? "border-red-500/50 focus:ring-red-500" : (cvv.length === 3 ? "border-emerald-500/50 focus:ring-emerald-500" : "")
                            )}
                              disabled={isLoading}
                            />
                            {cardErrors.cvv && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {cardErrors.cvv}</p>}
                          </div>
                        </div>

                      <div className="space-y-1.5">
                        <Label className="font-cairo text-xs text-zinc-400">اسم حامل البطاقة</Label>
                        <Input 
                          value={cardHolder}
                          onChange={handleCardHolderChange}
                          placeholder="الاسم كما هو مكتوب على البطاقة" 
                          className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all", 
                            cardErrors.holder ? "border-red-500/50 focus:ring-red-500" : (cardHolder.length >= 3 ? "border-emerald-500/50 focus:ring-emerald-500" : "")
                          )}
                          disabled={isLoading}
                        />
                        {cardErrors.holder && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {cardErrors.holder}</p>}
                      </div>

                      <div className="flex items-center gap-2 pt-2 cursor-pointer" onClick={() => setSaveCard(!saveCard)}>
                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", saveCard ? "bg-rose-600 border-rose-600" : "border-white/20 bg-transparent")}>
                          {saveCard && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <Label className="font-cairo text-xs text-zinc-400 cursor-pointer select-none">حفظ بيانات البطاقة للمدفوعات القادمة بأمان</Label>
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
                        paymentMethod === "card" ? (
                          <>إتمام الدفع الآمن <Lock className="w-5 h-5 mr-3 opacity-80" /></>
                        ) : (
                          <>إتمام الطلب بواسطة المحفظة</>
                        )
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>

            {/* Order Summary (Left Side on Desktop, Top on Mobile) */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 space-y-6">
                <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 md:p-8 backdrop-blur-2xl">
                  <h3 className="font-alexandria font-bold text-white text-lg mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
                    <Package className="w-5 h-5 text-rose-500" />
                    منتجات السلة ({items.length})
                  </h3>
                  
                  <div className="flex flex-col gap-4 mb-6">
                    {resolvedItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                        <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-white/10 relative overflow-hidden shrink-0">
                          {item.image_url && (
                            <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-cairo font-bold text-white text-sm leading-tight mb-1 line-clamp-2">{item.title}</h4>
                          <span className="text-rose-400 font-bold text-sm">
                            {formatPrice(
                              (item.showFee && !hasSeparatedFeeRow) ? item.finalPrice : item.price,
                              currency
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="py-6 space-y-4 border-t border-white/10">
                    {hasSeparatedFeeRow && (
                      <>
                        <div className="flex justify-between items-center text-zinc-400 font-cairo">
                          <span>المجموع الفرعي</span>
                          <span>{formatPrice(subtotalCartTotal, currency)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 border-t border-white/5 pt-2">
                          <div className="flex justify-between items-center text-zinc-400 font-cairo text-xs">
                            <span>رسوم معالجة الدفع</span>
                            <span>{formatPrice(displayedFee, currency)}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 text-right leading-relaxed font-cairo block">
                            (رسوم بسيطة للمساعدة في تغطية تكاليف بوابة الدفع الآمنة)
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="font-alexandria font-bold text-white text-xl">الإجمالي</span>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-alexandria font-black">{formatPrice(resolvedCartTotal, currency)}</span>
                      </div>
                    </div>

                    {currency === "USD" && (
                      <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-cairo text-center leading-relaxed">
                        Notice: Final payment will be processed in EGP based on the current exchange rate ($1 = {exchangeRate.toFixed(2)} EGP).
                        <br />
                        تنبيه: سيتم معالجة الدفع النهائي بالجنيه المصري (EGP) بناءً على سعر الصرف الحالي ($1 = {exchangeRate.toFixed(2)} ج.م).
                      </div>
                    )}
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

      {/* Instapay Modal */}
      {showInstapayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowInstapayModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[#0a0a12] border border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10"
          >
            <button onClick={() => setShowInstapayModal(false)} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
              <span className="text-lg">&times;</span>
            </button>

            <div className="text-center space-y-5">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-black font-sans text-purple-400">IPN</span>
                </div>
                <h3 className="text-xl font-alexandria font-bold text-white">الدفع عبر Instapay</h3>
                <p className="text-sm text-zinc-400 font-cairo mt-1">قم بتحويل المبلغ ثم أرسل لقطة الشاشة</p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                <p className="text-sm text-purple-300 font-cairo mb-1">المبلغ المطلوب تحويله</p>
                <p className="text-3xl font-alexandria font-black text-white">{formatPrice(resolvedCartTotal, currency)}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 mx-auto max-w-[220px]">
                <img src="/instapay-qr.png" alt="Instapay QR Code" className="w-full h-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>

              <div className="space-y-3 text-right">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                  <button onClick={() => { navigator.clipboard.writeText('youssef.m2003@instapay'); toast.success('تم نسخ العنوان'); }} className="text-xs text-purple-400 font-bold hover:text-purple-300 transition-colors cursor-pointer">نسخ</button>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-cairo">Payment Address</p>
                    <p className="text-sm text-white font-mono font-bold" dir="ltr">youssef.m2003@instapay</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                  <button onClick={() => { navigator.clipboard.writeText('01016748891'); toast.success('تم نسخ الرقم'); }} className="text-xs text-purple-400 font-bold hover:text-purple-300 transition-colors cursor-pointer">نسخ</button>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-cairo">رقم الهاتف</p>
                    <p className="text-sm text-white font-mono font-bold" dir="ltr">01016748891</p>
                  </div>
                </div>
              </div>

              <a 
                href="https://ipn.eg/S/youssefmohamed2003/instapay/MJ1vR8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(147,51,234,0.3)] font-cairo"
              >
                ادفع مباشرة عبر Instapay
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </a>

              <div className="space-y-2">
                <label className="w-full h-24 border-2 border-dashed border-white/10 hover:border-purple-500/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/[0.02]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs text-zinc-500 font-cairo">ارفع لقطة شاشة التحويل</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) toast.success('تم رفع الصورة بنجاح'); }} />
                </label>
              </div>

              <a 
                href={`https://wa.me/201107099196?text=${encodeURIComponent(hasCourse ? `مرحباً، لقد قمت بدفع قيمة اشتراك دورة ${items.map(i => i.title).join(' و ')} أريد الانضمام للكورس الآن.` : `مرحباً، لقد قمت بدفع قيمة منتج ${items.map(i => i.title).join(' و ')} أريد الحصول عليه الآن.`)}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] font-cairo"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                أرسل إثبات الدفع عبر واتساب
              </a>
            </div>
          </motion.div>
        </div>
      )}

      <div className="opacity-40 hover:opacity-100 transition-opacity pb-8">
        <Footer />
      </div>
    </div>
  );
}
