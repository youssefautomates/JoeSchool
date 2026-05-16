import Link from "next/link";
import { ShoppingBag, Mail, MapPin, Phone, ShieldCheck, CreditCard, ChevronLeft, Globe, X, Camera } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-[#050505] border-t border-white/5 py-12 overflow-hidden">
      {/* Cinematic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-4 z-10 text-center">
        {/* Brand */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
          <div className="relative w-12 h-12 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
             <img src="/logo.png" alt="Youssef Automates" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(214,0,75,0.4)]" />
          </div>
          <span className="font-alexandria font-black text-2xl tracking-tighter text-white" dir="ltr">
            Youssef <span className="text-[#D6004B]">Automates</span>
          </span>
        </Link>

        {/* Links Row */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8 font-cairo text-sm text-zinc-400">
          <Link href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
          <Link href="/terms" className="hover:text-white transition-colors">شروط الاستخدام</Link>
          <Link href="/refund" className="hover:text-white transition-colors">سياسة الاسترجاع</Link>
          <Link href="mailto:support@youssefautomates.com" className="hover:text-white transition-colors">الدعم الفني</Link>
        </div>

        {/* Socials */}
        <div className="flex justify-center gap-4 mb-8">
           {[X, Globe, Camera].map((Icon, i) => (
            <Link key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:bg-[#D6004B] hover:text-white transition-all shadow-lg">
              <Icon className="w-4 h-4" />
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 max-w-2xl mx-auto">
          <p className="font-cairo text-zinc-500 text-xs md:text-sm">
            &copy; {new Date().getFullYear()} <span className="text-white font-bold">Youssef Automates</span>. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}

