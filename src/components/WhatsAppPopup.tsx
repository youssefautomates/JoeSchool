"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function WhatsAppPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/201000000000";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDismissed) setIsVisible(true);
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, [isDismissed]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, x: -50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.5, x: -50 }}
          className="fixed bottom-6 right-6 md:right-8 z-[60]"
        >
          <div className="relative group">
            <button 
              onClick={(e) => {
                e.preventDefault();
                setIsVisible(false);
                setIsDismissed(true);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="w-3 h-3" />
            </button>
            
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-3 rounded-2xl shadow-[0_10px_40px_rgba(37,211,102,0.4)] transition-all hover:scale-105 active:scale-95 group border border-white/10"
            >
              <div className="relative">
                <MessageCircle className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[9px] opacity-80 font-cairo uppercase tracking-wider">هل لديك استفسار؟</span>
                <span className="text-sm font-bold font-cairo">تواصل واتساب</span>
              </div>
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
