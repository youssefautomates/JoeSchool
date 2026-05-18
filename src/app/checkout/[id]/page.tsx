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
import { supabaseClient } from "@/lib/supabaseClient";
import { type Product, calcDiscount } from "@/lib/products";

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

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().optional(),
  phone: z.string().min(6, { message: "يرجى إدخال رقم هاتف صحيح" }),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
  const [isCourse, setIsCourse] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  
  // Card Fields State
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardErrors, setCardErrors] = useState({ number: "", expiry: "", cvv: "", holder: "" });
  const [cardType, setCardType] = useState<"visa" | "mastercard" | "meeza" | null>(null);
  const [saveCard, setSaveCard] = useState(true);
  const cardNumberRef = useRef<HTMLInputElement>(null);

  // Auto-focus card number when selected
  useEffect(() => {
    if (paymentMethod === "card" && cardNumberRef.current) {
      setTimeout(() => cardNumberRef.current?.focus(), 100);
    }
  }, [paymentMethod]);

  const router = useRouter();

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

  useEffect(() => {
    fetchProduct();
  }, [resolvedParams.id]); // eslint-disable-line

  async function fetchProduct() {
    setIsFetching(true);
    try {
      let data: any = null;
      let isCourseItem = false;

      // Try fetching from courses first if it starts with "course-"
      if (resolvedParams.id.startsWith("course-")) {
        const { data: courseData, error: courseError } = await supabaseClient
          .from("courses")
          .select("*")
          .eq("id", resolvedParams.id)
          .maybeSingle();
        if (courseData) {
          data = courseData;
          isCourseItem = true;
        }
      }

      // Fallback/direct query from products if not loaded yet
      if (!data) {
        const { data: productData } = await supabase
          .from("products")
          .select("*")
          .eq("id", resolvedParams.id)
          .maybeSingle();
        if (productData) {
          data = productData;
        }
      }

      // If still not loaded, query courses again without startWith constraint just in case
      if (!data) {
        const { data: courseData } = await supabaseClient
          .from("courses")
          .select("*")
          .eq("id", resolvedParams.id)
          .maybeSingle();
        if (courseData) {
          data = courseData;
          isCourseItem = true;
        }
      }

      if (!data) throw new Error("المحتوى المطلوب غير متوفر حالياً");
      
      setProduct(data as Product);
      setIsCourse(isCourseItem);
      
      // Track InitiateCheckout
      if (typeof window !== "undefined") {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'InitiateCheckout', {
            content_name: data.title,
            content_ids: [data.id],
            content_type: isCourseItem ? 'course' : 'product',
            value: data.price,
            currency: 'EGP'
          });
        }
        if ((window as any).ttq) {
          (window as any).ttq.track('InitiateCheckout', {
            contents: [{ content_id: data.id, content_name: data.title, price: data.price, quantity: 1 }],
            content_type: isCourseItem ? 'course' : 'product',
            value: data.price,
            currency: 'EGP'
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast.error(error.message || "فشل تحميل تفاصيل المنتج للcheckout");
    } finally {
      setIsFetching(false);
    }
  }

  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [countryCode, setCountryCode] = useState("+20");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      phone: "",
    },
  });

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

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setValue("fullName", session.user.user_metadata?.full_name || "");
        setValue("email", session.user.email || "");

        const storedPhone = session.user.user_metadata?.phone || "";
        if (storedPhone) {
          const matchingCode = COUNTRY_CODES.find(c => storedPhone.startsWith(c.code));
          if (matchingCode) {
            setCountryCode(matchingCode.code);
            setValue("phone", storedPhone.slice(matchingCode.code.length));
          } else {
            setValue("phone", storedPhone);
          }
        }
      }
      setCheckingAuth(false);
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
    if (!product) return;

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
      if (!activeUser) {
        if (!data.password) {
          toast.error("يرجى إدخال كلمة مرور لإنشاء حسابك وتأمين مشترياتك.");
          setIsLoading(false);
          return;
        }

        const fullPhone = `${countryCode}${data.phone}`;

        // Try to sign up
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: fullPhone,
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

      console.log("[CARD_NAME_INPUT] Final React State Value:", cardHolder);

      const fullPhone = `${countryCode}${data.phone}`;

      const finalPrice = appliedCoupon 
        ? Math.round(product.price * (1 - appliedCoupon.percent / 100)) 
        : product.price;

      const payloadBody = {
        amount: finalPrice,
        email: data.email,
        firstName: data.fullName.split(" ")[0],
        lastName: data.fullName.split(" ").slice(1).join(" ") || "Customer",
        phone: fullPhone,
        productId: resolvedParams.id,
        paymentMethod: paymentMethod, 
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        cardData: paymentMethod === "card" ? {
          cardNumber,
          expiry: expiryDate,
          cvv,
          cardHolder
        } : undefined
      };

      console.log("[FORM_SUBMIT_DATA] Request body before fetch:", JSON.stringify(payloadBody, null, 2));

      const response = await fetch("/api/paymob/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const result = await response.json();

      if (result.checkoutUrl) {
        if (paymentMethod === "wallet") {
          toast.success("جاري تحويلك لمحفظتك الإلكترونية...");
          window.location.href = result.checkoutUrl; 
        } else {
          toast.success("جاري تأكيد عملية الدفع...");
          window.location.href = result.checkoutUrl; 
        }
      } else if (result.success) {
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
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <Link href={`/product/${product?.slug || resolvedParams.id}`} className="inline-flex items-center text-zinc-500 hover:text-white font-cairo transition-all mb-4 group">
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                العودة لتفاصيل المنتج
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
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff0f53] to-[#ff00b3]" />
                
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

                  <div className="space-y-2">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm">رقم الهاتف (الواتساب) <span className="text-[10px] font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded ml-2">هام: لمتابعة الطلبات وتفعيل الدعم</span></Label>
                    <div className="flex gap-2 relative group" dir="ltr">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-12 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 px-3 text-sm font-medium focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-white max-w-[100px] appearance-none cursor-pointer text-center select-none"
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

                      <div className="relative flex-1">
                        <Input 
                          placeholder="100000000" 
                          type="tel"
                          dir="ltr"
                          className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all pl-4", errors.phone && "border-red-500/50 focus:ring-red-500")}
                          disabled={isLoading}
                          {...register("phone")}
                          onChange={(e) => {
                            e.target.value = e.target.value.replace(/\D/g, "");
                            register("phone").onChange(e);
                          }}
                        />
                      </div>
                    </div>
                    {errors.phone && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.phone.message}</p>}
                  </div>

                  {!user && (
                    <>
                      <div className="space-y-2">
                        <Label className="font-cairo font-bold text-zinc-400 text-sm">كلمة المرور <span className="text-[10px] font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded ml-2">لإنشاء حسابك وتفعيل لوحة التحكم فوراً</span></Label>
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
                        <Link href={`/login?redirect=/checkout/${resolvedParams.id}`} className="text-rose-400 hover:text-rose-300 underline font-bold transition-all">
                          اضغط هنا لتسجيل الدخول
                        </Link>
                      </p>
                    </>
                  )}



                  {/* Payment Method Selector */}
                  <div className="pt-4 mt-4">
                    <Label className="font-cairo font-bold text-zinc-400 text-sm mb-3 block">طريقة الدفع</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      
                      <div 
                        onClick={() => setPaymentMethod("card")}
                        className={cn(
                          "cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                          paymentMethod === "card" 
                            ? "border-rose-500/50 bg-rose-500/10 shadow-[inset_0_0_30px_rgba(244,63,94,0.1)]" 
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
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {isCourse ? "انضمام فوري للمساق" : "تنزيل فوري"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Code Input Block */}
                  <div className="py-4 border-b border-white/10 space-y-2">
                    <Label className="font-cairo text-xs text-zinc-400 font-bold block">كود الخصم (Coupon)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={couponInput}
                        onChange={e => {
                          setCouponInput(e.target.value);
                          setCouponError("");
                        }}
                        placeholder="أدخل كوبون الخصم هنا..." 
                        className="h-10 rounded-xl bg-white/5 border-white/5 text-white text-xs font-cairo"
                        disabled={isLoading || !!appliedCoupon}
                      />
                      {appliedCoupon ? (
                        <Button 
                          type="button" 
                          onClick={() => {
                            setAppliedCoupon(null);
                            setCouponInput("");
                          }}
                          className="h-10 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold text-xs"
                        >
                          إلغاء
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          onClick={async () => {
                            const code = couponInput.trim().toUpperCase();
                            if (!code) return;
                            
                            setIsLoading(true);
                            setCouponError("");
                            try {
                              const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}&itemId=${encodeURIComponent(product.id)}`);
                              const data = await res.json();
                              
                              if (!res.ok || !data.success) {
                                throw new Error(data.error || "كود الخصم غير صالح");
                              }
                              
                              setAppliedCoupon({ code: data.code, percent: data.discount_percent });
                              toast.success(`تم تطبيق الكوبون ${data.code} بنجاح! خصم ${data.discount_percent}%`);
                            } catch (err: any) {
                              setCouponError(err.message || "كود الخصم غير صالح لهذا المنتج.");
                              toast.error(err.message || "كود الخصم غير صالح.");
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          className="h-10 px-4 bg-[#D6004B] hover:bg-[#b0003d] text-white border-none rounded-xl font-bold text-xs"
                          disabled={isLoading}
                        >
                          تطبيق
                        </Button>
                      )}
                    </div>
                    {couponError && <p className="text-[10px] text-red-400 font-cairo">{couponError}</p>}
                    {appliedCoupon && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-bold font-mono w-fit">
                        <span>الكوبون {appliedCoupon.code} نشط (-{appliedCoupon.percent}%)</span>
                      </div>
                    )}
                  </div>

                  <div className="py-6 space-y-4">
                    {product.original_price ? (
                      <div className="flex justify-between items-center text-zinc-400 font-cairo">
                        <span>السعر الأصلي</span>
                        <span className="line-through">{product.original_price} ج.م</span>
                      </div>
                    ) : null}
                    
                    {discountPct ? (
                      <div className="flex justify-between items-center text-emerald-400 font-cairo font-bold">
                        <span>خصم الدورة ({discountPct}%)</span>
                        <span>- {savings} ج.م</span>
                      </div>
                    ) : null}

                    {appliedCoupon ? (
                      <div className="flex justify-between items-center text-emerald-400 font-cairo font-bold bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
                        <span>خصم الكوبون ({appliedCoupon.percent}%)</span>
                        <span>- {Math.round(product.price * (appliedCoupon.percent / 100))} ج.م</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between items-center pt-4 border-t border-white/10">
                      <span className="font-alexandria font-bold text-white text-xl">الإجمالي</span>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-alexandria font-black">
                          {appliedCoupon 
                            ? Math.round(product.price * (1 - appliedCoupon.percent / 100)) 
                            : product.price}
                        </span>
                        <span className="text-sm font-cairo">ج.م</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#050505] rounded-2xl p-4 border border-white/5">
                    <ul className="space-y-3">
                      {(isCourse ? [
                        "دخول كامل للمحاضرات والدروس مدى الحياة",
                        "ملفات ومواد الدورة التفاعلية جاهزة للتحميل",
                        "شهادة إتمام معتمدة قابلة للتحقق التلقائي",
                        "دعم فني واستشارات حقيقية مع يوسف"
                      ] : [
                        "ملفات المنتج الأصلية والكاملة",
                        "دعم فني وتحديثات مجانية مدى الحياة",
                        "إرسال تلقائي وفوري للبريد الإلكتروني"
                      ]).map((benefit, i) => (
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
