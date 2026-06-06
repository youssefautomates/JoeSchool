"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, Globe, DollarSign, Download, RefreshCw, 
  Maximize2, Minimize2, Sun, Moon 
} from "lucide-react";

interface DashboardFiltersProps {
  dateRange: string;
  setDateRange: (range: string) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  country: string;
  setCountry: (country: string) => void;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  hasCountriesData?: string[];
  isCompact: boolean;
  setIsCompact: (isCompact: boolean) => void;
}

export default function DashboardFilters({
  dateRange,
  setDateRange,
  currency,
  setCurrency,
  country,
  setCountry,
  theme,
  setTheme,
  loading,
  onRefresh,
  onExport,
  hasCountriesData = ["EG", "SA", "AE", "US"],
  isCompact,
  setIsCompact,
}: DashboardFiltersProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state with window events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const countries = [
    { id: "ALL", label: "جميع الدول والمناطق" },
    ...hasCountriesData.map(c => {
      const label = c === "EG" ? "🇪🇬 مصر" : c === "SA" ? "🇸🇦 المملكة العربية السعودية" : c === "AE" ? "🇦🇪 الإمارات" : c === "US" ? "🇺🇸 الولايات المتحدة" : `🌐 ${c}`;
      return { id: c, label };
    }),
    { id: "Unknown", label: "دول أخرى / مجهولة" }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#09090e]/80 border border-white/5 relative z-30 text-right" dir="rtl">
      
      {/* Top row: Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center bg-white/5 border border-white/5 rounded-xl p-1 gap-1">
          {[
            { id: "1", label: "اليوم" },
            { id: "7", label: "٧ أيام" },
            { id: "30", label: "٣٠ يوم" },
            { id: "90", label: "٩٠ يوم" }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${
                dateRange === range.id 
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" 
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Country Filter */}
        <div className="relative flex items-center pr-10">
          <Globe className="w-4.5 h-4.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-white/5 border border-white/5 hover:border-white/10 text-xs text-zinc-300 font-bold rounded-xl py-2.5 pr-10 pl-3 focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer text-right"
          >
            {countries.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#09090e] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Filter */}
        <div className="relative flex items-center pr-10">
          <DollarSign className="w-4.5 h-4.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-white/5 border border-white/5 hover:border-white/10 text-xs text-zinc-300 font-bold rounded-xl py-2.5 pr-10 pl-3 focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer text-right"
          >
            <option value="ALL" className="bg-[#09090e] text-white">جميع العملات</option>
            <option value="EGP" className="bg-[#09090e] text-white">🇪🇬 الجنيه المصري</option>
            <option value="USD" className="bg-[#09090e] text-white">🇺🇸 الدولار الأمريكي</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Page Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
        
        {/* Refresh & Excel Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 h-8.5 rounded-xl text-[11px] font-black transition-all bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث البيانات
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 h-8.5 rounded-xl text-[11px] font-black transition-all bg-rose-600 hover:bg-[#ff0059] text-white shadow-md shadow-rose-600/10 border border-transparent cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير تقرير إكسل
          </button>
        </div>

        {/* Theme Toggles, At-a-Glance, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* At-a-Glance Mode Toggle */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex items-center gap-1.5 px-3 h-8.5 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
              isCompact 
                ? "bg-rose-950/40 text-rose-400 border-rose-500/30" 
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
            }`}
            title="معاينة موجزة (تقليل المسافات والحجم)"
          >
            {isCompact ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            معاينة موجزة
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8.5 h-8.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={theme === "dark" ? "التحويل للوضع المضيء" : "التحويل للوضع الداكن"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className="w-8.5 h-8.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all hidden md:flex cursor-pointer"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
