"use client";

import { useState, useMemo } from "react";
import { Globe, Users, ShoppingBag, DollarSign } from "lucide-react";

interface CountryData {
  code: string;
  name: string;
  flag: string;
  visitors: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  growth: string;
}

interface GeoAnalyticsProps {
  orders: any[];
  visitorsCount?: number;
}

export default function GeoAnalytics({ orders, visitorsCount = 1200 }: GeoAnalyticsProps) {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Compile real country statistics from orders
  const countryStats = useMemo(() => {
    const stats: Record<string, { orders: number; revenue: number; codes: string }> = {};
    
    // Default mock template for rich display
    const defaults: Record<string, { name: string; flag: string; baseVisits: number; growth: string }> = {
      EG: { name: "Egypt", flag: "🇪🇬", baseVisits: 840, growth: "+14.2%" },
      SA: { name: "Saudi Arabia", flag: "🇸🇦", baseVisits: 320, growth: "+22.5%" },
      AE: { name: "United Arab Emirates", flag: "🇦🇪", baseVisits: 150, growth: "+8.9%" },
      US: { name: "United States", flag: "🇺🇸", baseVisits: 90, growth: "+5.1%" },
      GB: { name: "United Kingdom", flag: "🇬🇧", baseVisits: 60, growth: "+1.2%" },
    };

    // Aggregate completed orders
    const completedOrders = orders.filter(o => o.status === "completed");
    completedOrders.forEach(o => {
      const c = o.country || "Unknown";
      if (!stats[c]) {
        stats[c] = { orders: 0, revenue: 0, codes: c };
      }
      stats[c].orders += 1;
      stats[c].revenue += Number(o.amount || 0);
    });

    const parsed: CountryData[] = Object.entries(defaults).map(([code, def]) => {
      const actual = stats[code] || { orders: 0, revenue: 0 };
      const visitors = def.baseVisits + (actual.orders * 4);
      const conversionRate = visitors > 0 ? (actual.orders / visitors) * 100 : 0;
      
      return {
        code,
        name: def.name,
        flag: def.flag,
        visitors,
        orders: actual.orders,
        revenue: actual.revenue,
        conversionRate,
        growth: def.growth
      };
    });

    // Add "Other" if exists in stats but not defaults
    Object.entries(stats).forEach(([code, data]) => {
      if (!defaults[code] && code !== "Unknown") {
        const visitors = Math.max(10, data.orders * 9);
        parsed.push({
          code,
          name: code,
          flag: "🌐",
          visitors,
          orders: data.orders,
          revenue: data.revenue,
          conversionRate: visitors > 0 ? (data.orders / visitors) * 100 : 0,
          growth: "+0.0%"
        });
      }
    });

    return parsed.sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
  }, [orders]);

  // World map coordinates mapping for hotspots
  const mapHotspots = [
    { code: "US", x: 80, y: 130, label: "USA" },
    { code: "GB", x: 230, y: 100, label: "UK" },
    { code: "EG", x: 290, y: 175, label: "Egypt" },
    { code: "SA", x: 325, y: 195, label: "Saudi Arabia" },
    { code: "AE", x: 345, y: 190, label: "UAE" }
  ];

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 60
    });
  };

  const activeHoverData = countryStats.find(c => c.code === hoveredCountry);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 rounded-3xl bg-[#09090e]/80 border border-white/5 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      
      {/* Country statistics column */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Geographic Analytics</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Top student locations & purchasing heat points</p>
        </div>

        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {countryStats.map((c, index) => {
            const colors = ["#D6004B", "#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4"];
            const color = colors[index] || "#71717a";
            const maxRevenue = countryStats[0]?.revenue || 1;
            const pct = (c.revenue / maxRevenue) * 100;

            return (
              <div
                key={c.code}
                onMouseEnter={() => setHoveredCountry(c.code)}
                onMouseLeave={() => setHoveredCountry(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  hoveredCountry === c.code
                    ? "bg-white/[0.04] border-white/10"
                    : "bg-white/[0.01] border-white/5"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{c.flag}</span>
                    <span className="font-bold text-white truncate">{c.name}</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold shrink-0">{c.growth}</span>
                  </div>
                  <span className="font-bold font-mono text-[11px] text-rose-500 shrink-0">
                    {c.revenue > 0 ? `${c.revenue} L.E` : "0 L.E"}
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(3, pct)}%`, backgroundColor: color }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold">
                  <span>{c.visitors} visitors · {c.orders} orders</span>
                  <span className="text-emerald-400">CR: {c.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Map Visualizer Column */}
      <div className="lg:col-span-3 bg-white/[0.01] border border-white/5 rounded-2xl relative h-64 sm:h-[350px] overflow-hidden flex items-center justify-center p-4">
        
        {/* World Map SVG representation */}
        <div 
          className="relative w-full h-full max-w-[480px] max-h-[300px] select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
        >
          <svg
            viewBox="0 0 480 300"
            className="w-full h-full text-zinc-800 opacity-20 pointer-events-none"
            fill="currentColor"
          >
            {/* Extremely simplified global outline grids */}
            {/* North America */}
            <path d="M40 70 L120 60 L140 100 L110 140 L70 120 Z" />
            <path d="M60 40 L80 35 L90 50 Z" />
            {/* South America */}
            <path d="M100 150 L130 160 L110 240 L85 240 Z" />
            {/* Africa */}
            <path d="M230 140 L280 135 L300 170 L280 230 L250 240 L235 180 Z" />
            {/* Europe */}
            <path d="M220 70 L270 65 L280 110 L225 110 Z" />
            {/* Asia */}
            <path d="M285 70 L380 60 L420 130 L350 200 L300 130 Z" />
            {/* Australia */}
            <path d="M390 210 L430 215 L420 250 L380 240 Z" />
          </svg>

          {/* Glowing hotspots */}
          {mapHotspots.map((spot) => {
            const data = countryStats.find(c => c.code === spot.code);
            const isHovered = hoveredCountry === spot.code;
            const hasData = data && (data.orders > 0 || data.visitors > 50);

            return (
              <div
                key={spot.code}
                style={{ left: `${(spot.x / 480) * 100}%`, top: `${(spot.y / 300) * 100}%` }}
                onMouseEnter={() => setHoveredCountry(spot.code)}
                onMouseLeave={() => setHoveredCountry(null)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 p-2 group"
              >
                <span className="relative flex h-3.5 w-3.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isHovered || hasData ? "bg-rose-400" : "bg-zinc-500"
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border border-black/40 transition-colors duration-300 ${
                    isHovered ? "bg-rose-500 scale-125" : hasData ? "bg-rose-600" : "bg-zinc-700"
                  }`}></span>
                </span>
              </div>
            );
          })}

          {/* Interactive World Map Tooltip */}
          {hoveredCountry && activeHoverData && (
            <div
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
              className="absolute z-30 p-3 rounded-xl bg-[#060608]/95 border border-white/10 shadow-2xl backdrop-blur-md text-[10px] pointer-events-none w-40 space-y-1.5 transition-all duration-100 text-left font-sans"
            >
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-1 mb-1">
                <span>{activeHoverData.flag}</span>
                <span className="font-extrabold text-white">{activeHoverData.name}</span>
              </div>
              <div className="space-y-0.5 text-zinc-400 font-semibold">
                <div className="flex justify-between">
                  <span>Revenue:</span>
                  <span className="text-rose-400 font-mono font-black">{activeHoverData.revenue} L.E</span>
                </div>
                <div className="flex justify-between">
                  <span>Orders:</span>
                  <span className="text-white font-mono">{activeHoverData.orders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conversion:</span>
                  <span className="text-emerald-400 font-mono">{activeHoverData.conversionRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-black/40 border border-white/5 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[9px] text-zinc-500 font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            Purchases Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-700" />
            Zero/Low Traffic
          </span>
        </div>
      </div>
    </div>
  );
}
