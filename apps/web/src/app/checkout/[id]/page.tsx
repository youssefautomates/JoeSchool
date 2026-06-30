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
import { Lock, ShieldCheck, CreditCard, ChevronRight, ChevronDown, Loader2, ShieldAlert, Sparkles, CheckCircle2, Package, Mail, Eye, EyeOff, BookOpen, LayoutDashboard, User, Smartphone, Wallet as WalletIcon } from "lucide-react";
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
import { trackInitiateCheckout } from "@/lib/metaPixel";
import { trackTiktokInitiateCheckout } from "@/lib/tiktokPixel";

import { resolveUserCurrency, resolveProductPrice, formatPrice, getUSDtoEGPExchangeRate, type Currency } from "@/lib/pricing";
import { getUserEnrollments } from "@/lib/coursesDb";
import { normalizePhoneNumber } from "@/lib/phone";
import dynamic from "next/dynamic";
const PhoneInput = dynamic(() => import("react-phone-input-2"), { ssr: false });
import "react-phone-input-2/lib/style.css";

const checkoutSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم بالكامل يجب أن يكون 3 أحرف على الأقل" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  password: z.string().optional(),
});

const countries = [
  { code: "EG", dial: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "KW", dial: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "QA", dial: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "OM", dial: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "BH", dial: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "JO", dial: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "LY", dial: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "SD", dial: "+249", flag: "🇸🇩", name: "Sudan" },
  { code: "IQ", dial: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "USA" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "UK" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
];

type CheckoutValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet" | "instapay" | null>(null);
  const [showInstapayModal, setShowInstapayModal] = useState(false);
  const [instapayReturnBanner, setInstapayReturnBanner] = useState(false);
  const [instapayScreenshot, setInstapayScreenshot] = useState<string | null>(null);
  const [instapayScreenshotUrl, setInstapayScreenshotUrl] = useState<string | null>(null);
  const [instapayFile, setInstapayFile] = useState<File | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [isCourse, setIsCourse] = useState(false);
  const [isBundle, setIsBundle] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [currency, setCurrency] = useState<Currency>("EGP");
  const [exchangeRate, setExchangeRate] = useState<number>(50.0);
  
  // Global gateway fee settings state
  const [globalFeeEnabled, setGlobalFeeEnabled] = useState(true);
  const [globalFeePercentage, setGlobalFeePercentage] = useState(3.00);
  
  // Deduplication Event ID for Meta CAPI
  const checkoutEventId = useRef(`checkout_${resolvedParams.id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`);
  
  // Wallet Fields State
  const [walletNumber, setWalletNumber] = useState("");
  const [walletNumberError, setWalletNumberError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWallet = localStorage.getItem("joeschool_wallet_number") || "";
      setWalletNumber(savedWallet);
    }
  }, []);

  const handleWalletNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, 11);
    setWalletNumber(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("joeschool_wallet_number", value);
    }
    
    if (value.length > 0) {
      if (value.startsWith("0")) {
        if (value.length < 11) {
          setWalletNumberError("رقم المحفظة يجب أن يكون 11 رقم");
        } else if (!value.startsWith("01")) {
          setWalletNumberError("رقم المحفظة يجب أن يبدأ بـ 01");
        } else {
          setWalletNumberError("");
        }
      } else if (value.startsWith("1")) {
        if (value.length < 10) {
          setWalletNumberError("رقم المحفظة يجب أن يكون 10 أرقام عند الإدخال بدون 0");
        } else if (value.length > 10) {
          setWalletNumberError("رقم المحفظة غير صحيح (الحد الأقصى 10 أرقام بدون 0)");
        } else {
          setWalletNumberError("");
        }
      } else {
        setWalletNumberError("يجب أن يبدأ الرقم بـ 01 أو 1");
      }
    } else {
      setWalletNumberError("");
    }
  };

  const isWalletValid = 
    !walletNumberError && (
      (walletNumber.length === 11 && walletNumber.startsWith("01")) ||
      (walletNumber.length === 10 && walletNumber.startsWith("1"))
    );

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
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [enrolledCourseSlug, setEnrolledCourseSlug] = useState("");
  const [firstLessonSlug, setFirstLessonSlug] = useState("");

  useEffect(() => {
    async function checkEnrollment() {
      if (!user || !resolvedParams.id) return;
      try {
        let courseId = resolvedParams.id;
        let courseSlug = "";
        
        if (product) {
          if (isCourse) {
            courseSlug = product.slug || "";
          } else {
            const { data: coursesList } = await supabaseClient
              .from("courses")
              .select("id, title, slug")
              .order("id", { ascending: true });
            
            if (coursesList) {
              const matched = coursesList.find(c => 
                c.id === resolvedParams.id ||
                c.title.toLowerCase().includes(product.title?.toLowerCase()) || 
                product.title?.toLowerCase().includes(c.title.toLowerCase())
              );
              if (matched) {
                courseId = matched.id;
                courseSlug = matched.slug;
              }
            }
          }
        } else {
          if (resolvedParams.id.startsWith("course-")) {
            const { data: cData } = await supabaseClient
              .from("courses")
              .select("slug")
              .eq("id", resolvedParams.id)
              .maybeSingle();
            if (cData) {
              courseSlug = cData.slug;
            }
          }
        }
        
        const { data: enroll } = await supabaseClient
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle();
        
        if (enroll) {
          setIsAlreadyEnrolled(true);
          setEnrolledCourseSlug(courseSlug);
          
          if (courseSlug) {
            const { data: modules } = await supabaseClient
              .from("course_modules")
              .select("id")
              .eq("course_id", courseId)
              .order("sort_order", { ascending: true })
              .limit(1);
            
            if (modules && modules.length > 0) {
              const { data: lessons } = await supabaseClient
                .from("course_lessons")
                .select("slug")
                .eq("module_id", modules[0].id)
                .order("sort_order", { ascending: true })
                .limit(1);
              
              if (lessons && lessons.length > 0) {
                setFirstLessonSlug(lessons[0].slug);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error checking enrollment status:", e);
      }
    }
    checkEnrollment();
  }, [user, product, isCourse, resolvedParams.id]);

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
    // Track checkout_page_opened immediately on page mount - don't wait for product fetch
    trackEvent("checkout_page_opened", resolvedParams.id, "Checkout", {
      type: "single",
      pathname: window.location.pathname
    });
  }, [resolvedParams.id]);

  // Track Meta Pixel InitiateCheckout on page load once product is available
  useEffect(() => {
    if (product && typeof window !== "undefined") {
      const isFree = product.price === 0 || product.price === null || product.price === undefined;
      const finalPriceEGP = isFree ? 0 : Number(product.price);
      trackInitiateCheckout(product.id, product.title, finalPriceEGP, "EGP", isCourse ? "course" : "product", checkoutEventId.current);
      trackTiktokInitiateCheckout(product.id, product.title, finalPriceEGP, "EGP", isCourse ? "course" : "product");
    }
  }, [product, isCourse]);

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
      let isBundleItem = false;

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
          isBundleItem = true;
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
      setIsBundle(isBundleItem);
      
      // Restore Instapay modal if user is returning from external payment link
      if (typeof window !== "undefined") {
        const instapayPending = sessionStorage.getItem(`instapay_pending_${resolvedParams.id}`);
        if (instapayPending === "true") {
          setInstapayReturnBanner(true);
          setPaymentMethod("instapay");
        }
      }
    } catch (error: any) {
      console.error("Error fetching product:", error);
      toast.error(error.message || "فشل تحميل تفاصيل المنتج للcheckout");
    } finally {
      setIsFetching(false);
    }
  }



  const { register, handleSubmit, setValue, trigger, getValues, setError, clearErrors, watch, formState: { errors } } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const fullNameValue = watch("fullName");
  const emailValue = watch("email");
  const passwordValue = watch("password");

  const isFree = appliedCoupon && appliedCoupon.percent === 100;
  const isFormValid = !!(
    fullNameValue?.trim() &&
    emailValue?.trim() &&
    !errors.fullName &&
    !errors.email &&
    (isFree || !paymentMethod || paymentMethod !== "card" || (
      cardNumber.replace(/\s/g, "").length === 16 &&
      expiryDate.length === 5 &&
      cvv.length >= 3 &&
      cardHolder.trim().length >= 3 &&
      !cardErrors.number &&
      !cardErrors.expiry &&
      !cardErrors.cvv &&
      !cardErrors.holder
    ))
  );

  const [phoneVal, setPhoneVal] = useState("");
  const [dialCode, setDialCode] = useState("20");
  const [detectedCountry, setDetectedCountry] = useState("eg");

  const [emailStatus, setEmailStatus] = useState<any>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const handleEmailBlur = async () => {
    if (!emailValue) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) return;

    setIsCheckingEmail(true);
    try {
      let checkCourseId = resolvedParams.id;
      if (product && !isCourse) {
        const { data: coursesList } = await supabaseClient
          .from("courses")
          .select("id, title")
          .order("id", { ascending: true });
        
        if (coursesList) {
          const matched = coursesList.find(c => 
            c.id === resolvedParams.id ||
            c.title.toLowerCase().includes(product.title?.toLowerCase()) || 
            product.title?.toLowerCase().includes(c.title.toLowerCase())
          );
          if (matched) {
            checkCourseId = matched.id;
          }
        }
      }

      const response = await fetch(`/api/checkout/detect-email?email=${encodeURIComponent(emailValue.trim())}&courseId=${checkCourseId}`);
      const data = await response.json();
      
      if (response.ok) {
        setEmailStatus({
          checked: true,
          exists: data.exists,
          ownsCourse: data.ownsCourse,
          userId: data.userId,
          courseSlug: data.courseSlug,
          firstLessonSlug: data.firstLessonSlug,
        });

        if (data.ownsCourse) {
          setIsAlreadyEnrolled(true);
          setEnrolledCourseSlug(data.courseSlug || "");
          setFirstLessonSlug(data.firstLessonSlug || "");
        } else {
          if (!user) {
            setIsAlreadyEnrolled(false);
          }
        }
      }
    } catch (err) {
      console.error("Error checking email:", err);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    if (!user && emailStatus) {
      setEmailStatus(null);
      setIsAlreadyEnrolled(false);
    }
  }, [emailValue, user]);

  useEffect(() => {
    async function detectCountry() {
      try {
        const response = await fetch("/api/pricing/detect");
        const data = await response.json();
        if (data && data.country) {
          setDetectedCountry(data.country.toLowerCase());
        }
      } catch (err) {
        console.warn("Failed to detect country:", err);
      }
    }
    detectCountry();
  }, []);

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const fullName = session.user.user_metadata?.full_name || "";
        setValue("fullName", fullName);
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

    const nameParts = data.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "Student";

    const isFree = appliedCoupon && appliedCoupon.percent === 100;

    if (!isFree && !paymentMethod) {
      toast.error("يُرجى اختيار طريقة الدفع أولاً");
      return;
    }

    if (!isFree && paymentMethod === "card") {
      const isValid = validateCardFields();
      if (!isValid) {
        toast.error("توجد أخطاء في بيانات البطاقة، يرجى مراجعتها.");
        return;
      }
    }

    if (!isFree && paymentMethod === "wallet") {
      if (!isWalletValid) {
        setWalletNumberError(walletNumber.length === 0 ? "رقم الهاتف مطلوب للدفع بالمحفظة" : "يرجى إدخال رقم محفظة صحيح مكون من 11 رقم يبدأ بـ 01");
        toast.error("يرجى إدخال رقم محفظة إلكترونية صحيح");
        return;
      }
    }

    setIsLoading(true);
    try {
      let activeUser = user;

      // If user is not logged in, perform Instant Purchase Authentication (only if password is provided)
      if (!activeUser && !emailStatus?.exists && data.password) {
        // Try to sign in. If it fails, we proceed without blocking (backend will handle account creation/resolution)
        try {
          const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: data.email.toLowerCase().trim(),
            password: data.password,
          });

          if (!signInError && signInData?.user) {
            activeUser = signInData.user;
            setUser(signInData.user);
            console.log("[CHECKOUT] Existing user signed in successfully before payment");
            
            // Check if they are already enrolled in this course
            let courseId = resolvedParams.id;
            if (product && !isCourse) {
              const { data: coursesList } = await supabaseClient
                .from("courses")
                .select("id, title")
                .order("id", { ascending: true });
              if (coursesList) {
                const matched = coursesList.find(c => 
                  c.id === resolvedParams.id ||
                  c.title.toLowerCase().includes(product.title?.toLowerCase()) || 
                  product.title?.toLowerCase().includes(c.title.toLowerCase())
                );
                if (matched) courseId = matched.id;
              }
            }
            
            const { data: enroll } = await supabaseClient
              .from("enrollments")
              .select("id")
              .eq("user_id", signInData.user.id)
              .eq("course_id", courseId)
              .maybeSingle();
            
            if (enroll) {
              setIsAlreadyEnrolled(true);
              toast.error("أنت مشترك بالفعل في هذا الكورس.");
              setIsLoading(false);
              return;
            }
          } else {
            console.log("[CHECKOUT] Sign-in failed or new user. Account creation deferred to payment success.");
          }
        } catch (e) {
          console.log("[CHECKOUT] Deferred sign-in exception:", e);
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
      const gatewayFeeAmount = isFeeActive ? Math.ceil(subtotalEGP * (globalFeePercentage / 100) + 3) : 0;
      const finalPriceEGP = subtotalEGP + gatewayFeeAmount;

      const payloadBody = {
        amount: finalPriceEGP,
        email: data.email,
        firstName: firstName,
        lastName: lastName,
        phone: phoneVal ? normalizePhoneNumber(phoneVal, dialCode) : "",
        productId: resolvedParams.id,
        paymentMethod: isFree ? "free" : paymentMethod, 
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        cardData: (!isFree && paymentMethod === "card") ? {
          cardNumber,
          expiry: expiryDate,
          cvv,
          cardHolder
        } : undefined,
        walletNumber: (!isFree && paymentMethod === "wallet") 
          ? (walletNumber.startsWith("1") ? `0${walletNumber}` : walletNumber) 
          : undefined,
        gatewayFeeEnabled: isFeeActive,
        gatewayFeeAmount,
        subtotalPrice: subtotalEGP,
        gateway_fee_percentage: isFeeActive ? globalFeePercentage : 0,
        password: data.password || undefined,
        instapayScreenshotUrl: paymentMethod === "instapay" ? (instapayScreenshotUrl || undefined) : undefined,
        checkoutEventId: checkoutEventId.current
      };

      console.log("[FORM_SUBMIT_DATA] Request body before fetch:", JSON.stringify(payloadBody, null, 2));

      // Track Checkout Started
      trackEvent("checkout_started", product.id, product.title, {
        price: finalPriceEGP,
        currency: "EGP", // Everything is converted to EGP for paymob payload
        type: isCourse ? "course" : "product",
        paymentMethod: isFree ? "free" : paymentMethod
      });
      
      if (typeof window !== "undefined") {
        trackInitiateCheckout(product.id, product.title, finalPriceEGP, "EGP", isCourse ? "course" : "product");
        trackTiktokInitiateCheckout(product.id, product.title, finalPriceEGP, "EGP", isCourse ? "course" : "product");
      }

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
            `- الاسم: ${data.fullName}\n` +
            `- البريد الإلكتروني: ${data.email}\n` +
            (data.password ? `- كلمة المرور: ${data.password}\n` : '') +
            (phoneVal ? `- رقم الهاتف: ${normalizePhoneNumber(phoneVal, dialCode)}\n` : '') +
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
        <h1 className="text-3xl font-cairo font-bold mb-4">عذراً، المنتج غير متاح للcheckout</h1>
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
  const feeAmountEGP = showFeeRecover ? Math.ceil(subtotalForFeeEGP * (globalFeePercentage / 100) + 3) : 0;

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

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="flex flex-col items-center justify-center text-center gap-4 mb-8">
            <Link 
              href={
                product?.slug 
                  ? (isCourse 
                      ? `/courses/${product.slug}` 
                      : (isBundle 
                          ? `/bundles/${product.slug}` 
                          : `/product/${product.slug}`)) 
                  : `/checkout/${resolvedParams.id}`
              } 
              className="inline-flex items-center text-zinc-500 hover:text-white font-cairo transition-all group text-sm"
            >
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              العودة لتفاصيل المنتج
            </Link>

            <h1 className="text-3xl sm:text-4xl font-cairo font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff0f53] via-[#ff2d6b] to-white mt-1 drop-shadow-[0_2px_15px_rgba(255,15,83,0.2)] select-none">
              إتمـام الطلب
            </h1>
          </div>



          <div className="w-full">
            {isAlreadyEnrolled ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0f]/80 backdrop-blur-2xl rounded-[2rem] p-8 border border-rose-500/20 shadow-2xl relative overflow-hidden text-center space-y-6 max-w-3xl mx-auto"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
                
                <div className="w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
                  <Sparkles className="w-10 h-10 animate-pulse" />
                </div>
                
                {user ? (
                  <>
                    <h2 className="text-2xl font-cairo font-bold text-white leading-snug">لقد قمت بشراء هذا الكورس وإنشاء حساب بالفعل.</h2>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto font-cairo">
                      يمكنك متابعة التعلم مباشرة.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <Link
                        href={enrolledCourseSlug ? `/learn/${enrolledCourseSlug}/${firstLessonSlug || ""}` : "/dashboard"}
                        className="h-12 px-8 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-cairo font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(244,63,94,0.25)] transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <span>🎓 اذهب إلى الكورس الآن</span>
                      </Link>
                      
                      <Link
                        href="/dashboard"
                        className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white font-cairo font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-zinc-400" />
                        <span>لوحة التحكم</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-cairo font-bold text-white leading-snug">تم العثور على اشتراك سابق لهذا البريد الإلكتروني.</h2>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto font-cairo">
                      لقد قمت بشراء هذا الكورس وإنشاء حساب بالفعل. يرجى تسجيل الدخول للوصول إلى محتوى الكورس.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <Link
                        href={`/login?email=${encodeURIComponent(emailValue || "")}&redirect=${encodeURIComponent(enrolledCourseSlug ? `/learn/${enrolledCourseSlug}/${firstLessonSlug || ""}` : `/checkout/${resolvedParams.id}`)}`}
                        className="h-12 px-8 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-cairo font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(244,63,94,0.25)] transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <span>🔑 تسجيل الدخول</span>
                      </Link>
                      
                      <Link
                        href="/login/forgot-password"
                        className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white font-cairo font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
                      >
                        <span>🔒 نسيت كلمة المرور</span>
                      </Link>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Right Column (Forms) */}
                  <div className="lg:col-span-8 space-y-4 md:space-y-6">
                    
                    {/* Personal Information */}
                    <div className="bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 hover:border-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="space-y-2">
                          <Label className="font-cairo font-bold text-zinc-400 text-sm">الاسم بالكامل *</Label>
                          <Input 
                            placeholder="ادخل اسمك لإنشاء الحساب" 
                            className={cn(
                              "h-12 rounded-lg bg-white/[0.02] border text-white text-sm font-cairo hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500/40 transition-all text-right pr-4 pl-4",
                              fullNameValue && fullNameValue.length > 0
                                ? (errors.fullName 
                                    ? "border-red-500/40 focus:border-red-500 focus:ring-red-500/20" 
                                    : "border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500/20")
                                : "border-white/10 focus:border-white/30"
                            )}
                            disabled={isLoading}
                            {...register("fullName")}
                          />
                          {errors.fullName && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.fullName.message}</p>}
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label className="font-cairo font-bold text-zinc-400 text-sm">البريد الإلكتروني *</Label>
                          <div className="relative">
                            <Mail 
                              className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                                emailValue && emailValue.length > 0
                                  ? (errors.email ? "text-red-400" : "text-emerald-400")
                                  : "text-zinc-500"
                              )} 
                            />
                            <Input 
                              placeholder="name@email.com" 
                              type="email"
                              dir="ltr"
                              className={cn(
                                "h-12 rounded-lg bg-white/[0.02] border text-white text-sm font-cairo hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-rose-500/20 focus:border-rose-500/40 transition-all pl-11",
                                emailValue && emailValue.length > 0
                                  ? (errors.email 
                                      ? "border-red-500/40 focus:border-red-500 focus:ring-red-500/20" 
                                      : "border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500/20")
                                  : "border-white/10 focus:border-white/30"
                              )}
                              disabled={isLoading}
                              {...register("email", {
                                onBlur: handleEmailBlur
                              })}
                            />
                          </div>
                          {errors.email && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1"><ShieldAlert className="w-3 h-3" /> {errors.email.message}</p>}
                          {emailStatus?.exists && !emailStatus?.ownsCourse && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3 font-cairo text-sm mt-3 text-right">
                              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <p className="font-bold">مرحباً بك مجدداً!</p>
                                <p className="text-zinc-300 text-xs mt-1">
                                  هذا البريد الإلكتروني مسجل لدينا بالفعل. سيتم ربط هذا الكورس بحسابك الحالي فور إتمام الدفع دون الحاجة لإنشاء حساب جديد.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Password and Phone fields removed from UI, state and background values are kept intact */}

                      <style>{`
                        .react-tel-input {
                          font-family: var(--font-cairo), sans-serif;
                          width: 100%;
                        }
                        .react-tel-input .form-control {
                          height: 48px !important;
                          width: 100% !important;
                          background-color: rgba(255, 255, 255, 0.05) !important;
                          border: 1px solid rgba(255, 255, 255, 0.05) !important;
                          border-radius: 12px !important;
                          color: white !important;
                          font-size: 14px !important;
                          padding-left: 56px !important;
                          transition: all 0.2s ease !important;
                        }
                        .react-tel-input .form-control:focus {
                          background-color: rgba(255, 255, 255, 0.1) !important;
                          border-color: rgba(255, 255, 255, 0.2) !important;
                          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
                        }
                        .react-tel-input .flag-dropdown {
                          background-color: transparent !important;
                          border: none !important;
                          border-radius: 12px 0 0 12px !important;
                          padding: 0 !important;
                          height: 46px !important;
                          top: 1px !important;
                          left: 1px !important;
                        }
                        .react-tel-input .flag-dropdown:hover, 
                        .react-tel-input .flag-dropdown.open,
                        .react-tel-input .selected-flag:hover {
                          background-color: rgba(255, 255, 255, 0.05) !important;
                          border-radius: 12px 0 0 12px !important;
                        }
                        .react-tel-input .selected-flag {
                          background-color: transparent !important;
                          padding-left: 12px !important;
                          width: 48px !important;
                        }
                        .react-tel-input .selected-flag .arrow {
                          border-top-color: #a1a1aa !important;
                          left: 28px !important;
                        }
                        .react-tel-input .selected-flag .arrow.up {
                          border-bottom-color: #a1a1aa !important;
                        }
                        .react-tel-input .country-list {
                          background-color: #0c0c0e !important;
                          border: 1px solid rgba(255, 255, 255, 0.1) !important;
                          border-radius: 12px !important;
                          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                          margin-top: 6px !important;
                          width: 320px !important;
                          padding: 6px 0 !important;
                          z-index: 9999 !important;
                          max-height: 220px !important;
                          overflow-y: auto !important;
                        }
                        .react-tel-input .country-list::-webkit-scrollbar {
                          width: 6px;
                        }
                        .react-tel-input .country-list::-webkit-scrollbar-thumb {
                          background-color: rgba(255, 255, 255, 0.1);
                          border-radius: 3px;
                        }
                        .react-tel-input .country-list .search {
                          padding: 6px 10px !important;
                          background-color: #0c0c0e !important;
                          position: sticky !important;
                          top: 0 !important;
                          z-index: 10 !important;
                          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                        }
                        .react-tel-input .country-list .search-box {
                          width: 100% !important;
                          height: 36px !important;
                          background-color: rgba(255, 255, 255, 0.05) !important;
                          border: 1px solid rgba(255, 255, 255, 0.1) !important;
                          border-radius: 8px !important;
                          color: white !important;
                          font-size: 13px !important;
                          padding: 0 10px !important;
                          margin: 0 !important;
                        }
                        .react-tel-input .country-list .search-box:focus {
                          border-color: rgba(255, 255, 255, 0.2) !important;
                          outline: none !important;
                        }
                        }
                      `}</style>
                    </div>

                    {/* Payment Method Selector */}
                    {!(appliedCoupon && appliedCoupon.percent === 100) && (
                      <div className="bg-[#0a0a0f]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-5 md:p-8 hover:border-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
                        <div className="flex items-center justify-start gap-2.5 mb-5 select-none" dir="rtl">
                          <CreditCard className="w-5 h-5 text-[#ff0f53] shrink-0" />
                          <h3 className="font-cairo font-bold text-white text-base">اختر طريقة الدفع</h3>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                          {/* Card Option */}
                          <motion.div 
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setPaymentMethod("card")}
                            className={cn(
                              "relative cursor-pointer rounded-xl border transition-all duration-300 select-none",
                              "flex flex-row items-center justify-between gap-2 sm:gap-4 h-[70px] px-3 sm:px-4 py-3 w-full",
                              paymentMethod === "card" 
                                ? "border-[#D6004B] bg-[#D6004B]/5 shadow-[0_0_20px_rgba(214,0,75,0.12)]" 
                                : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]"
                            )}
                            dir="rtl"
                          >
                            {/* Right group: Radio + Text */}
                            <div className="flex items-center gap-2 sm:gap-3.5">
                              {/* Radio indicator */}
                              <div className={cn(
                                "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                                paymentMethod === "card" ? "border-[#D6004B] bg-[#D6004B]/10" : "border-white/10 bg-white/5"
                              )}>
                                {paymentMethod === "card" && <div className="w-2.5 h-2.5 rounded-full bg-[#D6004B]" />}
                              </div>
                              
                              {/* Text */}
                              <div className="text-right">
                                <h4 className={cn("font-bold text-sm sm:text-base transition-colors leading-tight whitespace-nowrap", paymentMethod === "card" ? "text-white" : "text-zinc-300")}>
                                  البطاقات البنكية
                                </h4>
                              </div>
                            </div>

                            {/* Left group: Logos */}
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0" dir="ltr">
                              <Image 
                                src="/payment-logos/visa.svg" 
                                alt="Visa" 
                                width={54} 
                                height={18} 
                                className="h-3.5 sm:h-[22px] w-auto object-contain opacity-95" 
                                priority
                              />
                              <Image 
                                src="/payment-logos/mastercard.svg" 
                                alt="Mastercard" 
                                width={36} 
                                height={22} 
                                className="h-4 sm:h-[24px] w-auto object-contain opacity-95" 
                                priority
                              />
                              <Image 
                                src="/payment-logos/meeza.svg" 
                                alt="Meeza" 
                                width={41} 
                                height={20} 
                                className="h-3.5 sm:h-[22px] w-auto object-contain opacity-95" 
                                priority
                              />
                            </div>
                          </motion.div>

                          {/* Wallet Option */}
                          {currency === "EGP" && (
                            <motion.div 
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => setPaymentMethod("wallet")}
                              className={cn(
                                "relative cursor-pointer rounded-xl border transition-all duration-300 select-none",
                                "flex flex-col w-full px-3 sm:px-4 py-0",
                                paymentMethod === "wallet" 
                                  ? "border-[#D6004B] bg-[#D6004B]/5 shadow-[0_0_20px_rgba(214,0,75,0.12)]" 
                                  : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]"
                              )}
                              dir="rtl"
                            >
                              {/* Header row — same height as card/instapay */}
                              <div className="flex items-center justify-between w-full h-[70px] gap-2 sm:gap-4">
                                <div className="flex items-center gap-2 sm:gap-3.5">
                                  {/* Radio indicator */}
                                  <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                                    paymentMethod === "wallet" ? "border-[#D6004B] bg-[#D6004B]/10" : "border-white/10 bg-white/5"
                                  )}>
                                    {paymentMethod === "wallet" && <div className="w-2.5 h-2.5 rounded-full bg-[#D6004B]" />}
                                  </div>
                                  
                                  {/* Text */}
                                  <div className="text-right">
                                    <h4 className={cn("font-bold text-sm sm:text-base transition-colors leading-tight whitespace-nowrap", paymentMethod === "wallet" ? "text-white" : "text-zinc-300")}>
                                      محفظة إلكترونية
                                    </h4>
                                  </div>
                                </div>

                                {/* Left group: Logos */}
                                <div className="flex items-center gap-1 sm:gap-2 shrink-0" dir="ltr">
                                  <Image 
                                    src="/payment-logos/vodafone.svg" 
                                    alt="Vodafone Cash" 
                                    width={20} 
                                    height={20} 
                                    className="h-3.5 sm:h-[22px] w-auto object-contain" 
                                  />
                                  <Image 
                                    src="/payment-logos/orange.svg" 
                                    alt="Orange Cash" 
                                    width={20} 
                                    height={20} 
                                    className="h-3.5 sm:h-[22px] w-auto object-contain rounded" 
                                  />
                                  <Image 
                                    src="/payment-logos/fawry.svg" 
                                    alt="Fawry" 
                                    width={50} 
                                    height={16} 
                                    className="h-3.5 sm:h-[22px] w-auto object-contain" 
                                  />
                                </div>
                              </div>

                              {/* Expandable Inner Content (Input & Helper Text) */}
                              <div className={cn(
                                "transition-all duration-500 ease-in-out overflow-hidden w-full",
                                paymentMethod === "wallet" ? "max-h-[200px] opacity-100 pb-4 pt-4 border-t border-white/5" : "max-h-0 opacity-0 pointer-events-none"
                              )}>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <div className={cn(
                                      "relative flex items-center rounded-xl bg-white/[0.02] border transition-all h-14 w-full overflow-hidden", 
                                      walletNumberError 
                                        ? "border-red-500/40 focus-within:ring-2 focus-within:ring-red-500/10 focus-within:border-red-500" 
                                        : (isWalletValid 
                                            ? "border-emerald-500/40 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500" 
                                            : "border-white/10 focus-within:border-[#D6004B] focus-within:ring-2 focus-within:ring-[#D6004B]/10 hover:border-white/20"
                                          )
                                    )} dir="ltr">
                                      {/* Country prefix on the left */}
                                      <div className="flex items-center gap-2 px-4 border-r border-white/5 bg-white/[0.01] h-full shrink-0 select-none">
                                        <span className="text-xl">🇪🇬</span>
                                        <span className="text-sm font-semibold text-zinc-400 font-sans">+20</span>
                                      </div>
                                      {/* Input field */}
                                      <input 
                                        type="tel"
                                        value={walletNumber}
                                        onChange={handleWalletNumberChange}
                                        placeholder="رقم الهاتف" 
                                        maxLength={11}
                                        inputMode="numeric"
                                        className="h-full flex-grow bg-transparent text-white font-cairo text-base px-4 focus:outline-none placeholder-zinc-500 text-left placeholder-shown:text-right"
                                        dir="ltr"
                                        disabled={isLoading}
                                      />
                                      {/* Checkmark on the right */}
                                      {isWalletValid && (
                                        <div className="pr-3 shrink-0 flex items-center justify-center">
                                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        </div>
                                      )}
                                    </div>
                                    {walletNumberError && (
                                      <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl">
                                        <ShieldAlert className="w-3 h-3 inline ml-1" /> {walletNumberError}
                                      </p>
                                    )}
                                    {!walletNumberError && (
                                      <p className="text-[11px] text-zinc-500 font-cairo text-right mt-1.5 leading-relaxed">
                                        سيتم استخدام هذا الرقم لإرسال طلب الدفع إلى محفظتك الإلكترونية.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Instapay Option */}
                          {currency === "EGP" && (
                            <motion.div 
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => setPaymentMethod("instapay")}
                              className={cn(
                                "relative cursor-pointer rounded-xl border transition-all duration-300 select-none",
                                "flex flex-row items-center justify-between gap-2 sm:gap-4 h-[70px] px-3 sm:px-4 py-3 w-full",
                                paymentMethod === "instapay" 
                                  ? "border-[#D6004B] bg-[#D6004B]/5 shadow-[0_0_20px_rgba(214,0,75,0.12)]" 
                                  : "border-white/5 bg-white/[0.01] hover:border-purple-500/10 hover:bg-purple-500/[0.005] hover:border-white/10"
                              )}
                              dir="rtl"
                            >
                              {/* Right group: Radio + Text */}
                              <div className="flex items-center gap-2 sm:gap-3.5">
                                {/* Radio indicator */}
                                <div className={cn(
                                  "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                                  paymentMethod === "instapay" ? "border-[#D6004B] bg-[#D6004B]/10" : "border-white/10 bg-white/5"
                                )}>
                                  {paymentMethod === "instapay" && <div className="w-2.5 h-2.5 rounded-full bg-[#D6004B]" />}
                                </div>
                                
                                {/* Text */}
                                <div className="text-right">
                                  <h4 className={cn("font-bold text-sm sm:text-base transition-colors leading-tight whitespace-nowrap", paymentMethod === "instapay" ? "text-white" : "text-zinc-300")}>
                                    إنستاباي - Instapay
                                  </h4>
                                </div>
                              </div>

                              {/* Left group: Logos */}
                              <div className="flex items-center shrink-0 select-none" dir="ltr">
                                <Image 
                                  src="/payment-logos/instapay.svg" 
                                  alt="Instapay" 
                                  width={64} 
                                  height={22} 
                                  className="h-3.5 sm:h-[22px] w-auto object-contain" 
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Inline Card Fields (Animated transition, now merged inside the same parent card) */}
                        <div className={cn(
                          "transition-all duration-500 ease-in-out overflow-hidden",
                          paymentMethod === "card" ? "max-h-[600px] opacity-100 mt-6 pt-6 border-t border-white/5" : "max-h-0 opacity-0 pointer-events-none"
                        )}>
                          <div className="space-y-4">
                            <div className="flex items-center justify-start gap-2.5 mb-1" dir="rtl">
                              <Lock className="w-5 h-5 text-[#ff0f53] shrink-0" />
                              <h3 className="font-cairo font-bold text-white text-base">بيانات البطاقة</h3>
                            </div>
                            <p className="text-[11px] text-zinc-500 pr-7 text-right block mb-4">جميع البيانات مشفرة وآمنة</p>

                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <Label className="font-cairo text-xs text-zinc-400 text-right block pr-1">رقم البطاقة</Label>
                                <div className="relative">
                                  <Input 
                                    ref={cardNumberRef}
                                    value={cardNumber}
                                    onChange={handleCardNumberChange}
                                    placeholder="1234 5678 9012 3456" 
                                    dir="ltr"
                                    maxLength={19}
                                    inputMode="numeric"
                                    className={cn("h-12 rounded-lg bg-white/[0.02] border text-white font-mono text-base tracking-widest hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all pr-12 pl-4", 
                                      cardErrors.number ? "border-red-500/40 focus:ring-red-500/20" : (cardNumber.length === 19 ? "border-emerald-500/40 focus:ring-emerald-500/20" : "border-white/10")
                                    )}
                                    disabled={isLoading}
                                  />
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                    {cardNumber.length === 19 && !cardErrors.number ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                      <CreditCard className="w-5 h-5 text-zinc-500" />
                                    )}
                                  </div>
                                </div>
                                {cardErrors.number && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.number}</p>}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label className="font-cairo text-xs text-zinc-400 text-right block pr-1">تاريخ الانتهاء</Label>
                                  <Input 
                                    value={expiryDate}
                                    onChange={handleExpiryChange}
                                    placeholder="MM/YY" 
                                    dir="ltr"
                                    maxLength={5}
                                    inputMode="numeric"
                                    className={cn("h-12 rounded-lg bg-white/[0.02] border text-white font-mono text-base text-center hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all", 
                                      cardErrors.expiry ? "border-red-500/40 focus:ring-red-500/20" : (expiryDate.length === 5 ? "border-emerald-500/40 focus:ring-emerald-500/20" : "border-white/10")
                                    )}
                                    disabled={isLoading}
                                  />
                                  {cardErrors.expiry && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.expiry}</p>}
                                </div>
                                
                                <div className="space-y-1.5">
                                  <Label className="font-cairo text-xs text-zinc-400 text-right block pr-1">رمز التحقق (CVV)</Label>
                                  <Input 
                                    value={cvv}
                                    onChange={handleCvvChange}
                                    placeholder="123" 
                                    type="password"
                                    dir="ltr"
                                    maxLength={3}
                                    inputMode="numeric"
                                    className={cn("h-12 rounded-lg bg-white/[0.02] border text-white font-mono text-base text-center hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all", 
                                      cardErrors.cvv ? "border-red-500/40 focus:ring-red-500/20" : (cvv.length === 3 ? "border-emerald-500/40 focus:ring-emerald-500/20" : "border-white/10")
                                    )}
                                    disabled={isLoading}
                                  />
                                  {cardErrors.cvv && <p className="text-xs text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.cvv}</p>}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="font-cairo text-xs text-zinc-400 text-right block pr-1">اسم حامل البطاقة</Label>
                                <Input 
                                  value={cardHolder}
                                  onChange={handleCardHolderChange}
                                  placeholder="كما هو مكتوب على البطاقة" 
                                  className={cn("h-12 rounded-lg bg-white/[0.02] border text-white text-sm font-cairo hover:bg-white/[0.05] focus:bg-white/[0.07] focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all text-right pr-4 pl-4", 
                                    cardErrors.holder ? "border-red-500/40 focus:border-red-500/20" : (cardHolder.length >= 3 ? "border-emerald-500/40 focus:border-emerald-500/20" : "border-white/10")
                                  )}
                                  disabled={isLoading}
                                />
                                {cardErrors.holder && <p className="text-[10px] text-red-400 font-cairo flex items-center gap-1 mt-1 text-right" dir="rtl"><ShieldAlert className="w-3 h-3 inline ml-1" /> {cardErrors.holder}</p>}
                              </div>

                              {/* Save Card Checkbox */}
                              <label className="flex items-center gap-3 cursor-pointer select-none group mt-1" dir="rtl">
                                <div 
                                  onClick={() => setSaveCard(!saveCard)}
                                  className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                                    saveCard 
                                      ? "bg-[#D6004B] border-[#D6004B] shadow-[0_0_8px_rgba(214,0,75,0.3)]" 
                                      : "border-white/15 bg-white/5 group-hover:border-white/25"
                                  )}
                                >
                                  {saveCard && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors font-cairo">حفظ بيانات البطاقة لعمليات الشراء القادمة</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mobile-only CTA Section (Placed directly under payment fields) */}
                    <div className="block lg:hidden mt-6 space-y-4">
                      {/* Submit Button */}
                      {!(appliedCoupon && appliedCoupon.percent === 100) ? (
                        <>
                          {paymentMethod ? (
                            <Button 
                              type={paymentMethod === "instapay" ? "button" : "submit"}
                              onClick={async (e) => {
                                if (paymentMethod === "instapay") {
                                  e.preventDefault();
                                  const fieldsToValidate: ("fullName" | "email")[] = ["fullName", "email"];
                                  const isValid = await trigger(fieldsToValidate);

                                  if (isValid) {
                                    setShowInstapayModal(true);
                                  } else {
                                    toast.error("يُرجى إكمال جميع الحقول لإتمام الدفع");
                                  }
                                }
                              }}
                              disabled={isLoading}
                              className={cn(
                                "w-full h-14 font-cairo text-lg font-bold rounded-xl transition-all duration-300",
                                isFormValid
                                  ? "bg-[#D6004B] text-white hover:bg-[#b0003d] shadow-[0_4px_20px_0_rgba(214,0,75,0.4)] cursor-pointer active:scale-[0.98]"
                                  : "bg-[#D6004B]/30 text-white/50 cursor-not-allowed shadow-none"
                              )}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin ml-2" />
                                  جاري تجهيز الدفع...
                                </>
                              ) : (
                                <>إتمام الدفع - {formatPrice(finalPriceFormatted, currency)}</>
                              )}
                            </Button>
                          ) : null}
                        </>
                      ) : (
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className={cn(
                            "w-full h-14 font-cairo text-lg font-bold rounded-xl transition-all duration-300",
                            isFormValid
                              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-[0_4px_20px_rgba(16,185,129,0.4)] cursor-pointer active:scale-[0.98]"
                              : "bg-gradient-to-r from-emerald-500/30 to-teal-600/30 text-white/50 cursor-not-allowed shadow-none"
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
                      )}

                      {((appliedCoupon && appliedCoupon.percent === 100) || paymentMethod) && (
                        <p className="text-[10px] text-zinc-500 text-center mt-2 font-cairo leading-relaxed">
                          بالضغط على الزر أعلاه، أنت توافق على <Link href="/privacy" className="underline hover:text-white transition-colors">الشروط والأحكام</Link> و <Link href="/privacy" className="underline hover:text-white transition-colors">سياسة الخصوصية</Link>
                        </p>
                      )}
                    </div>

                    {/* Mobile-only Order Summary & Invoice Card */}
                    <div className="block lg:hidden bg-white/[0.015] backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 hover:border-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.37)] space-y-6 mt-6">

                      {/* Coupon Input */}
                      <div>
                        {appliedCoupon ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl w-full">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-mono font-bold text-emerald-400">{appliedCoupon.code}</span>
                              <span className="text-[10px] text-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 rounded-full font-bold font-mono">-{appliedCoupon.percent}%</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-[11px] text-zinc-400 hover:text-white transition-colors mr-2 cursor-pointer font-bold font-cairo"
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
                              className="w-full h-11 rounded-lg bg-white/5 border border-white/5 text-white text-xs font-cairo px-4 pl-16 hover:bg-white/[0.07] focus:bg-white/10 focus:border-white/20 focus:ring-0 outline-none transition-all text-right"
                              dir="rtl"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={isValidatingCoupon || !couponInput.trim()}
                              className="absolute left-1.5 h-8 px-4 text-xs bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-lg transition-all font-bold cursor-pointer disabled:opacity-50 font-cairo"
                            >
                              {isValidatingCoupon ? "..." : "تطبيق"}
                            </button>
                          </div>
                        )}
                        {couponError && <p className="text-[11px] text-red-400 font-cairo mt-1 text-right" dir="rtl">{couponError}</p>}
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="border-t border-white/5 pt-4 space-y-3 font-cairo text-sm text-zinc-400">
                        <div className="flex justify-between items-center">
                          <span>السعر الأصلي:</span>
                          <span className="font-bold line-through text-zinc-500">
                            {formatPrice(product.original_price || product.price, currency)}
                          </span>
                        </div>

                        {discountPct !== null && discountPct > 0 && (
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>خصم الدورة ({discountPct}%):</span>
                            <span className="font-bold" dir="ltr">
                              -{formatPrice(savings, currency)}
                            </span>
                          </div>
                        )}

                        {appliedCoupon && (
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>خصم الكوبون ({appliedCoupon.percent}%):</span>
                            <span className="font-bold" dir="ltr">
                              -{formatPrice(Math.round(product.price * (appliedCoupon.percent / 100)), currency)}
                            </span>
                          </div>
                        )}

                        {showFeeRowSeparately && (
                          <div className="flex justify-between items-center">
                            <span>رسوم الدفع:</span>
                            <span className="font-bold">
                              {formatPrice(feeAmountFormatted, currency)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                          <span className="text-white font-bold">الإجمالي:</span>
                          <span className="text-lg text-white font-cairo font-black">
                            {formatPrice(finalPriceFormatted, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                        {product.image_url ? (
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                            <Image
                              src={product.image_url}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                            <Package className="w-6 h-6 text-zinc-500" />
                          </div>
                        )}
                        <div className="text-right">
                          <h3 className="text-sm font-cairo font-bold text-white leading-relaxed">
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
                    </div>

                    {/* Desktop-only Invoice & Payment Card */}
                    <div className="hidden lg:block bg-white/[0.015] backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 hover:border-white/10 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.37)] space-y-6">

                      <div className="border-b border-white/5 pb-4 mb-6 space-y-3 font-cairo text-sm text-zinc-400">
                        <div className="flex justify-between items-center">
                          <span>السعر الأصلي:</span>
                          <span className="font-bold line-through text-zinc-500">
                            {formatPrice(product.original_price || product.price, currency)}
                          </span>
                        </div>

                        {discountPct !== null && discountPct > 0 && (
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>خصم الدورة ({discountPct}%):</span>
                            <span className="font-bold" dir="ltr">
                              -{formatPrice(savings, currency)}
                            </span>
                          </div>
                        )}

                        {appliedCoupon && (
                          <div className="flex justify-between items-center text-emerald-400">
                            <span>خصم الكوبون ({appliedCoupon.percent}%):</span>
                            <span className="font-bold" dir="ltr">
                              -{formatPrice(Math.round(product.price * (appliedCoupon.percent / 100)), currency)}
                            </span>
                          </div>
                        )}

                        {showFeeRowSeparately && (
                          <div className="flex justify-between items-center">
                            <span>رسوم الدفع:</span>
                            <span className="font-bold">
                              {formatPrice(feeAmountFormatted, currency)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                          <span className="text-white font-bold">الإجمالي:</span>
                          <span className="text-lg text-white font-cairo font-black">
                            {formatPrice(finalPriceFormatted, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      {!(appliedCoupon && appliedCoupon.percent === 100) ? (
                        <>
                          {paymentMethod ? (
                            <Button 
                              type={paymentMethod === "instapay" ? "button" : "submit"}
                              onClick={async (e) => {
                                if (paymentMethod === "instapay") {
                                  e.preventDefault();
                                  const fieldsToValidate: ("fullName" | "email")[] = ["fullName", "email"];
                                  const isValid = await trigger(fieldsToValidate);

                                  if (isValid) {
                                    setShowInstapayModal(true);
                                  } else {
                                    toast.error("يُرجى إكمال جميع الحقول لإتمام الدفع");
                                  }
                                }
                              }}
                              disabled={isLoading}
                              className={cn(
                                "w-full h-14 font-cairo text-lg font-bold rounded-xl transition-all duration-300",
                                isFormValid
                                  ? "bg-[#D6004B] text-white hover:bg-[#b0003d] shadow-[0_4px_20px_0_rgba(214,0,75,0.4)] cursor-pointer active:scale-[0.98]"
                                  : "bg-[#D6004B]/30 text-white/50 cursor-not-allowed shadow-none"
                              )}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin ml-2" />
                                  جاري تجهيز الدفع...
                                </>
                              ) : (
                                <>إتمام الدفع - {formatPrice(finalPriceFormatted, currency)}</>
                              )}
                            </Button>
                          ) : null}
                        </>
                      ) : (
                        <Button 
                          type="submit" 
                          disabled={isLoading}
                          className={cn(
                            "w-full h-14 font-cairo text-lg font-bold rounded-xl transition-all duration-300",
                            isFormValid
                              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-[0_4px_20px_rgba(16,185,129,0.4)] cursor-pointer active:scale-[0.98]"
                              : "bg-gradient-to-r from-emerald-500/30 to-teal-600/30 text-white/50 cursor-not-allowed shadow-none"
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
                      )}

                    {((appliedCoupon && appliedCoupon.percent === 100) || paymentMethod) && (
                      <p className="text-[10px] text-zinc-500 text-center mt-4 font-cairo leading-relaxed">
                        بالضغط على الزر أعلاه، أنت توافق على <Link href="/privacy" className="underline hover:text-white transition-colors">الشروط والأحكام</Link> و <Link href="/privacy" className="underline hover:text-white transition-colors">سياسة الخصوصية</Link>
                      </p>
                    )}
                  </div>



                </div>

                {/* Left Column (Desktop Only Sticky Sidebar) */}
                <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-32 space-y-6">
                  <div className="bg-white/[0.015] backdrop-blur-2xl border border-white/5 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:border-white/10 transition-all duration-300">
                    
                    {/* Coupon Field inside Sidebar */}
                    <div className="mb-6">
                      <Label className="font-cairo text-xs text-zinc-400 block mb-2 text-right">كوبون الخصم</Label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-2xl w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-emerald-400">{appliedCoupon.code}</span>
                            <span className="text-[10px] text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full font-bold font-mono">-{appliedCoupon.percent}%</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-xs text-zinc-400 hover:text-white transition-colors mr-2 cursor-pointer font-bold font-cairo"
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
                            className="w-full h-11 rounded-lg bg-white/5 border border-white/5 text-white text-xs font-cairo px-4 pl-16 hover:bg-white/[0.04] focus:bg-white/10 focus:border-white/15 focus:ring-0 outline-none transition-all text-right"
                            dir="rtl"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={isValidatingCoupon || !couponInput.trim()}
                            className="absolute left-1.5 h-8 px-4 text-xs bg-[#D6004B] hover:bg-[#b0003d] text-white rounded-lg transition-all font-bold cursor-pointer disabled:opacity-50 font-cairo"
                          >
                            {isValidatingCoupon ? "..." : "تطبيق"}
                          </button>
                        </div>
                      )}
                      {couponError && <p className="text-[11px] text-red-400 font-cairo mt-1.5 text-right" dir="rtl">{couponError}</p>}
                    </div>

                    {/* Pricing Breakdown inside Sidebar */}
                    <div className="border-t border-white/5 pt-4 space-y-3 font-cairo text-sm text-zinc-400">
                      <div className="flex justify-between items-center">
                        <span>السعر الأصلي:</span>
                        <span className="font-bold line-through text-zinc-500">
                          {formatPrice(product.original_price || product.price, currency)}
                        </span>
                      </div>

                      {discountPct !== null && discountPct > 0 && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>خصم الدورة ({discountPct}%):</span>
                          <span className="font-bold" dir="ltr">
                            -{formatPrice(savings, currency)}
                          </span>
                        </div>
                      )}

                      {appliedCoupon && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>خصم الكوبون ({appliedCoupon.percent}%):</span>
                          <span className="font-bold" dir="ltr">
                            -{formatPrice(Math.round(product.price * (appliedCoupon.percent / 100)), currency)}
                          </span>
                        </div>
                      )}

                      {showFeeRowSeparately && (
                        <div className="flex justify-between items-center">
                          <span>رسوم الدفع:</span>
                          <span className="font-bold">
                            {formatPrice(feeAmountFormatted, currency)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-white/5 pt-4">
                        <span className="text-white font-bold">الإجمالي:</span>
                        <span className="text-xl text-white font-cairo font-black">
                          {formatPrice(finalPriceFormatted, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Product Image and Title */}
                    <div className="flex flex-col gap-4 border-t border-white/5 pt-6 mt-6">
                      {product.image_url ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/5">
                          <Image
                            src={product.image_url}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-2xl bg-white/5 flex items-center justify-center border border-white/5">
                          <Package className="w-12 h-12 text-zinc-600" />
                        </div>
                      )}
                      
                      <div className="text-right">
                        <h3 className="text-base font-cairo font-bold text-white leading-relaxed font-cairo">
                          {product.title}
                        </h3>
                        {isCourse && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full mt-2 font-bold">
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            انضمام فوري للقسم
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sidebar trust checklist items */}
                    <div className="border-t border-white/5 pt-6 mt-6 space-y-4 font-cairo text-xs text-zinc-400 text-right">
                      <div className="flex items-center gap-2.5 justify-end">
                        <span>وصول فوري بعد الدفع</span>
                        <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                          <Sparkles className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 justify-end">
                        <span>ضمان استرجاع 7 أيام</span>
                        <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 justify-end">
                        <span>دعم فني طوال فترة الكورس</span>
                        <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </form>
          )}
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
                <div className="mx-auto mb-3.5 flex justify-center">
                  <Image 
                    src="/payment-logos/instapay.svg" 
                    alt="Instapay" 
                    width={130} 
                    height={44} 
                    className="h-10 w-auto object-contain" 
                    priority
                  />
                </div>
                <h3 className="text-xl font-cairo font-bold text-white">الدفع عبر Instapay</h3>
                <p className="text-sm text-zinc-400 font-cairo mt-1">قم بتحويل المبلغ ثم أرسل لقطة الشاشة</p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
                <p className="text-sm text-purple-300 font-cairo mb-1">المبلغ المطلوب تحويله</p>
                <p className="text-3xl font-cairo font-black text-white">
                  {formatPrice(finalPriceFormatted, currency)}
                </p>
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

              <div className="text-center bg-[#151522]/50 border border-emerald-500/10 rounded-xl p-2.5">
                <p className="text-xs text-zinc-300 font-cairo leading-normal">
                  تنويه: سيظهر اسم المستلم باسم <span className="text-emerald-400 font-bold">Youssef.M</span> عند التحويل
                </p>
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

