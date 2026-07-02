"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { ComponentType } from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  desc?: string;
  icon: ComponentType<{ className?: string }>;
  trend?: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  glowColor?: string;
}

export default function KPICard({
  label,
  value,
  desc,
  icon: Icon,
  trend,
  trendUp,
  trendNeutral = false,
  glowColor = "from-brand-500/10 to-transparent",
}: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.12)" }}
      className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 backdrop-blur-md border border-zinc-200/60 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex flex-col justify-between min-h-[120px] sm:min-h-[140px]"
    >
      {/* Background glow hover effect */}
      <div className={`absolute -inset-px bg-gradient-to-br ${glowColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl`} />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-zinc-100/40 border border-zinc-200/60 group-hover:bg-[#1D4ED8]/10 group-hover:border-[#1D4ED8]/20 transition-all duration-300 shrink-0">
          <Icon className="w-4 h-4 text-zinc-500 group-hover:text-[#1D4ED8] transition-colors" />
        </div>

        {trend && (
          <span
            className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 ${
              trendNeutral
                ? "text-zinc-500 bg-zinc-100/40 border border-zinc-200/60"
                : trendUp
                ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                : "text-yellow-500 bg-brand-500/5 border border-zinc-200/60"
            }`}
          >
            {trendNeutral ? (
              <Minus className="w-2.5 h-2.5" />
            ) : trendUp ? (
              <ArrowUpRight className="w-2.5 h-2.5" />
            ) : (
              <ArrowDownRight className="w-2.5 h-2.5" />
            )}
            {trend}
          </span>
        )}
      </div>

      <div className="space-y-1 relative z-10">
        <p className="text-[9px] sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest leading-none">
          {label}
        </p>
        <h3 className="text-base sm:text-xl font-black tracking-tight text-zinc-900 leading-tight font-sans">
          {value}
        </h3>
        {desc && (
          <p className="text-[8px] sm:text-[9.5px] text-zinc-500 font-medium">
            {desc}
          </p>
        )}
      </div>
    </motion.div>
  );
}
