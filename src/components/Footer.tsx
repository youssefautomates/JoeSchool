"use client";

import Link from "next/link";
import { ShieldCheck, Heart, Clock, Laptop, Tag, Infinity, Phone, Mail, MapPin } from "lucide-react";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#030303] pt-12 pb-10 relative overflow-hidden select-none font-cairo text-zinc-400">
      
      {/* Top Gradient Divider Line with Glow */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent opacity-80" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[10px] bg-[#D6004B]/20 blur-[8px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">


        {/* ── 2. Rearranged Grid/Flex Layout (Desktop: Right-to-Left, Mobile: Stacked Vertical) ── */}
        <div className="flex flex-col md:flex-row-reverse items-center md:items-start justify-between gap-10 pb-8 border-b border-white/5">
          
          {/* Right Section: Brand Logo */}
          <div className="flex flex-col items-center md:items-end gap-3.5 w-full md:w-auto text-center md:text-right">
            <Link href="/" className="flex items-center justify-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/logo.png" alt="JoeSchool" className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(214,0,75,0.5)]" />
              </div>
            </Link>
          </div>

          {/* Center Section: Horizontal Navigation Links (wraps beautifully on mobile) */}
          <div className="flex flex-col items-center gap-4 text-center w-full md:w-auto">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5 text-xs sm:text-sm font-bold text-zinc-300">
              <Link href="/" className="hover:text-[#D6004B] transition-colors">الرئيسية</Link>
              <Link href="/#courses" className="hover:text-[#D6004B] transition-colors">الدورات</Link>
              <Link href="/#bundles" className="hover:text-[#D6004B] transition-colors">الدبلومات</Link>
              <Link href="/#faq" className="hover:text-[#D6004B] transition-colors">مركز المساعدة</Link>
              <Link href="/privacy?tab=terms" className="hover:text-[#D6004B] transition-colors">سياسة الاستخدام</Link>
              <Link href="/privacy?tab=privacy" className="hover:text-[#D6004B] transition-colors">سياسة الخصوصية</Link>
            </div>
            <div className="text-xs sm:text-sm font-bold text-zinc-400 hover:text-[#D6004B] transition-colors">
              <Link href="/privacy?tab=refund">قواعد سياسة الاسترجاع</Link>
            </div>
          </div>

          {/* Left Section: Contact Info & Social Links */}
          <div className="flex flex-col items-center md:items-start gap-4.5 w-full md:w-auto">
            <div className="flex flex-col items-center md:items-start gap-2.5 text-xs sm:text-sm text-zinc-400 font-medium font-sans">
              <div className="flex items-center gap-2.5 hover:text-white transition-colors" dir="ltr">
                <Mail className="w-4 h-4 text-zinc-600" />
                <a href="mailto:support@joeschool.com">support@joeschool.com</a>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-500" dir="ltr">
                <MapPin className="w-4 h-4 text-zinc-600 shrink-0" />
                <span>Egypt</span>
              </div>
            </div>
            
            {/* Social icons row */}
            <div className="flex justify-center scale-90 md:origin-left">
              <SocialLinks />
            </div>
          </div>

        </div>

        {/* Copyright and Attribution centered at absolute bottom */}
        <div className="flex flex-col items-center gap-2 mt-8 text-center">
          <span className="text-zinc-400 text-xs sm:text-sm">
            جميع الحقوق محفوظة لـ <span className="text-[#CF2946] font-extrabold">JoeSchool</span> ©
          </span>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-zinc-500">
            <span>صنع بكل</span>
            <Heart className="w-3.5 h-3.5 text-[#D6004B] fill-[#D6004B]" />
            <span>لدعم مسيرتك الإبداعية</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
