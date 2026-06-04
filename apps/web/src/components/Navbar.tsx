"use client";

import Link from "next/link";
import { ChevronLeft, Menu, X, ShoppingCart, Home, User, LogOut, LogIn, BookOpen, Package, HelpCircle, Heart } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { usePathname, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "sonner";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { cartCount, setIsCartOpen } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [imgError, setImgError] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  const isHomePage = pathname === "/";

  const updateWishlistCount = async (currentUser = user) => {
    try {
      if (currentUser?.id) {
        const { count, error } = await supabaseClient
          .from("wishlist_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUser.id);
        if (!error && count !== null) {
          setWishlistCount(count);
          return;
        }
      }
      const local = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("youssef-automates-wishlist") || "[]") : [];
      setWishlistCount(local.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    updateWishlistCount(user);

    const handleUpdate = () => {
      updateWishlistCount(user);
    };
    window.addEventListener("wishlist-updated", handleUpdate);
    return () => window.removeEventListener("wishlist-updated", handleUpdate);
  }, [user]);

  const profileImageUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.profile_image;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "طالب مميز";

  // Check and listen for auth session state changes in real-time
  useEffect(() => {
    // 1. Initial retrieval
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setImgError(false);
    });

    // 2. Listen to state changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setImgError(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setMobileOpen(false);
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        toast.error(error.message || "حدث خطأ أثناء تسجيل الخروج");
      } else {
        toast.success("تم تسجيل الخروج بنجاح. نراك قريباً!");
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      toast.error("حدث خطأ غير متوقع أثناء تسجيل الخروج");
    }
  };

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
    const sections = ["courses", "products", "faq", "reviews"];
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
    { href: isHomePage ? "#products" : "/#products", label: "المنتجات الرقمية", section: "products", icon: Package },
    { href: isHomePage ? "#faq" : "/#faq", label: "الأسئلة الشائعة", section: "faq", icon: HelpCircle },
  ];

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-500 ease-in-out px-4 py-4 md:px-8",
          scrolled ? "py-2 md:py-3" : "py-4 md:py-6"
        )}
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

            {/* Right Side: Logo & Brand */}
            <div className="md:flex-1 flex items-center justify-start">
              <Link href="/" onClick={handleHomeClick} className="flex items-center group">
                <img src="/logo-text.png" alt="JoeSchool" className="h-18 sm:h-22 md:h-26 object-contain group-hover:scale-[1.03] transition-transform duration-300" />
              </Link>
            </div>

            {/* Middle: Desktop Nav Links */}
            <div className="hidden md:flex items-center justify-center gap-6 font-cairo text-[15px] font-medium text-zinc-300 shrink-0">
              <Link
                href="/"
                onClick={handleHomeClick}
                className={cn(
                  "relative group py-2 transition-all hover:text-rose-500",
                  isHomePage && activeSection === "" ? "text-white" : ""
                )}
              >
                الصفحة الرئيسية
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-rose-600 to-orange-400 rounded-full transition-all duration-300",
                  isHomePage && activeSection === "" ? "w-full" : "w-0 group-hover:w-full"
                )} />
              </Link>

              <Link
                href={isHomePage ? "#courses" : "/courses"}
                onClick={(e) => handleNavClick(e, isHomePage ? "#courses" : "/courses")}
                className={cn(
                  "relative group py-2 transition-all hover:text-rose-500",
                  (pathname.startsWith("/courses") || (isHomePage && activeSection === "courses")) ? "text-white" : ""
                )}
              >
                الدورات التعليمية
                <span className={cn(
                  "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-rose-600 to-orange-400 rounded-full transition-all duration-300",
                  (pathname.startsWith("/courses") || (isHomePage && activeSection === "courses")) ? "w-full" : "w-0 group-hover:w-full"
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
            <div className="md:flex-1 flex items-center justify-end gap-2 md:gap-4">



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

              {/* Mobile Auth Quick Link */}
              {user ? (
                <Link
                  href="/dashboard"
                  className="md:hidden font-cairo text-[11px] xs:text-xs font-bold text-[#D6004B] hover:text-[#ff0055] transition-colors bg-[#D6004B]/5 hover:bg-[#D6004B]/10 px-2.5 py-1.5 rounded-xl shrink-0 cursor-pointer"
                >
                  لوحة التحكم
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="md:hidden font-cairo text-[11px] xs:text-xs font-bold text-white hover:text-white transition-colors bg-[#D6004B] hover:bg-[#b0003d] px-2.5 py-1.5 rounded-xl shrink-0 cursor-pointer"
                >
                  تسجيل الدخول
                </Link>
              )}

              {/* Integrated Auth CTA Actions for Desktop */}
              {user ? (
                <div className="hidden md:flex items-center gap-4">
                  {/* User Details / Avatar based on presence */}
                  {profileImageUrl && !imgError ? (
                    <div className="relative group shrink-0 select-none">
                      <img 
                        src={profileImageUrl} 
                        alt={userName}
                        onError={() => setImgError(true)}
                        className="w-8 h-8 rounded-full object-cover border border-rose-500/30 shadow-[0_0_10px_rgba(214,0,75,0.25)] hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col text-right font-cairo select-none shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          مستخدم نشط
                        </span>
                        <span className="text-xs font-bold text-white leading-tight">{userName}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 leading-none mt-0.5" dir="ltr">{user.email}</span>
                    </div>
                  )}

                  <span className="text-white/10 text-xs select-none">|</span>

                  {/* Logout link */}
                  <button
                    onClick={handleLogout}
                    className="font-cairo text-xs font-bold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    تسجيل الخروج
                  </button>

                  <span className="text-white/10 text-xs select-none">|</span>

                  {/* Dashboard link */}
                  <Link
                    href="/dashboard"
                    className="relative group overflow-hidden inline-flex items-center gap-2 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(214,0,75,0.2)] shrink-0"
                  >
                    <span className="relative z-10">لوحة التحكم</span>
                    <ChevronLeft className="w-3.5 h-3.5 relative z-10 group-hover:-translate-x-0.5 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Link>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-4">
                  {/* Login Link */}
                  <Link
                    href="/login"
                    className="font-cairo text-xs font-bold text-zinc-300 hover:text-rose-500 transition-colors"
                  >
                    تسجيل الدخول
                  </Link>

                  {/* Signup CTA Button */}
                  <Link
                    href="/signup"
                    className="relative group overflow-hidden inline-flex items-center gap-2 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(214,0,75,0.25)] shrink-0"
                  >
                    <span className="relative z-10">إنشاء حساب</span>
                    <ChevronLeft className="w-3.5 h-3.5 relative z-10 group-hover:-translate-x-0.5 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Link>
                </div>
              )}

              {/* Mobile Burger Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cn(
                  "md:hidden p-2 rounded-xl transition-all duration-300 shrink-0",
                  scrolled
                    ? "hover:bg-white/10 text-white"
                    : "bg-white/5 backdrop-blur-md text-white"
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
                  {/* Top Profile Card in Mobile Menu */}
                  {user ? (
                    <div className="p-4 mb-3 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group select-none">
                      <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="flex items-center gap-3.5 relative z-10 text-right">
                        {profileImageUrl && !imgError && (
                          <img
                            src={profileImageUrl}
                            alt={userName}
                            onError={() => setImgError(true)}
                            className="w-12 h-12 rounded-xl object-cover border border-rose-500/30 shadow-md shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-alexandria font-bold text-white truncate leading-tight mb-1.5">{userName}</p>
                          <p className="text-[10px] text-zinc-500 truncate leading-none mb-2" dir="ltr">{user.email}</p>
                          <div className="flex justify-end">
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                              مستخدم نشط
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 mb-3 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden flex items-center gap-3.5 text-right select-none">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-alexandria font-bold text-white leading-tight mb-1">مرحباً بك في جو سكول</p>
                        <p className="text-[10px] text-zinc-400 font-cairo">سجل دخولك للاستفادة الكاملة</p>
                      </div>
                    </div>
                  )}

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
                      الصفحة الرئيسية
                    </span>
                    <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                  </Link>

                  <Link
                    href={isHomePage ? "#courses" : "/courses"}
                    onClick={(e) => handleNavClick(e, isHomePage ? "#courses" : "/courses")}
                    className={cn(
                      "p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group",
                      (pathname.startsWith("/courses") || (isHomePage && activeSection === "courses")) ? "text-white bg-white/5" : ""
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-rose-500" />
                      الدورات التعليمية
                    </span>
                    <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                  </Link>

                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={(e) => handleNavClick(e, link.href.startsWith("/#") ? `#${link.section}` : link.href)}
                        className={cn(
                          "p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group",
                          activeSection === link.section ? "text-white bg-white/5" : ""
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-rose-500" />
                          {link.label}
                        </span>
                        <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                      </Link>
                    );
                  })}

                  {/* Favorites / Wishlist link in mobile menu */}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      window.dispatchEvent(new Event("wishlist-open"));
                    }}
                    className="p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group w-full text-right cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                      المفضلة
                    </span>
                    <div className="flex items-center gap-2">
                      {wishlistCount > 0 && (
                        <span className="bg-[#D6004B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {wishlistCount}
                        </span>
                      )}
                      <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                    </div>
                  </button>

                  <Link
                    href={isHomePage ? "#products" : "/#products"}
                    onClick={(e) => handleNavClick(e, "#products")}
                    className="w-full mt-2 bg-[#D6004B] hover:bg-[#b0003d] text-white font-cairo font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(214,0,75,0.3)] transition-all"
                  >
                    تصفح المنتجات الرقمية
                  </Link>

                  {/* Integrated Auth Drawer Actions for Mobile */}
                  <div className="border-t border-white/5 my-2 pt-2 flex flex-col gap-1">
                    {user ? (
                      <>
                        {/* Mobile Dashboard */}
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2.5">
                            <User className="w-4 h-4 text-rose-500" />
                            لوحة التحكم الخاصة بي
                          </span>
                          <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                        </Link>

                        {/* Mobile Logout */}
                        <button
                          onClick={handleLogout}
                          className="p-3 rounded-xl hover:bg-red-500/10 font-cairo text-red-400 hover:text-red-300 transition-all flex items-center gap-2.5 text-right w-full cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>تسجيل الخروج</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Mobile Login */}
                        <Link
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                          className="p-3 rounded-xl hover:bg-white/5 font-cairo text-zinc-300 hover:text-white transition-all flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2.5">
                            <LogIn className="w-4 h-4 text-rose-500" />
                            تسجيل الدخول للمنصة
                          </span>
                          <ChevronLeft className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
                        </Link>

                        {/* Mobile Signup */}
                        <Link
                          href="/signup"
                          onClick={() => setMobileOpen(false)}
                          className="w-full mt-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-cairo font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-all text-center"
                        >
                          <span>إنشاء حساب جديد</span>
                        </Link>
                      </>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
