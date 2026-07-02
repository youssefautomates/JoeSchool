"use client";

import Link from "next/link";
import { ShieldCheck, Heart, Clock, Laptop, Tag, Infinity, Phone, Mail, MapPin } from "lucide-react";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white pt-8 pb-10 relative overflow-hidden select-none text-zinc-500">
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">

        {/* ── 2. Rearranged Grid/Flex Layout (Desktop: Right-to-Left, Mobile: Stacked Vertical) ── */}
        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-6 md:gap-10 pb-6 border-b border-zinc-200">
          
          {/* Right Section: Brand Logo */}
          <div className="flex flex-col items-center md:items-end gap-3.5 w-full md:w-auto text-center md:text-right">
            <Link href="/" className="flex items-center justify-center group">
              <div className="h-16 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/logo-text.png" alt="JoeSchool" className="h-full object-contain" />
              </div>
            </Link>
          </div>

          {/* Center Section: Horizontal Navigation Links (wraps beautifully on mobile) */}
          <div className="flex flex-col items-center gap-4 text-center w-full md:w-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs sm:text-sm font-bold text-zinc-700">
              <Link href="/" className="hover:text-[#2563EB] hover:underline underline-offset-4 transition-all">الصفحة الرئيسية</Link>
              <span className="text-zinc-500 hidden sm:inline select-none">•</span>
              <Link href="/courses" className="hover:text-[#2563EB] hover:underline underline-offset-4 transition-all">الدورات</Link>
              <span className="text-zinc-500 hidden sm:inline select-none">•</span>
              <Link href="/products" className="hover:text-[#2563EB] hover:underline underline-offset-4 transition-all">المنتجات الرقمية</Link>
              <span className="text-zinc-500 hidden sm:inline select-none">•</span>
              <Link href="/privacy?tab=privacy" className="hover:text-[#2563EB] hover:underline underline-offset-4 transition-all">سياسة الخصوصية</Link>
              <span className="text-zinc-500 hidden sm:inline select-none">•</span>
              <Link href="/privacy?tab=terms" className="hover:text-[#2563EB] hover:underline underline-offset-4 transition-all">الشروط والأحكام</Link>
              <span className="text-zinc-500 hidden sm:inline select-none">•</span>
              <Link href="/privacy?tab=refund" className="hover:text-[#2563EB] hover:underline underline-offset-4 transition-all">سياسة الاسترجاع</Link>
            </div>
          </div>

          {/* Left Section: Social Links */}
          <div className="flex flex-col items-center md:items-start gap-4.5 w-full md:w-auto">
            {/* Social icons row */}
            <div className="flex justify-center scale-90 md:origin-left">
              <SocialLinks />
            </div>
          </div>

        </div>

        {/* Copyright and Attribution centered at absolute bottom */}
        <div className="flex flex-col items-center gap-2 mt-6 text-center">
          <span className="text-zinc-500 text-xs sm:text-sm">
            جميع الحقوق محفوظة لـ <span className="text-[#2563EB] font-extrabold">JoeSchool</span> ©
          </span>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-500">
            <span>صنع بكل</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>لدعم مسيرتك الإبداعية</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
