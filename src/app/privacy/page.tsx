"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield, FileText, RefreshCw, Sparkles, Scale, Lock, Info } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState("privacy");

  // Allow tab selection via URL hash or search param (e.g. /privacy?tab=refund)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["privacy", "terms", "refund"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const tabs = [
    { id: "privacy", label: "سياسة الخصوصية", icon: Shield },
    { id: "terms", label: "الشروط والأحكام", icon: Scale },
    { id: "refund", label: "سياسة الاسترجاع", icon: RefreshCw },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-cairo overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 relative z-10">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-rose-600/5 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[140px]" />
        </div>

        <div className="container mx-auto px-4 max-w-5xl relative z-10">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-1.5 rounded-full mb-6 font-bold text-xs md:text-sm"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>المركز القانوني لمنصة JoeSchool</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl font-alexandria font-black leading-tight tracking-tight text-white mb-4"
            >
              السياسات والأحكام
            </motion.h1>
            
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mt-2">
              نلتزم بتقديم تجربة تعليمية وخدمية ممتازة مبنية على الشفافية والثقة المتبادلة. يرجى مراجعة سياساتنا القانونية أدناه.
            </p>
          </div>

          {/* Legal Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-t-xl transition-all duration-300 font-bold text-xs sm:text-sm border-b-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "border-rose-500 text-rose-400 bg-rose-500/5"
                      : "border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Box */}
          <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            <AnimatePresence mode="wait">
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-zinc-300 text-sm sm:text-base leading-relaxed text-right"
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Lock className="w-6 h-6 text-rose-500" />
                    <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white">سياسة الخصوصية لمنصة JoeSchool</h2>
                  </div>

                  <p>
                    نحن في منصة <strong>JoeSchool</strong> نحترم خصوصية المستخدمين ونلتزم بحماية جميع البيانات والمعلومات الشخصية التي يتم جمعها أثناء استخدام المنصة أو شراء الدورات والخدمات والمنتجات الرقمية المتعلقة بالأتمتة والذكاء الاصطناعي وصناعة المحتوى.
                  </p>
                  <p>
                    تهدف هذه السياسة إلى توضيح كيفية جمع المعلومات واستخدامها وحمايتها عند استخدام خدمات المنصة.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">جمع المعلومات</h3>
                  <p>قد نقوم بجمع بعض البيانات والمعلومات من المستخدمين، وتشمل:</p>
                  <ul className="list-disc list-inside space-y-2 pr-4 text-zinc-400">
                    <li>• الاسم الكامل.</li>
                    <li>• البريد الإلكتروني.</li>
                    <li>• رقم الهاتف.</li>
                    <li>• بيانات الدفع والمعاملات المالية (تتم معالجتها بأمان عبر بوابات الدفع الرسمية المعتمدة).</li>
                    <li>• بيانات استخدام المنصة والدورات التعليمية ومتابعة المحتوى.</li>
                    <li>• المعلومات التقنية مثل عنوان IP ونوع الجهاز والمتصفح ونظام التشغيل.</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">استخدام المعلومات</h3>
                  <p>يتم استخدام البيانات التي يتم جمعها للأغراض التالية:</p>
                  <ul className="list-disc list-inside space-y-2 pr-4 text-zinc-400">
                    <li>• إنشاء وإدارة حساب المستخدم وتأمين الوصول داخل المنصة.</li>
                    <li>• توفير الوصول الفوري والمستقر إلى الدورات والمنتجات الرقمية والخدمات التعليمية.</li>
                    <li>• تحسين تجربة المستخدم الإجمالية وتطوير وتحديث خدمات المنصة.</li>
                    <li>• إرسال التحديثات الهامة والإشعارات المتعلقة بالدورات المشترك بها أو الحسابات أو العروض الترويجية.</li>
                    <li>• تقديم الدعم الفني وحل المشكلات وخدمة العملاء.</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">حماية وأمن البيانات</h3>
                  <p>
                    نلتزم باتخاذ أحدث معايير الأمان التقنية والتنظيمية لحماية بياناتك الشخصية من الوصول غير المصرح به أو التعديل أو الإفشاء أو التدمير. لا نقوم ببيع أو مشاركة أو تأجير بياناتك الشخصية لأي أطراف ثالثة لأغراض تسويقية على الإطلاق.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">ملفات تعريف الارتباط (Cookies)</h3>
                  <p>
                    نستخدم ملفات تعريف الارتباط لتحسين تجربة تصفحك للموقع، وحفظ تفضيلاتك وتسهيل عملية تسجيل الدخول وجمع إحصاءات عامة عن كيفية استخدام المنصة لمساعدتنا في تحسين الأداء.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">تعديل الخدمات والشروط</h3>
                  <p>
                    يحق لإدارة منصة JoeSchool تعديل أو تحديث أو إيقاف أي جزء من الخدمات أو الشروط والأحكام في أي وقت دون إشعار مسبق، ويُعد استمرار استخدام المنصة موافقة على التعديلات الجديدة.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">إنهاء الاستخدام</h3>
                  <p>
                    يحق لإدارة المنصة تعليق أو إيقاف أي حساب يخالف الشروط والأحكام أو يسيء استخدام الخدمات أو المحتوى المقدم عبر المنصة أو يحاول إعادة بيع المحتوى أو مشاركته بطرق غير مصرح بها.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">الموافقة على الشروط والسياسات</h3>
                  <p>
                    استخدام منصة JoeSchool أو شراء أي دورة أو منتج رقمي أو خدمة عبرها يعني موافقة المستخدم الكاملة على جميع الشروط والأحكام والسياسات الخاصة بالمنصة.
                  </p>
                </motion.div>
              )}

              {activeTab === "terms" && (
                <motion.div
                  key="terms-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-zinc-300 text-sm sm:text-base leading-relaxed text-right"
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Scale className="w-6 h-6 text-rose-500" />
                    <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white">الشروط والأحكام والشروط والاستخدام</h2>
                  </div>

                  <p>
                    مرحباً بكم في منصة <strong>JoeSchool</strong>. يرجى قراءة شروط الاستخدام هذه بعناية قبل التصفح أو التسجيل أو الشراء.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">1. شروط الحساب والتسجيل</h3>
                  <ul className="list-disc list-inside space-y-2 pr-4 text-zinc-400">
                    <li>• يجب الحفاظ على سرية معلومات الحساب وكلمة المرور الخاصة بك.</li>
                    <li>• يمنع منعاً باتاً مشاركة الحساب أو بيانات الدخول مع أي شخص آخر.</li>
                    <li>• يتم تأمين المنصة بنظام حماية ذكي يمنع تشغيل الحساب على أكثر من 3 أجهزة نشطة في نفس الوقت، ومخالفة ذلك قد تعرض الحساب للإغلاق التلقائي.</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">2. حقوق الملكية الفكرية وحماية المحتوى</h3>
                  <p>
                    جميع المحتويات المقدمة في منصة JoeSchool من دورات تدريبية، فيديوهات، قوالب أتمتة، أكواد برمجية، وتصميمات هي ملكية فكرية حصرية للمنصة ويحميه القانون الدولي والمحلي لحقوق النشر.
                  </p>
                  <ul className="list-disc list-inside space-y-2 pr-4 text-zinc-400">
                    <li>• يُرخص للمستخدم مشاهدة المحتوى واستخدام الملفات للاستخدام الشخصي أو المهني الخاص به فقط.</li>
                    <li>• يمنع منعاً باتاً تنزيل الفيديوهات أو إعادة رفعها أو بيعها أو توزيعها بأي وسيلة.</li>
                    <li>• نستخدم تقنيات متطورة لمنع تصوير الشاشة وتسجيل الفيديوهات، وفي حال محاولة انتهاك خصوصية وأمن المحتوى، يحتفظ النظام بالحق في حظر الحساب فوراً دون إشعار أو تعويض مالي.</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">3. تعديل الخدمات وتغيير الأسعار</h3>
                  <p>
                    تحتفظ منصة JoeSchool بالحق في تعديل الأسعار، سحب أو تعديل أي كورس أو منتج، أو إيقاف بعض الخدمات مؤقتاً أو نهائياً في أي وقت دون إشعار مسبق.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">4. إخلاء المسؤولية</h3>
                  <p>
                    الدورات التدريبية وقوالب الأتمتة تهدف لتعليم المستخدم وتزويده بالأدوات اللازمة، والنجاح الفعلي وتطبيق هذه الأدوات يعتمد على جهد وخبرة والتزام كل مستخدم بمفرده، ولا نضمن تحقيق مكاسب أو نتائج محددة خارج نطاق المحتوى التعليمي المقدم.
                  </p>
                </motion.div>
              )}

              {activeTab === "refund" && (
                <motion.div
                  key="refund-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 text-zinc-300 text-sm sm:text-base leading-relaxed text-right"
                >
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <RefreshCw className="w-6 h-6 text-rose-500" />
                    <h2 className="text-xl sm:text-2xl font-alexandria font-bold text-white">سياسة الدفع والاسترجاع</h2>
                  </div>

                  <p>
                    نظراً لطبيعة المنتجات الرقمية (الدورات التدريبية المسجلة، قوالب الأتمتة n8n، الحزم البرمجية، والملفات القابلة للتحميل الفوري) فإن سياسة الاسترجاع لدينا تخضع للشروط الصارمة التالية لحماية حقوق الملكية الفكرية:
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">1. المنتجات الرقمية القابلة للتحميل</h3>
                  <p className="text-zinc-400">
                    أي منتج رقمي يتضمن ملفات قابلة للتحميل الفوري (مثل حزم الأتمتة، قوالب Excel، ملفات البرمجة، والكتب الرقمية) <strong>لا يمكن استرجاعه أو استرداد قيمته بمجرد إتمام الدفع بنجاح والحصول على رابط التحميل المباشر</strong>، نظراً لاستحالة إرجاع السلعة الرقمية بعد تحميلها.
                  </p>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">2. الدورات التدريبية المباشرة والمسجلة</h3>
                  <ul className="list-disc list-inside space-y-2 pr-4 text-zinc-400">
                    <li>• يمكن تقديم طلب استرجاع قيمة الدورة التدريبية <strong>خلال 7 أيام كحد أقصى من تاريخ الشراء</strong>.</li>
                    <li>• يُشترط للموافقة على طلب الاسترجاع <strong>ألا يكون الطالب قد شاهد أو استهلك أكثر من 10% من محتوى الدورة</strong> أو قام بتحميل الملحقات وحزم الأتمتة المرفقة مع الدورة.</li>
                    <li>• في حال تخطي نسبة المشاهدة لـ 10% أو تحميل حزم الأتمتة الحصرية المرفقة بالكورس، يعتبر طلب الاسترجاع ملغياً وغير مقبول لحفظ حقوق المحتوى الفني.</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-alexandria font-bold text-white mt-8 mb-3">3. آلية وخطوات معالجة الاسترداد</h3>
                  <p>
                    في حال قبول طلب الاسترجاع واستيفاء الشروط أعلاه، يتم التواصل مع الدعم الفني عبر البريد الإلكتروني <span className="text-rose-400">joeschool.ai@gmail.com</span> أو الواتساب، ويتم تحويل المبلغ المسترد بنفس طريقة الدفع الأصلية خلال مدة تتراوح بين 7 إلى 14 يوم عمل عملياً حسب متطلبات البنك المعني وبوابات الدفع المستخدمة.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
