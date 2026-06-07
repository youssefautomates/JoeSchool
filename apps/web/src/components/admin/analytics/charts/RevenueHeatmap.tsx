"use client";

import { useState, useMemo } from "react";
import { Flame } from "lucide-react";

interface HeatmapDataPoint {
  dayIndex: number;
  hour: number;
  amount: number;
}

interface RevenueHeatmapProps {
  orders: any[];
}

export default function RevenueHeatmap({ orders }: RevenueHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; amount: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hoursOfDay = ["12A", "2A", "4A", "6A", "8A", "10A", "12P", "2P", "4P", "6P", "8P", "10P"];

  // Aggregate orders by day and hour
  const heatmapGrid = useMemo(() => {
    const grid: Record<string, number> = {};
    
    // Initialize empty grid keys
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        grid[`${d}-${h}`] = 0;
      }
    }

    // Populate completed orders revenue
    orders.filter(o => o.status === "completed").forEach(o => {
      const date = new Date(o.created_at);
      const d = date.getDay();
      const h = date.getHours();
      grid[`${d}-${h}`] += Number(o.amount || 0);
    });

    return grid;
  }, [orders]);

  // Find max value in grid to scale color opacity
  const maxRevenueHour = useMemo(() => {
    const vals = Object.values(heatmapGrid);
    return Math.max(1, ...vals);
  }, [heatmapGrid]);

  const handleMouseMove = (e: React.MouseEvent, day: number, hour: number, amount: number) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.offsetParent?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 50
      });
    }
    setHoveredCell({ day, hour, amount });
  };

  const getHeatColor = (amount: number) => {
    if (amount === 0) return "bg-white/[0.02] border-white/5";
    
    const intensity = amount / maxRevenueHour;
    if (intensity < 0.25) return "bg-rose-500/20 border-rose-500/10";
    if (intensity < 0.5) return "bg-rose-500/40 border-rose-500/20";
    if (intensity < 0.75) return "bg-rose-600/70 border-rose-600/30";
    return "bg-rose-600 border-rose-500 shadow-md shadow-rose-600/20";
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour === 12) return "12:00 PM";
    if (hour > 12) return `${hour - 12}:00 PM`;
    return `${hour}:00 AM`;
  };

  return (
    <div className="w-full flex flex-col justify-between font-sans text-left" dir="ltr">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
        <div className="text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hourly Sales Revenue Heatmap</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">Distribution of total sales volume by weekday and hour of the day</p>
        </div>
        <Flame className="w-4 h-4 text-rose-500 shrink-0" />
      </div>

      {/* Swipeable container */}
      <div className="w-full overflow-x-auto no-scrollbar relative select-none pb-2" dir="ltr">
        <div className="min-w-[620px] space-y-1 relative">
          
          {/* Hour labels row */}
          <div className="flex items-center text-[8px] font-bold text-zinc-600 pb-1 pl-12">
            {Array.from({ length: 24 }).map((_, h) => (
              <span key={h} className="w-5 text-center shrink-0">
                {h % 2 === 0 ? `${h === 0 ? "12" : h > 12 ? h - 12 : h}${h >= 12 ? "P" : "A"}` : ""}
              </span>
            ))}
          </div>

          {/* Days grids */}
          {daysOfWeek.map((dayLabel, dIdx) => (
            <div key={dayLabel} className="flex items-center gap-1.5">
              <span className="w-10 text-[9px] font-black text-zinc-500 text-left shrink-0">{dayLabel}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 24 }).map((_, hIdx) => {
                  const val = heatmapGrid[`${dIdx}-${hIdx}`] || 0;
                  return (
                    <div
                      key={hIdx}
                      onMouseEnter={(e) => handleMouseMove(e, dIdx, hIdx, val)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`w-5 h-5 rounded border transition-all cursor-crosshair hover:scale-110 hover:z-20 shrink-0 ${getHeatColor(val)}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Interactive Heatmap Tooltip */}
          {hoveredCell && (
            <div
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
              className="absolute z-30 p-2.5 rounded-lg bg-[#060608]/95 border border-white/10 shadow-2xl backdrop-blur-md text-[9px] pointer-events-none w-36 space-y-0.5 text-left font-sans"
              dir="ltr"
            >
              <div className="font-extrabold text-white">
                {daysOfWeek[hoveredCell.day]} at {formatHour(hoveredCell.hour)}
              </div>
              <div className="text-zinc-400 font-semibold flex justify-between">
                <span>Revenue:</span>
                <span className="text-rose-400 font-mono font-black">{hoveredCell.amount} EGP</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-[8.5px] font-bold text-zinc-500 justify-start">
        <span>Low Sales</span>
        <div className="w-3.5 h-3.5 bg-white/[0.02] border border-white/5 rounded" />
        <div className="w-3.5 h-3.5 bg-rose-500/20 border border-rose-500/10 rounded" />
        <div className="w-3.5 h-3.5 bg-rose-500/40 border border-rose-500/20 rounded" />
        <div className="w-3.5 h-3.5 bg-rose-600/70 border border-rose-600/30 rounded" />
        <div className="w-3.5 h-3.5 bg-rose-600 border border-rose-500 rounded" />
        <span>High Sales</span>
      </div>
    </div>
  );
}
