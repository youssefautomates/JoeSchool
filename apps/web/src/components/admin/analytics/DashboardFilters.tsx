"use client";

import { useState, useEffect } from "react";
import { 
  Globe, DollarSign, Download, RefreshCw, 
  Maximize2, Minimize2, Sun, Moon, RotateCcw
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
  onReset?: () => void;
  hasCountriesData?: string[];
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
  onReset,
  hasCountriesData = ["EG", "SA", "AE", "US"]
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
    { id: "ALL", label: "All Countries & Regions" },
    ...hasCountriesData.map(c => {
      const label = c === "EG" ? "🇪🇬 Egypt" : c === "SA" ? "🇸🇦 Saudi Arabia" : c === "AE" ? "🇦🇪 UAE" : c === "US" ? "🇺🇸 USA" : `🌐 ${c}`;
      return { id: c, label };
    }),
    { id: "Unknown", label: "Other / Unknown Countries" }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-50/80 border border-zinc-200/60 relative z-30 text-left" dir="ltr">

      {/* Top row: Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center bg-zinc-100/40 border border-zinc-200/60 rounded-2xl p-1 gap-1">
          {[
            { id: "1", label: "Today" },
            { id: "7", label: "7 Days" },
            { id: "30", label: "30 Days" },
            { id: "90", label: "90 Days" }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`flex-1 py-1.5 rounded-2xl text-[10px] sm:text-xs font-bold transition-all ${
                dateRange === range.id 
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/10" 
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Country Filter */}
        <div className="relative flex items-center pl-10">
          <Globe className="w-4.5 h-4.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 text-xs text-zinc-700 font-bold rounded-2xl py-2.5 pl-10 pr-3 focus:outline-none focus:border-zinc-200/60 transition-all appearance-none cursor-pointer text-left"
          >
            {countries.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-50 text-zinc-900">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Filter */}
        <div className="relative flex items-center pl-10">
          <DollarSign className="w-4.5 h-4.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-zinc-100/40 border border-zinc-200/60 hover:border-zinc-200 text-xs text-zinc-700 font-bold rounded-2xl py-2.5 pl-10 pr-3 focus:outline-none focus:border-zinc-200/60 transition-all appearance-none cursor-pointer text-left"
          >
            <option value="ALL" className="bg-slate-50 text-zinc-900">All Currencies</option>
            <option value="EGP" className="bg-slate-50 text-zinc-900">🇪🇬 EGP (Egyptian Pound)</option>
            <option value="USD" className="bg-slate-50 text-zinc-900">🇺🇸 USD (US Dollar)</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Page Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200/60">
        
        {/* Refresh, Export, & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 h-8.5 rounded-2xl text-[11px] font-black transition-all bg-zinc-100/40 hover:bg-zinc-100/80 border border-zinc-200/60 text-zinc-700 hover:text-zinc-900 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 h-8.5 rounded-2xl text-[11px] font-black transition-all bg-brand-600 hover:bg-[#3B82F6] text-white shadow-md shadow-brand-600/10 border border-transparent cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3.5 h-8.5 rounded-2xl text-[11px] font-black transition-all bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/20 text-amber-400 hover:text-amber-300 cursor-pointer"
              title="تصفير جميع إحصائيات المنصة (الزيارات، المبيعات، إلخ)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Statistics
            </button>
          )}
        </div>

        {/* Theme Toggles & Fullscreen (desktop only) */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8.5 h-8.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className="w-8.5 h-8.5 rounded-2xl bg-zinc-100/40 border border-zinc-200/60 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-all hidden md:flex cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
