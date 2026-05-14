"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Shield, Clock, CheckCircle2, ChevronDown, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { SalesPopup } from "@/components/ui/SalesPopup";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { InfiniteTestimonials } from "@/components/ui/InfiniteTestimonials";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("store_products");
    if (saved) {
      setProducts(JSON.parse(saved).filter((p: any) => p.status === "نشط"));
    } else {
      setProducts([
        { id: 1, name: "حزمة أتمتة خدمة العملاء الذكية", price: "49.00", originalPrice: "99.00", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop", isFeatured: true },
        { id: 2, name: "دليل بناء بوت تليجرام متقدم", price: "39.00", originalPrice: "79.00", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop", isFeatured: false },
      ]);
    }
  }, []);

  return (
    <>
      <Navbar />
      <SalesPopup />
      
      <main className="flex-1 flex flex-col pt-16 bg-white">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-40">
          {/* Animated Background Gradients - Light Blue Tones */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[120px] pointer-events-none opacity-60" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-sky-50 rounded-full blur-[100px] pointer-events-none opacity-60" />
          
          <div className="container relative mx-auto px-4 text-center z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex justify-center mb-8">
                <CountdownTimer hours={12} />
              </div>

              <Badge className="bg-blue-50 text-blue-600 border-blue-100 mb-8 px-4 py-2 font-cairo text-sm backdrop-blur-md">
                ⚡ خصم حصري 50% لفترة محدودة
              </Badge>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-alexandria font-bold text-zinc-900 mb-8 leading-tight tracking-tight">
                أتمتة <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 via-sky-500 to-cyan-500">ذكية</span><br />
                تضاعف إنتاجيتك
              </h1>
              
              <p className="text-xl md:text-2xl text-zinc-600 font-cairo max-w-2xl mx-auto mb-12 leading-relaxed">
                وفر مئات الساعات شهرياً باستخدام حزم n8n الجاهزة. ملفات PDF دقيقة وروابط استيراد مباشر لتدفقات عمل احترافية.
              </p>
              
              <div className="flex flex-col items-center justify-center gap-3 w-full sm:w-auto">
                <Link
                  href="#products"
                  className="inline-flex items-center justify-center gap-2 h-16 px-10 text-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white w-full sm:w-auto font-cairo font-semibold shadow-[0_10px_30px_rgba(37,99,235,0.25)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.35)] transition-all rounded-xl"
                >
                  تصفح الحزم الآن
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <p className="text-sm text-zinc-500 font-cairo sm:hidden">عدد النسخ المتاحة محدود جداً</p>
              </div>
            </motion.div>
          </div>

          {/* Mouse Scroll Indicator */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-zinc-400 gap-2"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <span className="font-cairo text-sm text-zinc-500">اكتشف المزيد</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </section>

        {/* Trust Logos / Numbers (Social Proof) */}
        <section className="border-y border-zinc-100 bg-zinc-50/50 py-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-24 items-center text-center">
              <div>
                <p className="text-4xl font-alexandria font-bold text-zinc-900 mb-1">+1,200</p>
                <p className="text-zinc-500 font-cairo text-sm">عميل سعيد</p>
              </div>
              <div>
                <p className="text-4xl font-alexandria font-bold text-zinc-900 mb-1">+50K</p>
                <p className="text-zinc-500 font-cairo text-sm">ساعة تم توفيرها</p>
              </div>
              <div>
                <p className="text-4xl font-alexandria font-bold text-zinc-900 mb-1">100%</p>
                <p className="text-zinc-500 font-cairo text-sm">أتمتة ناجحة</p>
              </div>
            </div>
          </div>
        </section>

        {/* Products Showcase (Conversion Optimized) */}
        <section id="products" className="py-16 md:py-32 relative bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <Badge className="bg-blue-50 text-blue-600 mb-4 font-cairo border-blue-100">الأكثر طلباً 🔥</Badge>
              <h2 className="text-4xl md:text-5xl font-alexandria font-bold text-zinc-900 mb-6">استثمر في وقتك الآن</h2>
              <p className="text-zinc-600 font-cairo text-lg max-w-2xl mx-auto">
                حزم أتمتة متكاملة وجاهزة للعمل الفوري لتعظيم أرباحك وتقليل الجهد البشري.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
              {products.map((product, idx) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <Card className="bg-white border-zinc-200 overflow-hidden group hover:border-blue-500/50 transition-all duration-500 h-full flex flex-col hover:shadow-[0_20px_50px_rgba(37,99,235,0.1)] relative rounded-2xl">
                    {/* Subtle Blue glow on hover */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative h-56 bg-zinc-100 overflow-hidden">
                      <Image 
                        src={product.image || product.img} 
                        alt={product.title || product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-transparent z-10" />
                      
                      {product.originalPrice && (
                         <div className="absolute top-4 right-4 z-20">
                           <Badge className="bg-red-500 text-white font-alexandria font-bold px-3 py-1 text-sm shadow-lg border-none">
                             خصم {Math.round(100 - (parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}%
                           </Badge>
                         </div>
                      )}
                    </div>
                    
                    <div className="p-5 md:p-8 relative z-20 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        {product.isFeatured && (
                          <Badge className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 font-cairo">الأكثر مبيعاً</Badge>
                        )}
                        {!product.isFeatured && <div />}
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-bold font-alexandria text-zinc-900">{product.price} ج.م</span>
                          {product.originalPrice && (
                            <span className="text-zinc-400 font-cairo text-sm line-through decoration-red-400">{product.originalPrice} ج.م</span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-alexandria font-bold text-zinc-900 mb-3 leading-snug">
                        {product.title || product.name}
                      </h3>
                      
                      <ul className="space-y-3 mb-8 font-cairo text-sm text-zinc-600 flex-1 mt-4">
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                          <span>ملف PDF احترافي ودقيق خطوة بخطوة</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                          <span>رابط استيراد مباشر للـ Workflow (n8n)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                          <span>تحديثات مجانية مستمرة للملف</span>
                        </li>
                      </ul>

                      <Link
                        href={`/product/${product.id}`}
                        className="mt-auto w-full h-14 inline-flex items-center justify-center text-base md:text-lg font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-cairo rounded-xl transition-all shadow-md hover:shadow-[0_10px_30px_rgba(37,99,235,0.25)]"
                      >
                        شراء الآن والتسليم فوري
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <p className="text-zinc-500 font-cairo text-lg">جاري تجهيز أقوى حزم الأتمتة...</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section - Light Themed */}
        <section id="features" className="py-32 relative overflow-hidden bg-zinc-50">
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-alexandria font-bold text-zinc-900 mb-6">لماذا يوسف أوتميتس؟</h2>
              <p className="text-zinc-600 font-cairo text-lg">الاحترافية، الجودة، والتسليم الفوري هي معاييرنا الأساسية.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "تسليم فوري (Instant)", desc: "بمجرد إتمام الدفع، سيصلك رابط التحميل وملف الـ PDF مباشرة إلى بريدك الإلكتروني ولن تنتظر دقيقة واحدة." },
                { icon: Shield, title: "جودة استثنائية (Premium)", desc: "كل تدفق عمل تم اختباره وبناؤه بعناية فائقة لضمان عمله 100% بدون أي أخطاء برمجية." },
                { icon: Clock, title: "توفير مئات الساعات", desc: "لا تضيع وقتك في التجربة والخطأ، احصل على الخلاصة وابدأ في جني الأرباح فوراً." }
              ].map((feature, idx) => (
                <Card key={idx} className="bg-white border-zinc-200 p-10 text-center hover:shadow-xl transition-all relative overflow-hidden group">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-8 border border-blue-100 group-hover:bg-blue-600 transition-colors">
                    <feature.icon className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-2xl font-alexandria font-bold text-zinc-900 mb-4">{feature.title}</h3>
                  <p className="text-zinc-600 font-cairo leading-relaxed">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="reviews" className="py-32 border-y border-zinc-100 relative bg-white">
          <div className="text-center mb-16 px-4">
            <Badge className="bg-blue-50 text-blue-600 mb-4 font-cairo border-blue-100">آراء العملاء</Badge>
            <h2 className="text-3xl md:text-5xl font-alexandria font-bold text-zinc-900">ماذا يقول عملاؤنا؟</h2>
          </div>
          <InfiniteTestimonials />
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 max-w-4xl mx-auto px-4 w-full bg-white">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-alexandria font-bold text-zinc-900 mb-6">الأسئلة الشائعة</h2>
            <p className="text-zinc-600 font-cairo text-lg">كل ما تحتاج معرفته قبل الشراء</p>
          </div>

          <div className="space-y-4">
            {[
              { q: "كيف يتم تسليم الملفات؟", a: "بمجرد الدفع الناجح، سيتم إرسال رسالة فورية إلى بريدك الإلكتروني تحتوي على ملف الـ PDF ورابط التحميل المباشر." },
              { q: "هل أحتاج لخبرة برمجية لاستخدام الملفات؟", a: "إطلاقاً! الملفات مصممة لتكون 'نسخ ولصق' مع شرح مبسط خطوة بخطوة بالصور لضمان نجاحك." },
              { q: "هل يمكنني استرجاع المبلغ؟", a: "نظراً لطبيعة المنتجات الرقمية، لا يوجد استرجاع. ولكننا نضمن لك أن كل منتج يعمل بكفاءة 100% كما هو موضح." }
            ].map((faq, i) => (
              <details key={i} className="group bg-zinc-50 border border-zinc-200 rounded-2xl p-6 open:bg-blue-50 transition-colors cursor-pointer">
                <summary className="font-alexandria font-bold text-zinc-900 text-lg flex justify-between items-center outline-none">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-zinc-600 font-cairo leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
