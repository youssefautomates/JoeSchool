"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

const names = ["أحمد", "محمد", "خالد", "سارة", "نورة", "فهد", "يوسف", "محمود", "عمر", "عبدالله"];
const products = ["حزمة أتمتة الرد التلقائي", "دليل بناء بوت تليجرام", "أتمتة جدولة الميديا"];
const times = ["منذ دقيقة", "منذ 3 دقائق", "منذ 5 دقائق", "منذ 10 دقائق", "الآن"];

export function SalesPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState({ name: "", product: "", time: "" });

  useEffect(() => {
    // Initial delay before first popup
    const initialTimer = setTimeout(() => {
      triggerPopup();
    }, 10000);

    // Setup interval for recurring popups
    const interval = setInterval(() => {
      triggerPopup();
    }, 45000); // Every 45 seconds

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const triggerPopup = () => {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const randomTime = times[Math.floor(Math.random() * times.length)];

    setData({ name: randomName, product: randomProduct, time: randomTime });
    setIsVisible(true);

    // Auto hide after 5 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 left-6 z-50 max-w-sm"
        >
          <div className="bg-white/95 backdrop-blur-md border border-rose-100 rounded-xl shadow-xl p-4 flex items-start gap-4 shadow-rose-500/10">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 font-cairo">
              <p className="text-sm text-zinc-600">
                قام <span className="font-bold text-zinc-900">{data.name}</span> بشراء
              </p>
              <p className="text-sm font-bold text-rose-600 truncate w-48">
                {data.product}
              </p>
              <p className="text-xs text-zinc-400 mt-1">{data.time}</p>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
