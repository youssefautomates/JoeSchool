"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2, Sparkles, PhoneCall } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setStatus("error");
        setErrorMessage(data.error || "حدث خطأ ما، يرجى المحاولة لاحقاً");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("فشل الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت");
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-brand-500/30 font-sans overflow-x-hidden flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 relative z-10">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-600/5 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[140px]" />
        </div>

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-brand-500/10 text-yellow-500 border border-zinc-200/60 px-4 py-1.5 rounded-full mb-6 font-bold text-xs md:text-sm"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>مستعدون لمساعدتك في أي وقت</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-5xl font-sans font-black leading-tight tracking-tight text-zinc-900 mb-6"
            >
              تواصل معنا
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-zinc-500 text-sm sm:text-base leading-relaxed"
            >
              في حال وجود أي استفسار أو مشكلة أو طلب دعم، يمكن التواصل مع منصة JoeSchool من خلال قنوات التواصل المباشرة أو عن طريق إرسال رسالة بريد إلكتروني، وسيتم الرد عليك في أقرب وقت ممكن.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Contact details & Cards - Left (or Right in RTL, 5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-lg font-sans font-bold text-zinc-900 border-r-4 border-brand-500 pr-3 mb-6">
                قنوات التواصل المباشر
              </h2>

              {/* WhatsApp Card */}
              <motion.a
                href="https://wa.me/201107099196"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="block bg-slate-50 border border-zinc-200/60 hover:border-emerald-500/30 rounded-3xl p-6 shadow-sm border border-zinc-200/60 transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-all">
                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-6 h-6 transition-transform duration-300 group-hover:scale-110">
                      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 512l148.4-38.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-117zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-88.4 23.2 23.6-86.2-4.4-7c-18.4-29.3-28.1-63.1-28.1-98.3 0-101.8 82.8-184.6 184.7-184.6 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-bold">تواصل فوري عبر الواتساب</span>
                    <span className="text-base font-bold text-zinc-900 block mt-0.5" dir="ltr">+20 110 709 9196</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end text-xs text-emerald-400 font-bold gap-1">
                  <span>تحدث معنا الآن</span>
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </div>
              </motion.a>

              {/* Email Card */}
              <motion.a
                href="mailto:support@joeschool.com"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="block bg-slate-50 border border-zinc-200/60 hover:border-zinc-200/60 rounded-3xl p-6 shadow-sm border border-zinc-200/60 transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-zinc-200/60 text-[#1D4ED8] flex items-center justify-center shrink-0 group-hover:bg-brand-500/20 transition-all">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block font-bold">راسلنا عبر البريد الإلكتروني</span>
                    <span className="text-base font-bold text-zinc-900 block mt-0.5 font-mono" dir="ltr">support@joeschool.com</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end text-xs text-[#1D4ED8] font-bold gap-1">
                  <span>أرسل رسالة إلكترونية</span>
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </div>
              </motion.a>

              {/* Note card */}
              <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 text-zinc-500 text-xs sm:text-sm leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-yellow-500 font-bold mb-1">
                  <PhoneCall className="w-4 h-4" />
                  <span>ساعات الدعم الفني</span>
                </div>
                <p>يسعدنا الرد على استفساراتكم ومساعدتكم على مدار الساعة.</p>
                <p>نقوم بمعالجة الطلبات والرد على الرسائل خلال مدة لا تتجاوز 12-24 ساعة كحد أقصى.</p>
              </div>
            </div>

            {/* Contact Form - Right (or Left in RTL, 7 cols) */}
            <div className="lg:col-span-7">
              <div className="bg-slate-50 border border-zinc-200/60 rounded-3xl p-6 sm:p-10 shadow-sm border border-zinc-200/60 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#1D4ED8] to-transparent" />
                
                <h2 className="text-xl font-sans font-bold text-zinc-900 mb-6">
                  أرسل لنا استفسارك مباشرة
                </h2>

                {status === "success" ? (
                  <div className="py-16 flex flex-col items-center text-center space-y-6">
                    <CheckCircle2 className="w-20 h-20 text-emerald-500 animate-bounce" />
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-zinc-900 font-sans">تم إرسال رسالتك بنجاح!</h3>
                      <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                        شكراً لتواصلك معنا. لقد استلمنا رسالتك الفنية وسيقوم فريق الدعم الفني بمنصة JoeSchool بالرد عليك على بريدك الإلكتروني في أقرب وقت.
                      </p>
                    </div>
                    <button
                      onClick={() => setStatus("idle")}
                      className="px-6 py-2.5 bg-zinc-100/40 hover:bg-zinc-100/80 text-zinc-900 rounded-2xl text-xs font-bold transition-all border border-zinc-200"
                    >
                      إرسال رسالة أخرى
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 mr-2 block">الاسم الكريم</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 focus:border-[#1D4ED8]/50 focus:bg-zinc-100/80 rounded-2xl py-4 px-6 text-zinc-900 text-sm focus:outline-none transition-all font-sans"
                        placeholder="أدخل اسمك الكامل هنا"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 mr-2 block">البريد الإلكتروني</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 focus:border-[#1D4ED8]/50 focus:bg-zinc-100/80 rounded-2xl py-4 px-6 text-zinc-900 text-sm focus:outline-none transition-all font-sans"
                        placeholder="example@mail.com"
                        dir="ltr"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-500 mr-2 block">تفاصيل الرسالة أو الاستفسار</label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 focus:border-[#1D4ED8]/50 focus:bg-zinc-100/80 rounded-2xl py-4 px-6 text-zinc-900 text-sm focus:outline-none transition-all font-sans resize-none leading-relaxed"
                        placeholder="اكتب تفاصيل استفسارك أو المشكلة التي تواجهك هنا بالتفصيل..."
                      />
                    </div>

                    {status === "error" && (
                      <div className="flex items-center gap-3 text-yellow-500 bg-brand-500/10 p-4 rounded-2xl font-sans text-xs sm:text-sm border border-zinc-200/60">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <button
                      disabled={status === "loading"}
                      type="submit"
                      className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-sans font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(29, 78, 216,0.25)] flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري إرسال الاستفسار...</span>
                        </>
                      ) : (
                        <>
                          <span>أرسل رسالتك الآن</span>
                          <Send className="w-4 h-4 group-hover:-translate-x-1 transition-transform rotate-180" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
