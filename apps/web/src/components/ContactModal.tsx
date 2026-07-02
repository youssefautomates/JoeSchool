"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
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
        setTimeout(() => {
          onClose();
          setStatus("idle");
          setFormData({ name: "", email: "", message: "" });
        }, 2000);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "حدث خطأ ما");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("فشل الاتصال بالخادم");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-50 border border-zinc-200 rounded-3xl p-8 z-[101] shadow-sm border border-zinc-200/60"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-sans font-black text-zinc-900">تواصل معنا</h2>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100/40 rounded-2xl transition-colors">
                <X className="w-6 h-6 text-zinc-500" />
              </button>
            </div>

            {status === "success" ? (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
                <h3 className="text-xl font-bold text-zinc-900 font-sans">تم إرسال رسالتك بنجاح!</h3>
                <p className="text-zinc-500 font-cairo">سنقوم بالرد عليك في أقرب وقت ممكن.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-sans font-bold text-zinc-500 mr-2">الاسم</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-100/40 border border-zinc-200 rounded-2xl py-4 px-6 text-zinc-900 focus:outline-none focus:border-[#1D4ED8] transition-all font-sans"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-sans font-bold text-zinc-500 mr-2">البريد الإلكتروني</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-100/40 border border-zinc-200 rounded-2xl py-4 px-6 text-zinc-900 focus:outline-none focus:border-[#1D4ED8] transition-all font-sans"
                    placeholder="example@mail.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-sans font-bold text-zinc-500 mr-2">الرسالة</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-zinc-100/40 border border-zinc-200 rounded-2xl py-4 px-6 text-zinc-900 focus:outline-none focus:border-[#1D4ED8] transition-all font-sans resize-none"
                    placeholder="كيف يمكننا مساعدتك؟"
                  />
                </div>

                {status === "error" && (
                  <div className="flex items-center gap-2 text-yellow-500 bg-brand-500/10 p-4 rounded-2xl font-sans text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  disabled={status === "loading"}
                  type="submit"
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-sans font-bold py-4 rounded-2xl transition-all shadow-none flex items-center justify-center gap-2 group"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>إرسال الرسالة</span>
                      <Send className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
