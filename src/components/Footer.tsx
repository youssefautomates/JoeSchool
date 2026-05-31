"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Zap, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("تم الاشتراك بنجاح في النشرة البريدية لصناع المحتوى! 🚀");
    setEmail("");
  };

  return (
    <footer className="border-t border-white/5 bg-[#030303] pt-20 pb-12 relative overflow-hidden select-none font-cairo text-zinc-400">
      
      {/* Top Gradient Divider Line with Glow */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D6004B] to-transparent opacity-80" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[10px] bg-[#D6004B]/20 blur-[8px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pb-16">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="w-9 h-9 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/logo.png" alt="JoeSchool" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(214,0,75,0.4)]" />
              </div>
              <span className="font-alexandria font-bold text-lg tracking-tight text-white" dir="ltr">
                Joe <span className="text-[#D6004B]">School</span>
              </span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed">
              أكاديميتك الاحترافية لتعلم صناعة المحتوى البصري، الرسوم المتحركة، وإنتاج الفيديو الإبداعي بالذكاء الاصطناعي.
            </p>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-zinc-300">متجر موثق وآمن 100%</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-5 hidden md:block">
            <h4 className="font-alexandria font-bold text-white text-xs tracking-wider uppercase">روابط سريعة</h4>
            <ul className="space-y-3 text-sm">
              {[
                { label: "الرئيسية", href: "/" },
                { label: "الدورات التعليمية", href: "/#courses" },
                { label: "المنتجات الرقمية", href: "/#products" },
                { label: "الأسئلة الشائعة", href: "/#faq" }
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    href={link.href}
                    className="hover:text-white transition-colors flex items-center gap-2 group w-fit"
                  >
                    <ArrowLeft className="w-3 h-3 text-[#D6004B] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Legal & Support */}
          <div className="space-y-5">
            <h4 className="font-alexandria font-bold text-white text-xs tracking-wider uppercase">الدعم والخصوصية</h4>
            <ul className="space-y-3 text-sm">
              {[
                { label: "سياسة الخصوصية والاستخدام", href: "/privacy" },
                { label: "شروط الدفع والاسترجاع", href: "/privacy" },
                { label: "تواصل مع الدعم الفني", href: "mailto:joeschool.ai@gmail.com" }
              ].map((link, i) => (
                <li key={i}>
                  <Link 
                    href={link.href}
                    className="hover:text-white transition-colors flex items-center gap-2 group w-fit"
                  >
                    <ArrowLeft className="w-3 h-3 text-[#D6004B] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter & Socials */}
          <div className="space-y-5">
            <h4 className="font-alexandria font-bold text-white text-xs tracking-wider uppercase">النشرة البريدية للإبداع</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              اشترك لتلقي أحدث تقنيات صناعة المحتوى بالذكاء الاصطناعي، أدوات الإنتاج الإبداعي، وأصول المبدعين الحصرية مجاناً.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full">
              <input 
                type="email"
                placeholder="بريدك الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-[#D6004B]/50 transition-all w-full"
                required
              />
              <button 
                type="submit"
                className="bg-[#D6004B] hover:bg-[#b0003d] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 shadow-lg shadow-[#D6004B]/20"
              >
                اشترك
              </button>
            </form>
            
            {/* Social Icons Row */}
            <div className="pt-2 flex justify-start">
              <SocialLinks />
            </div>
          </div>

        </div>

        {/* Bottom Section: Centered Copyright */}
        <div className="pt-8 border-t border-white/5 flex items-center justify-center text-center">
          <div className="text-zinc-500 text-xs flex items-center justify-center gap-1.5 flex-wrap">
            <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
            <span className="font-alexandria font-bold text-zinc-400">JoeSchool</span>
            <span>· صنع بكل</span>
            <Heart className="w-3 h-3 text-[#D6004B] fill-[#D6004B]" />
            <span>لدعم مسيرتك الإبداعية</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
