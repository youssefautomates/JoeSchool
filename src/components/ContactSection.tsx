"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function ContactSection() {
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
    <section id="contact" className="py-16 md:py-24 relative overflow-hidden bg-[#050508] select-none font-cairo">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-rose-500/5 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-0 right-10 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-purple-650/5 rounded-full blur-[80px] mix-blend-screen" />
      </div>

      <div className="container relative z-10 mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">


          <h2 className="text-2xl md:text-5xl font-alexandria font-black text-white mb-4 tracking-tight">تواصل معنا</h2>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            يسعدنا دائماً سماع استفساراتكم أو تلقي آرائكم. تواصل معنا مباشرة عبر الواتساب أو راسلنا برقمك واستفسارك عبر النموذج البريدي أدناه.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Direct channels (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-base sm:text-lg font-alexandria font-bold text-white border-r-4 border-rose-500 pr-3 mb-6">
              قنوات الاتصال الفوري
            </h3>

            {/* WhatsApp Contact Box */}
            <motion.a
              href="https://wa.me/201107099196"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.015, y: -2 }}
              className="block bg-[#0a0a0f] border border-white/5 hover:border-emerald-500/30 rounded-3xl p-6 shadow-2xl transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-all">
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="w-6 h-6 transition-transform duration-300 group-hover:scale-110">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 512l148.4-38.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-117zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-88.4 23.2 23.6-86.2-4.4-7c-18.4-29.3-28.1-63.1-28.1-98.3 0-101.8 82.8-184.6 184.7-184.6 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block font-bold">تواصل فوري عبر الواتساب</span>
                  <span className="text-base font-bold text-white block mt-0.5" dir="ltr">+20 110 709 9196</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end text-xs text-emerald-400 font-bold gap-1">
                <span>تحدث معنا الآن</span>
                <Send className="w-3.5 h-3.5 rotate-180" />
              </div>
            </motion.a>

            {/* Email Contact Box */}
            <motion.a
              href="mailto:support@joeschool.com"
              whileHover={{ scale: 1.015, y: -2 }}
              className="block bg-[#0a0a0f] border border-white/5 hover:border-rose-500/30 rounded-3xl p-6 shadow-2xl transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[#D6004B] flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition-all">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block font-bold">راسلنا مباشرة عبر البريد الإلكتروني</span>
                  <span className="text-base font-bold text-white block mt-0.5 font-sans" dir="ltr">support@joeschool.com</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end text-xs text-[#D6004B] font-bold gap-1">
                <span>أرسل رسالة إلكترونية</span>
                <Send className="w-3.5 h-3.5 rotate-180" />
              </div>
            </motion.a>

          </div>

          {/* Contact Email Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-[#0a0a0f] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-right" dir="rtl">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent" />
              
              <h3 className="text-lg font-alexandria font-bold text-white mb-6">
                أرسل رسالة دعم فني مباشرة
              </h3>

              {status === "success" ? (
                <div className="py-12 flex flex-col items-center text-center space-y-6">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white font-cairo">تم الإرسال بنجاح!</h4>
                    <p className="text-zinc-400 text-xs sm:text-sm max-w-sm leading-relaxed mx-auto">
                      شكراً لتواصلك. لقد تم استلام استفسارك بنجاح وسيقوم فريق الدعم بالرد عليك على بريدك الإلكتروني قريباً جداً.
                    </p>
                  </div>
                  <button
                    onClick={() => setStatus("idle")}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                  >
                    إرسال رسالة أخرى
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 mr-1 block">الاسم الكريم</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-[#D6004B]/50 focus:bg-white/10 rounded-2xl py-3 px-5 text-white text-xs sm:text-sm focus:outline-none transition-all font-cairo"
                      placeholder="أدخل اسمك بالكامل"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 mr-1 block">البريد الإلكتروني</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-[#D6004B]/50 focus:bg-white/10 rounded-2xl py-3 px-5 text-white text-xs sm:text-sm focus:outline-none transition-all font-cairo text-right"
                      placeholder="name@example.com"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 mr-1 block">محتوى الاستفسار أو الرسالة</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-white/5 border border-white/5 hover:border-white/10 focus:border-[#D6004B]/50 focus:bg-white/10 rounded-2xl py-3 px-5 text-white text-xs sm:text-sm focus:outline-none transition-all font-cairo resize-none leading-relaxed"
                      placeholder="اكتب استفسارك أو تفاصيل الرسالة هنا..."
                    />
                  </div>

                  {status === "error" && (
                    <div className="flex items-center gap-3 text-rose-500 bg-rose-500/10 p-4 rounded-xl font-cairo text-xs sm:text-sm border border-rose-500/20">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    disabled={status === "loading"}
                    type="submit"
                    className="w-full bg-[#D6004B] hover:bg-[#b0003d] disabled:opacity-50 text-white font-cairo font-bold py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(214,0,75,0.25)] flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الإرسال...</span>
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
    </section>
  );
}
