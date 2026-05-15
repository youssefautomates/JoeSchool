"use client";

import Link from "next/link";
import { ShoppingBag, ChevronLeft, Menu, X, Sparkles, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount, setIsCartOpen } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#features", label: "المميزات" },
    { href: "#products", label: "المنتجات" },
    { href: "#faq", label: "الأسئلة الشائعة" },
    { href: "#reviews", label: "آراء العملاء" },
  ];

  return (
    <>
      <nav 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-500 ease-in-out px-4 py-4 md:px-8",
          scrolled ? "py-2 md:py-3" : "py-4 md:py-6"
        )}
      >
        <div className={cn(
          "container mx-auto max-w-7xl transition-all duration-500 border border-transparent",
          scrolled ? "bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl px-6 h-14 md:h-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "bg-transparent h-16"
        )}>
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <motion.div 
                  className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Sparkles className="w-2.5 h-2.5 text-rose-900" />
                </motion.div>
              </div>
              <div className="flex flex-col">
                <span className="font-alexandria font-bold text-lg md:text-xl tracking-tight text-white leading-tight" dir="ltr">
                  Youssef <span className="text-rose-500">Automates</span>
                </span>
                <span className="font-cairo text-[10px] text-zinc-400 font-medium tracking-wider uppercase">Premium Workflows</span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8 font-cairo text-[15px] font-medium text-zinc-300">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-rose-600 transition-all relative group py-2"
                >
                  {link.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-rose-600 to-orange-400 rounded-full transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/admin/login"
                className="font-cairo text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="#products"
                className="relative group overflow-hidden inline-flex items-center gap-2 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(214,0,75,0.3)]"
              >
                <span className="relative z-10">ابدأ الأتمتة الآن</span>
                <ChevronLeft className="w-4 h-4 relative z-10 group-hover:-translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-zinc-400 hover:text-rose-400 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95"
              >
                <ShoppingCart className="w-6 h-6 drop-shadow-lg" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0a0a0f] shadow-lg animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "md:hidden p-2 rounded-xl transition-all duration-300 ml-2",
                scrolled ? "hover:bg-white/10 text-white" : "bg-white/5 backdrop-blur-md border border-white/10 shadow-sm text-white"
              )}
              aria-label="فتح القائمة"
            >
              {mobileOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 w-full mt-2 md:hidden"
            >
              <div className="mx-4 p-4 rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group"
                    >
                      {link.label}
                      <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </Link>
                  ))}
                  <div className="h-px bg-white/10 my-2" />
                  <Link
                    href="/admin/login"
                    onClick={() => setMobileOpen(false)}
                    className="p-3 font-cairo text-zinc-400 hover:text-white text-center"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="#products"
                    onClick={() => setMobileOpen(false)}
                    className="w-full mt-2 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(214,0,75,0.3)] transition-all"
                  >
                    تصفح المنتجات
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

