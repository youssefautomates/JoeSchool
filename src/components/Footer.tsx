"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Camera, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505] py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          
          {/* Logo & Rights */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/" className="relative w-32 h-8 block">
              <Image 
                src="/logo.png" 
                alt="Youssef Automates" 
                fill 
                className="object-contain brightness-125" 
              />
            </Link>
            <p className="text-zinc-500 font-cairo text-sm">
              جميع الحقوق محفوظة Youssef Automates 2026
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {[
              { label: "الرئيسية", href: "/" },
              { label: "المميزات", href: "#features" },
              { label: "التقييمات", href: "#reviews" },
              { label: "الأسئلة الشائعة", href: "#faq" },
              { label: "سياسة الخصوصية", href: "/privacy" },
            ].map((link, i) => (
              <Link 
                key={i} 
                href={link.href}
                className="text-zinc-400 hover:text-white font-cairo text-sm transition-colors duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Social */}
          <div className="flex items-center gap-4">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:bg-rose-600 hover:text-white transition-all duration-500 hover:-translate-y-1"
              title="Instagram"
            >
              <Camera className="w-5 h-5" />
            </a>
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:bg-[#1877F2] hover:text-white transition-all duration-500 hover:-translate-y-1"
              title="Facebook"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
            <a 
              href="mailto:support@youssefautomates.com" 
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:bg-emerald-600 hover:text-white transition-all duration-500 hover:-translate-y-1"
              title="Email Support"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
