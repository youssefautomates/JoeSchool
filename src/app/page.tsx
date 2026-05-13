"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Zap, Shield, Clock, CheckCircle2, ChevronDown } from "lucide-react";
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
      
      <main className="flex-1 flex flex-col pt-16 bg-zinc-950">
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-40">
          {/* Animated Background Gradients */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          
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

              <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 mb-8 px-4 py-2 font-cairo text-sm backdrop-blur-md">
                ⚡ خصم حصري 50% لفترة محدودة
              </Badge>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-alexandria font-bold text-white mb-8 leading-tight tracking-tight">
                أتمتة <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-400 via-cyan-400 to-emerald-400">ذكية</span><br />
                تضاعف إنتاجيتك
              </h1>
              
              <p className="text-xl md:text-2xl text-zinc-400 font-cairo max-w-2xl mx-auto mb-12 leading-relaxed">
                وفر مئات الساعات شهرياً باستخدام حزم n8n الجاهزة. ملفات PDF دقيقة وروابط استيراد مباشر لتدفقات عمل احترافية.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-16 px-10 text-xl bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto font-cairo shadow-[0_0_40px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_rgba(79,70,229,0.6)] transition-all rounded-xl" render={
                  <Link href="#products" className="w-full h-full flex items-center justify-center">
                    تصفح الحزم الآن
                    <ChevronLeft className="w-6 h-6 mr-2" />
                  </Link>
                } />
                <p className="text-sm text-zinc-500 font-cairo mt-4 sm:hidden">عدد النسخ المتاحة محدود جداً</p>
              </div>
            </motion.div>
          </div>

          {/* Mouse Scroll Indicator */}
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-zinc-500 gap-2"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <span className="font-cairo text-sm">اكتشف المزيد</span>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </section>

        {/* Trust Logos / Numbers (Social Proof) */}
        <section className="border-y border-zinc-800/50 bg-zinc-900/20 py-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-24 items-center text-center">
              <div>
                <p className="text-4xl font-alexandria font-bold text-white mb-1">+1,200</p>
                <p className="text-zinc-500 font-cairo text-sm">عميل سعيد</p>
              </div>
              <div>
                <p className="text-4xl font-alexandria font-bold text-white mb-1">+50K</p>
                <p className="text-zinc-500 font-cairo text-sm">ساعة تم توفيرها</p>
              </div>
              <div>
                <p className="text-4xl font-alexandria font-bold text-white mb-1">100%</p>
                <p className="text-zinc-500 font-cairo text-sm">أتمتة ناجحة</p>
              </div>
            </div>
          </div>
        </section>

        {/* Products Showcase (Conversion Optimized) */}
        <section id="products" className="py-32 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <Badge className="bg-emerald-500/10 text-emerald-400 mb-4 font-cairo">الأكثر طلباً 🔥</Badge>
              <h2 className="text-4xl md:text-5xl font-alexandria font-bold text-white mb-6">استثمر في وقتك الآن</h2>
              <p className="text-zinc-400 font-cairo text-lg max-w-2xl mx-auto">
                حزم أتمتة متكاملة وجاهزة للعمل الفوري لتعظيم أرباحك وتقليل الجهد البشري.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, idx) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <Card className="bg-zinc-900/80 backdrop-blur-md border-zinc-800 overflow-hidden group hover:border-indigo-500/50 transition-all duration-500 h-full flex flex-col hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.3)] relative">
                    {/* Glowing effect inside card */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative h-56 bg-zinc-800 overflow-hidden">
                      <Image 
                        src={product.image || product.img} 
                        alt={product.title || product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent z-10" />
                      
                      {product.originalPrice && (
                         <div className="absolute top-4 right-4 z-20">
                           <Badge className="bg-red-500 text-white font-alexandria font-bold px-3 py-1 text-sm shadow-lg">
                             خصم {Math.round(100 - (parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}%
                           </Badge>
                         </div>
                      )}
                    </div>
                    
                    <div className="p-8 relative z-20 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        {product.isFeatured && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 font-cairo">الأكثر مبيعاً</Badge>
                        )}
                        {!product.isFeatured && <div />}
                        <div className="flex flex-col items-end">
                          <span className="text-2xl font-bold font-alexandria text-white">{product.price} ج.م</span>
                          {product.originalPrice && (
                            <span className="text-zinc-500 font-cairo text-sm line-through decoration-red-500/50">{product.originalPrice} ج.م</span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-alexandria font-bold text-white mb-3 leading-snug">
                        {product.title || product.name}
                      </h3>
                      
                      <ul className="space-y-3 mb-8 font-cairo text-sm text-zinc-400 flex-1 mt-4">
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                          <span>ملف PDF احترافي ودقيق خطوة بخطوة</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                          <span>رابط استيراد مباشر للـ Workflow (n8n)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                          <span>تحديثات مجانية مستمرة للملف</span>
                        </li>
                      </ul>

                      <Button className="w-full h-14 text-lg bg-indigo-600 hover:bg-indigo-500 text-white font-cairo mt-auto relative overflow-hidden group-hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all rounded-xl" render={
                        <Link href={`/product/${product.id}`} className="w-full h-full flex items-center justify-center z-10">
                          شراء الآن والتسليم فوري
                        </Link>
                      } />
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

        {/* Features Section (Glassmorphism) */}
        <section id="features" className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-zinc-900/50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-alexandria font-bold text-white mb-6">لماذا يوسف أوتميتس؟</h2>
              <p className="text-zinc-400 font-cairo text-lg">الاحترافية، الجودة، والتسليم الفوري هي معاييرنا الأساسية.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "تسليم فوري (Instant)", desc: "بمجرد إتمام الدفع، سيصلك رابط التحميل وملف الـ PDF مباشرة إلى بريدك الإلكتروني ولن تنتظر دقيقة واحدة." },
                { icon: Shield, title: "جودة استثنائية (Premium)", desc: "كل تدفق عمل تم اختباره وبناؤه بعناية فائقة لضمان عمله 100% بدون أي أخطاء برمجية." },
                { icon: Clock, title: "توفير مئات الساعات", desc: "لا تضيع وقتك في التجربة والخطأ، احصل على الخلاصة وابدأ في جني الأرباح فوراً." }
              ].map((feature, idx) => (
                <Card key={idx} className="bg-zinc-950/50 backdrop-blur-md border-zinc-800/50 p-10 text-center hover:bg-zinc-900 transition-colors relative overflow-hidden">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
                    <feature.icon className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-alexandria font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-zinc-400 font-cairo leading-relaxed">{feature.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="reviews" className="py-32 border-y border-zinc-800/50 relative">
          <div className="text-center mb-16 px-4">
            <Badge className="bg-indigo-500/10 text-indigo-400 mb-4 font-cairo">آراء العملاء</Badge>
            <h2 className="text-3xl md:text-5xl font-alexandria font-bold text-white">ماذا يقول عملاؤنا؟</h2>
          </div>
          <InfiniteTestimonials />
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 max-w-4xl mx-auto px-4 w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-alexandria font-bold text-white mb-6">الأسئلة الشائعة</h2>
            <p className="text-zinc-400 font-cairo text-lg">كل ما تحتاج معرفته قبل الشراء</p>
          </div>

          <div className="space-y-4">
            {[
              { q: "كيف يتم تسليم الملفات؟", a: "بمجرد الدفع الناجح، سيتم إرسال رسالة فورية إلى بريدك الإلكتروني تحتوي على ملف الـ PDF ورابط التحميل المباشر." },
              { q: "هل أحتاج لخبرة برمجية لاستخدام الملفات؟", a: "إطلاقاً! الملفات مصممة لتكون 'نسخ ولصق' مع شرح مبسط خطوة بخطوة بالصور لضمان نجاحك." },
              { q: "هل يمكنني استرجاع المبلغ؟", a: "نظراً لطبيعة المنتجات الرقمية، لا يوجد استرجاع. ولكننا نضمن لك أن كل منتج يعمل بكفاءة 100% كما هو موضح." }
            ].map((faq, i) => (
              <details key={i} className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 open:bg-zinc-900 transition-colors cursor-pointer">
                <summary className="font-alexandria font-bold text-white text-lg flex justify-between items-center outline-none">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-zinc-400 font-cairo leading-relaxed">
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
