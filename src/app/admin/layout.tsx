"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut,
  Search, Bell, Sparkles, Target, Star, BarChart3, ShieldAlert,
  Flame, Globe, ShieldCheck, BookOpen, Video, Users, Award, Mail, LayoutGrid
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navGroups = [
    {
      title: "التحليلات والمقاييس",
      items: [
        { name: "لوحة التحكم الرئيسية", href: "/admin", icon: LayoutDashboard },
        { name: "مساعد الأعمال الذكي (AI)", href: "/admin/ai", icon: Sparkles },
        { name: "التحليلات والتقارير", href: "/admin/analytics", icon: BarChart3 }
      ]
    },
    {
      title: "متجر المنتجات الرقمية",
      items: [
        { name: "إدارة المنتجات الرقمية", href: "/admin/products", icon: Package },
        { name: "أقسام المنتجات الرقمية", href: "/admin/categories?tab=products", icon: LayoutGrid },
        { name: "الكوبونات والتسويق", href: "/admin/marketing", icon: Target },
        { name: "إدارة الطلبات والمبيعات", href: "/admin/orders", icon: ShoppingCart },
        { name: "تغذية المبيعات الحية", href: "/admin/orders/live", icon: Flame }
      ]
    },
    {
      title: "أكاديمية التعليم (LMS)",
      items: [
        { name: "إدارة الكورسات التعليمية", href: "/admin/courses", icon: BookOpen },
        { name: "أقسام الكورسات التعليمية", href: "/admin/categories?tab=courses", icon: LayoutGrid },
        { name: "إدارة قائمة الطلاب", href: "/admin/courses/students", icon: Users },
        { name: "الشهادات الصادرة", href: "/admin/courses/certificates", icon: Award },
        { name: "مكتبة الوسائط", href: "/admin/media", icon: Video }
      ]
    },
    {
      title: "الإدارة والأمن",
      items: [
        { name: "نظام البريد الإلكتروني", href: "/admin/email-system", icon: Mail },
        { name: "تقييمات الطلاب", href: "/admin/reviews", icon: Star },
        { name: "فيسبوك بيكسل", href: "/admin/analytics/facebook-pixel", icon: Target },
        { name: "تيك توك بيكسل", href: "/admin/analytics/tiktok-pixel", icon: Globe },
        { name: "الإعدادات العامة", href: "/admin/settings", icon: Settings },
        { name: "حماية وأمن النظام", href: "/admin/settings/security", icon: ShieldCheck }
      ]
    }
  ];

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 h-screen w-80 bg-[#09090b] border-l border-white/5 z-50 hidden lg:flex flex-col shadow-2xl">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logo.png" alt="Admin Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(214,0,75,0.5)]" />
          </div>
          <div>
            <span className="text-xl font-alexandria font-black tracking-tighter block uppercase">ADMIN PRO</span>
            <span className="text-[10px] text-rose-500 font-bold tracking-[0.2em] uppercase">Youssef Automates</span>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <Suspense fallback={
            <div className="space-y-4 px-4 py-2">
              <div className="h-4 bg-white/5 rounded-md w-2/3 animate-pulse" />
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            </div>
          }>
            <SidebarNav pathname={pathname} navGroups={navGroups} />
          </Suspense>
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
            <span className="text-xs">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pr-80 min-h-screen transition-all">
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
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto font-cairo">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarNav({ pathname, navGroups }: { pathname: string, navGroups: any[] }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  return (
    <>
      {navGroups.map((group: any) => (
        <div key={group.title} className="space-y-3">
          <p className="px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest font-alexandria">{group.title}</p>
          {group.items.map((item: any) => {
            const isActive = item.href.includes('?')
              ? pathname === item.href.split('?')[0] && activeTab === new URLSearchParams(item.href.split('?')[1]).get("tab")
              : pathname === item.href;
            
            // If it is an inactive/disabled preview item, render it with a premium disabled look
            if ((item as any).disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-5 py-3.5 rounded-2xl opacity-35 cursor-not-allowed select-none bg-white/[0.01] border border-transparent"
                >
                  <div className="flex items-center gap-4">
                    <item.icon className="w-5 h-5 text-zinc-500" />
                    <span className="font-bold text-[13px] tracking-wide font-cairo text-zinc-400">{item.name}</span>
                  </div>
                  <span className="text-[8px] bg-rose-950 text-rose-400 border border-rose-900/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider scale-90">قريباً</span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group relative border border-transparent",
                  isActive 
                    ? "bg-[#D6004B] text-white shadow-xl shadow-[#D6004B]/20 border-[#D6004B]/20" 
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:border-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute right-0 w-1.5 h-7 bg-white rounded-l-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-all duration-300", 
                  isActive ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-zinc-500 group-hover:text-[#D6004B] group-hover:scale-110"
                )} />
                <span className="font-bold text-[13px] tracking-wide font-cairo transition-colors duration-300">{item.name}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
