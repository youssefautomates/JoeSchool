"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  defaultExpanded = false,
  children
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // Collapses on lg breakpoint (tablet/mobile)
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Always keep expanded on desktop to show full data density
  const shouldCollapse = isMobile;
  const isCurrentlyOpen = shouldCollapse ? isOpen : true;

  return (
    <div className="w-full">
      {shouldCollapse ? (
        <div className="border border-zinc-200/60 rounded-3xl bg-slate-50/60 overflow-hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-4 text-right font-sans font-extrabold text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <span>{title}</span>
            <div className="w-7 h-7 rounded-2xl bg-zinc-100/40 flex items-center justify-center shrink-0">
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-yellow-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </div>
          </button>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div className="p-4 pt-2 border-t border-zinc-200/60 bg-[#07070b]/20">
                  {children}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  );
}
