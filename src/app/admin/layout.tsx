"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Search, Bell, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
    { name: "المنتجات", href: "/admin/products", icon: Package },
    { name: "الطلبات", href: "/admin/orders", icon: ShoppingCart },
    { name: "الإعدادات", href: "/admin/settings", icon: Settings },
  ];

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-screen w-72 bg-[#09090b] border-l border-white/5 z-50 hidden lg:flex flex-col shadow-2xl">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-pink-700 flex items-center justify-center shadow-lg shadow-rose-600/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-alexandria font-black tracking-tighter block uppercase">ADMIN PRO</span>
            <span className="text-[10px] text-rose-500 font-bold tracking-[0.2em] uppercase">Youssef Automates</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 pb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">القائمة الرئيسية</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                  isActive 
                    ? "bg-rose-600 text-white shadow-xl shadow-rose-600/20" 
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute right-0 w-1 h-6 bg-white rounded-l-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-colors", 
                  isActive ? "text-white" : "group-hover:text-rose-400"
                )} />
                <span className="font-bold text-sm tracking-wide font-cairo">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <button 
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              window.location.href = '/admin/login';
            }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-cairo font-bold group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pr-72 min-h-screen transition-all">
        {/* Header */}
        <header className="sticky top-0 h-24 border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-full max-w-md hidden md:block group">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
              <input 
                type="text" 
                placeholder="ابحث عن أي شيء..." 
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-cairo focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all group">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute top-3 left-3 w-2 h-2 bg-rose-600 rounded-full border-2 border-[#050505]" />
            </button>

            <div className="flex items-center gap-4 pl-4 border-l border-white/5 h-10">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-white font-alexandria leading-none mb-1">يوسف أحمد</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Super Admin</p>
              </div>
              <div className="relative group cursor-pointer">
                <Avatar className="w-12 h-12 rounded-xl border-2 border-white/5 group-hover:border-rose-600/50 transition-all shadow-xl">
                  <AvatarImage src="https://github.com/shadcn.png" className="rounded-xl" />
                  <AvatarFallback className="bg-rose-600 text-white rounded-xl">YA</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-4 border-[#050505] rounded-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

