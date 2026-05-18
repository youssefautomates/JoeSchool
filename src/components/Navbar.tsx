"use client";

import Link from "next/link";
import { ChevronLeft, Menu, X, ShoppingCart, Home } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { cartCount, setIsCartOpen } = useCart();
  const pathname = usePathname();

  const isHomePage = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      if (isHomePage && window.scrollY < 200) {
        setActiveSection("");
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  // Active section tracker (only on home page)
  useEffect(() => {
    if (!isHomePage) return;
    const sections = ["products", "faq", "reviews"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHomePage]);

  // Smart scroll handler: scroll to anchor on home, navigate + scroll on other pages
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      setMobileOpen(false);
      if (href.startsWith("#")) {
        if (isHomePage) {
          e.preventDefault();
          const targetId = href.slice(1);
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
        // If not home, let Next.js navigate to /#section naturally
      }
    },
    [isHomePage]
  );

  const handleHomeClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      setMobileOpen(false);
      if (isHomePage) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [isHomePage]
  );

  const navLinks = [
    { href: isHomePage ? "#products" : "/#products", label: "المنتجات", section: "products" },
    { href: isHomePage ? "#faq" : "/#faq", label: "الأسئلة الشائعة", section: "faq" },
    { href: isHomePage ? "#reviews" : "/#reviews", label: "آراء العملاء", section: "reviews" },
  ];

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-500 ease-in-out px-4 py-4 md:px-8",
          scrolled ? "py-2 md:py-3" : "py-4 md:py-6"
        )}
        // Ensure pointer events are always enabled on the nav
        style={{ pointerEvents: "auto" }}
      >
        <div
          className={cn(
            "container mx-auto max-w-7xl transition-all duration-500 border border-transparent",
            scrolled
              ? "bg-white/5 backdrop-blur-xl border-white/10 rounded-2xl px-6 h-14 md:h-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              : "bg-transparent h-16"
          )}
        >
          <div className="flex items-center justify-between h-full">

            {/* Mobile Spacer to preserve justify-between layout when logo is hidden */}
            <div className="md:hidden" />

            {/* Right Side: Logo (hidden on mobile) */}
            <Link href="/" onClick={handleHomeClick} className="hidden md:flex items-center gap-2.5 group">
              <div className="relative">
                <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <img src="/logo.png" alt="Youssef Automates" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(214,0,75,0.5)]" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-alexandria font-bold text-lg md:text-xl tracking-tight text-white leading-tight" dir="ltr">
                  Youssef <span className="text-rose-500">Automates</span>
                </span>
                <span className="font-cairo text-[10px] text-zinc-400 font-medium tracking-wider uppercase hidden md:block">Premium Workflows</span>
              </div>
            </Link>

            {/* Middle: Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6 font-cairo text-[15px] font-medium text-zinc-300">
              {/* Home Link */}
              <Link
                href="/"
                onClick={handleHomeClick}
                className={cn(
                  "relative group py-2 transition-all hover:text-rose-500",
                  isHomePage && activeSection === "" ? "text-white" : ""
                )}
              >
                الرئيسية
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-rose-600 to-orange-400 rounded-full transition-all duration-300",
                  isHomePage && activeSection === "" ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </Link>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href.startsWith("/#") ? `#${link.section}` : link.href)}
                  className={cn(
                    "relative group py-2 transition-all hover:text-rose-500",
                    activeSection === link.section ? "text-white" : ""
                  )}
                >
                  {link.label}
                  <span className={cn(
                    "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-rose-600 to-orange-400 rounded-full transition-all duration-300",
                    activeSection === link.section ? "w-full" : "w-0 group-hover:w-full"
                  )} />
                </Link>
              ))}
            </div>

            {/* Left Side: Action Elements */}
            <div className="flex items-center gap-2 md:gap-4">

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-zinc-400 hover:text-rose-400 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 active:scale-95 shrink-0"
                style={{ pointerEvents: "auto" }}
              >
                <ShoppingCart className="w-6 h-6 drop-shadow-lg" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0a0a0f] shadow-lg animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Desktop CTA Button */}
              <Link
                href={isHomePage ? "#products" : "/#products"}
                onClick={(e) => handleNavClick(e, "#products")}
                className="relative group overflow-hidden hidden md:inline-flex items-center gap-2 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(214,0,75,0.3)] shrink-0"
                style={{ pointerEvents: "auto" }}
              >
                <span className="relative z-10">ابدأ الأتمتة الآن</span>
                <ChevronLeft className="w-4 h-4 relative z-10 group-hover:-translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>

              {/* Mobile Burger Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cn(
                  "md:hidden p-2 rounded-xl transition-all duration-300 shrink-0",
                  scrolled
                    ? "hover:bg-white/10 text-white"
                    : "bg-white/5 backdrop-blur-md border border-white/10 shadow-sm text-white"
                )}
                aria-label="فتح القائمة"
                style={{ pointerEvents: "auto" }}
              >
                {mobileOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
              </button>

            </div>

          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 w-full mt-2 md:hidden px-4"
              style={{ pointerEvents: "auto" }}
            >
              <div className="p-4 rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col gap-1">
                  {/* Home link in mobile */}
                  <Link
                    href="/"
                    onClick={handleHomeClick}
                    className={cn(
                      "p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group",
                      isHomePage && activeSection === "" ? "text-white bg-white/5" : ""
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-rose-500" />
                      الرئيسية
                    </span>
                    <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                  </Link>

                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href.startsWith("/#") ? `#${link.section}` : link.href)}
                      className={cn(
                        "p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group",
                        activeSection === link.section ? "text-white bg-white/5" : ""
                      )}
                    >
                      {link.label}
                      <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </Link>
                  ))}

                  <Link
                    href={isHomePage ? "#products" : "/#products"}
                    onClick={(e) => handleNavClick(e, "#products")}
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
