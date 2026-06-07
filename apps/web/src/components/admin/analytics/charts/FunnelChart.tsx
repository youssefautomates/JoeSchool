"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

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
      <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl p-6 text-center text-zinc-500 text-xs font-sans">
        لم يتم العثور على سجلات زيارات كافية لتحليل قمع التحويل.
      </div>
    );
  }

  // Translate stages names and labels to Arabic
  const translateStageName = (name: string) => {
    switch (name) {
      case "Total Visitors": return "إجمالي الزوار";
      case "Product Views": return "زيارات المنتجات";
      case "Add to Cart": return "إضافات السلة";
      case "Checkout Started": return "بدء عمليات الدفع";
      case "Purchases": return "عمليات الشراء الناجحة";
      default: return name;
    }
  };

  const translateStageLabel = (label: string) => {
    switch (label) {
      case "Initial Site Visits": return "زيارة الموقع الأولى";
      case "Details Page Views": return "تصفح تفاصيل المنتج";
      case "Expressed Purchasing Intent": return "تأكيد نية الشراء الفعلي";
      case "Entered Billing Flow": return "الدخول في صفحة الفوترة";
      case "Successful Payment Received": return "اكتمال السداد واستلام الأرباح";
      default: return label;
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between font-sans text-right" dir="rtl">
      
      {/* Title block */}
      <div className="pb-4 border-b border-white/5 mb-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">قمع تحويل المبيعات والاشتراكات</h3>
        <p className="text-[10px] text-zinc-500">تحليل نسب الانسحاب والتحويل عبر مراحل الشراء المختلفة</p>
      </div>

      {/* Funnel rows */}
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const pctWidth = (stage.count / maxCount) * 100;
          
          return (
            <div key={stage.name} className="relative space-y-1 text-right">
              {/* Step info row */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] bg-white/5 font-black text-zinc-400 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] sm:text-xs">{translateStageName(stage.name)}</span>
                  <span className="text-[9px] text-zinc-500 font-semibold hidden sm:inline">({translateStageLabel(stage.label)})</span>
                </span>
                <span className="font-black text-white font-mono text-[10px] sm:text-xs shrink-0">{stage.count} جلسة</span>
              </div>

              {/* Progress bar container */}
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden flex relative z-10" dir="ltr">
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
                <div className="absolute left-0 top-[-9px] flex gap-2 text-[9px] font-bold" dir="rtl">
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    تحويل: {stage.convRate}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-rose-400">انسحاب: {stage.dropRate}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
