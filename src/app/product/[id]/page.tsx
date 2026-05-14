"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, FileText, Zap, ChevronRight, Lock, PlayCircle, Star, ShieldCheck, Download, Users, Check, Infinity, Target, Sparkles, MonitorPlay } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, use } from "react";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"details" | "video" | "reviews">("details");

  useEffect(() => {
    const saved = localStorage.getItem("store_products");
    if (saved) {
      const products = JSON.parse(saved);
      const found = products.find((p: any) => p.id.toString() === resolvedParams.id);
      if (found) setProduct(found);
    }
  }, [resolvedParams.id]);

  const defaultProduct = {
    name: "مكتبة الأتمتة الشاملة: +2000 تدفق عمل (n8n Workflows) جاهز للاستخدام",
    price: "49.00",
    originalPrice: "199.00",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop"
  };

  const currentProduct = product || defaultProduct;

  return (
    <>
      <Navbar />
      
      <main className="flex-1 pt-24 pb-32 md:pt-32 md:pb-24 bg-white">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="mb-6 md:mb-8 hidden md:block">
            <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-blue-600 font-cairo transition-colors text-sm">
              <ChevronRight className="w-4 h-4 ml-1" />
              العودة للرئيسية
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12 relative">
            
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8 md:space-y-12">
              
              {/* Product Header (Mobile First) */}
              <div className="block lg:hidden space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-50 text-blue-600 px-3 py-1 font-cairo border border-blue-100 text-xs">
                    🔥 الأكثر مبيعاً
                  </Badge>
                  <div className="flex items-center text-emerald-600 text-xs font-cairo font-bold">
                    <Star className="w-3 h-3 fill-emerald-600 mr-1" />
                    5.0 (284)
                  </div>
                </div>
                <h1 className="text-2xl md:text-4xl font-alexandria font-bold text-zinc-900 leading-tight">
                  {currentProduct.name}
                </h1>
              </div>

              {/* Image Gallery */}
              <div className="relative h-[250px] sm:h-[350px] md:h-[500px] bg-zinc-50 rounded-2xl border border-zinc-200 overflow-hidden flex items-center justify-center group shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-white via-transparent to-blue-50/30 z-10" />
                <Image 
                  src={currentProduct.image} 
                  alt={currentProduct.name} 
                  fill 
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                />
              </div>

              {/* Title & Description (Desktop) */}
              <div className="hidden lg:block">
                <div className="flex items-center gap-3 mb-6">
                  <Badge className="bg-blue-50 text-blue-600 px-4 py-1.5 font-cairo border border-blue-100">
                    🔥 الحزمة الشاملة الكبرى
                  </Badge>
                  <div className="flex items-center text-emerald-600 text-sm font-cairo font-bold">
                    <Star className="w-4 h-4 fill-emerald-600 mr-1" />
                    5.0 (284 تقييم)
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-alexandria font-bold text-zinc-900 mb-6 leading-tight">
                  {currentProduct.name}
                </h1>
                <p className="text-xl text-zinc-600 font-cairo leading-relaxed">
                  توقف عن إعادة اختراع العجلة! احصل على أضخم مكتبة عربية وعالمية تضم أكثر من <span className="text-blue-600 font-bold">2000 تدفق عمل (Workflow)</span> احترافي لمنصة n8n. كل ما تحتاجه لأتمتة التسويق، المبيعات، خدمة العملاء، وإدارة السيرفرات بضغطة زر واحدة (نسخ ولصق).
                </p>
              </div>

              {/* Interactive Tabs */}
              <div className="mt-8 border-b border-zinc-200 flex overflow-x-auto hide-scrollbar">
                {[
                  { id: "details", label: "تفاصيل المكتبة", icon: Sparkles },
                  { id: "video", label: "شرح المكتبة بالفيديو", icon: PlayCircle },
                  { id: "reviews", label: "التقييمات (284)", icon: Users },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 font-cairo font-bold text-sm md:text-base whitespace-nowrap transition-colors relative ${
                      activeTab === tab.id ? "text-blue-600" : "text-zinc-500 hover:text-blue-500"
                    }`}
                  >
                    <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="py-6 min-h-[400px]">
                <AnimatePresence mode="wait">
                  {activeTab === "details" && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-10"
                    >
                      {/* Why 2000+ Workflows? */}
                      <div className="prose prose-zinc max-w-none font-cairo">
                        <p className="text-lg leading-relaxed text-zinc-600 mb-6">
                          بناء أنظمة الأتمتة من الصفر يستهلك مئات الساعات وقد يكلفك آلاف الدولارات للمبرمجين. مع <strong>"مكتبة الـ 2000+ وورك فلو"</strong>، لقد قمنا بالعمل الشاق بالنيابة عنك. لقد جمعنا وصممنا واختبرنا تدفقات عمل تغطي 99% من احتياجات أي شركة أو مسوق أو مطور.
                        </p>
                      </div>

                      {/* What you get */}
                      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 md:p-8">
                        <h3 className="text-xl md:text-2xl font-alexandria font-bold text-zinc-900 mb-6">محتويات الحزمة بالتفصيل</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-cairo text-zinc-700">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                              <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 mb-1 text-lg">ملف JSON ضخم مقسم للفئات</h4>
                              <p className="text-sm text-zinc-500 leading-relaxed">ملفات جاهزة للاستيراد الفوري داخل مساحة عملك في n8n، مقسمة باحترافية (تسويق، مبيعات، ChatGPT، واتساب، الخ).</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                              <Target className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 mb-1 text-lg">دليل التفعيل والتنصيب</h4>
                              <p className="text-sm text-zinc-500 leading-relaxed">ملف PDF مرفق يشرح لك خطوة بخطوة كيفية رفع الـ Workflows وربطها مع حساباتك الخاصة بمفاتيح الـ API.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                              <Infinity className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 mb-1 text-lg">استخدام لا محدود (Lifetime)</h4>
                              <p className="text-sm text-zinc-500 leading-relaxed">ادفع مرة واحدة فقط، واستخدم الـ Workflows مع عدد لا نهائي من العملاء والمشاريع الخاصة بك.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100">
                              <CheckCircle2 className="w-6 h-6 text-cyan-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-zinc-900 mb-1 text-lg">محدثة بالكامل لعام 2026</h4>
                              <p className="text-sm text-zinc-500 leading-relaxed">جميع العقد (Nodes) تم تحديثها لتتوافق مع أحدث نسخة من n8n ولا تحتوي على أي عقد قديمة (Deprecated).</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Benefits & Value Proposition */}
                      <div>
                        <h3 className="text-xl md:text-2xl font-alexandria font-bold text-zinc-900 mb-6">قوة الـ 2000+ Workflow بين يديك</h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-cairo text-zinc-700">
                          {[
                            "أتمتة الردود على منصات التواصل عبر الذكاء الاصطناعي.",
                            "نقل البيانات أوتوماتيكياً بين Google Sheets و CRM.",
                            "أتمتة إرسال فواتير ورسائل ترحيب عبر الواتساب و Telegram.",
                            "نظام سكرتير آلي (AI Agent) للرد على استفسارات العملاء.",
                            "أتمتة حملات البريد الإلكتروني (Cold Email Outreach).",
                            "نشر المحتوى التلقائي على جميع منصات السوشيال ميديا.",
                            "استخراج البيانات (Web Scraping) بشكل يومي ومنتظم.",
                            "تتبع المبيعات وتحديث حالات الطلبات بدون تدخل بشري."
                          ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 hover:border-blue-200 transition-colors">
                              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                              <span className="text-sm md:text-base leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "video" && (
                    <motion.div
                      key="video"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-8"
                    >
                      {/* Video Text Context */}
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 md:p-8">
                        <h3 className="text-xl md:text-2xl font-alexandria font-bold text-zinc-900 mb-4 flex items-center gap-3">
                          <MonitorPlay className="w-6 h-6 text-blue-600" />
                          نظرة من الداخل على مكتبة الـ 2000+
                        </h3>
                        <p className="text-zinc-600 font-cairo text-sm md:text-base leading-relaxed">
                          في هذا الفيديو القصير، سنقوم بجولة حية داخل منصة n8n لنستعرض لك مدى سهولة استيراد وتفعيل تدفقات العمل. سترى بعينك كيف يمكنك تحويل مساحة العمل الفارغة إلى نظام أتمتة جبار يعمل بكامل طاقته خلال ثوانٍ معدودة فقط عن طريق عملية النسخ واللصق!
                        </p>
                      </div>

                      {/* Video Player Mock */}
                      <div className="aspect-video w-full bg-zinc-100 rounded-2xl border border-zinc-200 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden group shadow-xl cursor-pointer">
                        <Image 
                          src="https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?q=80&w=1200&auto=format&fit=crop" 
                          alt="Video Thumbnail" 
                          fill 
                          sizes="(max-width: 1024px) 100vw, 66vw"
                          className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent z-10" />
                        
                        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center relative z-20 group-hover:scale-110 transition-transform duration-300 shadow-xl">
                          <PlayCircle className="w-10 h-10 text-white ml-1" />
                        </div>
                        <h3 className="text-lg md:text-xl font-alexandria font-bold text-zinc-900 mt-6 relative z-20">
                          اضغط لتشغيل الشرح التوضيحي
                        </h3>
                        <p className="text-zinc-500 font-cairo text-sm mt-2 relative z-20 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm border border-zinc-200">
                          المدة: 3:45 دقائق
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "reviews" && (
                    <motion.div
                      key="reviews"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-8 bg-zinc-50 rounded-2xl border border-zinc-200 mb-8">
                        <div className="text-center md:border-l border-zinc-200 md:pl-8">
                          <p className="text-5xl md:text-6xl font-bold font-alexandria text-zinc-900">5.0</p>
                          <div className="flex text-emerald-500 justify-center my-3">
                            {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-emerald-500" />)}
                          </div>
                          <p className="text-zinc-500 text-sm font-cairo">من أصل 284 تقييم حقيقي</p>
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          {[
                            { stars: 5, perc: '98%' },
                            { stars: 4, perc: '2%' },
                            { stars: 3, perc: '0%' },
                            { stars: 2, perc: '0%' },
                            { stars: 1, perc: '0%' }
                          ].map((row) => (
                            <div key={row.stars} className="flex items-center gap-3 text-sm font-cairo text-zinc-500">
                              <span className="w-3 text-zinc-900 font-bold">{row.stars}</span>
                              <Star className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                              <div className="flex-1 h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: row.perc }} />
                              </div>
                              <span className="w-8 text-left">{row.perc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {[
                          { name: "محمد العبدالله", role: "مطور برمجيات", comment: "كمية الـ Workflows الموجودة مرعبة! بحثت في كل مكان عن حزم مشابهة ولم أجد بهذا الحجم والشمولية. التحديث الأخير للعقد كان ممتاز جداً." },
                          { name: "سارة خالد", role: "مديرة تسويق", comment: "كنت أصرف آلاف الدولارات على خدمات خارجية لربط المنصات ببعضها، هذا الملف حرفياً غيّر طريقة إدارتي للبزنس. النسخ واللصق يعمل بدون مشاكل!" },
                          { name: "فهد الدوسري", role: "رائد أعمال", comment: "شريته عشان وورك فلو واحد حق الواتساب، وتفاجأت بكمية الأفكار اللي ممكن أطبقها من باقي الملفات. استثمار لا يقدر بثمن." }
                        ].map((review, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-2xl border border-zinc-200 hover:border-blue-200 transition-colors shadow-sm">
                            <div className="flex items-center gap-2 mb-3 text-emerald-500">
                              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-emerald-500" />)}
                            </div>
                            <p className="text-zinc-600 font-cairo mb-6 text-sm md:text-base leading-relaxed">"{review.comment}"</p>
                            <div className="flex items-center gap-3 border-t border-zinc-100 pt-4">
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {review.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-zinc-900 text-sm font-bold font-cairo">{review.name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-zinc-500 text-xs font-cairo">{review.role}</p>
                                  <span className="w-1 h-1 bg-zinc-200 rounded-full" />
                                  <p className="text-emerald-600 text-xs font-cairo flex items-center gap-1">
                                    <Check className="w-3 h-3" /> مشتري موثق
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Sticky Sidebar / Checkout Box */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 z-30">
                {/* Desktop Urgency Callout */}
                <div className="hidden md:flex bg-red-50 border border-red-100 p-4 rounded-t-3xl flex-col items-center justify-center">
                  <p className="text-red-600 font-cairo font-bold mb-2">⚡ عرض الإطلاق ينتهي خلال:</p>
                  <CountdownTimer hours={18} />
                </div>

                <Card className="hidden md:block bg-white border-zinc-200 rounded-t-none rounded-b-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl pointer-events-none" />

                  <div className="text-center mb-6 relative z-10">
                    <span className="text-4xl lg:text-5xl font-alexandria font-bold text-zinc-900">{currentProduct.price} ج.م</span>
                    <span className="text-zinc-400 font-cairo text-lg mr-2 line-through">{currentProduct.originalPrice} ج.م</span>
                  </div>

                  <Separator className="bg-zinc-100 mb-6" />

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-zinc-700 font-cairo text-sm lg:text-base">
                      <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="font-bold">تسليم فوري (ملف JSON + PDF)</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-700 font-cairo text-sm lg:text-base">
                      <Infinity className="w-5 h-5 text-blue-600 shrink-0" />
                      <span>وصول مدى الحياة للتحديثات</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-700 font-cairo text-sm lg:text-base">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>دفع آمن ومحمي 100%</span>
                    </div>
                  </div>

                  <Link
                    href={`/checkout/${resolvedParams.id}`}
                    className="w-full h-14 lg:h-16 inline-flex items-center justify-center text-lg lg:text-xl font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-cairo mb-4 rounded-xl transition-all shadow-[0_10px_30px_rgba(37,99,235,0.2)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.3)]"
                  >
                    شراء المكتبة الكاملة الآن
                  </Link>
                  
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0" />
                    <p className="text-xs text-emerald-700 font-cairo leading-relaxed">
                      انتباه: السعر سيرتفع إلى 199 ج.م بمجرد انتهاء العداد التنازلي.
                    </p>
                  </div>
                </Card>

                {/* Mobile Sticky Purchase Bar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-zinc-200 p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-safe">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-400 font-cairo line-through decoration-red-400">{currentProduct.originalPrice} ج.م</span>
                      <span className="text-2xl font-bold font-alexandria text-zinc-900">{currentProduct.price} ج.م</span>
                    </div>
                    <Link
                      href={`/checkout/${resolvedParams.id}`}
                      className="h-12 flex-1 inline-flex items-center justify-center font-bold text-base bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-cairo rounded-xl transition-all shadow-lg"
                    >
                      شراء المكتبة الآن
                    </Link>
                  </div>
                </div>

                {/* Trust Badges Desktop */}
                <div className="hidden md:flex mt-6 items-center justify-center gap-4 opacity-70 hover:opacity-100 transition-all duration-300">
                  <div className="text-zinc-500 font-cairo text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    مدعوم ومحمي بواسطة Paymob
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Added bottom padding on mobile to account for sticky bar */}
      <div className="md:hidden h-24 bg-white" />

      <Footer />
    </>
  );
}
