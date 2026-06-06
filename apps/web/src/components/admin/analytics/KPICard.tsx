"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  desc?: string;
  icon: ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  glowColor?: string;
  sparklineData?: number[];
  isCompact?: boolean;
}

export default function KPICard({
  label,
  value,
  desc,
  icon: Icon,
  trend,
  trendUp,
  trendNeutral = false,
  glowColor = "from-rose-500/5 to-transparent",
  sparklineData,
  isCompact = false,
}: KPICardProps) {

  // Pure SVG Sparkline path generator
  const generateSparklinePath = (data: number[], width: number, height: number) => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;

    return data
      .map((val, index) => {
        const x = (index / (data.length - 1)) * width;
        // Invert Y coordinate because SVG top-left is 0
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const cleanLabelId = label.replace(/[^\w\u0600-\u06FF]/g, "-");

  return (
    <motion.div
      whileHover={{ y: -2, borderColor: "rgba(255,255,255,0.08)" }}
      className={cn(
        "rounded-2xl bg-[#09090e]/80 backdrop-blur-md border border-white/5 relative overflow-hidden group hover:shadow-[0_8px_20px_rgb(0,0,0,0.1)] transition-all duration-300 flex flex-col justify-between text-right",
        isCompact ? "p-3.5 min-h-[110px]" : "p-4.5 min-h-[130px]"
      )}
      dir="rtl"
    >
      {/* Soft ambient hover glow */}
      <div className={cn(
        "absolute -inset-px bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl",
        glowColor
      )} />

      <div className="space-y-1 relative z-10 flex-1 flex flex-col justify-between">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "font-extrabold text-zinc-500 uppercase tracking-widest leading-none",
            isCompact ? "text-[8px]" : "text-[9px] sm:text-[10px]"
          )}>
            {label}
          </p>
          <div className={cn(
            "rounded-lg flex items-center justify-center bg-white/5 border border-white/5 group-hover:bg-[#D6004B]/5 group-hover:border-[#D6004B]/10 transition-all duration-300 shrink-0",
            isCompact ? "w-6 h-6" : "w-8 h-8"
          )}>
            <Icon className={cn("text-zinc-400 group-hover:text-[#D6004B] transition-colors", isCompact ? "w-3 h-3" : "w-4 h-4")} />
          </div>
        </div>

        {/* Value + Sparkline Row */}
        <div className="flex items-end justify-between gap-3 mt-1.5 mb-1.5">
          <h3 className={cn(
            "font-black tracking-tight text-white leading-tight font-sans",
            isCompact ? "text-sm sm:text-base" : "text-base sm:text-xl"
          )}>
            {value}
          </h3>
          
          {sparklineData && sparklineData.length > 1 && (
            <div className={cn("shrink-0", isCompact ? "h-6 w-16" : "h-8 w-24")} dir="ltr">
              <svg className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id={`glow-${cleanLabelId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendUp ? "#10b981" : "#D6004B"} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={trendUp ? "#10b981" : "#D6004B"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path
                  d={`${generateSparklinePath(sparklineData, isCompact ? 64 : 96, isCompact ? 24 : 32)} L ${isCompact ? 64 : 96} ${isCompact ? 24 : 32} L 0 ${isCompact ? 24 : 32} Z`}
                  fill={`url(#glow-${cleanLabelId})`}
                />
                <path
                  d={generateSparklinePath(sparklineData, isCompact ? 64 : 96, isCompact ? 24 : 32)}
                  fill="none"
                  stroke={trendUp ? "#10b981" : "#D6004B"}
                  strokeWidth={1.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Footer row (Trends + Description) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-white/5">
          {desc && (
            <p className={cn("text-zinc-500 font-medium", isCompact ? "text-[7.5px]" : "text-[8px] sm:text-[9.5px]")}>
              {desc}
            </p>
          )}

          {trend && (
            <span
              className={cn(
                "font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0",
                isCompact ? "text-[7.5px]" : "text-[8.5px] sm:text-[9.5px]",
                trendNeutral
                  ? "text-zinc-400 bg-white/5 border border-white/5"
                  : trendUp
                  ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                  : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
              )}
            >
              {trendNeutral ? (
                <Minus className="w-2 h-2" />
              ) : trendUp ? (
                <ArrowUpRight className="w-2.5 h-2.5" />
              ) : (
                <ArrowDownRight className="w-2.5 h-2.5" />
              )}
              {trend}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
