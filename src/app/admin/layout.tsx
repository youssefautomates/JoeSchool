"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut,
  Search, Bell, Sparkles, Target, Star, BarChart3, ShieldAlert,
  Flame, Globe, ShieldCheck, BookOpen, Users, Award, Mail, LayoutGrid
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navGroups = [
    {
      title: "Analytics & Metrics",
      items: [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "AI Smart Assistant", href: "/admin/ai", icon: Sparkles },
        { name: "Detailed Analytics", href: "/admin/analytics", icon: BarChart3 }
      ]
    },
    {
      title: "Digital Products Store",
      items: [
        { name: "Manage Products", href: "/admin/products", icon: Package },
        { name: "Product Categories", href: "/admin/categories?tab=products", icon: LayoutGrid },
        { name: "Coupons & Marketing", href: "/admin/marketing", icon: Target },
        { name: "Manage Orders", href: "/admin/orders", icon: ShoppingCart },
        { name: "Live Orders Feed", href: "/admin/orders/live", icon: Flame }
      ]
    },
    {
      title: "LMS Academy",
      items: [
        { name: "Manage Courses", href: "/admin/courses", icon: BookOpen },
        { name: "Course Categories", href: "/admin/categories?tab=courses", icon: LayoutGrid },
        { name: "Students List", href: "/admin/courses/students", icon: Users },
        { name: "Issued Certificates", href: "/admin/courses/certificates", icon: Award }
      ]
    },
    {
      title: "Security & Admin",
      items: [
        { name: "صندوق الوارد", href: "/admin/inbox", icon: Mail },
        { name: "Email System", href: "/admin/email-system", icon: Mail },
        { name: "Student Reviews", href: "/admin/reviews", icon: Star },
        { name: "Facebook Pixel", href: "/admin/analytics/facebook-pixel", icon: Target },
        { name: "TikTok Pixel", href: "/admin/analytics/tiktok-pixel", icon: Globe },
        { name: "General Settings", href: "/admin/settings", icon: Settings },
        { name: "System Security", href: "/admin/settings/security", icon: ShieldCheck }
      ]
    }
  ];

  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30" dir="ltr">
      {/* Sidebar - Positioned on Left for LTR */}
      <aside className="fixed left-0 top-0 h-screen w-80 bg-[#09090b] border-r border-white/5 z-50 hidden lg:flex flex-col shadow-2xl">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="/logo.png" alt="Admin Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(214,0,75,0.5)]" />
          </div>
          <div>
            <span className="text-xl font-sans font-black tracking-tighter block uppercase">ADMIN PRO</span>
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
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-sans font-bold group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-xs">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Padded on Left for Sidebar */}
      <main className="lg:pl-80 min-h-screen transition-all">
        {/* Header */}
        <header className="sticky top-0 h-24 border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-8 flex-1">
            <div className="relative w-full max-w-md hidden md:block group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search for anything..." 
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-sans focus:outline-none focus:border-rose-500/50 focus:bg-white/10 transition-all text-zinc-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all group">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-600 rounded-full border-2 border-[#050505]" />
            </button>

            <div className="flex items-center gap-4 pr-4 border-r border-white/5 h-10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white font-sans leading-none mb-1">Youssef Mostafa</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Super Admin</p>
              </div>
              <div className="relative group cursor-pointer">
                <Avatar className="w-12 h-12 rounded-xl border-2 border-white/5 group-hover:border-rose-600/50 transition-all shadow-xl">
                  <AvatarImage src="https://github.com/shadcn.png" className="rounded-xl" />
                  <AvatarFallback className="bg-rose-600 text-white rounded-xl">YM</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#050505] rounded-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto font-sans">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarNav({ pathname, navGroups }: { pathname: string, navGroups: any[] }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/admin/inbox");
        if (res.ok) {
          const data = await res.json();
          const count = Array.isArray(data) ? data.filter((e: any) => !e.isRead).length : 0;
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Error fetching sidebar unread count:", err);
      }
    };

    fetchUnread();

    const handleUpdate = () => {
      fetchUnread();
    };
    window.addEventListener("inbox-updated", handleUpdate);
    return () => window.removeEventListener("inbox-updated", handleUpdate);
  }, []);

  return (
    <>
      {navGroups.map((group: any) => (
        <div key={group.title} className="space-y-3 mt-6">
          <p className="px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">{group.title}</p>
          {group.items.map((item: any) => {
            const isActive = item.href.includes('?')
              ? pathname === item.href.split('?')[0] && activeTab === new URLSearchParams(item.href.split('?')[1]).get("tab")
              : pathname === item.href;

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
                    className="absolute left-0 w-1.5 h-7 bg-white rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-all duration-300", 
                  isActive ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "text-zinc-500 group-hover:text-[#D6004B] group-hover:scale-110"
                )} />
                <span className="font-bold text-[13px] tracking-wide font-sans transition-colors duration-300">{item.name}</span>
                {item.href === "/admin/inbox" && unreadCount > 0 && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#D6004B] text-white font-bold leading-none min-w-[20px] text-center shadow-[0_0_10px_rgba(214,0,75,0.4)]">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
