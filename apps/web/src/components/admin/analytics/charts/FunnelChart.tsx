"use client";

import { motion } from "framer-motion";

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
      <div className="w-full h-[320px] flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-6 text-center text-zinc-500 text-xs font-sans">
        لم يتم العثور على سجلات زيارات كافية لتحليل قمع التحويل.
      </div>
    );
  }

  // Width coordinates for each stage of the funnel SVG
  // Stage 0 (top): 100% -> 80%
  // Stage 1: 80% -> 60%
  // Stage 2: 60% -> 45%
  // Stage 3: 45% -> 30%
  // Stage 4 (bottom): 30% -> 18%
  const widths = [
    { top: 220, bottom: 180 },
    { top: 180, bottom: 140 },
    { top: 140, bottom: 110 },
    { top: 110, bottom: 80 },
    { top: 80, bottom: 50 }
  ];

  const centerY = 150; // Center X of the SVG is 150

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-right" dir="rtl">
      
      {/* Title */}
      <div className="pb-4 border-b border-white/5 mb-5 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">قمع تحويل المبيعات والاشتراكات</h3>
          <p className="text-[10px] text-zinc-500">تحليل نسب التحويل ومواضع التسرب (الانسحاب) للمشترين</p>
        </div>
        <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-[#D6004B] px-2 py-0.5 rounded-full font-bold">
          مخطط قمعي تفاعلي
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
        
        {/* Left side: Custom SVG Funnel Graphic (cols 1-2) */}
        <div className="md:col-span-2 flex items-center justify-center">
          <svg viewBox="0 0 300 320" className="w-full max-w-[240px] overflow-visible">
            <defs>
              {stages.map((stage, idx) => (
                <linearGradient key={idx} id={`funnel-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stage.color} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={stage.color} stopOpacity={0.4} />
                </linearGradient>
              ))}
            </defs>

            {/* Render funnel polygons */}
            {stages.map((stage, idx) => {
              const w = widths[idx] || { top: 80, bottom: 50 };
              const yStart = idx * 60 + 5;
              const yEnd = yStart + 45;

              // Calculate points for the polygon (centered on X=150)
              const topLeftX = centerY - w.top;
              const topRightX = centerY + w.top;
              const bottomLeftX = centerY - w.bottom;
              const bottomRightX = centerY + w.bottom;

              const points = `${topLeftX},${yStart} ${topRightX},${yStart} ${bottomRightX},${yEnd} ${bottomLeftX},${yEnd}`;

              return (
                <g key={idx}>
                  <motion.polygon
                    points={points}
                    fill={`url(#funnel-grad-${idx})`}
                    stroke={stage.color}
                    strokeWidth={1.5}
                    initial={{ opacity: 0, scaleY: 0.5 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                    className="hover:brightness-125 transition-all cursor-pointer"
                  />
                  {/* Center Text inside polygon */}
                  <text
                    x={centerY}
                    y={yStart + 26}
                    textAnchor="middle"
                    fill="#ffffff"
                    className="text-[10px] font-black pointer-events-none tracking-wide"
                  >
                    {stage.convRate === "100%" ? "100%" : stage.convRate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right side: Detailed Stage Indicators and Leakages (cols 3-5) */}
        <div className="md:col-span-3 space-y-3">
          {stages.map((stage, idx) => {
            const pct = ((stage.count / maxCount) * 100).toFixed(0);
            
            return (
              <div key={idx} className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-extrabold text-white">{stage.name}</span>
                  </div>
                  <span className="text-xs font-black text-white font-mono">{stage.count} عميل</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                  <span>{stage.label}</span>
                  <span className="text-zinc-400 font-mono">الاحتفاظ: {pct}%</span>
                </div>

                {/* Leakage Indicator for next step */}
                {idx < stages.length - 1 && (
                  <div className="absolute bottom-[-14px] right-6 z-20 bg-[#0d0d15] px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1.5 text-[8.5px] text-rose-400 font-black">
                    <span>نسبة التسرب: {stages[idx + 1].dropRate}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
