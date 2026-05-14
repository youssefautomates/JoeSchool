"use client";

import Link from "next/link";
import { ShoppingBag, ChevronLeft, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "المميزات" },
    { href: "#products", label: "المنتجات" },
    { href: "#faq", label: "الأسئلة الشائعة" },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-alexandria font-bold text-lg tracking-tight text-zinc-900" dir="ltr">
              Youssef <span className="text-blue-600">Automates</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 font-cairo text-sm font-medium text-zinc-600">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-blue-600 transition-colors relative group py-1"
              >
                {link.label}
                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-blue-600 rounded-full transition-all group-hover:w-full" />
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/admin/login"
              className="font-cairo text-sm font-medium text-zinc-600 hover:text-blue-600 transition-colors px-3 py-2"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="#products"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-cairo text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              تصفح المنتجات
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="فتح القائمة"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 bg-white border-b border-zinc-200",
            mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-cairo text-base font-medium text-zinc-700 hover:text-blue-600 hover:bg-blue-50 transition-colors px-4 py-3 rounded-xl"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-zinc-100 my-2" />
            <Link
              href="/admin/login"
              onClick={() => setMobileOpen(false)}
              className="font-cairo text-sm text-zinc-500 hover:text-zinc-900 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="#products"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-cairo font-semibold text-base px-4 py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 mt-1"
            >
              تصفح المنتجات الآن
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
