import Link from "next/link";
import { ShoppingBag, Mail, MapPin, Phone, ShieldCheck, CreditCard, ChevronLeft, Globe, X, Camera } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-[#050505] border-t border-white/5 pt-24 pb-12 overflow-hidden">
      {/* Cinematic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-4 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          {/* Brand & Mission */}
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center shadow-2xl shadow-rose-500/20 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-alexandria font-black text-2xl tracking-tighter text-white leading-tight" dir="ltr">
                  Youssef <span className="text-rose-500">Automates</span>
                </span>
                <span className="font-cairo text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Premium Workflows</span>
              </div>
            </Link>
            <p className="text-zinc-400 font-cairo leading-relaxed text-lg">
              الوجهة الأولى عربياً لحلول وأتمتة الأعمال باستخدام الذكاء الاصطناعي. نحن نبني المستقبل، تدفق عمل واحداً في كل مرة.
            </p>
            <div className="flex items-center gap-4">
              {[X, Globe, Camera].map((Icon, i) => (
                <Link key={i} href="#" className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-all shadow-xl">
                  <Icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>
          
          {/* Exploration */}
          <div>
            <h3 className="font-alexandria font-bold text-white mb-10 text-xl flex items-center gap-3">
              استكشف
              <span className="w-12 h-px bg-rose-500/50" />
            </h3>
            <ul className="space-y-5 font-cairo text-lg text-zinc-400">
              <li><Link href="#products" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> المنتجات المميزة</Link></li>
              <li><Link href="#features" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> لماذا تختارنا؟</Link></li>
              <li><Link href="#faq" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> الأسئلة الشائعة</Link></li>
              <li><Link href="#reviews" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> آراء العملاء</Link></li>
            </ul>
          </div>

          {/* Legal & Trust */}
          <div>
            <h3 className="font-alexandria font-bold text-white mb-10 text-xl flex items-center gap-3">
              قانوني
              <span className="w-12 h-px bg-rose-500/50" />
            </h3>
            <ul className="space-y-5 font-cairo text-lg text-zinc-400">
              <li><Link href="#" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> شروط الاستخدام</Link></li>
              <li><Link href="#" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> سياسة الخصوصية</Link></li>
              <li><Link href="#" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> سياسة الاسترجاع</Link></li>
              <li><Link href="#" className="hover:text-rose-500 hover:translate-x-2 transition-all inline-flex items-center gap-3"><ChevronLeft className="w-4 h-4" /> الدعم الفني</Link></li>
            </ul>
          </div>

          {/* Direct Support */}
          <div className="space-y-8">
            <h3 className="font-alexandria font-bold text-white mb-10 text-xl flex items-center gap-3">
              تواصل مباشر
              <span className="w-12 h-px bg-rose-500/50" />
            </h3>
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
              <ul className="space-y-6 font-cairo text-zinc-300">
                <li className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-sm md:text-base truncate" dir="ltr">support@youssefautomates.com</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="text-sm md:text-base" dir="ltr">+20 100 000 0000</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap justify-center items-center gap-6 text-zinc-500">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-cairo text-xs font-bold uppercase tracking-wider text-zinc-400">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <CreditCard className="w-4 h-4 text-rose-400" />
              <span className="font-cairo text-xs font-bold uppercase tracking-wider text-zinc-400">Paymob Verified</span>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="font-cairo text-zinc-500 text-sm">
              &copy; {new Date().getFullYear()} <span className="text-white font-bold">Youssef Automates</span>. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

