"use client";

import { motion } from "framer-motion";
import { TrendingUp, ArrowDown } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
  label: string;
  convRate: string;
  dropRate: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
}

export default function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = stages[0]?.count || 1;

  if (maxCount === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-6 text-center text-zinc-500 text-xs">
        No sales clickstream records found for funnel analysis.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans">
      
      {/* Title block */}
      <div className="pb-4 border-b border-white/5 mb-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sales Conversion Funnel</h3>
        <p className="text-[10px] text-zinc-500">Attrition ratios computed from product views to successful completions</p>
      </div>

      {/* Funnel rows */}
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const pctWidth = (stage.count / maxCount) * 100;
          
          return (
            <div key={stage.name} className="relative space-y-1 text-left">
              {/* Step info row */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] bg-white/5 font-black text-zinc-400 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] sm:text-xs">{stage.name}</span>
                  <span className="text-[9px] text-zinc-500 font-semibold hidden sm:inline">({stage.label})</span>
                </span>
                <span className="font-black text-white font-mono text-[10px] sm:text-xs shrink-0">{stage.count} sessions</span>
              </div>

              {/* Progress bar container */}
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden flex relative z-10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pctWidth}%` }}
                  transition={{ type: "spring", damping: 20, stiffness: 100 }}
                  className="h-full rounded-full" 
                  style={{ backgroundColor: stage.color }}
                />
              </div>

              {/* Transition indicators showing conversion and drop-off rates */}
              {idx > 0 && (
                <div className="absolute right-0 top-[-9px] flex gap-2 text-[9px] font-bold">
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    Conv: {stage.convRate}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-rose-400">Drop-off: {stage.dropRate}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
