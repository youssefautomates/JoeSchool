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
import { Lock, ShieldCheck, CreditCard, ChevronRight, Loader2, ShieldAlert, Sparkles, CheckCircle2, Package, Mail, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabase";
import { supabaseClient } from "@/lib/supabaseClient";
import { type Product, calcDiscount } from "@/lib/products";
import { trackEvent } from "@/lib/analytics";

import { resolveUserCurrency, resolveProductPrice, formatPrice, getUSDtoEGPExchangeRate, type Currency } from "@/lib/pricing";

const checkoutSchema = z.object({
  firstName: z.string().min(2, { message: "الاسم الأول يجب أن يكون حرفين على الأقل" }),
  lastName: z.string().min(2, { message: "الاسم الأخير يجب أن يكون حرفين على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().optional(),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "instapay">("card");
  const [showInstapayModal, setShowInstapayModal] = useState(false);
  const [instapayReturnBanner, setInstapayReturnBanner] = useState(false);
  const [instapayScreenshot, setInstapayScreenshot] = useState<string | null>(null);
  const [instapayScreenshotUrl, setInstapayScreenshotUrl] = useState<string | null>(null);
  const [instapayFile, setInstapayFile] = useState<File | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isCourse, setIsCourse] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
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
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);
  const [showPassword, setShowPassword] = useState(false);

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

  // Force credit card payment for international users
  useEffect(() => {
    if (currency === "USD") {
      setPaymentMethod("card");
    }
  }, [currency]);

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
    resolveUserCurrency().then(async (detectedCurrency) => {
      setCurrency(detectedCurrency);
      if (detectedCurrency === "USD") {
        try {
          const rate = await getUSDtoEGPExchangeRate();
          setExchangeRate(rate);
        } catch (err) {}
      }
      fetchProduct(detectedCurrency);
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
  }, [resolvedParams.id]); // eslint-disable-line

  async function fetchProduct(resolvedCurrency: Currency) {
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

      // If still not loaded, query bundles table
      if (!data) {
        const { data: bundleData } = await supabaseClient
          .from("bundles")
          .select("*")
          .eq("id", resolvedParams.id)
          .maybeSingle();
        if (bundleData) {
          data = bundleData;
        }
      }

      if (!data) throw new Error("المحتوى المطلوب غير متوفر حالياً");
      
      // Resolve prices depending on resolvedCurrency
      const resolvedPricing = resolveProductPrice(data, resolvedCurrency);
      
      const mappedProduct: Product = {
        ...data,
        price: resolvedPricing.price,
        original_price: resolvedPricing.original_price
      };

      setProduct(mappedProduct);
      setIsCourse(isCourseItem);
      
      // Track InitiateCheckout in Supabase analytics database
      trackEvent("checkout_started", mappedProduct.id, mappedProduct.title, {
        price: mappedProduct.price,
        currency: resolvedCurrency,
        type: isCourseItem ? "course" : "product"
      });
      
      // Restore Instapay modal if user is returning from external payment link
      if (typeof window !== "undefined") {
        const instapayPending = sessionStorage.getItem(`instapay_pending_${resolvedParams.id}`);
        if (instapayPending === "true") {
          setInstapayReturnBanner(true);
          setPaymentMethod("instapay");
        }
      }
      
      // Track InitiateCheckout
      if (typeof window !== "undefined") {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'InitiateCheckout', {
            content_name: mappedProduct.title,
            content_ids: [mappedProduct.id],
            content_type: isCourseItem ? 'course' : 'product',
            value: mappedProduct.price,
            currency: resolvedCurrency
          });
        }
        if ((window as any).ttq) {
          (window as any).ttq.track('InitiateCheckout', {
            contents: [{ content_id: mappedProduct.id, content_name: mappedProduct.title, price: mappedProduct.price, quantity: 1 }],
            content_type: isCourseItem ? 'course' : 'product',
            value: mappedProduct.price,
            currency: resolvedCurrency
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

  const { register, handleSubmit, setValue, trigger, getValues, setError, clearErrors, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const fullName = session.user.user_metadata?.full_name || "";
        const parts = fullName.split(" ");
        setValue("firstName", parts[0] || "");
        setValue("lastName", parts.slice(1).join(" ") || "");
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
    }
    const passwordVal = getValues("password");
    if (!user && (!passwordVal || passwordVal.trim() === "")) {
      setError("password", { type: "manual", message: "يُرجى إكمال جميع الحقول لإتمام الدفع" });
    }
    toast.error("يُرجى إكمال جميع الحقول لإتمام الدفع");
  };

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponInput.trim().toUpperCase())}&itemId=${resolvedParams.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedCoupon({
          code: data.code,
          percent: data.discount_percent
        });
        setCouponError("");
        toast.success(`تم تطبيق الكوبون بنجاح بخصم ${data.discount_percent}%`);
      } else {
        setCouponError(data.error || "كود الخصم غير صالح");
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error(err);
      setCouponError("فشل التحقق من الكوبون");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  async function onSubmit(data: CheckoutValues) {
    if (!product) return;

    const isFree = appliedCoupon && appliedCoupon.percent === 100;

    if (!isFree && paymentMethod === "card") {
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
          setError("password", { type: "manual", message: "يُرجى إكمال جميع الحقول لإتمام الدفع" });
          toast.error("يُرجى إكمال جميع الحقول لإتمام الدفع");
          setIsLoading(false);
          return;
        }

        if (paymentMethod !== "instapay") {
          // Try to sign up
          const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                full_name: `${data.firstName} ${data.lastName}`,
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
      }

      console.log("[CARD_NAME_INPUT] Final React State Value:", cardHolder);

      const baseFinalPrice = appliedCoupon 
        ? Math.round(product.price * (1 - appliedCoupon.percent / 100)) 
        : product.price;

      const subtotalEGP = currency === "USD"
        ? Math.round(baseFinalPrice * exchangeRate)
        : baseFinalPrice;

      const isFeeActive = currency === "EGP" && paymentMethod !== "instapay" && globalFeeEnabled && (product.enable_gateway_fee !== false) && baseFinalPrice > 0;
      const gatewayFeeAmount = isFeeActive ? Math.ceil(subtotalEGP * (globalFeePercentage / 100)) : 0;
      const finalPriceEGP = subtotalEGP + gatewayFeeAmount;

      const payloadBody = {
        amount: finalPriceEGP,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: "",
        productId: resolvedParams.id,
        paymentMethod: isFree ? "free" : paymentMethod, 
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        cardData: (!isFree && paymentMethod === "card") ? {
          cardNumber,
          expiry: expiryDate,
          cvv,
          cardHolder
        } : undefined,
        gatewayFeeEnabled: isFeeActive,
        gatewayFeeAmount,
        subtotalPrice: subtotalEGP,
        gateway_fee_percentage: isFeeActive ? globalFeePercentage : 0,
        password: data.password || undefined,
        instapayScreenshotUrl: paymentMethod === "instapay" ? (instapayScreenshotUrl || undefined) : undefined
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
          window.location.assign(result.checkoutUrl); 
        } else {
          toast.success("جاري تأكيد عملية الدفع...");
          window.location.assign(result.checkoutUrl); 
        }
      } else if (result.success) {
         if (paymentMethod === "instapay") {
           // Copy file to clipboard
           if (instapayFile) {
             try {
               const data = [new ClipboardItem({ [instapayFile.type]: instapayFile })];
               await navigator.clipboard.write(data);
               toast.success("تم نسخ لقطة الشاشة للحافظة! يمكنك لصقها مباشرة في واتساب (Ctrl+V)");
             } catch (err) {
               console.error("Clipboard copy failed:", err);
             }
           }
           
           // Open WhatsApp URL
           const waText = (isCourse 
             ? `مرحباً، لقد قمت بدفع قيمة اشتراك دورة ${product?.title || ''} أريد الانضمام للكورس الآن.`
             : `مرحباً، لقد قمت بدفع قيمة منتج ${product?.title || ''} أريد الحصول عليه الآن.`
            ) + 
            `\n\nبيانات العميل:\n` +
            `- الاسم: ${data.firstName} ${data.lastName}\n` +
            `- البريد الإلكتروني: ${data.email}\n` +
            (data.password ? `- كلمة المرور: ${data.password}\n` : '') +
            (instapayScreenshotUrl ? `\nإثبات التحويل:\n${instapayScreenshotUrl}` : '');
           
           const waUrl = `https://wa.me/201107099196?text=${encodeURIComponent(waText)}`;
           window.open(waUrl, "_blank");
         }

         toast.success(isFree ? "تم تفعيل الكورس بنجاح!" : (paymentMethod === "instapay" ? "تم تسجيل طلبك بنجاح! جاري تحويلك لواتساب..." : "تم الدفع بنجاح!"));
         // Clear the instapay pending flag on successful completion
         sessionStorage.removeItem(`instapay_pending_${resolvedParams.id}`);
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

  const basePriceAfterCoupon = appliedCoupon 
    ? Math.round(product.price * (1 - appliedCoupon.percent / 100)) 
    : product.price;

  const showFeeRecover = currency === "EGP" && paymentMethod !== "instapay" && globalFeeEnabled && (product.enable_gateway_fee !== false) && basePriceAfterCoupon > 0;
  const subtotalForFeeEGP = currency === "USD" ? Math.round(basePriceAfterCoupon * exchangeRate) : basePriceAfterCoupon;
  const feeAmountEGP = showFeeRecover ? Math.ceil(subtotalForFeeEGP * (globalFeePercentage / 100)) : 0;

  const isCheapItem = subtotalForFeeEGP < 100;
  const showFeeRowSeparately = showFeeRecover && !isCheapItem;

  const feeAmountFormatted = currency === "USD" ? Number((basePriceAfterCoupon * (globalFeePercentage / 100)).toFixed(2)) : feeAmountEGP;
  const finalPriceFormatted = currency === "USD" 
    ? Number((basePriceAfterCoupon + feeAmountFormatted).toFixed(2))
    : (basePriceAfterCoupon + feeAmountEGP);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-cairo">
      <Navbar />

      {/* Instapay Return Banner - Shows when user returns from external Instapay payment */}
      {instapayReturnBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-gradient-to-r from-purple-900/95 to-purple-800/95 border-b border-purple-500/30 backdrop-blur-xl p-3 text-center font-cairo"
        >
          <div className="container mx-auto flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-purple-200 text-sm font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400"></span>
              </span>
              هل أكملت التحويل عبر Instapay؟ ارفع صورة إثبات الدفع لإتمام طلبك!
            </div>
            <button
              onClick={() => {
                setShowInstapayModal(true);
                setInstapayReturnBanner(false);
              }}
              className="bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              رفع إثبات الدفع الآن
            </button>
            <button
              onClick={() => {
                setInstapayReturnBanner(false);
                sessionStorage.removeItem(`instapay_pending_${resolvedParams.id}`);
              }}
              className="text-purple-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
      
      <main className="pt-32 pb-24 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* Header */}
          <div className="flex flex-col items-center justify-center text-center gap-2 mb-12">
            <Link href={`/product/${product?.slug || resolvedParams.id}`} className="inline-flex items-center text-zinc-500 hover:text-white font-cairo transition-all mb-3 group">
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              العودة لتفاصيل المنتج
            </Link>
            <h1 className="text-3xl md:text-5xl font-alexandria font-black text-white tracking-tight">إتمام الطلب بأمان</h1>
          </div>

          <div className="max-w-3xl mx-auto w-full">
            
            {/* Checkout Form */}
            <div className="flex flex-col gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0a0a0f]/80 backdrop-blur-2xl rounded-[2rem] p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff0f53] to-[#ff00b3]" />
                
                <h2 className="text-xl font-alexandria font-bold text-white mb-6">معلومات الاستلام</h2>
                
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" dir="rtl">

                  {/* Compact Order Summary Box */}
                  <div className="bg-[#050505]/40 border border-white/5 rounded-2xl p-4 mb-6 space-y-4">
                    {/* Row 1: Product Image + Title & Coupon Code */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Product details */}
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                            <Image
                              src={product.image_url}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                            <Package className="w-6 h-6 text-zinc-500" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-sm font-alexandria font-bold text-white leading-tight">
                            {product.title}
                          </h3>
                          {isCourse && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full mt-1 font-bold">
                              <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                              انضمام فوري للقسم
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Coupon */}
                      <div className="flex items-center gap-2 max-w-xs w-full md:w-auto">
                        {appliedCoupon ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-full">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-emerald-400">{appliedCoupon.code}</span>
                              <span className="text-[10px] text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded-full font-bold font-mono">-{appliedCoupon.percent}%</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-[11px] text-zinc-500 hover:text-white transition-colors mr-2 cursor-pointer font-bold font-cairo"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="relative flex items-center w-full">
                            <input
                              type="text"
                              placeholder="أدخل كوبون الخصم..."
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value)}
                              disabled={isValidatingCoupon}
                              className="w-full h-9 rounded-xl bg-white/5 border border-white/5 text-white text-xs font-cairo px-3 pl-16 hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-0 outline-none transition-all text-right"
                              dir="rtl"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={isValidatingCoupon || !couponInput.trim()}
                              className="absolute left-1 h-7 px-3 text-xs bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-lg transition-all font-bold cursor-pointer disabled:opacity-50 font-cairo"
                            >
                              {isValidatingCoupon ? "..." : "تطبيق"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {couponError && <p className="text-[11px] text-red-400 font-cairo mt-1 text-right" dir="rtl">{couponError}</p>}

                    {/* Row 2: Horizontal Price Breakdown */}
                    <div className="flex flex-wrap items-center justify-between md:justify-start gap-x-6 gap-y-2 pt-3 border-t border-white/5 text-sm font-cairo">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs">السعر الأصلي:</span>
                        <span className="text-zinc-400 font-bold line-through">
                          {formatPrice(product.original_price || product.price, currency)}
                        </span>
                      </div>

                      {discountPct !== null && discountPct > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-xs">خصم الدورة ({discountPct}%):</span>
                          <span className="text-emerald-400 font-bold" dir="ltr">
                            -{formatPrice(savings, currency)}
                          </span>
                        </div>
                      )}

                      {appliedCoupon && (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-xs">خصم الكوبون ({appliedCoupon.percent}%):</span>
                          <span className="text-emerald-400 font-bold" dir="ltr">
                            -{formatPrice(Math.round(product.price * (appliedCoupon.percent / 100)), currency)}
                          </span>
                        </div>
                      )}

                      {showFeeRowSeparately && (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs">رسوم الدفع:</span>
                          <span className="text-zinc-400 font-bold">
                            {formatPrice(feeAmountFormatted, currency)}
                          </span>
                        </div>
                      )}

                      <div className="md:mr-auto flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
                        <span className="text-rose-400 font-bold text-xs">الإجمالي:</span>
                        <span className="text-base text-white font-alexandria font-black">
                          {formatPrice(finalPriceFormatted, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* First Name & Last Name Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-cairo font-bold text-zinc-400 text-sm">الاسم الأول</Label>
                      <div className="relative">
                        <Input 
                          placeholder="الاسم الأول" 
                          className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all text-right", errors.firstName && "border-red-500/50 focus:ring-red-500")}
                          disabled={isLoading}
                          autoFocus
                          {...register("firstName")}
                        />
                      </div>
                      {errors.firstName && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.firstName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="font-cairo font-bold text-zinc-400 text-sm">الاسم الأخير</Label>
                      <div className="relative">
                        <Input 
                          placeholder="الاسم الأخير" 
                          className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all text-right", errors.lastName && "border-red-500/50 focus:ring-red-500")}
                          disabled={isLoading}
                          {...register("lastName")}
                        />
                      </div>
                      {errors.lastName && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.lastName.message}</p>}
                    </div>
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

                  {!user && (
                    <>
                      <div className="space-y-2">
                        <Label className="font-cairo font-bold text-zinc-400 text-sm">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input 
                            placeholder="••••••••" 
                            type={showPassword ? "text" : "password"}
                            dir="ltr"
                            className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all pl-11 pr-11", errors.password && "border-red-500/50 focus:ring-red-500")}
                            disabled={isLoading}
                            {...register("password")}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/10 cursor-pointer"
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
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
                  {!(appliedCoupon && appliedCoupon.percent === 100) && (
                    <div className="pt-4 mt-4">
                      <Label className="font-cairo font-bold text-zinc-400 text-sm mb-3 block">طريقة الدفع</Label>
                      <div className={cn("grid gap-3", currency === "EGP" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1")}>
                        
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
                            onClick={() => {
                              setPaymentMethod("instapay");
                            }}
                            className={cn(
                              "cursor-pointer border rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]",
                              paymentMethod === "instapay" 
                                ? "border-purple-500/50 bg-purple-500/10 shadow-[inset_0_0_30px_rgba(147,51,234,0.1)]" 
                                : "border-white/5 bg-white/5 hover:border-purple-500/30 hover:bg-purple-500/5 hover:shadow-[inset_0_0_20px_rgba(147,51,234,0.05)]"
                            )}
                          >
                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === "instapay" ? "border-purple-500" : "border-zinc-500")}>
                              {paymentMethod === "instapay" && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                            </div>
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-900/30 shrink-0">
                              <span className={cn("text-[8px] font-black font-sans", paymentMethod === "instapay" ? "text-purple-400" : "text-zinc-500")}>IPN</span>
                            </div>
                            <div className="font-cairo">
                              <p className={cn("font-bold", paymentMethod === "instapay" ? "text-white" : "text-zinc-300")}>Instapay تحويل فوري</p>
                              <p className="text-xs text-zinc-500">تحويل بنكي فوري عبر إنستاباي</p>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {/* Inline Card Fields (Animated transition) */}
                  {!(appliedCoupon && appliedCoupon.percent === 100) && (
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
                          <Label className="font-cairo text-xs text-zinc-400 text-right block">رقم البطاقة</Label>
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
                          {cardErrors.number && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.number}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="font-cairo text-xs text-zinc-400 text-right block">تاريخ الانتهاء</Label>
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
                            {cardErrors.expiry && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.expiry}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-cairo text-xs text-zinc-400 text-right block">رمز الأمان (CVV)</Label>
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
                            {cardErrors.cvv && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.cvv}</p>}
                          </div>
                        </div>

                        {/* Card Holder Input */}
                        <div className="space-y-1.5">
                          <Label className="font-cairo text-xs text-zinc-400 text-right block">اسم حامل البطاقة</Label>
                          <Input 
                            value={cardHolder}
                            onChange={handleCardHolderChange}
                            placeholder="الاسم كما هو مكتوب على البطاقة" 
                            className={cn("h-12 rounded-xl bg-white/5 border-white/5 text-white text-sm font-cairo hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all text-right", 
                              cardErrors.holder ? "border-red-500/50 focus:ring-red-500" : (cardHolder.length >= 3 ? "border-emerald-500/50 focus:ring-emerald-500" : "")
                            )}
                            disabled={isLoading}
                          />
                          {cardErrors.holder && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.holder}</p>}
                        </div>

                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/5 mt-8">
                    {!(appliedCoupon && appliedCoupon.percent === 100) ? (
                      <>
                        <Button 
                          type={paymentMethod === "instapay" ? "button" : "submit"}
                          onClick={async (e) => {
                            if (paymentMethod === "instapay") {
                              e.preventDefault();
                              const fieldsToValidate: ("firstName" | "lastName" | "email" | "password")[] = ["firstName", "lastName", "email"];
                              if (!user) {
                                fieldsToValidate.push("password");
                              }
                              const isValid = await trigger(fieldsToValidate);
                              const passwordVal = getValues("password");
                              const isPasswordMissing = !user && (!passwordVal || passwordVal.trim() === "");

                              if (isValid && !isPasswordMissing) {
                                setShowInstapayModal(true);
                              } else {
                                toast.error("يُرجى إكمال جميع الحقول لإتمام الدفع");
                                if (isPasswordMissing) {
                                  setError("password", { type: "manual", message: "يُرجى إكمال جميع الحقول لإتمام الدفع" });
                                }
                              }
                            }
                          }}
                          disabled={isLoading}
                          className={cn(
                            "w-full h-14 text-white font-alexandria text-lg font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer",
                            paymentMethod === "card" 
                              ? "bg-[#D6004B] hover:bg-[#b0003d] shadow-[0_4px_14px_0_rgba(214,0,75,0.39)] hover:shadow-[0_6px_20px_rgba(214,0,75,0.23)] hover:-translate-y-0.5" 
                              : paymentMethod === "instapay"
                                ? "bg-purple-600 hover:bg-purple-500 shadow-[0_4px_14px_0_rgba(147,51,234,0.39)] hover:shadow-[0_6px_20px_rgba(147,51,234,0.23)] hover:-translate-y-0.5"
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
                            ) : paymentMethod === "instapay" ? (
                              <>إتمام الطلب عن طريق إنستاباي</>
                            ) : (
                              <>إتمام الطلب بواسطة المحفظة</>
                            )
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className={cn(
                            "w-full h-14 text-white font-alexandria text-lg font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer",
                            "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] hover:-translate-y-0.5"
                          )}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin ml-2" />
                              جاري تفعيل طلبك...
                            </>
                          ) : (
                            isCourse ? (
                              <>تفعيل الكورس مجاناً والانضمام فوراً <Sparkles className="w-5 h-5 mr-3 opacity-80" /></>
                            ) : (
                              <>تأكيد الطلب والحصول على المنتج مجاناً <Sparkles className="w-5 h-5 mr-3 opacity-80" /></>
                            )
                          )}
                        </Button>
                      </>
                    )}

                    {currency === "USD" && (
                      <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-cairo text-center leading-relaxed">
                        Notice: Final payment will be processed in EGP based on the current exchange rate ($1 = {exchangeRate.toFixed(2)} EGP).
                        <br />
                        تنبيه: سيتم معالجة الدفع النهائي بالجنيه المصري (EGP) بناءً على سعر الصرف الحالي ($1 = {exchangeRate.toFixed(2)} ج.م).
                      </div>
                    )}


                  </div>
                </form>
              </motion.div>
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
                <p className="text-3xl font-alexandria font-black text-white">
                  {formatPrice(finalPriceFormatted, currency)}
                </p>
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
                onClick={() => {
                  // Mark that user is going to pay via instapay externally so we can detect return
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem(`instapay_pending_${resolvedParams.id}`, "true");
                  }
                }}
                className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(147,51,234,0.3)] font-cairo"
              >
                ادفع مباشرة عبر Instapay
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </a>

              <div className="space-y-2">
                {instapayScreenshot ? (
                  <div className="relative rounded-xl overflow-hidden border border-purple-500/30 bg-white/5">
                    <img src={instapayScreenshot} alt="لقطة شاشة التحويل" className="w-full h-auto max-h-48 object-contain" />
                    {isUploadingScreenshot && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                          <span className="text-xs text-purple-300 font-cairo">جاري رفع الصورة...</span>
                        </div>
                      </div>
                    )}
                    {!isUploadingScreenshot && (
                      <button
                        onClick={() => { setInstapayScreenshot(null); setInstapayScreenshotUrl(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center text-white transition-all text-sm"
                      >
                        &times;
                      </button>
                    )}
                    {instapayScreenshotUrl && !isUploadingScreenshot && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full font-cairo">
                        <CheckCircle2 className="w-3 h-3" />
                        تم رفع الصورة
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="w-full h-24 border-2 border-dashed border-white/10 hover:border-purple-500/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/[0.02]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-zinc-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-xs text-zinc-500 font-cairo">ارفع لقطة شاشة التحويل</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      // Show local preview immediately
                      const localUrl = URL.createObjectURL(file);
                      setInstapayScreenshot(localUrl);
                      setInstapayFile(file);
                      setIsUploadingScreenshot(true);
                      try {
                        const fileName = `instapay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${file.name.split('.').pop()}`;
                        const { data, error } = await supabaseClient.storage.from('instapay-receipts').upload(fileName, file, { cacheControl: '3600', upsert: false });
                        if (error) throw error;
                        const shortUrl = `${window.location.origin}/api/receipt/${fileName}`;
                        setInstapayScreenshotUrl(shortUrl);
                        toast.success('تم رفع الصورة بنجاح');
                      } catch (err) {
                        console.error('Upload error:', err);
                        toast.error('حدث خطأ أثناء رفع الصورة، حاول مرة أخرى');
                        setInstapayScreenshot(null);
                      } finally {
                        setIsUploadingScreenshot(false);
                      }
                    }} />
                  </label>
                )}
              </div>

              <button 
                type="button"
                disabled={!instapayScreenshotUrl || isLoading}
                onClick={handleSubmit(onSubmit)}
                className={cn(
                  "w-full h-12 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all font-cairo",
                  (instapayScreenshotUrl && !isLoading)
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                    : "bg-zinc-700 cursor-not-allowed opacity-50"
                )}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {isLoading ? "جاري تسجيل الطلب..." : "أرسل إثبات الدفع عبر واتساب"}
              </button>
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
