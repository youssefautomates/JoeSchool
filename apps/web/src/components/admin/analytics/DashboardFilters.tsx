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
    { id: "ALL", label: "All Countries" },
    ...hasCountriesData.map(c => ({ id: c, label: c === "EG" ? "🇪🇬 Egypt" : c === "SA" ? "🇸🇦 Saudi Arabia" : c === "AE" ? "🇦🇪 UAE" : c === "US" ? "🇺🇸 USA" : `🌐 ${c}` })),
    { id: "Unknown", label: "Other/Unknown" }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#09090e]/80 border border-white/5 relative z-30">
      
      {/* Top row: Filter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Date Range Selector */}
        <div className="flex items-center bg-white/5 border border-white/5 rounded-xl p-1 gap-1">
          {[
            { id: "1", label: "Today" },
            { id: "7", label: "7D" },
            { id: "30", label: "30D" },
            { id: "90", label: "90D" }
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
        <div className="relative flex items-center">
          <Globe className="w-4.5 h-4.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-white/5 border border-white/5 hover:border-white/10 text-xs text-zinc-300 font-bold rounded-xl py-2.5 pl-10 pr-3 focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer"
          >
            {countries.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#09090e] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Filter */}
        <div className="relative flex items-center">
          <DollarSign className="w-4.5 h-4.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-white/5 border border-white/5 hover:border-white/10 text-xs text-zinc-300 font-bold rounded-xl py-2.5 pl-10 pr-3 focus:outline-none focus:border-rose-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#09090e] text-white">All Currencies</option>
            <option value="EGP" className="bg-[#09090e] text-white">🇪🇬 EGP Only</option>
            <option value="USD" className="bg-[#09090e] text-white">🇺🇸 USD Only</option>
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
            className="flex items-center gap-1.5 px-3 h-8.5 rounded-xl text-[11px] font-black transition-all bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 h-8.5 rounded-xl text-[11px] font-black transition-all bg-rose-600 hover:bg-[#ff0059] text-white shadow-md shadow-rose-600/10 border border-transparent"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>

        {/* Theme Toggles & Fullscreen (desktop only) */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8.5 h-8.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={toggleFullscreen}
            className="w-8.5 h-8.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all hidden md:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
